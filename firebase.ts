
// This project is now using mockStorage.ts for standalone demo.
// Firebase has been removed to satisfy local VS Code setup without a backend.
export const auth = { onAuthStateChanged: () => {}, signOut: () => {} } as any;
export const db = {} as any;
