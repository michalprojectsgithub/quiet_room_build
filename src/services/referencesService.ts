// References Service - Abstracts data access for Tauri offline functionality
import TauriService from './tauriService';

export interface Reference {
  id: string;
  filename: string;
  original_name: string;
  url: string;
  created_at: number;
  location?: string;
  folder_id?: string;
  tags?: string[];
  image_note?: { text: string; updatedAt: number } | null;
  image_source?: { text: string; updatedAt: number } | null;
  rotation?: number;
  crop?: { x: number; y: number; w: number; h: number } | null;
}

export interface Folder {
  id: string;
  name: string;
  created_at: number;
  color?: string;
}

export class ReferencesService {
  // Get all references for the current user
  static async getReferences(): Promise<Reference[]> {
    return await TauriService.getReferences();
  }

  // Get all folders for the current user
  static async getFolders(): Promise<Folder[]> {
    return await TauriService.getFolders();
  }

  // Upload a new reference
  static async uploadReference(file: File, folderId?: string): Promise<Reference> {
    return await TauriService.uploadReference(file, folderId);
  }

  // Get image URL for display
  static async getReferenceUrl(reference: Reference): Promise<string> {
    return await TauriService.getReferenceUrl(reference);
  }

  // Get thumbnail URL for faster display
  static async getReferenceThumbnailUrl(reference: Reference): Promise<string> {
    return await TauriService.getReferenceThumbnailUrl(reference);
  }

  // Delete a reference
  static async deleteReference(id: string): Promise<void> {
    return await TauriService.deleteReference(id);
  }

  // Rotation
  static async setRotation(referenceId: string, rotation: number): Promise<Reference> {
    return await TauriService.setReferenceRotation(referenceId, rotation);
  }

  // Crop (non-destructive; affects display only)
  static async setCrop(referenceId: string, crop: { x: number; y: number; w: number; h: number } | null): Promise<Reference> {
    return await TauriService.setReferenceCrop(referenceId, crop);
  }

  // Tags helpers
  static async addTag(referenceId: string, tag: string): Promise<Reference> {
    return await TauriService.addTagToReference(referenceId, tag);
  }

  static async removeTag(referenceId: string, tag: string): Promise<Reference> {
    return await TauriService.removeTagFromReference(referenceId, tag);
  }

  static async setTags(referenceId: string, tags: string[]): Promise<Reference> {
    return await TauriService.setTagsForReference(referenceId, tags);
  }

  static async listTags(): Promise<string[]> {
    return await TauriService.listAllTags();
  }

  static async listCustomTags(): Promise<string[]> {
    return await TauriService.listCustomTags();
  }

  static async createCustomTag(name: string): Promise<string[]> {
    return await TauriService.createCustomTag(name);
  }

  static async deleteTagEverywhere(name: string): Promise<void> {
    return await TauriService.deleteTagEverywhere(name);
  }

  static async renameTagEverywhere(oldName: string, newName: string): Promise<void> {
    return await TauriService.renameTagEverywhere(oldName, newName);
  }

  // Image notes
  static async setImageNote(referenceId: string, text: string): Promise<Reference> {
    return await TauriService.setImageNote(referenceId, text);
  }

  static async deleteImageNote(referenceId: string): Promise<Reference> {
    return await TauriService.deleteImageNote(referenceId);
  }

  static async setImageSource(referenceId: string, text: string): Promise<Reference> {
    return await TauriService.setImageSource(referenceId, text);
  }

  static async deleteImageSource(referenceId: string): Promise<Reference> {
    return await TauriService.deleteImageSource(referenceId);
  }

  // TODO: Implement folder management methods
  // These will need to be added to the Rust backend first
  
  // static async getFolders(): Promise<Folder[]> {
  //   return await TauriService.getFolders();
  // }

  // static async createFolder(name: string): Promise<Folder> {
  //   return await TauriService.createFolder(name);
  // }

  // static async deleteFolder(id: string): Promise<void> {
  //   return await TauriService.deleteFolder(id);
  // }

  // static async moveReferenceToFolder(referenceId: string, folderId: string): Promise<void> {
  //   return await TauriService.moveReferenceToFolder(referenceId, folderId);
  // }
}

export default ReferencesService;
