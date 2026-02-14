import { useState, useEffect } from 'react';
import './App.css';
import Inspiration from './components/Inspiration/Inspiration';
import Focus_mode from './components/Inspiration/Focus_mode';
import Photo_journal from './components/Photo_journal/Photo_journal';
import Idea_vault from './components/Idea_vault/Idea_vault';
import TabNavigation from './components/TabNavigation/TabNavigation';
import TauriService from './services/tauriService';
import Study_room from './components/Study_room/Study_room';

function App() {
  const [activeTab, setActiveTab] = useState<'inspiration' | 'gallery' | 'ideaVault' | 'studyRoom'>('inspiration');
  const [index, setIndex] = useState<number | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [isTauri, setIsTauri] = useState(false);
  const [moodboardsRefreshToken, setMoodboardsRefreshToken] = useState(0);

  // Check if running in Tauri
  useEffect(() => {
    const checkTauri = async () => {
      try {
        await TauriService.ping();
        setIsTauri(true);
        console.log('Running in Tauri mode');
      } catch (error) {
        setIsTauri(false);
        console.log('Running in web mode');
      }
    };
    checkTauri();
  }, []);

  // Always reset scroll when changing top-level tabs
  useEffect(() => {
    // rAF ensures we scroll after the new tab content becomes visible
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }, [activeTab]);

  // Focus mode function
  const startFocusMode = () => {
    if (!currentPrompt) return;
    setFocusMode(true);
  };

  // Create moodboard from inspiration
  const createMoodboardFromInspiration = async (prompt: string) => {
    console.log('Creating moodboard with title:', prompt);
    try {
      if (isTauri) {
        await TauriService.createMoodboard(prompt);
        setMoodboardsRefreshToken((v) => v + 1);
        setActiveTab('ideaVault');
      } else {
        // Fallback to web mode (if needed)
        console.log('Web mode moodboard creation not available');
      }
    } catch (error) {
      console.error('Error creating moodboard:', error);
    }
  };

  // Exit focus mode
  const exitFocusMode = () => {
    setFocusMode(false);
  };

  // Render focus mode if active
  if (focusMode) {
    const focusPrompt = currentPrompt ? [currentPrompt] : [];
    const focusIndex = currentPrompt ? 0 : null;
    return (
      <Focus_mode
        focusMode={focusMode}
        index={focusIndex}
        filteredInspirations={focusPrompt}
        onExitFocusMode={exitFocusMode}
      />
    );
  }

  return (
    <main className="app-container">
      <TabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      {/* Tab Content */}
      <div className={`tab-content ${activeTab === 'inspiration' ? 'active' : ''}`}>
        <Inspiration
          onStartFocusMode={startFocusMode}
          createMoodboardFromInspiration={createMoodboardFromInspiration}
          index={index}
          setIndex={setIndex}
          onPromptChange={setCurrentPrompt}
        />
      </div>

      <div className={`tab-content ${activeTab === 'gallery' ? 'active' : ''}`}>
        <Photo_journal />
      </div>

      <div className={`tab-content ${activeTab === 'ideaVault' ? 'active' : ''}`}>
        <Idea_vault 
          API_BASE={isTauri ? "tauri://localhost" : "http://127.0.0.1:8787"}
          moodboardsRefreshToken={moodboardsRefreshToken}
        />
      </div>

      <div className={`tab-content ${activeTab === 'studyRoom' ? 'active' : ''}`}>
        <Study_room />
      </div>
    </main>
  );
}

export default App;
