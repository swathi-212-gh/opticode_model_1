
import { OptimizationResult } from './types';

/**
 * STORAGE KEYS
 * These are the labels we use to find our data in the browser's memory.
 */
const HISTORY_STORAGE_KEY = 'opticode_projects_history';
const SAVED_SNIPPETS_KEY = 'opticode_saved_snippets';
const CURRENT_USER_NAME = 'opticode_logged_in_user';
const USER_PROFILE_DETAILS = 'opticode_user_profile_bio';

export interface UserProfileData {
  name: string;
  email: string;
  joinDate: string;
  bio: string;
}

export const mockDb = {
  // SAVE HISTORY: Saves a new optimization run
  saveToHistory: (data: OptimizationResult) => {
    const history = mockDb.getHistory();
    const id = data.id || Math.random().toString(36).substring(2, 9);
    // Use the existing name if it has one, otherwise call it "New Session"
    const name = data.name || `Session-${id}`;
    
    const itemWithId = { ...data, id, name };
    
    const newHistory = [itemWithId, ...history];
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
    return itemWithId;
  },

  // UPDATE PROJECT NAME: Finds an existing project and changes its name
  updateProjectName: (id: string, newName: string) => {
    // 1. Update in History
    const history = mockDb.getHistory();
    const updatedHistory = history.map(item => 
      item.id === id ? { ...item, name: newName } : item
    );
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));

    // 2. Update in Profile (if it was saved there too)
    const saved = mockDb.getSavedSnippets();
    const updatedSaved = saved.map(item => 
      item.id === id ? { ...item, name: newName } : item
    );
    localStorage.setItem(SAVED_SNIPPETS_KEY, JSON.stringify(updatedSaved));
  },

  getHistory: (): OptimizationResult[] => {
    const rawData = localStorage.getItem(HISTORY_STORAGE_KEY);
    return rawData ? JSON.parse(rawData) : [];
  },
  
  saveToProfile: (data: OptimizationResult) => {
    const saved = mockDb.getSavedSnippets();
    if (saved.find(item => item.id === data.id)) return;
    
    const newSaved = [data, ...saved];
    localStorage.setItem(SAVED_SNIPPETS_KEY, JSON.stringify(newSaved));
  },

  getSavedSnippets: (): OptimizationResult[] => {
    const rawData = localStorage.getItem(SAVED_SNIPPETS_KEY);
    return rawData ? JSON.parse(rawData) : [];
  },

  deleteSnippet: (id: string) => {
    const filtered = mockDb.getSavedSnippets().filter(item => item.id !== id);
    localStorage.setItem(SAVED_SNIPPETS_KEY, JSON.stringify(filtered));
    
    const filteredHistory = mockDb.getHistory().filter(item => item.id !== id);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filteredHistory));
  },

  getById: (id: string): OptimizationResult | undefined => {
    const allItems = [...mockDb.getHistory(), ...mockDb.getSavedSnippets()];
    // We use a Map to ensure we only have unique IDs (since an item can be in both lists)
    const uniqueMap = new Map(allItems.map(item => [item.id, item]));
    return uniqueMap.get(id);
  }
};

export const mockAuth = {
  login: (userName: string, userEmail: string = 'demo@example.com') => {
    localStorage.setItem(CURRENT_USER_NAME, userName);
    const profile: UserProfileData = {
      name: userName,
      email: userEmail,
      joinDate: new Date().toLocaleDateString(),
      bio: 'Ready to optimize some Python code!'
    };
    localStorage.setItem(USER_PROFILE_DETAILS, JSON.stringify(profile));
  },

  logout: () => {
    localStorage.removeItem(CURRENT_USER_NAME);
    localStorage.removeItem(USER_PROFILE_DETAILS);
  },

  getUserName: () => localStorage.getItem(CURRENT_USER_NAME),

  getProfile: (): UserProfileData | null => {
    const data = localStorage.getItem(USER_PROFILE_DETAILS);
    return data ? JSON.parse(data) : null;
  },

  updateProfile: (updatedData: UserProfileData) => {
    localStorage.setItem(USER_PROFILE_DETAILS, JSON.stringify(updatedData));
  }
};
