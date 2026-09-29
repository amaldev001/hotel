import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import env from '../config/env.js';

/**
 * Abstract Storage Adapter Interface
 */
export class StorageAdapter {
  async saveFile(_buffer, _originalName, _mimeType) {
    throw new Error('saveFile method must be implemented');
  }

  async deleteFile(_relativePath) {
    throw new Error('deleteFile method must be implemented');
  }
}

/**
 * Local Disk Storage Provider Implementation
 */
export class LocalDiskStorageProvider extends StorageAdapter {
  constructor(uploadDir = env.UPLOAD_DIR) {
    super();
    this.uploadDir = path.isAbsolute(uploadDir)
      ? uploadDir
      : path.resolve(process.cwd(), uploadDir);

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Validates image magic bytes signature.
   * Allowed: JPEG, PNG, WebP. Reject SVG or executable/other binary types.
   * @param {Buffer} buffer 
   * @param {string} mimetype 
   * @returns {boolean}
   */
  validateMagicBytes(buffer, mimetype) {
    if (!buffer || buffer.length < 12) return false;

    // Reject SVG explicitly
    if (mimetype === 'image/svg+xml' || buffer.toString('utf8', 0, 100).includes('<svg')) {
      return false;
    }

    // JPEG: FF D8 FF
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a;

    // WebP: RIFF ... WEBP
    const isRiff = buffer.toString('ascii', 0, 4) === 'RIFF';
    const isWebp = buffer.toString('ascii', 8, 12) === 'WEBP';
    const isWebPImage = isRiff && isWebp;

    return isJpeg || isPng || isWebPImage;
  }

  /**
   * Save buffer to local disk with a random UUID filename.
   * @returns {Promise<string>} Relative URL path (e.g. '/uploads/uuid.png')
   */
  async saveFile(buffer, originalName, mimetype) {
    if (!this.validateMagicBytes(buffer, mimetype)) {
      throw new Error('INVALID_FILE_TYPE');
    }

    const ext = path.extname(originalName).toLowerCase() || (mimetype === 'image/jpeg' ? '.jpg' : mimetype === 'image/webp' ? '.webp' : '.png');
    const randomName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(this.uploadDir, randomName);

    await fs.promises.writeFile(filePath, buffer);
    return `/uploads/${randomName}`;
  }

  /**
   * Delete existing file from local disk.
   * Protects against path traversal.
   * @param {string} relativePath 
   */
  async deleteFile(relativePath) {
    if (!relativePath || typeof relativePath !== 'string') return;
    const filename = path.basename(relativePath);
    const targetPath = path.join(this.uploadDir, filename);

    // Prevent path traversal outside uploadDir
    if (!targetPath.startsWith(this.uploadDir)) return;

    try {
      if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath);
      }
    } catch (_err) {
      // Ignore deletion failure if file doesn't exist
    }
  }
}

export const defaultStorageProvider = new LocalDiskStorageProvider();
export default defaultStorageProvider;
