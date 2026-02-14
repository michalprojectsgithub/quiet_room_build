// Data Configuration - Tauri app configuration
export const DATA_CONFIG = {
  // Current data source: 'tauri' (local file system via Tauri)
  dataSource: 'tauri' as const,
  
  // User Configuration
  user: {
    // Current user ID - will be dynamic when authentication is implemented
    currentUserId: 'devuser123',
    
    // User data paths (relative to Tauri data directory)
    paths: {
      notes: 'notes',
      photo_journal: 'photo_journal',
      moodboards: 'moodboards',
      references: 'references',
    }
  }
};

// Helper function to get user-specific path
export function getUserPath(pathType: keyof typeof DATA_CONFIG.user.paths): string {
  return DATA_CONFIG.user.paths[pathType];
}
