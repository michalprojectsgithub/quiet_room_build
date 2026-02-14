import React, { useState, useCallback, useEffect } from 'react';
import './Inspiration.css';
import { invoke } from '@tauri-apps/api/tauri';
import { CATEGORIES, INSPIRATIONS } from './inspirationData';
import { useInspiration } from './hooks/useInspiration';
import { useSavedPrompts } from './hooks/useSavedPrompts';
import { usePromptHistory } from './hooks/usePromptHistory';
import { useColorPalette } from './hooks/useColorPalette';
import FocusModeButton from './components/FocusModeButton';
import CategoryFilter from './components/CategoryFilter';
import InspirationDisplay from './components/InspirationDisplay';
import ColorPaletteSection from './components/ColorPaletteSection';
import SavedPromptsModal from './components/SavedPromptsModal';
import Warmups from '../Study_room/Warmups';

interface InspirationProps {
  onStartFocusMode: () => void;
  createMoodboardFromInspiration: (prompt: string) => Promise<void>;
  index: number | null;
  setIndex: (index: number | null) => void;
  onPromptChange?: (prompt: string | null) => void;
}

// Sub-tab type
type InspirationSubTab = 'warmups' | 'suggestions';

// Sub-tab configuration
interface SubTabConfig {
  id: InspirationSubTab;
  label: string;
  description: string;
}

const SUB_TABS: SubTabConfig[] = [
  { id: 'warmups', label: 'Warm-ups', description: 'Quick warm-up exercises with timed practice' },
  { id: 'suggestions', label: 'Drawing Suggestions', description: 'Generate prompts and explore palettes' },
];

// Main Inspiration component
const Inspiration: React.FC<InspirationProps> = ({
  onStartFocusMode,
  createMoodboardFromInspiration,
  index,
  setIndex,
  onPromptChange
}) => {
  const [activeSubTab, setActiveSubTab] = useState<InspirationSubTab>('warmups');
  const {
    selectedCategory,
    filteredInspirations,
    roll,
    changeCategory
  } = useInspiration(index, setIndex);

  const {
    savedPrompts,
    showSaved,
    savePrompt,
    removePrompt,
    toggleSaved
  } = useSavedPrompts();

  const {
    promptHistory,
    addToHistory
  } = usePromptHistory();

  const {
    colorPalette,
    showPalette,
    generateColorPalette,
    togglePalette
  } = useColorPalette();

  useEffect(() => {
    if (!onPromptChange) return;
    const prompt = index !== null ? filteredInspirations[index] : null;
    onPromptChange(prompt ?? null);
  }, [index, filteredInspirations, onPromptChange]);

  // History navigation state (index into promptHistory; 0 = most recent)
  const [historyPos, setHistoryPos] = useState<number | null>(null);

  // Handle roll with history tracking
  const handleRoll = useCallback(() => {
    roll();
    setHistoryPos(null);
    if (index !== null) {
      addToHistory(filteredInspirations[index]);
    }
  }, [roll, index, filteredInspirations, addToHistory]);

  // Handle save current prompt
  const handleSaveCurrentPrompt = useCallback(() => {
    if (index === null) return;
    const currentPrompt = filteredInspirations[index];
    savePrompt(currentPrompt);
  }, [index, filteredInspirations, savePrompt]);

  // (Removed) Generate sketch functionality

  // Handle search reference
  const handleSearchReference = useCallback(async () => {
    if (index !== null && filteredInspirations[index]) {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(filteredInspirations[index])}&tbm=isch`;
      try {
        await invoke('open_url_in_chrome', { url: searchUrl });
      } catch (e) {
        // Fallback to default behavior if Tauri command fails or not available
        try {
          window.open(searchUrl, '_blank');
        } catch {
          // ignore
        }
      }
    }
  }, [index, filteredInspirations]);

  // Handle create moodboard
  const handleCreateMoodboard = useCallback(async () => {
    if (index !== null && filteredInspirations[index]) {
      await createMoodboardFromInspiration(filteredInspirations[index]);
    }
  }, [index, filteredInspirations, createMoodboardFromInspiration]);

  // Handle load prompt from history/saved
  const handleLoadPrompt = useCallback((prompt: string) => {
    const promptIndex = INSPIRATIONS.indexOf(prompt);
    if (promptIndex !== -1) {
      setIndex(promptIndex);
    }
  }, [setIndex]);

  // Handle category change
  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    changeCategory(e.target.value);
  }, [changeCategory]);

  // Toggle sections
  const handleToggleSaved = useCallback(() => {
    toggleSaved();
  }, [toggleSaved]);

  // History nav controls
  const canNavPrev = promptHistory.length > 0 && (historyPos === null || historyPos < promptHistory.length - 1);
  const canNavNext = historyPos !== null && historyPos > 0;

  const handleNavPrev = useCallback(() => {
    if (!canNavPrev) return;
    const nextPos = historyPos === null ? 0 : Math.min(historyPos + 1, promptHistory.length - 1);
    setHistoryPos(nextPos);
    const prompt = promptHistory[nextPos];
    if (prompt) handleLoadPrompt(prompt);
  }, [canNavPrev, historyPos, promptHistory, handleLoadPrompt]);

  const handleNavNext = useCallback(() => {
    if (!canNavNext) return;
    const nextPos = Math.max(0, (historyPos as number) - 1);
    setHistoryPos(nextPos);
    const prompt = promptHistory[nextPos];
    if (prompt) handleLoadPrompt(prompt);
  }, [canNavNext, historyPos, promptHistory, handleLoadPrompt]);

  // Create moodboard from arbitrary prompt (used in Saved modal)
  const handleCreateMoodboardFromPrompt = useCallback(async (prompt: string) => {
    if (!prompt) return;
    await createMoodboardFromInspiration(prompt);
  }, [createMoodboardFromInspiration]);

  // Search references for arbitrary prompt (used in Saved modal)
  const handleSearchReferenceForPrompt = useCallback(async (prompt: string) => {
    if (!prompt) return;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(prompt)}&tbm=isch`;
    try {
      await invoke('open_url_in_chrome', { url: searchUrl });
    } catch (e) {
      try { window.open(searchUrl, '_blank'); } catch {}
    }
  }, []);

  // Drawing Suggestions content (the original Inspiration content)
  const DrawingSuggestionsContent = (
    <>
      {/* Top bar: Category + Focus Mode */}
      <div className="inspiration-topbar">
        <CategoryFilter
          selectedCategory={selectedCategory}
          categories={CATEGORIES}
          onCategoryChange={handleCategoryChange}
        />
        <div className="inspiration-topbar-actions">
          <FocusModeButton
            index={index}
            onStartFocusMode={onStartFocusMode}
          />
          <button
            className="inspiration-icon-button"
            onClick={handleToggleSaved}
            title="Saved prompts"
            aria-label="Saved prompts"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 5h16M4 12h16M4 19h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Inspiration Display */}
      <InspirationDisplay
        index={index}
        filteredInspirations={filteredInspirations}
        onSearchReference={handleSearchReference}
        onCreateMoodboard={handleCreateMoodboard}
        onTogglePalette={togglePalette}
        isPaletteActive={showPalette}
        onNavPrev={handleNavPrev}
        onNavNext={handleNavNext}
        canNavPrev={canNavPrev}
        canNavNext={canNavNext}
        onSavePrompt={handleSaveCurrentPrompt}
        isSaved={index !== null ? savedPrompts.includes(filteredInspirations[index]) : false}
      />

      {/* Color Palette Toggle */}
      <ColorPaletteSection
        showPalette={showPalette}
        colorPalette={colorPalette}
        onGeneratePalette={generateColorPalette}
      />

      {/* Primary roll button below prompt/palette */}
      <div className="inspiration-roll-container">
        <button className="inspiration-button inspiration-button-primary-full" onClick={handleRoll}>
          New Inspiration
        </button>
      </div>

      {/* Saved Prompts Section */}
      {showSaved && (
        <SavedPromptsModal
          savedPrompts={savedPrompts}
          onRemovePrompt={removePrompt}
          onClose={() => toggleSaved()}
          onCreateMoodboard={handleCreateMoodboardFromPrompt}
          onSearchReference={handleSearchReferenceForPrompt}
        />
      )}
    </>
  );

  return (
    <>
      <div className="inspiration-header">
        <h2 className="inspiration-header-title">Inspiration Board</h2>
        <p className="inspiration-header-subtitle">
          Warm-up exercises and drawing prompts to spark your creativity.
        </p>
      </div>

      {/* Sub-tabs Navigation */}
      <nav
        className="inspiration-sub-tabs"
        role="tablist"
        aria-label="Inspiration Board sections"
      >
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`inspiration-sub-tab-button ${activeSubTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveSubTab(tab.id)}
            role="tab"
            aria-selected={activeSubTab === tab.id}
            aria-label={`${tab.label} - ${tab.description}`}
            tabIndex={activeSubTab === tab.id ? 0 : -1}
          >
            <span className="inspiration-sub-tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Content Area */}
      <div className="inspiration-content">
        {activeSubTab === 'warmups' && <Warmups />}
        {activeSubTab === 'suggestions' && DrawingSuggestionsContent}
      </div>
    </>
  );
};

export default Inspiration;