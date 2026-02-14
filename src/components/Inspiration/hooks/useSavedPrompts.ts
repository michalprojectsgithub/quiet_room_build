import { useCallback, useEffect, useState } from 'react';
import { TauriService } from '../../../services/tauriService';

export const useSavedPrompts = () => {
  const [savedPrompts, setSavedPrompts] = useState<string[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    const loadSavedPrompts = async () => {
      try {
        const saved = await TauriService.getStorageValue('drawing-inspo-saved');
        if (saved) {
          setSavedPrompts(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load saved prompts:', e);
        setSavedPrompts([]);
      }
    };
    loadSavedPrompts();
  }, []);

  useEffect(() => {
    const saveSavedPrompts = async () => {
      try {
        await TauriService.setStorageValue('drawing-inspo-saved', JSON.stringify(savedPrompts));
      } catch (e) {
        console.error('Failed to save prompts:', e);
      }
    };
    if (savedPrompts.length > 0) {
      saveSavedPrompts();
    }
  }, [savedPrompts]);

  const savePrompt = useCallback((prompt: string) => {
    if (!savedPrompts.includes(prompt)) {
      setSavedPrompts(prev => [...prev, prompt]);
    }
  }, [savedPrompts]);

  const removePrompt = useCallback((promptToRemove: string) => {
    setSavedPrompts(prev => prev.filter(prompt => prompt !== promptToRemove));
  }, []);

  const toggleSaved = useCallback(() => {
    setShowSaved(prev => !prev);
  }, []);

  return {
    savedPrompts,
    showSaved,
    savePrompt,
    removePrompt,
    toggleSaved,
  };
};

