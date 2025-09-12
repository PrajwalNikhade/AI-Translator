'use client';
import { useState, useRef } from 'react';
import { Mic, Square, Loader2, Copy, Upload } from 'lucide-react';
import LanguageSelector from './LanguageSelector';

export default function VoiceTranslator() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [useBrowserSpeech, setUseBrowserSpeech] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm;codecs=opus' });
        console.log('Audio recorded:', { 
          size: blob.size, 
          type: blob.type,
          fileName: file.name 
        });
        setAudioFile(file);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError('');
    } catch {
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('File selected:', { 
      name: file?.name, 
      type: file?.type, 
      size: file?.size 
    });
    
    if (file && (file.type.startsWith('audio/') || file.type.includes('webm') || file.type.includes('wav') || file.type.includes('mp3'))) {
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
      setError('');
      console.log('Audio file set successfully');
    } else {
      setError('Please upload a valid audio file (MP3, WAV, WebM, etc.)');
      console.error('Invalid file type:', file?.type);
    }
  };

  const handleTranslate = async () => {
    if (!audioFile) {
      setError('Please record or upload an audio file');
      return;
    }

    console.log('Starting voice translation with file:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
      sourceLanguage,
      targetLanguage
    });

    setIsLoading(true);
    setError('');
    setTranscript('');
    setTranslatedText('');

    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('sourceLanguage', sourceLanguage);
      formData.append('targetLanguage', targetLanguage);

      console.log('Sending request to /api/translate/voice');
      const response = await fetch('/api/translate/voice', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('Response from API:', { status: response.status, data });

      if (!response.ok) {
        console.error('API error:', data);
        throw new Error(data.error || 'Voice translation failed');
      }

      if (data.transcript) {
        setTranscript(data.transcript);
        console.log('Transcript set:', data.transcript.substring(0, 100) + '...');
      }
      
      if (data.translatedText) {
        setTranslatedText(data.translatedText);
        console.log('Translation set:', data.translatedText.substring(0, 100) + '...');
      }
      
      if (!data.transcript && !data.translatedText) {
        setError('No transcript or translation received from server');
      }
    } catch (err) {
      console.error('Voice translation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Voice translation failed';
      setError(`Translation failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const tryBrowserSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Browser speech recognition not supported. Please try uploading an audio file instead.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = sourceLanguage === 'en' ? 'en-US' : `${sourceLanguage}-${sourceLanguage.toUpperCase()}`;
    
    recognition.onstart = () => {
      setIsLoading(true);
      setError('');
      setTranscript('');
      setTranslatedText('');
    };
    
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('Browser speech recognition result:', transcript);
      setTranscript(transcript);
      
      // Translate the transcript
      try {
        const translationModel = getTranslationModel(sourceLanguage, targetLanguage);
        const response = await fetch('/api/translate/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: transcript,
            sourceLanguage,
            targetLanguage
          })
        });
        
        const data = await response.json();
        if (response.ok) {
          setTranslatedText(data.translatedText);
        } else {
          setError('Translation failed: ' + data.error);
        }
      } catch (err) {
        setError('Translation failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    };
    
    recognition.onerror = (event: any) => {
      setError('Speech recognition error: ' + event.error);
    };
    
    recognition.onend = () => {
      setIsLoading(false);
    };
    
    recognition.start();
  };

  const getTranslationModel = (source: string, target: string): string => {
    const modelMap: Record<string, string> = {
      'en-es': 'Helsinki-NLP/opus-mt-en-es',
      'en-fr': 'Helsinki-NLP/opus-mt-en-fr',
      'en-de': 'Helsinki-NLP/opus-mt-en-de',
      'es-en': 'Helsinki-NLP/opus-mt-es-en',
      'fr-en': 'Helsinki-NLP/opus-mt-fr-en',
      'de-en': 'Helsinki-NLP/opus-mt-de-en'
    };
    return modelMap[`${source}-${target}`] || 'Helsinki-NLP/opus-mt-en-de';
  };

  const clearAudio = () => {
    setAudioFile(null);
    setAudioUrl('');
    setTranscript('');
    setTranslatedText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="mb-6">
        <div className="flex items-center justify-center mb-4 space-x-8">
          <LanguageSelector
            value={sourceLanguage}
            onChange={setSourceLanguage}
            label="From"
          />
          <LanguageSelector
            value={targetLanguage}
            onChange={setTargetLanguage}
            label="To"
          />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex flex-col items-center space-y-4">
          {/* Speech Recognition Method Toggle */}
          <div className="flex items-center space-x-4 mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={useBrowserSpeech}
                onChange={(e) => setUseBrowserSpeech(e.target.checked)}
                className="mr-2"
              />
              Use Browser Speech Recognition (Backup)
            </label>
          </div>

          {/* Recording Controls */}
          <div className="flex items-center space-x-4">
            {useBrowserSpeech ? (
              <button
                onClick={tryBrowserSpeechRecognition}
                disabled={isLoading}
                className="flex items-center px-6 py-3 rounded-full font-medium bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 transition-all"
              >
                <Mic className="mr-2 h-5 w-5" />
                {isLoading ? 'Listening...' : 'Start Browser Recognition'}
              </button>
            ) : (
              <>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex items-center px-6 py-3 rounded-full font-medium transition-all ${
                    isRecording
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square className="mr-2 h-5 w-5" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-5 w-5" />
                      Start Recording
                    </>
                  )}
                </button>

                <span className="text-gray-500">or</span>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Audio
                </button>
              </>
            )}
          </div>

          {/* Audio Preview */}
          {audioUrl && (
            <div className="w-full max-w-md">
              <audio controls className="w-full mb-2">
                <source src={audioUrl} type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
              <button
                onClick={clearAudio}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear Audio
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {(transcript || translatedText) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Transcript
              </label>
              {transcript && (
                <button
                  onClick={() => copyToClipboard(transcript)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Copy className="h-4 w-4" />
                </button>
              )}
            </div>
            <textarea
              value={transcript}
              readOnly
              className="w-full h-24 p-3 border border-gray-300 rounded-lg bg-gray-50 resize-none"
              placeholder="Transcript will appear here..."
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Translation
              </label>
              {translatedText && (
                <button
                  onClick={() => copyToClipboard(translatedText)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Copy className="h-4 w-4" />
                </button>
              )}
            </div>
            <textarea
              value={translatedText}
              readOnly
              className="w-full h-24 p-3 border border-gray-300 rounded-lg bg-gray-50 resize-none"
              placeholder="Translation will appear here..."
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={handleTranslate}
          disabled={isLoading || !audioFile}
          className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {isLoading ? 'Processing...' : 'Translate Audio'}
        </button>
      </div>
    </div>
  );
}
