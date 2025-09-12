import { NextRequest, NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export const runtime = 'nodejs';

// This route expects a FormData with a "file" (audio) and languages
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const sourceLanguage = (formData.get('sourceLanguage') as string) || 'en';
    const targetLanguage = (formData.get('targetLanguage') as string) || 'de';

    console.log('Voice translation request:', {
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      sourceLanguage,
      targetLanguage
    });

    if (!file) {
      return NextResponse.json({ error: 'No audio file uploaded' }, { status: 400 });
    }

    // Validate audio file type
    if (!file.type.startsWith('audio/') && !file.type.includes('webm') && !file.type.includes('wav') && !file.type.includes('mp3')) {
      return NextResponse.json({ error: 'Invalid audio file type. Please upload a valid audio file.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    console.log('Audio file processed, size:', arrayBuffer.byteLength, 'bytes');

    // 1) Speech-to-text using available models with fallback
    console.log('Starting speech recognition...');
    const transcript = await speechToTextWithFallback(hf, arrayBuffer);

    if (!transcript) {
      return NextResponse.json({ 
        error: 'Could not transcribe audio. Please ensure the audio is clear and contains speech, and try with a shorter audio file.',
      }, { status: 400 });
    }

    console.log('Final transcript:', transcript);

    // 2) Translate the transcript
    console.log('Starting translation...');
    const translationModel = getTranslationModel(sourceLanguage, targetLanguage);
    
    // Sanitize and handle translation
    const sanitizedTranscript = sanitizeText(transcript);
    let translatedText = '';
    
    if (sanitizedTranscript.length > 500) {
      const chunks = splitTextIntoChunks(sanitizedTranscript, 500);
      const translatedChunks: string[] = [];
      
      for (const chunk of chunks) {
        try {
          const translated = await translateWithRetry(hf, translationModel, chunk);
          translatedChunks.push(translated);
        } catch (chunkError) {
          console.error('Error translating voice chunk:', chunkError);
          translatedChunks.push(chunk);
        }
      }
      
      translatedText = translatedChunks.join(' ');
    } else {
      try {
        translatedText = await translateWithRetry(hf, translationModel, sanitizedTranscript);
      } catch (translationError) {
        console.error('Voice translation failed:', translationError);
        translatedText = sanitizedTranscript; // Fallback to transcript
      }
    }

    console.log('Translation complete:', { transcript: transcript.substring(0, 100), translatedText: translatedText.substring(0, 100) });

    return NextResponse.json({
      transcript,
      translatedText,
      sourceLanguage,
      targetLanguage,
      model: translationModel,
    });
  } catch (error) {
    console.error('Voice translation error:', error);
    return NextResponse.json(
      { 
        error: 'Voice translation failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

async function speechToTextWithFallback(hf: HfInference, audioData: ArrayBuffer): Promise<string> {
  // List of speech recognition models to try (ordered by likelihood to work)
  const models = [
    'facebook/wav2vec2-base-960h',
    'facebook/wav2vec2-large-960h-lv60-self',
    'openai/whisper-tiny'
  ];

  for (const model of models) {
    try {
      console.log(`Trying speech recognition model: ${model}`);
      const result = await hf.automaticSpeechRecognition({
        model,
        data: audioData,
      });

      console.log(`Speech recognition result from ${model}:`, result);

      // Handle different response formats
      let transcript = '';
      if (typeof result === 'string') {
        transcript = result;
      } else if (typeof result === 'object' && result !== null) {
        const sttObj = result as { text?: string; transcription?: string; transcript?: string };
        transcript = sttObj.text || sttObj.transcription || sttObj.transcript || '';
      }

      transcript = transcript.trim();
      
      if (transcript && transcript.length > 0) {
        console.log(`Successfully transcribed with ${model}:`, transcript.substring(0, 100) + '...');
        return transcript;
      }
    } catch (error) {
      console.log(`Model ${model} failed:`, error instanceof Error ? error.message : 'Unknown error');
      continue; // Try next model
    }
  }

  console.error('All speech recognition models failed');
  return '';
}

async function translateWithRetry(hf: HfInference, model: string, input: string, depth = 0): Promise<string> {
  const maxDepth = 3;
  const backoff = (ms: number) => new Promise((res) => setTimeout(res, ms));

  try {
    const result = await hf.translation({ model, inputs: input });
    return result.translation_text;
  } catch (err) {
    // If we've tried a few times, split the input further if possible
    if (depth < maxDepth && input.length > 150) {
      // Split roughly in half on sentence boundary
      const mid = Math.floor(input.length / 2);
      const leftBoundary = input.lastIndexOf('. ', mid);
      const idx = leftBoundary > 100 ? leftBoundary + 1 : mid;
      const a = input.slice(0, idx).trim();
      const b = input.slice(idx).trim();

      const [ta, tb] = await Promise.all([
        translateWithRetry(hf, model, a, depth + 1),
        translateWithRetry(hf, model, b, depth + 1),
      ]);
      return `${ta} ${tb}`.trim();
    }

    // Exponential backoff retries a couple times before giving up
    if (depth < maxDepth) {
      await backoff(300 * (depth + 1));
      return translateWithRetry(hf, model, input, depth + 1);
    }

    throw err;
  }
}

function sanitizeText(text: string): string {
  // Remove non-printable/control characters, normalize whitespace
  return text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\uFFFD/g, '')
    .trim();
}

function splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    // If adding this sentence would exceed the limit, save current chunk
    if (currentChunk.length + trimmedSentence.length + 1 > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
    }

    currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
  }

  // Add the last chunk if it has content
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // If no chunks were created (very long single sentence), split by character limit
  if (chunks.length === 0 && text.length > 0) {
    for (let i = 0; i < text.length; i += maxChunkSize) {
      chunks.push(text.slice(i, i + maxChunkSize));
    }
  }

  return chunks;
}

function getTranslationModel(sourceLanguage: string, targetLanguage: string): string {
  const modelMap: Record<string, string> = {
    'en-es': 'Helsinki-NLP/opus-mt-en-es',
    'en-fr': 'Helsinki-NLP/opus-mt-en-fr',
    'en-de': 'Helsinki-NLP/opus-mt-en-de',
    'en-it': 'Helsinki-NLP/opus-mt-en-it',
    'en-pt': 'Helsinki-NLP/opus-mt-en-pt',
    'es-en': 'Helsinki-NLP/opus-mt-es-en',
    'fr-en': 'Helsinki-NLP/opus-mt-fr-en',
    'de-en': 'Helsinki-NLP/opus-mt-de-en',
    'it-en': 'Helsinki-NLP/opus-mt-it-en',
    'pt-en': 'Helsinki-NLP/opus-mt-pt-en',
  };
  const languagePair = `${sourceLanguage}-${targetLanguage}`;
  return modelMap[languagePair] || 'Helsinki-NLP/opus-mt-en-de';
}

