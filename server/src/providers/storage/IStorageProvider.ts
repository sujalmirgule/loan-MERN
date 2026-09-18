import { Readable } from 'stream';

export interface StorageSaveResult {
  storageKey: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

export interface IStorageProvider {
  /**
   * Saves a file buffer or stream under the specified unique storage key.
   */
  saveFile(
    key: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<StorageSaveResult>;

  /**
   * Retrieves a readable stream for a stored file key.
   */
  getFileStream(key: string): Promise<Readable>;

  /**
   * Checks if a file exists under the specified storage key.
   */
  fileExists(key: string): Promise<boolean>;

  /**
   * Deletes a file under the specified storage key.
   */
  deleteFile(key: string): Promise<void>;

  /**
   * Resolves absolute file path (used by local storage providers for streaming).
   */
  getAbsolutePath(key: string): string;
}
