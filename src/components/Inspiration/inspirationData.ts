import promptsData from './prompts.json';

export interface PromptsData {
  categories: { [key: string]: string };
  promptsByCategory: { [key: string]: string[] };
}

const data = promptsData as PromptsData;

export const CATEGORIES = data.categories;
export const PROMPTS_BY_CATEGORY = data.promptsByCategory;

export const INSPIRATIONS: string[] = [];
export const INSPIRATION_CATEGORIES: { [key: string]: string } = {};

Object.entries(PROMPTS_BY_CATEGORY).forEach(([category, prompts]) => {
  prompts.forEach(prompt => {
    INSPIRATIONS.push(prompt);
    INSPIRATION_CATEGORIES[prompt] = category;
  });
});

export function nextIndex(len: number, last: number | null): number {
  if (len <= 1) return 0;
  let i = Math.floor(Math.random() * len);
  if (i === last) i = (i + 1) % len;
  return i;
}

