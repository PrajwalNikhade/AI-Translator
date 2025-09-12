import { NextRequest, NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';
import pdf from 'pdf-parse';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const sourceLanguage = (formData.get('sourceLanguage') as string) || 'en';
    const targetLanguage = (formData.get('targetLanguage') as string) || 'de';

    if (!file) {
      return NextResponse.json({ error: 'No PDF file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsed = await pdf(buffer);
    const rawText = parsed.text || '';
    const text = sanitizeText(rawText);

    if (!text) {
      return NextResponse.json({ error: 'No extractable text in PDF' }, { status: 400 });
    }

    const translationModel = getTranslationModel(sourceLanguage, targetLanguage);

    // Split text into conservative chunks to handle long documents
    const chunks = splitTextIntoChunks(text, 500);
    const translatedChunks: string[] = [];

    for (const chunk of chunks) {
      try {
        const translated = await translateWithRetry(hf, translationModel, chunk);
        translatedChunks.push(translated);
      } catch (chunkError) {
        console.error('Error translating chunk after retries, returning original chunk:', chunkError);
        // If a chunk fails, use the original text to avoid losing content
        translatedChunks.push(chunk);
      }
    }

    const translatedText = translatedChunks.join(' ');

    return NextResponse.json({
      translatedText,
      sourceLanguage,
      targetLanguage,
      model: translationModel,
    });
  } catch (error) {
    console.error('PDF translation error:', error);
    return NextResponse.json(
      { error: 'PDF translation failed', details: error instanceof Error ? error.message : 'Unknown error' },
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

