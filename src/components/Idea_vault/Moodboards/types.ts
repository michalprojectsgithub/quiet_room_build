// Moodboard Types - Re-export from service for consistency
export type { Moodboard, MoodboardItem } from '../../../../services/moodboardService';

export interface MoodboardEditorProps {
  moodboard: import('../../../../services/moodboardService').Moodboard | null;
  isOpen: boolean;
  onClose: () => void;
  API_BASE: string;
  onMoodboardUpdate: (updatedMoodboard: import('../../../../services/moodboardService').Moodboard) => void;
}
