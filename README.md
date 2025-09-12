# Universal Translator

A comprehensive translation web application built with Next.js, TypeScript, and Tailwind CSS that supports text, voice, and PDF translation using Hugging Face AI models.

## Features

### 🎯 Multi-Modal Translation
- **Text Translation**: Direct text-to-text translation with language swapping
- **Voice Translation**: Speech-to-text transcription and translation with audio recording or file upload
- **PDF Translation**: Extract text from PDFs and translate with downloadable results

### 🚀 Technology Stack
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (MERN-like architecture)
- **AI Models**: Hugging Face Transformers
  - Translation: Helsinki-NLP Opus models
  - Speech Recognition: OpenAI Whisper
- **UI Components**: Lucide React icons, custom responsive design

### 🌍 Supported Languages
- English ↔ Spanish
- English ↔ French  
- English ↔ German
- English ↔ Italian
- English ↔ Portuguese

## Prerequisites

1. **Node.js** (version 18 or higher)
2. **npm** or **yarn**
3. **Hugging Face Account** and API key

## Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Hugging Face API Configuration
   HUGGINGFACE_API_KEY=your_huggingface_api_key_here
   
   # Translation Model Configuration
   DEFAULT_TRANSLATION_MODEL=Helsinki-NLP/opus-mt-en-de
   ```

3. **Get your Hugging Face API key**
   - Go to [Hugging Face](https://huggingface.co/)
   - Create an account or sign in
   - Go to Settings → Access Tokens
   - Create a new token with read permissions
   - Copy the token to your `.env.local` file

## Running the Application

1. **Development mode**
   ```bash
   npm run dev
   ```

2. **Build for production**
   ```bash
   npm run build
   npm start
   ```

3. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## API Endpoints

### Text Translation
- **POST** `/api/translate/text`
- **Body**: `{ text, sourceLanguage, targetLanguage }`

### Voice Translation
- **POST** `/api/translate/voice`
- **FormData**: `file, sourceLanguage, targetLanguage`

### PDF Translation
- **POST** `/api/translate/pdf`
- **FormData**: `file, sourceLanguage, targetLanguage`

## Usage Guide

### Text Translation
1. Select source and target languages
2. Enter text in the source text area
3. Click "Translate" button
4. Copy or use the translated text

### Voice Translation
1. Choose languages for transcription and translation
2. **Record audio**: Click "Start Recording" → speak → "Stop Recording"
3. **Upload audio**: Click "Upload Audio" → select audio file
4. Click "Translate Audio"
5. View transcript and translation

### PDF Translation
1. Set source and target languages
2. Upload PDF file by clicking the upload area
3. Click "Translate PDF"
4. View, copy, or download the translated text

## Project Structure

```
translator-app/
├── src/
│   ├── app/
│   │   ├── api/translate/
│   │   │   ├── text/route.ts
│   │   │   ├── voice/route.ts
│   │   │   └── pdf/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── components/
│       ├── Navigation.tsx
│       ├── TextTranslator.tsx
│       ├── VoiceTranslator.tsx
│       ├── PDFTranslator.tsx
│       └── LanguageSelector.tsx
├── .env.local
├── package.json
└── README.md
```

## Recent Improvements (v2.0)

### 🛡️ **Robust Error Handling**
- **Smart Retry Logic**: Automatic retries with exponential backoff for failed translations
- **Recursive Text Splitting**: Automatically splits problematic text chunks and retries
- **Text Sanitization**: Removes control characters and normalizes whitespace
- **Graceful Fallbacks**: Returns original text if translation fails completely

### 📄 **Enhanced PDF Features**
- **PDF Output**: Download translated content as a formatted PDF file
- **Text Output**: Traditional text file download option
- **Progress Tracking**: Real-time progress updates during processing
- **Metadata Inclusion**: PDF includes original filename, languages, and date

### 🎙️ **Improved Voice Translation**
- **Better Error Messages**: Detailed debugging information
- **Enhanced Audio Support**: WebM, WAV, MP3 format validation
- **Console Logging**: Comprehensive debugging for troubleshooting
- **Robust Processing**: Handles various Whisper API response formats

### 🔧 **Technical Improvements**
- **Windows Compatibility**: Fixed Next.js build issues on Windows
- **Smaller Chunk Sizes**: Reduced from 1000 to 500 characters for better reliability
- **Provider Error Handling**: Specifically addresses "index out of range" errors
- **TypeScript Enhancements**: Better type safety and error handling

## Troubleshooting

For common issues and solutions, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

### Quick Fixes
- **PDF Translation Errors**: Try smaller PDF files first, ensure they contain extractable text
- **Voice Translation Issues**: Check browser console, ensure clear audio, verify microphone permissions
- **API Errors**: Verify HUGGINGFACE_API_KEY and account quota

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically with git push

---

**Built with ❤️ using Next.js, TypeScript, and Hugging Face AI**
