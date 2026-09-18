import { IStorageProvider } from './IStorageProvider';
import { LocalStorageProvider } from './LocalStorageProvider';

// Singleton instance defaulting to local storage
export const storageProvider: IStorageProvider = new LocalStorageProvider();

export * from './IStorageProvider';
export * from './LocalStorageProvider';
