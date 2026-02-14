import { useCallback, useEffect, useState } from 'react';
import { TauriService } from '../../../services/tauriService';

export const usePromptHistory = () => {
  const [promptHistory, setPromptHistory] = useState<string[]>([]);

  useEffect(() => {
    const loadPromptHistory = async () => {
      try {
        const savedHistory = await TauriService.getStorageValue('drawing-inspo-history');
        if (savedHistory) {
          setPromptHistory(JSON.parse(savedHistory));
        }
      } catch (e) {
        console.error('Failed to load prompt history:', e);
        setPromptHistory([]);
      }
    };
    loadPromptHistory();
  }, []);

  useEffect(() => {
    const savePromptHistory = async () => {
      try {
        await TauriService.setStorageValue('drawing-inspo-history', JSON.stringify(promptHistory));
      } catch (e) {
        console.error('Failed to save prompt history:', e);
      }
    };
    if (promptHistory.length > 0) {
      savePromptHistory();
    }
  }, [promptHistory]);

  const addToHistory = useCallback((prompt: string) => {
    setPromptHistory(prev => {
      const newHistory = [prompt, ...prev.filter(p => p !== prompt)];
      return newHistory.slice(0, 20);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setPromptHistory([]);
  }, []);

  return {
    promptHistory,
    addToHistory,
    clearHistory,
  };
};

