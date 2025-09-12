'use client';
import { useState, useRef } from 'react';
import { Upload, Download, Loader2, Copy, FileText, FileDown } from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import jsPDF from 'jspdf';

export default function PDFTranslator() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [progress, setProgress] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setError('');
      setTranslatedText('');
    } else {
      setError('Please upload a valid PDF file');
    }
  };

  const handleTranslate = async () => {
    if (!pdfFile) {
      setError('Please upload a PDF file');
      return;
    }

    setIsLoading(true);
    setError('');
    setProgress('Extracting text from PDF...');

    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('sourceLanguage', sourceLanguage);
      formData.append('targetLanguage', targetLanguage);

      setProgress('Translating text...');
      
      const response = await fetch('/api/translate/pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'PDF translation failed');
      }

      setTranslatedText(data.translatedText);
      setProgress('Translation complete!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF translation failed');
      setProgress('');
    } finally {
      setIsLoading(false);
      setTimeout(() => setProgress(''), 2000); // Clear progress after 2 seconds
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadTranslatedText = () => {
    if (!translatedText) return;

    const blob = new Blob([translatedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translated-${pdfFile?.name || 'document'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadTranslatedPDF = () => {
    if (!translatedText) return;

    try {
      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      const lineHeight = 7;
      const maxWidth = pageWidth - (margin * 2);

      // Add title
      doc.setFontSize(16);
      doc.text('Translated Document', margin, margin + 10);
      
      // Add metadata
      doc.setFontSize(10);
      doc.text(`Original file: ${pdfFile?.name || 'Unknown'}`, margin, margin + 25);
      doc.text(`Translated from: ${getLanguageName(sourceLanguage)} to ${getLanguageName(targetLanguage)}`, margin, margin + 35);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, margin + 45);
      
      // Add translated content
      doc.setFontSize(12);
      const lines = doc.splitTextToSize(translatedText, maxWidth);
      let yPosition = margin + 60;
      
      for (let i = 0; i < lines.length; i++) {
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(lines[i], margin, yPosition);
        yPosition += lineHeight;
      }
      
      doc.save(`translated-${pdfFile?.name?.replace('.pdf', '') || 'document'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to text download
      downloadTranslatedText();
    }
  };

  const getLanguageName = (code: string): string => {
    const languageNames: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish', 
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese'
    };
    return languageNames[code] || code;
  };

  const clearFile = () => {
    setPdfFile(null);
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

      {/* File Upload Section */}
      <div className="mb-6">
        <div className="flex flex-col items-center space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full max-w-md border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Upload PDF File
            </p>
            <p className="text-sm text-gray-500">
              Click here to select a PDF file to translate
            </p>
          </div>

          {pdfFile && (
            <div className="w-full max-w-md bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-red-500 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{pdfFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearFile}
                  className="text-gray-400 hover:text-red-500"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Translation Result */}
      {translatedText && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Translated Content
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => copyToClipboard(translatedText)}
                className="flex items-center text-gray-400 hover:text-gray-600"
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </button>
              <button
                onClick={downloadTranslatedText}
                className="flex items-center text-gray-400 hover:text-gray-600"
                title="Download as text file"
              >
                <Download className="h-4 w-4 mr-1" />
                Text
              </button>
              <button
                onClick={downloadTranslatedPDF}
                className="flex items-center text-blue-500 hover:text-blue-700"
                title="Download as PDF"
              >
                <FileDown className="h-4 w-4 mr-1" />
                PDF
              </button>
            </div>
          </div>
          <textarea
            value={translatedText}
            readOnly
            className="w-full h-48 p-4 border border-gray-300 rounded-lg bg-gray-50 resize-none text-sm"
            placeholder="Translated text will appear here..."
          />
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {progress && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg">
          {progress}
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={handleTranslate}
          disabled={isLoading || !pdfFile}
          className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {isLoading ? (progress || 'Processing PDF...') : 'Translate PDF'}
        </button>
      </div>
    </div>
  );
}
