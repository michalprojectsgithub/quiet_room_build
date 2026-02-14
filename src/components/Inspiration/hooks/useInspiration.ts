import { useCallback, useMemo, useRef, useState } from 'react';
import { INSPIRATIONS, INSPIRATION_CATEGORIES, nextIndex } from '../inspirationData';

export const useInspiration = (_index: number | null, setIndex: (index: number | null) => void) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const lastRef = useRef<number | null>(null);

  const filteredInspirations = useMemo(() => {
    if (selectedCategory === 'All') {
      return INSPIRATIONS;
    }
    return INSPIRATIONS.filter(prompt => INSPIRATION_CATEGORIES[prompt] === selectedCategory);
  }, [selectedCategory]);

  const roll = useCallback(() => {
    const n = nextIndex(filteredInspirations.length, lastRef.current);
    lastRef.current = n;
    setIndex(n);
  }, [filteredInspirations.length, setIndex]);

  const changeCategory = useCallback((category: string) => {
    setSelectedCategory(category);
    setIndex(null);
  }, [setIndex]);

  return {
    selectedCategory,
    filteredInspirations,
    roll,
    changeCategory,
  };
};

