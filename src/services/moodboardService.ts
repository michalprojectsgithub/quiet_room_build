// Moodboard Service - Abstracts data access for Tauri offline functionality
import TauriService from './tauriService';

// Raw interfaces matching the Rust backend
interface RawMoodboard {
  id: string;
  title: string;
  items: RawMoodboardItem[];
  createdAt: number;
  updatedAt?: number;
}

interface RawMoodboardItem {
  id: string;
  type: string; // Raw string from Rust backend
  content?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt?: number;
  filename?: string;
  url?: string;
  originalWidth?: number;
  originalHeight?: number;
  aspectRatio?: number;
  isWebp?: boolean;
  colors?: string[];
  fontSize?: number;
  color?: string;
  originalName?: string;
}

// Clean interfaces for frontend use
export interface Moodboard {
  id: string;
  title: string;
  items: MoodboardItem[];
  createdAt: number;
  updatedAt?: number;
}

export interface MoodboardItem {
  id: string;
  type: 'image' | 'text' | 'color';
  content?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt?: number;
  filename?: string;
  url?: string;
  originalWidth?: number;
  originalHeight?: number;
  aspectRatio?: number;
  isWebp?: boolean;
  colors?: string[];
  fontSize?: number;
  color?: string;
  originalName?: string;
}

export class MoodboardService {
  // Get all moodboards for the current user
  static async getMoodboards(): Promise<Moodboard[]> {
    const rawMoodboards: RawMoodboard[] = await TauriService.getMoodboards();
    
    // Convert the raw data to ensure type safety
    return rawMoodboards.map(moodboard => ({
      ...moodboard,
      items: moodboard.items.map(item => ({
        ...item,
        type: this.validateItemType(item.type)
      }))
    }));
  }

  // Validate and convert item type from string to union type
  private static validateItemType(type: string): 'image' | 'text' | 'color' {
    if (type === 'image' || type === 'text' || type === 'color') {
      return type;
    }
    // Default to 'text' if type is invalid
    console.warn(`Invalid moodboard item type: ${type}, defaulting to 'text'`);
    return 'text';
  }

  // Create a new moodboard
  static async createMoodboard(title: string): Promise<Moodboard> {
    const rawMoodboard: RawMoodboard = await TauriService.createMoodboard(title);
    
    // Convert the raw data to ensure type safety
    return {
      ...rawMoodboard,
      items: rawMoodboard.items.map(item => ({
        ...item,
        type: this.validateItemType(item.type)
      }))
    };
  }

  // Update an existing moodboard
  static async updateMoodboard(moodboardId: string, title: string, items: MoodboardItem[]): Promise<Moodboard> {
    // Convert frontend items to raw format for backend
    const rawItems: RawMoodboardItem[] = items.map(item => ({
      ...item,
      type: item.type // Already validated as union type
    }));
    
    const rawMoodboard: RawMoodboard = await TauriService.updateMoodboard(moodboardId, title, rawItems);
    
    // Convert the raw data back to frontend format
    return {
      ...rawMoodboard,
      items: rawMoodboard.items.map(item => ({
        ...item,
        type: this.validateItemType(item.type)
      }))
    };
  }

  // Delete a moodboard
  static async deleteMoodboard(id: string): Promise<void> {
    return await TauriService.deleteMoodboard(id);
  }

  // Update a specific moodboard item (for performance optimization)
  static async updateMoodboardItem(
    moodboardId: string,
    itemId: string,
    x?: number,
    y?: number,
    width?: number,
    height?: number
  ): Promise<Moodboard> {
    const rawMoodboard: RawMoodboard = await TauriService.updateMoodboardItem(
      moodboardId,
      itemId,
      x,
      y,
      width,
      height
    );
    
    // Convert the raw data to ensure type safety
    return {
      ...rawMoodboard,
      items: rawMoodboard.items.map(item => ({
        ...item,
        type: this.validateItemType(item.type)
      }))
    };
  }
}

export default MoodboardService;
