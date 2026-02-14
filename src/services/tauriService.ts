import { invoke } from '@tauri-apps/api/tauri';

// Types
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

export interface ScannedImage {
  filename: string;
  data_base64: string;
  mime: string;
}

export interface ScannerInfo {
  id: string;
  name: string;
}

export interface Reference {
  id: string;
  filename: string;
  original_name: string;
  url: string;
  created_at: number;
  location?: string;
  folder_id?: string;
  tags?: string[];
  image_note?: ImageNote | null;
  rotation?: number;
  crop?: { x: number; y: number; w: number; h: number } | null;
}

export interface ImageNote {
  text: string;
  updatedAt: number;
}

export interface ImageSource {
  text: string;
  updatedAt: number;
}

export interface Folder {
  id: string;
  name: string;
  created_at: number;
  color?: string;
  physicalPath?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export interface Moodboard {
  id: string;
  title: string;
  items: MoodboardItem[];
  created_at: number;
  updated_at: number;
}

export interface MoodboardItem {
  id: string;
  item_type: string;
  content?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  created_at?: number;
  filename?: string;
  url?: string;
  original_width?: number;
  original_height?: number;
  aspect_ratio?: number;
  is_webp?: boolean;
  colors?: string[];
}

export interface PhoneUploadStatus {
  enabled: boolean;
  expires_at: number;
}

export interface PhoneUploadInfo {
  port: number;
  urls: string[];
  preferred_url: string;
  interfaces: Array<{
    name: string;
    ip: string;
    url: string;
    is_loopback: boolean;
    is_private: boolean;
    is_link_local: boolean;
    is_virtual: boolean;
  }>;
}

// Tauri Service Class
export class TauriService {
  // Photo Journal Methods
  static async getPhotoJournalImages(): Promise<PhotoJournalImage[]> {
    try {
      return await invoke('get_photo_journal_images');
    } catch (error) {
      console.error('Failed to get photo journal images:', error);
      throw error;
    }
  }

  static async uploadPhotoJournalImage(
    file: File,
    prompt?: string
  ): Promise<PhotoJournalImage> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = Array.from(new Uint8Array(arrayBuffer));
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const extension = file.name.split('.').pop() || 'jpg';
      const filename = `${timestamp}-${randomId}.${extension}`;

      // Build args and include prompt only if defined
      const args: Record<string, any> = {
        filename,
        // Provide both keys to satisfy TAURI arg parsing
        original_name: file.name,
        originalName: file.name,
        data
      };
      if (typeof prompt === 'string') {
        args.prompt = prompt;
      }

      return await invoke('upload_photo_journal_image', args);
    } catch (error) {
      console.error('Failed to upload photo journal image:', error);
      throw error;
    }
  }

  static async getPhoneUploadStatus(): Promise<PhoneUploadStatus> {
    try {
      return await invoke('phone_upload_status');
    } catch (error) {
      console.error('Failed to get phone upload status:', error);
      throw error;
    }
  }

  static async setPhoneUploadEnabled(
    enabled: boolean,
    durationMs?: number
  ): Promise<PhoneUploadStatus> {
    try {
      return await invoke('phone_upload_toggle', {
        enabled,
        duration_ms: durationMs ?? null
      });
    } catch (error) {
      console.error('Failed to update phone upload status:', error);
      throw error;
    }
  }

  static async getPhoneUploadInfo(): Promise<PhoneUploadInfo> {
    try {
      return await invoke('phone_upload_info');
    } catch (error) {
      console.error('Failed to get phone upload info:', error);
      throw error;
    }
  }

  static async deletePhotoJournalImage(id: string): Promise<void> {
    try {
      await invoke('delete_photo_journal_image', { id });
    } catch (error) {
      console.error('Failed to delete photo journal image:', error);
      throw error;
    }
  }

  static async setPhotoJournalRotation(id: string, rotation: number): Promise<PhotoJournalImage> {
    try {
      return await invoke('set_photo_journal_rotation', { id, rotation });
    } catch (error) {
      console.error('Failed to set photo journal rotation:', error);
      throw error;
    }
  }

  // Scan artwork via connected scanner (Windows-only backend). Returns scanned images.
  static async scanArtwork(): Promise<ScannedImage[]> {
    try {
      return await invoke('scan_artwork');
    } catch (error) {
      console.error('Failed to scan artwork:', error);
      throw error;
    }
  }

  static async listScanners(): Promise<ScannerInfo[]> {
    try {
      return await invoke('list_scanners');
    } catch (error) {
      console.error('Failed to list scanners:', error);
      throw error;
    }
  }

  static async scanWithDevice(
    deviceId: string,
    pageSize?: 'A4' | 'A5',
    dpi?: number
  ): Promise<ScannedImage> {
    try {
      return await invoke('scan_with_device', { deviceId, pageSize, dpi });
    } catch (error) {
      console.error('Failed to scan with device:', error);
      throw error;
    }
  }

  static async linkPhotoJournalReference(photoId: string, referenceId: string): Promise<void> {
    try {
      await invoke('link_photo_journal_reference', { photoId, referenceId });
    } catch (error) {
      console.error('Failed to link photo journal reference:', error);
      throw error;
    }
  }

  static async unlinkPhotoJournalReference(photoId: string): Promise<void> {
    try {
      await invoke('unlink_photo_journal_reference', { photoId });
    } catch (error) {
      console.error('Failed to unlink photo journal reference:', error);
      throw error;
    }
  }

  // References Methods
  static async getReferences(): Promise<Reference[]> {
    try {
      return await invoke('get_references');
    } catch (error) {
      console.error('Failed to get references:', error);
      throw error;
    }
  }

  static async deleteReference(id: string): Promise<void> {
    try {
      return await invoke('delete_reference', { id });
    } catch (error) {
      console.error('Failed to delete reference:', error);
      throw error;
    }
  }

  // Tags methods
  static async addTagToReference(referenceId: string, tag: string): Promise<Reference> {
    try {
      return await invoke('add_tag_to_reference', { reference_id: referenceId, referenceId, tag });
    } catch (error) {
      console.error('Failed to add tag to reference:', error);
      throw error;
    }
  }

  static async removeTagFromReference(referenceId: string, tag: string): Promise<Reference> {
    try {
      return await invoke('remove_tag_from_reference', { reference_id: referenceId, referenceId, tag });
    } catch (error) {
      console.error('Failed to remove tag from reference:', error);
      throw error;
    }
  }

  static async setTagsForReference(referenceId: string, tags: string[]): Promise<Reference> {
    try {
      return await invoke('set_tags_for_reference', { reference_id: referenceId, referenceId, tags });
    } catch (error) {
      console.error('Failed to set tags for reference:', error);
      throw error;
    }
  }

  static async listAllTags(): Promise<string[]> {
    try {
      return await invoke('list_all_tags');
    } catch (error) {
      console.error('Failed to list tags:', error);
      throw error;
    }
  }

  static async listCustomTags(): Promise<string[]> {
    try {
      return await invoke('list_custom_tags');
    } catch (error) {
      console.error('Failed to list custom tags:', error);
      throw error;
    }
  }

  static async createCustomTag(name: string): Promise<string[]> {
    try {
      return await invoke('create_custom_tag', { name });
    } catch (error) {
      console.error('Failed to create custom tag:', error);
      throw error;
    }
  }

  static async deleteTagEverywhere(name: string): Promise<void> {
    try {
      await invoke('delete_tag_everywhere', { name });
    } catch (error) {
      console.error('Failed to delete tag everywhere:', error);
      throw error;
    }
  }

  static async renameTagEverywhere(oldName: string, newName: string): Promise<void> {
    try {
      await invoke('rename_tag_everywhere', { oldName, newName });
    } catch (error) {
      console.error('Failed to rename tag everywhere:', error);
      throw error;
    }
  }

  static async moveReference(referenceId: string, targetFolderId: string): Promise<Reference> {
    try {
      return await invoke('move_reference', { 
        referenceId, 
        targetFolderId 
      });
    } catch (error) {
      console.error('Failed to move reference:', error);
      throw error;
    }
  }

  static async setReferenceRotation(referenceId: string, rotation: number): Promise<Reference> {
    try {
      return await invoke('set_reference_rotation', {
        referenceId,
        reference_id: referenceId,
        rotation
      });
    } catch (error) {
      console.error('Failed to set reference rotation:', error);
      throw error;
    }
  }

  static async setReferenceCrop(referenceId: string, crop: { x: number; y: number; w: number; h: number } | null): Promise<Reference> {
    try {
      return await invoke('set_reference_crop', {
        referenceId,
        reference_id: referenceId,
        crop
      });
    } catch (error) {
      console.error('Failed to set reference crop:', error);
      throw error;
    }
  }

  // Image notes
  static async setImageNote(referenceId: string, text: string): Promise<Reference> {
    try {
      return await invoke('set_image_note', { referenceId, reference_id: referenceId, text });
    } catch (error) {
      console.error('Failed to set image note:', error);
      throw error;
    }
  }

  static async deleteImageNote(referenceId: string): Promise<Reference> {
    try {
      return await invoke('delete_image_note', { referenceId, reference_id: referenceId });
    } catch (error) {
      console.error('Failed to delete image note:', error);
      throw error;
    }
  }

  static async setImageSource(referenceId: string, text: string): Promise<Reference> {
    try {
      return await invoke('set_image_source', { referenceId, reference_id: referenceId, text });
    } catch (error) {
      console.error('Failed to set image source:', error);
      throw error;
    }
  }

  static async deleteImageSource(referenceId: string): Promise<Reference> {
    try {
      return await invoke('delete_image_source', { referenceId, reference_id: referenceId });
    } catch (error) {
      console.error('Failed to delete image source:', error);
      throw error;
    }
  }

  static async uploadReference(
    file: File,
    folderId?: string
  ): Promise<Reference> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = Array.from(new Uint8Array(arrayBuffer));
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const extension = file.name.split('.').pop() || 'jpg';
      const filename = `${timestamp}-${randomId}.${extension}`;

      // Provide both snake_case and camelCase keys for maximum compatibility
      // and ensure Option<String> receives null explicitly when not provided.
      return await invoke('upload_reference', {
        filename,
        original_name: file.name,
        originalName: file.name,
        data,
        folder_id: folderId ?? null,
        folderId: folderId ?? null
      });
    } catch (error) {
      console.error('Failed to upload reference:', error);
      throw error;
    }
  }

  // Notes Methods
  static async getNotes(): Promise<Note[]> {
    try {
      return await invoke('get_notes');
    } catch (error) {
      console.error('Failed to get notes:', error);
      throw error;
    }
  }

  // Moodboards Methods
  // static async getMoodboards(): Promise<Moodboard[]> {
  //   try {
  //     return await invoke('get_moodboards');
  //   } catch (error) {
  //     console.error('Failed to get moodboards:', error);
  //     throw error;
  //   }
  // }

  // Folders Methods
  static async getFolders(): Promise<Folder[]> {
    try {
      return await invoke('get_folders');
    } catch (error) {
      console.error('Failed to get folders:', error);
      throw error;
    }
  }

  static async createNote(title: string, content: string): Promise<Note> {
    try {
      return await invoke('create_note', { title, content });
    } catch (error) {
      console.error('Failed to create note:', error);
      throw error;
    }
  }

  static async updateNote(
    id: string,
    title?: string,
    content?: string
  ): Promise<Note> {
    try {
      return await invoke('update_note', { id, title, content });
    } catch (error) {
      console.error('Failed to update note:', error);
      throw error;
    }
  }

  static async deleteNote(id: string): Promise<void> {
    try {
      await invoke('delete_note', { id });
    } catch (error) {
      console.error('Failed to delete note:', error);
      throw error;
    }
  }

  // (Removed) AI Generation Methods

  // Storage Methods
  static async getStorageValue(key: string): Promise<string | null> {
    try {
      return await invoke('get_storage_value', { key });
    } catch (error) {
      console.error('Failed to get storage value:', error);
      return null;
    }
  }

  static async setStorageValue(key: string, value: string): Promise<void> {
    try {
      await invoke('set_storage_value', { key, value });
    } catch (error) {
      console.error('Failed to set storage value:', error);
      throw error;
    }
  }

  // Utility Methods
  static async ping(): Promise<string> {
    try {
      return await invoke('ping');
    } catch (error) {
      console.error('Failed to ping:', error);
      throw error;
    }
  }


  // File URL generation for display
  static async getPhotoJournalImageUrl(image: PhotoJournalImage): Promise<string> {
    try {
      // Use the URL from the image if it exists, otherwise construct the path
      const imagePath = image.url || `artwork_journal/${image.filename}`;
      return await invoke('get_image_data', { image_path: imagePath, imagePath });
    } catch (error) {
      console.error('Failed to get photo journal image data:', error);
      return ''; // Return empty string as fallback
    }
  }

  static async getPhotoJournalThumbnailUrl(image: PhotoJournalImage): Promise<string> {
    try {
      // Use the URL from the image if it exists, otherwise construct the path
      const imagePath = image.url || `artwork_journal/${image.filename}`;
      return await invoke('get_photo_journal_thumbnail_data', { image_path: imagePath, imagePath });
    } catch (error) {
      console.error('Failed to get photo journal thumbnail data:', error);
      return ''; // Return empty string as fallback
    }
  }

  static async clearPhotoJournalThumbnails(): Promise<void> {
    try {
      await invoke('clear_photo_journal_thumbnails');
    } catch (error) {
      console.error('Failed to clear photo journal thumbnails:', error);
      throw error;
    }
  }

  // Moodboard Methods
  static async getMoodboards(): Promise<Moodboard[]> {
    try {
      return await invoke('get_moodboards');
    } catch (error) {
      console.error('Failed to get moodboards:', error);
      throw error;
    }
  }

  static async createMoodboard(title: string): Promise<Moodboard> {
    try {
      return await invoke('create_moodboard', { title });
    } catch (error) {
      console.error('Failed to create moodboard:', error);
      throw error;
    }
  }

  static async updateMoodboard(moodboardId: string, title: string, items: MoodboardItem[]): Promise<Moodboard> {
    try {
      return await invoke('update_moodboard', { 
        moodboardId, 
        title, 
        items 
      });
    } catch (error) {
      console.error('Failed to update moodboard:', error);
      throw error;
    }
  }

  static async deleteMoodboard(moodboardId: string): Promise<void> {
    try {
      await invoke('delete_moodboard', { moodboardId });
    } catch (error) {
      console.error('Failed to delete moodboard:', error);
      throw error;
    }
  }

  static async updateMoodboardItem(
    moodboardId: string,
    itemId: string,
    x?: number,
    y?: number,
    width?: number,
    height?: number
  ): Promise<Moodboard> {
    try {
      return await invoke('update_moodboard_item', {
        moodboardId,
        itemId,
        x,
        y,
        width,
        height
      });
    } catch (error) {
      console.error('Failed to update moodboard item:', error);
      throw error;
    }
  }

  static async getReferenceUrl(reference: Reference, folders?: Folder[]): Promise<string> {
    try {
      let imagePath: string;
      if (reference.folder_id || reference.location?.includes('folder/')) {
        // For folder images, we need to get the folder's physical path
        // Use provided folders or fetch them if not provided
        let foldersData = folders;
        if (!foldersData || foldersData.length === 0) {
          foldersData = await this.getFolders();
        }
        const folder = foldersData.find(f => f.id === reference.folder_id);
        
        if (folder && folder.physicalPath) {
          imagePath = `references/folders/${folder.physicalPath}/${reference.filename}`;
        } else {
          // Fallback to using location field
          const locationParts = reference.location?.split('/');
          if (locationParts && locationParts.length > 1) {
            const folderId = locationParts[1];
            // Find folder by ID to get physical path
            const folderByLocation = foldersData.find(f => f.id === folderId);
            if (folderByLocation && folderByLocation.physicalPath) {
              imagePath = `references/folders/${folderByLocation.physicalPath}/${reference.filename}`;
            } else {
              imagePath = `references/folders/${folderId}/${reference.filename}`;
            }
          } else {
            imagePath = `references/folders/${reference.folder_id}/${reference.filename}`;
          }
        }
      } else {
        imagePath = `references/main/${reference.filename}`;
      }
      return await invoke('get_image_data', { image_path: imagePath, imagePath });
    } catch (error) {
      console.error('Failed to get reference image data:', error);
      return ''; // Return empty string as fallback
    }
  }

  static async getReferenceThumbnailUrl(reference: Reference, folders?: Folder[]): Promise<string> {
    try {
      let imagePath: string;
      if (reference.folder_id || reference.location?.includes('folder/')) {
        // For folder images, we need to get the folder's physical path
        // Use provided folders or fetch them if not provided
        let foldersData = folders;
        if (!foldersData) {
          foldersData = await this.getFolders();
        }
        const folder = foldersData.find(f => f.id === reference.folder_id);
        
        if (folder && folder.physicalPath) {
          imagePath = `references/folders/${folder.physicalPath}/${reference.filename}`;
        } else {
          // Fallback to using location field
          const locationParts = reference.location?.split('/');
          if (locationParts && locationParts.length > 1) {
            const folderId = locationParts[1];
            // Find folder by ID to get physical path
            const folderByLocation = foldersData.find(f => f.id === folderId);
            if (folderByLocation && folderByLocation.physicalPath) {
              imagePath = `references/folders/${folderByLocation.physicalPath}/${reference.filename}`;
            } else {
              imagePath = `references/folders/${folderId}/${reference.filename}`;
            }
          } else {
            imagePath = `references/folders/${reference.folder_id}/${reference.filename}`;
          }
        }
      } else {
        imagePath = `references/main/${reference.filename}`;
      }
      console.log(`Getting thumbnail for image path: ${imagePath}`);
      const result = await invoke('get_thumbnail_data', { image_path: imagePath, imagePath });
      console.log(`Thumbnail result for ${imagePath}: ${result ? 'Success' : 'Failed'}`);
      return result;
    } catch (error) {
      console.error('Failed to get reference thumbnail data:', error);
      return ''; // Return empty string as fallback
    }
  }

  // Folder management
  static async createFolder(name: string): Promise<Folder> {
    try {
      return await invoke('create_folder', { name });
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error;
    }
  }

  static async deleteFolder(id: string): Promise<void> {
    try {
      return await invoke('delete_folder', { id });
    } catch (error) {
      console.error('Failed to delete folder:', error);
      throw error;
    }
  }

  // Read file for upload (used by drag and drop)
  static async readFileForUpload(filePath: string): Promise<string> {
    try {
      return await invoke('read_file_for_upload', { filePath });
    } catch (error) {
      console.error('Failed to read file for upload:', error);
      throw error;
    }
  }

}

// Export default instance
export default TauriService;
