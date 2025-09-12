# Troubleshooting Guide

## Voice Translation Issues

If voice translation is not working, check the following:

### 1. Browser Console Logs
- Open browser developer tools (F12)
- Go to Console tab
- Look for error messages when trying to translate audio

### 2. Common Issues and Solutions

#### **Microphone Access Issues**
- **Problem**: "Could not access microphone" error
- **Solution**: 
  - Allow microphone permissions in browser
  - Use HTTPS (required for microphone access)
  - Check if another application is using the microphone

#### **Audio Format Issues**
- **Problem**: "Invalid audio file type" error
- **Solution**: 
  - Use supported formats: MP3, WAV, WebM
  - For recordings, the app uses WebM format automatically
  - Ensure uploaded files are actual audio files

#### **Hugging Face API Issues**
- **Problem**: "Voice translation failed" with API errors
- **Solutions**:
  - Check your HUGGINGFACE_API_KEY in `.env.local`
  - Verify your Hugging Face account has sufficient quota
  - Try with shorter audio files (under 30 seconds)

#### **Model Availability Issues**
- **Problem**: "No Inference Provider available for model" error
- **Solutions**:
  - The app automatically tries multiple speech recognition models
  - Some models may be temporarily unavailable on Hugging Face
  - Check the browser console to see which models are being tried
  - Wait a few minutes and try again (models may be loading)
  - Verify your Hugging Face account has access to Inference API

#### **Transcription Issues**
- **Problem**: "Could not transcribe audio" error
- **Solutions**:
  - Ensure audio contains clear speech
  - Avoid background noise
  - Try speaking more clearly and loudly
  - Use audio files with single speakers

### 3. Debug Steps

1. **Test with a simple recording**:
   - Record a short (5-10 second) clear message
   - Try translating between English and Spanish first

2. **Check file upload**:
   - Try uploading a known good audio file
   - Verify file size is reasonable (under 10MB)

3. **Test API directly**:
   - Check server logs for detailed error messages
   - Verify the API endpoint is responding

4. **Browser compatibility**:
   - Test in Chrome/Firefox (better WebRTC support)
   - Ensure browser has microphone permissions

### 4. Server-Side Debugging

Check the server logs for detailed error messages:
```bash
npm run dev
```

Look for console logs starting with:
- "Voice translation request:"
- "Speech recognition result:"
- "Translation complete:"

## PDF Translation Issues

### 1. PDF Text Extraction
- **Problem**: "No extractable text in PDF"
- **Solution**: 
  - Use text-based PDFs (not scanned images)
  - For scanned PDFs, OCR functionality would be needed

### 2. Large PDF Files
- **Problem**: Translation fails with large documents
- **Solution**: 
  - The app automatically chunks large texts
  - Try with smaller PDF files first
  - Check Hugging Face API limits

## General API Issues

### 1. Environment Variables
Ensure your `.env.local` file contains:
```
HUGGINGFACE_API_KEY=your_actual_api_key_here
```

### 2. Hugging Face Models
The app uses these models:
- Speech recognition: Multiple fallback models including `facebook/wav2vec2-base-960h`, `openai/whisper-tiny`
- Translation: `Helsinki-NLP/opus-mt-*` models

If models are unavailable, try:
- Checking Hugging Face model status and Inference API availability
- Using different language pairs
- Waiting and retrying (models may be loading)
- The app automatically tries multiple speech recognition models as fallbacks

## Getting Help

1. Check browser console for error messages
2. Review server logs during development
3. Test with simple, clear audio files
4. Verify API key and quota on Hugging Face
5. Try different browsers if issues persist

## Success Tips

- **For voice translation**: Use clear, single-speaker audio under 30 seconds
- **For PDF translation**: Use text-based PDFs with clear formatting
- **For all features**: Ensure stable internet connection and valid API key
