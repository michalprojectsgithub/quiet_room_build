// Notes Service - Abstracts data access for Tauri offline functionality
import TauriService from './tauriService';

export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export class NotesService {
  // Get all notes for the current user
  static async getNotes(): Promise<Note[]> {
    return await TauriService.getNotes();
  }

  // Create a new note
  static async createNote(title: string = '', content: string = ''): Promise<Note> {
    return await TauriService.createNote(title, content);
  }

  // Update an existing note
  static async updateNote(id: string, updates: { title?: string; content?: string }): Promise<Note> {
    return await TauriService.updateNote(id, updates.title, updates.content);
  }

  // Delete a note
  static async deleteNote(id: string): Promise<void> {
    return await TauriService.deleteNote(id);
  }
}

// Future Firebase implementation placeholder
export class FirebaseNotesService {
  // TODO: Implement Firebase-specific methods
  // This will replace the HTTP-based service when Firebase is integrated
  
  static async getNotes(): Promise<Note[]> {
    // TODO: Implement Firebase Firestore query
    throw new Error('Firebase implementation not yet available');
  }

  static async createNote(title: string = '', content: string = ''): Promise<Note> {
    // TODO: Implement Firebase Firestore create
    throw new Error('Firebase implementation not yet available');
  }

  static async updateNote(id: string, updates: { title?: string; content?: string }): Promise<Note> {
    // TODO: Implement Firebase Firestore update
    throw new Error('Firebase implementation not yet available');
  }

  static async deleteNote(id: string): Promise<void> {
    // TODO: Implement Firebase Firestore delete
    throw new Error('Firebase implementation not yet available');
  }
}
