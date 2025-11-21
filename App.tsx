import React, { useState, useEffect, useCallback } from 'react';
import { INITIAL_WORDS } from './constants';
import { Word, StudyMode, UserProgress } from './types';
import { calculateNextReview, getDueWords, getStats } from './services/srsService';
import { loadProgress, saveProgress, getBackupCode, restoreFromBackup } from './services/storageService';
import { Flashcard } from './components/Flashcard';

// Main Application
const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // App State
  const [view, setView] = useState<'home' | 'study' | 'mastered'>('home');
  const [mode, setMode] = useState<StudyMode>('de-es');
  const [progressMap, setProgressMap] = useState<Record<string, UserProgress>>({});
  const [sessionQueue, setSessionQueue] = useState<Word[]>([]);
  
  // Session State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  // Sync/Modal State
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncMode, setSyncMode] = useState<'export' | 'import'>('export');
  const [backupString, setBackupString] = useState('');
  const [importString, setImportString] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  // Load data on mount
  useEffect(() => {
    // Check for persistent login
    const authSession = localStorage.getItem('dm_session');
    if (authSession === 'active') {
      setIsAuthenticated(true);
    }

    // Load progress
    const saved = loadProgress();
    setProgressMap(saved);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Hardcoded credentials as requested
    if (usernameInput.trim().toLowerCase() === 'oscar' && passwordInput === 'password') {
      setIsAuthenticated(true);
      localStorage.setItem('dm_session', 'active'); // Persist session
      setLoginError('');
    } else {
      setLoginError('Usuario o contraseña incorrectos');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dm_session');
    setIsAuthenticated(false);
    setView('home');
    setUsernameInput('');
    setPasswordInput('');
  };

  // Start a session
  const startSession = (selectedMode: StudyMode) => {
    setMode(selectedMode);
    
    // Calculate Due Words using the new Active Pool logic
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

  // Sync Logic
  const openSyncModal = () => {
    setBackupString(getBackupCode());
    setImportString('');
    setSyncMode('export');
    setCopyStatus('idle');
    setShowSyncModal(true);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(backupString);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleImportCode = () => {
    if (!importString.trim()) return;
    
    const success = restoreFromBackup(importString);
    if (success) {
      setProgressMap(loadProgress());
      setShowSyncModal(false);
      alert("¡Progreso restaurado correctamente!");
    } else {
      alert("El código no es válido. Por favor verifica que lo has copiado correctamente.");
    }
  };

  // --- AUTHENTICATION VIEW ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-800">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900">
              Deutsch<span className="text-indigo-600">Meister</span>
            </h1>
            <p className="text-slate-500 text-sm mt-2">Acceso Restringido</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
              <input 
                type="text" 
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="Introduce tu usuario"
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input 
                type="password" 
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-lg border border-rose-100 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {loginError}
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-200"
            >
              Entrar
            </button>
          </form>
          <div className="mt-6 text-center text-xs text-slate-400">
            Solo personal autorizado
          </div>
        </div>
      </div>
    );
  }

  // --- MASTERED WORDS VIEW ---
  if (view === 'mastered') {
    const masteredWords = INITIAL_WORDS.filter(w => (progressMap[w.id]?.easyCounter || 0) >= 10);

    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Palabras Maestras</h1>
              <p className="text-slate-500">Vocabulario que has dominado (10+ veces fácil)</p>
            </div>
            <button 
              onClick={() => setView('home')}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-medium shadow-sm"
            >
              Volver
            </button>
          </div>

          {masteredWords.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="text-slate-300 mb-4">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-700">Aún no hay palabras maestras</h3>
              <p className="text-slate-500 mt-2 max-w-md mx-auto">
                Sigue practicando. Cuando marques una palabra como "Fácil" 10 veces, aparecerá en esta lista de honor.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {masteredWords.map(word => (
                <div key={word.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wide">
                      Masterizado
                    </span>
                    <span className="text-xs text-slate-400 uppercase font-semibold">{word.type}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{word.german}</h3>
                  {word.gender && <p className="text-indigo-500 text-sm font-medium mb-1">{word.gender}</p>}
                  <div className="h-px bg-slate-100 my-2"></div>
                  <p className="text-slate-600">{word.spanish}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD ---
  if (view === 'home') {
    // Stats
    const stats = getStats(progressMap);
    const dueCount = getDueWords(INITIAL_WORDS.map(w => w.id), progressMap).length;

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative">
        
        {/* Top Bar */}
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center">
           <div className="flex items-center gap-4">
             <div className="text-xs text-slate-400 pl-2">Usuario: <span className="font-bold text-slate-600">Oscar</span></div>
             <button onClick={handleLogout} className="text-xs text-rose-400 hover:text-rose-600 underline">Salir</button>
           </div>
           <button 
             onClick={openSyncModal}
             className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
           >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
               <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
             </svg>
             Sincronizar / Backup
           </button>
        </div>

        {/* Sync Modal */}
        {showSyncModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="flex border-b border-slate-100">
                <button 
                  onClick={() => setSyncMode('export')}
                  className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${syncMode === 'export' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  Exportar (Copiar)
                </button>
                <button 
                  onClick={() => setSyncMode('import')}
                  className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${syncMode === 'import' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  Importar (Pegar)
                </button>
              </div>
              
              <div className="p-6">
                {syncMode === 'export' ? (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                      Copia este código y pégalo en tu otro dispositivo para transferir tu progreso actual.
                    </p>
                    <div className="relative">
                      <textarea 
                        readOnly
                        value={backupString}
                        className="w-full h-32 p-3 bg-slate-100 text-slate-600 font-mono text-xs rounded-lg border border-slate-200 focus:outline-none resize-none"
                      />
                    </div>
                    <button 
                      onClick={handleCopyCode}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      {copyStatus === 'copied' ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          ¡Copiado!
                        </>
                      ) : (
                         "Copiar Código"
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                      Pega aquí el código que generaste en tu otro dispositivo. <br/>
                      <span className="text-rose-500 font-bold">Advertencia:</span> Esto sobrescribirá tu progreso actual en este dispositivo.
                    </p>
                    <textarea 
                      value={importString}
                      onChange={(e) => setImportString(e.target.value)}
                      placeholder="Pega el código aquí..."
                      className="w-full h-32 p-3 bg-white text-slate-800 font-mono text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none resize-none"
                    />
                    <button 
                      onClick={handleImportCode}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors"
                    >
                      Restaurar Progreso
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                <button 
                  onClick={() => setShowSyncModal(false)}
                  className="text-slate-500 text-sm hover:text-slate-800 font-medium"
                >
                  Cancelar / Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-2xl w-full space-y-8 mt-12">
          <div className="text-center">
             <h1 className="text-5xl font-bold text-slate-900 mb-2">
              Deutsch<span className="text-indigo-600">Meister</span>
            </h1>
            <p className="text-slate-500 text-lg">
              Domina las 2000 palabras más comunes del alemán.
            </p>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => setView('mastered')}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center relative overflow-hidden cursor-pointer hover:shadow-md hover:border-emerald-300 transition-all group"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
              <div className="text-3xl font-bold text-emerald-600 group-hover:scale-110 transition-transform">{stats.mastered}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1 group-hover:text-emerald-600">Maestras (Ver)</div>
            </button>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
               <div className="text-3xl font-bold text-indigo-600">
                 {stats.active} <span className="text-lg text-slate-400 font-normal">/ {stats.poolLimit}</span>
               </div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Pool Activo</div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-orange-500"></div>
              <div className="text-3xl font-bold text-orange-500">{dueCount}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Repaso Hoy</div>
            </div>
          </div>

          {/* Description of the system */}
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-indigo-900 text-sm text-center">
             <p>
               <strong>Sistema de Aprendizaje Activo:</strong> Tienes un máximo de <strong>50 palabras</strong> en rotación. 
               Una palabra se considera "Maestra" y libera su espacio cuando la marcas como 
               <span className="inline-flex items-center px-2 py-0.5 mx-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                 Fácil
               </span> 
               <strong>10 veces</strong>.
             </p>
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
          
          <div className="text-center text-xs text-slate-400 mt-8">
            Powered by Google Gemini • Active Pool Strategy v2.0
          </div>
        </div>
      </div>
    );
  }

  // --- STUDY SESSION VIEW ---
  if (sessionQueue.length === 0 && !sessionComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
         <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Todo listo por hoy!</h2>
         <p className="text-slate-500 mb-8">No tienes palabras pendientes ni huecos libres en tu pool de aprendizaje.</p>
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
           <p className="text-slate-500 mb-8">Has repasado {sessionQueue.length} palabras.</p>
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
  const currentWordProgress = progressMap[sessionQueue[currentIndex].id];
  const easyCount = currentWordProgress?.easyCounter || 0;

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
          <div className="flex items-center gap-2">
             <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                Mastery: {easyCount}/10
             </span>
             <span className="text-slate-500 font-medium text-sm tracking-wide">
               {currentIndex + 1} / {sessionQueue.length}
             </span>
          </div>
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
              <span className="text-center text-[10px] text-slate-400 font-medium uppercase">1 min</span>
            </div>
            <div className="flex flex-col gap-1">
               <button 
                onClick={() => handleRate(3)}
                className="h-14 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-sm transition-colors border border-slate-300"
              >
                Difícil
              </button>
              <span className="text-center text-[10px] text-slate-400 font-medium uppercase">5 min</span>
            </div>
            <div className="flex flex-col gap-1">
               <button 
                onClick={() => handleRate(4)}
                className="h-14 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-bold text-sm transition-colors border border-blue-200"
              >
                Bien
              </button>
              <span className="text-center text-[10px] text-slate-400 font-medium uppercase">20 min</span>
            </div>
             <div className="flex flex-col gap-1">
               <button 
                onClick={() => handleRate(5)}
                className="h-14 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl font-bold text-sm transition-colors border border-emerald-200"
              >
                Fácil
              </button>
              <span className="text-center text-[10px] text-slate-400 font-medium uppercase">1 día (+1pt)</span>
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