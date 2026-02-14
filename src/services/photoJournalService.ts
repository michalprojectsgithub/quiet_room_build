// Photo Journal Service - Abstracts data access for Tauri offline functionality
import TauriService from './tauriService';

export interface PhotoJournalImage {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  uploadDate: string;
  size: number;
  mimetype: string;
  prompt?: string;
  referenceId?: string | null;
  rotation?: number;
}

export class PhotoJournalService {
  // Get all photo journal images for the current user
  static async getImages(): Promise<PhotoJournalImage[]> {
    return await TauriService.getPhotoJournalImages();
  }

  // Upload a new image
  static async uploadImage(file: File, prompt?: string): Promise<PhotoJournalImage> {
    return await TauriService.uploadPhotoJournalImage(file, prompt);
  }

  // Delete an image
  static async deleteImage(id: string): Promise<void> {
    return await TauriService.deletePhotoJournalImage(id);
  }

  static async setRotation(id: string, rotation: number): Promise<PhotoJournalImage> {
    return await TauriService.setPhotoJournalRotation(id, rotation);
  }

  // Get image URL for display
  static async getImageUrl(image: PhotoJournalImage): Promise<string> {
    return await TauriService.getPhotoJournalImageUrl(image);
  }

  // Get thumbnail URL for display
  static async getThumbnailUrl(image: PhotoJournalImage): Promise<string> {
    return await TauriService.getPhotoJournalThumbnailUrl(image);
  }

  // Clear all thumbnails (useful for fixing orientation issues)
  static async clearThumbnails(): Promise<void> {
    return await TauriService.clearPhotoJournalThumbnails();
  }

  // Link a photo journal image to a reference by id
  static async linkReference(photoId: string, referenceId: string): Promise<void> {
    return await TauriService.linkPhotoJournalReference(photoId, referenceId);
  }

  // Unlink a photo journal image reference
  static async unlinkReference(photoId: string): Promise<void> {
    return await TauriService.unlinkPhotoJournalReference(photoId);
  }
}

// Future Firebase implementation placeholder
export class FirebasePhotoJournalService {
  // TODO: Implement Firebase-specific methods
  // This will replace the HTTP-based service when Firebase is integrated
  
  static async getImages(): Promise<PhotoJournalImage[]> {
    // TODO: Implement Firebase Firestore query
    throw new Error('Firebase implementation not yet available');
  }

  static async uploadImage(file: File, prompt?: string): Promise<PhotoJournalImage> {
    // TODO: Implement Firebase Storage upload + Firestore create
    throw new Error('Firebase implementation not yet available');
  }

  static async deleteImage(id: string): Promise<void> {
    // TODO: Implement Firebase Storage delete + Firestore delete
    throw new Error('Firebase implementation not yet available');
  }

  static getImageUrl(image: PhotoJournalImage): string {
    // TODO: Return Firebase Storage URL
    throw new Error('Firebase implementation not yet available');
  }
}
