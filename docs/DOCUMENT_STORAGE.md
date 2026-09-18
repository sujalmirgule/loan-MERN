# Document Storage Architecture

This document describes the storage abstraction, file security model, and cloud migration path for the **Loan Approve** platform.

---

## 1. Storage Abstraction Layer

To ensure portability between development environments (local disk) and enterprise cloud deployments (AWS S3, Cloudflare R2, Google Cloud Storage, or Cloudinary), document persistence is abstracted behind the `IStorageProvider` interface.

```typescript
export interface IStorageProvider {
  saveFile(key: string, buffer: Buffer, mimeType: string): Promise<StorageSaveResult>;
  getFileStream(key: string): Promise<Readable>;
  fileExists(key: string): Promise<boolean>;
  deleteFile(key: string): Promise<void>;
  getAbsolutePath(key: string): string;
}
```

Controllers and business logic interact exclusively with `storageProvider` and remain completely agnostic of whether a file is stored on local SSD or in an S3 bucket.

---

## 2. Local Storage Provider Implementation

In Phase 3, the `LocalStorageProvider` implementation is used:
- **Base Path**: `server/storage/documents/` (created automatically, outside static web server root).
- **Directory Traversal Protection**: Keys are sanitized to strip relative components (`../`, `..\`) and verified against the base storage root using `path.resolve`. If a traversal attempt is detected, an exception is raised immediately.
- **Key Generation Pattern**:
  `documents/{customerId}/{documentType}/{uuid}-v{version}.{ext}`
  Example: `documents/c2b0b5c2-63da-4f8e/AADHAAR_FRONT/0435cf59-7626-47ea-v1.pdf`

---

## 3. Upload Security Guidelines

1. **Strict File Filtering**:
   - Only `application/pdf`, `image/jpeg`, `image/jpg`, and `image/png` are accepted.
   - Executable, script, or archive files (`.exe`, `.sh`, `.zip`, `.js`, `.html`) are rejected at the middleware level.
2. **File Size Limit**:
   - Maximum 10 MB per file (`10 * 1024 * 1024` bytes) enforced both in Multer middleware and frontend forms.
3. **No Direct Static Serving**:
   - Stored files cannot be requested via public URLs like `http://server/uploads/...`.
   - Access is restricted to authenticated streaming endpoints with token validation and role/ownership checks.

---

## 4. Cloud Object Storage Migration Guide

When migrating to AWS S3, Cloudflare R2, or MinIO:

1. **Implement `S3StorageProvider`**:
   ```typescript
   import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

   export class S3StorageProvider implements IStorageProvider {
     private client = new S3Client({ region: process.env.AWS_REGION });
     private bucket = process.env.S3_BUCKET_NAME!;

     async saveFile(key: string, buffer: Buffer, mimeType: string) {
       await this.client.send(new PutObjectCommand({
         Bucket: this.bucket,
         Key: key,
         Body: buffer,
         ContentType: mimeType,
         ServerSideEncryption: 'aws:kms',
       }));
       return { storageKey: key, filePath: key, fileSize: buffer.length, mimeType };
     }

     async getFileStream(key: string) {
       const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
       return res.Body as Readable;
     }
     // ...
   }
   ```
2. **Swap Provider in Factory**:
   Update `server/src/providers/storage/index.ts` to instantiate `S3StorageProvider` when `STORAGE_DRIVER === 's3'`.
3. **Zero Controller Changes**:
   All upload, re-upload, metadata, and streaming controllers remain 100% unchanged.
