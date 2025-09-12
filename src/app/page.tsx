'use client';
import { useState } from 'react';
import Navigation from '@/components/Navigation';
import TextTranslator from '@/components/TextTranslator';
import VoiceTranslator from '@/components/VoiceTranslator';
import PDFTranslator from '@/components/PDFTranslator';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'text' | 'voice' | 'pdf'>('text');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Universal Translator
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Translate text, voice, and PDFs using advanced  AI models
          </p>
        </header>

        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="max-w-4xl mx-auto">
          {activeTab === 'text' && <TextTranslator />}
          {activeTab === 'voice' && <VoiceTranslator />}
          {activeTab === 'pdf' && <PDFTranslator />}
        </main>
      </div>
    </div>
  );
}
