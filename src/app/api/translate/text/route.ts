import { HfInference } from '@huggingface/inference';
import { NextRequest, NextResponse } from 'next/server';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { text, sourceLanguage, targetLanguage, model } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Use specified model or default
    const translationModel = model || getTranslationModel(sourceLanguage, targetLanguage);

    // Sanitize input text
    const sanitizedText = sanitizeText(text);
    
    // Handle long text by splitting into chunks if necessary
    if (sanitizedText.length > 500) {
      const chunks = splitTextIntoChunks(sanitizedText, 500);
      const translatedChunks: string[] = [];

      for (const chunk of chunks) {
        try {
          const translated = await translateWithRetry(hf, translationModel, chunk);
          translatedChunks.push(translated);
        } catch (chunkError) {
          console.error('Error translating chunk after retries:', chunkError);
          translatedChunks.push(chunk);
        }
      }

      return NextResponse.json({
        translatedText: translatedChunks.join(' '),
        sourceLanguage,
        targetLanguage,
        model: translationModel,
      });
    } else {
      try {
        const translated = await translateWithRetry(hf, translationModel, sanitizedText);
        return NextResponse.json({
          translatedText: translated,
          sourceLanguage,
          targetLanguage,
          model: translationModel,
        });
      } catch (translationError) {
        console.error('Translation failed:', translationError);
        return NextResponse.json({
          translatedText: sanitizedText, // Fallback to original text
          sourceLanguage,
          targetLanguage,
          model: translationModel,
          error: 'Translation failed, returned original text'
        });
      }
    }
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Translation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
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
  // Language code mapping for Helsinki-NLP models
  const modelMap: { [key: string]: string } = {
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
