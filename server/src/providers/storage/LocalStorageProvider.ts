import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { IStorageProvider, StorageSaveResult } from './IStorageProvider';
import { logger } from '../../utils/logger';

export class LocalStorageProvider implements IStorageProvider {
  private readonly baseStorageDir: string;

  constructor(customStorageDir?: string) {
    this.baseStorageDir = customStorageDir || path.resolve(process.cwd(), 'storage', 'documents');
    this.ensureDirectoryExists(this.baseStorageDir);
  }

  private ensureDirectoryExists(dirPath: string): void {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch {
      // Ignore directory creation failure in read-only serverless environments
    }
  }

  /**
   * Sanitizes key to prevent directory traversal attacks.
   */
  private sanitizeKey(key: string): string {
    // Normalize and remove leading slashes and any .. traversal components
    const safeKey = path.normalize(key).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
    return safeKey;
  }

  public getAbsolutePath(key: string): string {
    const safeKey = this.sanitizeKey(key);
    const resolvedPath = path.resolve(this.baseStorageDir, safeKey);

    // Verify the resolved path stays within baseStorageDir
    if (!resolvedPath.startsWith(path.resolve(this.baseStorageDir))) {
      throw new Error('Path traversal attempt detected');
    }

    return resolvedPath;
  }

  async saveFile(
    key: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<StorageSaveResult> {
    const destinationPath = this.getAbsolutePath(key);
    const destinationDir = path.dirname(destinationPath);
    this.ensureDirectoryExists(destinationDir);

    await fs.promises.writeFile(destinationPath, buffer);
    const stats = await fs.promises.stat(destinationPath);

    logger.info(`File stored locally: ${key} (${stats.size} bytes)`);

    return {
      storageKey: key,
      filePath: destinationPath,
      fileSize: stats.size,
      mimeType,
    };
  }

  async getFileStream(key: string): Promise<Readable> {
    const filePath = this.getAbsolutePath(key);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${key}`);
    }

    return fs.createReadStream(filePath);
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const filePath = this.getAbsolutePath(key);
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const filePath = this.getAbsolutePath(key);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err) {
      logger.warn(`Failed to delete file ${key}`, { error: String(err) });
    }
  }
}
