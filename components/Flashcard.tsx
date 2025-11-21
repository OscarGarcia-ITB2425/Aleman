import React, { useState, useCallback } from 'react';
import { Word, StudyMode } from '../types';
import { getWordExplanation } from '../services/geminiService';

interface FlashcardProps {
  word: Word;
  mode: StudyMode;
  isFlipped: boolean;
  onFlip: () => void;
}

export const Flashcard: React.FC<FlashcardProps> = ({ word, mode, isFlipped, onFlip }) => {
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Logic to determine front/back content based on mode
  const frontText = mode === 'de-es' ? word.german : word.spanish;
  const backText = mode === 'de-es' ? word.spanish : word.german;
  const subText = mode === 'de-es' && word.gender ? `${word.gender}` : '';

  const handleAskAi = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (aiExplanation) return;
    
    setLoadingAi(true);
    const explanation = await getWordExplanation(word.german, 'es');
    setAiExplanation(explanation);
    setLoadingAi(false);
  }, [word.german, aiExplanation]);

  // Reset AI explanation when word changes
  React.useEffect(() => {
    setAiExplanation(null);
    setLoadingAi(false);
  }, [word.id]);

  return (
    <div 
      className="relative w-full max-w-md h-96 cursor-pointer perspective-1000 group"
      onClick={onFlip}
    >
      <div 
        className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}
      >
        {/* Front Face */}
        <div className="absolute w-full h-full backface-hidden bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col items-center justify-center p-8 text-center">
          <span className="text-sm uppercase tracking-widest text-slate-400 mb-4">
            {mode === 'de-es' ? 'Alemán' : 'Español'}
          </span>
          <h2 className="text-4xl font-bold text-slate-800 mb-2">{frontText}</h2>
          {mode === 'de-es' && subText && (
             <span className="text-xl text-indigo-500 font-medium">{subText}</span>
          )}
           <div className="mt-8 text-slate-400 text-sm animate-pulse">
            Pulsa para revelar
          </div>
        </div>

        {/* Back Face */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-slate-900 text-white rounded-2xl shadow-xl flex flex-col items-center justify-center p-8 text-center overflow-y-auto scrollbar-hide">
           <span className="text-sm uppercase tracking-widest text-slate-400 mb-4">
            {mode === 'de-es' ? 'Significado' : 'Traducción'}
          </span>
          <h2 className="text-3xl font-bold text-white mb-4">{backText}</h2>
          
          {/* Details for context if available */}
          <div className="text-slate-300 mb-6">
            <span className="italic text-xs border border-slate-600 px-2 py-1 rounded-full">
              {word.type}
            </span>
          </div>

          {/* AI Tutor Section */}
          {!aiExplanation && !loadingAi && (
            <button 
              onClick={handleAskAi}
              className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              Explicar con IA
            </button>
          )}

          {loadingAi && (
             <div className="mt-4 flex items-center gap-2 text-slate-400 text-sm">
               <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
               Consultando a Gemini...
             </div>
          )}

          {aiExplanation && (
            <div 
              className="mt-4 text-left text-sm text-slate-300 bg-slate-800 p-4 rounded-lg border border-slate-700 w-full prose prose-invert prose-sm max-h-40 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: aiExplanation }} 
            />
          )}

        </div>
      </div>
    </div>
  );
};
