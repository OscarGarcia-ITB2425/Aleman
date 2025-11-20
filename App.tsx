import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { INITIAL_WORDS } from './constants';
import { Word, StudyMode, UserProgress } from './types';
import { calculateNextReview, getDueWords } from './services/srsService';
import { loadProgress, saveProgress } from './services/storageService';
import { Flashcard } from './components/Flashcard';

// Main Application
const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'study'>('home');
  const [mode, setMode] = useState<StudyMode>('de-es');
  const [progressMap, setProgressMap] = useState<Record<string, UserProgress>>({});
  const [sessionQueue, setSessionQueue] = useState<Word[]>([]);
  
  // Session State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  // Load progress on mount
  useEffect(() => {
    const saved = loadProgress();
    setProgressMap(saved);
  }, []);

  // Start a session
  const startSession = (selectedMode: StudyMode) => {
    setMode(selectedMode);
    
    // Calculate Due Words
    const allIds = INITIAL_WORDS.map(w => w.id);
    const dueIds = getDueWords(allIds, progressMap);
    
    // Map IDs back to Word objects
    const queue = INITIAL_WORDS.filter(w => dueIds.includes(w.id));
    
    // Shuffle slightly
    const shuffled = queue.sort(() => Math.random() - 0.5);
    
    setSessionQueue(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionComplete(false);
    setView('study');
  };

  // Handle Rating (SRS Logic)
  const handleRate = useCallback((quality: number) => {
    const currentWord = sessionQueue[currentIndex];
    if (!currentWord) return;

    // Calculate new progress
    const newProgress = calculateNextReview(progressMap[currentWord.id], quality, currentWord.id);
    
    // Update State
    const updatedMap = { ...progressMap, [currentWord.id]: newProgress };
    setProgressMap(updatedMap);
    saveProgress(updatedMap);

    // Move to next card
    if (currentIndex < sessionQueue.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 300); // Small delay for transition feel
    } else {
      setSessionComplete(true);
    }
  }, [currentIndex, progressMap, sessionQueue]);

  // Render Dashboard
  if (view === 'home') {
    // Stats
    const totalLearned = Object.values(progressMap).length;
    const dueCount = getDueWords(INITIAL_WORDS.map(w => w.id), progressMap).length;

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center">
             <h1 className="text-5xl font-bold text-slate-900 mb-2">
              Deutsch<span className="text-indigo-600">Meister</span>
            </h1>
            <p className="text-slate-500 text-lg">
              Domina las 2000 palabras más comunes del alemán.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
              <div className="text-3xl font-bold text-indigo-600">{totalLearned}</div>
              <div className="text-sm text-slate-500 uppercase tracking-wider">Palabras Vistas</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
              <div className="text-3xl font-bold text-orange-500">{dueCount}</div>
              <div className="text-sm text-slate-500 uppercase tracking-wider">Pendientes Hoy</div>
            </div>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => startSession('de-es')}
              className="w-full group relative flex items-center justify-between p-6 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-sm transition-all hover:shadow-md hover:border-indigo-300"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">DE</div>
                <div className="text-left">
                  <h3 className="font-bold text-lg text-slate-800 group-hover:text-indigo-700 transition-colors">Alemán → Español</h3>
                  <p className="text-slate-500 text-sm">Practica reconocimiento de vocabulario</p>
                </div>
              </div>
              <div className="text-slate-300 group-hover:text-indigo-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </button>

            <button 
              onClick={() => startSession('es-de')}
              className="w-full group relative flex items-center justify-between p-6 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-sm transition-all hover:shadow-md hover:border-indigo-300"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">ES</div>
                <div className="text-left">
                  <h3 className="font-bold text-lg text-slate-800 group-hover:text-indigo-700 transition-colors">Español → Alemán</h3>
                  <p className="text-slate-500 text-sm">Practica traducción y memoria activa</p>
                </div>
              </div>
              <div className="text-slate-300 group-hover:text-indigo-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </button>
          </div>
          
          {/* Optional: Just informational footer */}
          <div className="text-center text-xs text-slate-400 mt-8">
            Powered by Google Gemini • Spaced Repetition System v1.0
          </div>
        </div>
      </div>
    );
  }

  // Render Study Session
  if (sessionQueue.length === 0 && !sessionComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
         <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Todo listo por hoy!</h2>
         <p className="text-slate-500 mb-8">No tienes palabras pendientes de repaso. ¡Buen trabajo!</p>
         <button 
           onClick={() => setView('home')}
           className="px-6 py-3 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition-colors"
         >
           Volver al Inicio
         </button>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center animate-in fade-in zoom-in duration-300">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100">
           <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10">
               <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
             </svg>
           </div>
           <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Sesión Completada!</h2>
           <p className="text-slate-500 mb-8">Has repasado {sessionQueue.length} palabras. Tu cerebro te lo agradecerá.</p>
           <button 
             onClick={() => setView('home')}
             className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
           >
             Continuar
           </button>
        </div>
      </div>
    );
  }

  const progressPercent = ((currentIndex) / sessionQueue.length) * 100;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-between py-8 px-4">
      
      {/* Header / Progress */}
      <div className="w-full max-w-md space-y-4">
        <div className="flex justify-between items-center px-2">
          <button onClick={() => setView('home')} className="text-slate-400 hover:text-slate-600">
             <span className="sr-only">Cerrar</span>
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
               <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
             </svg>
          </button>
          <span className="text-slate-500 font-medium text-sm tracking-wide">
            {currentIndex + 1} / {sessionQueue.length}
          </span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Flashcard Area */}
      <div className="flex-1 flex items-center justify-center w-full">
        <Flashcard 
          word={sessionQueue[currentIndex]} 
          mode={mode} 
          isFlipped={isFlipped}
          onFlip={() => setIsFlipped(!isFlipped)}
        />
      </div>

      {/* Controls */}
      <div className="w-full max-w-md h-24">
        {isFlipped ? (
          <div className="grid grid-cols-4 gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="flex flex-col gap-1">
               <button 
                onClick={() => handleRate(0)}
                className="h-14 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl font-bold text-sm transition-colors border border-rose-200"
              >
                Olvidé
              </button>
              <span className="text-center text-[10px] text-slate-400 font-medium uppercase">&lt; 1 min</span>
            </div>
            <div className="flex flex-col gap-1">
               <button 
                onClick={() => handleRate(3)}
                className="h-14 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-sm transition-colors border border-slate-300"
              >
                Difícil
              </button>
              <span className="text-center text-[10px] text-slate-400 font-medium uppercase">2 días</span>
            </div>
            <div className="flex flex-col gap-1">
               <button 
                onClick={() => handleRate(4)}
                className="h-14 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-bold text-sm transition-colors border border-blue-200"
              >
                Bien
              </button>
              <span className="text-center text-[10px] text-slate-400 font-medium uppercase">4 días</span>
            </div>
             <div className="flex flex-col gap-1">
               <button 
                onClick={() => handleRate(5)}
                className="h-14 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl font-bold text-sm transition-colors border border-emerald-200"
              >
                Fácil
              </button>
              <span className="text-center text-[10px] text-slate-400 font-medium uppercase">7 días</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center h-full">
             <p className="text-slate-400 text-sm animate-pulse">Toca la tarjeta para ver la respuesta</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
