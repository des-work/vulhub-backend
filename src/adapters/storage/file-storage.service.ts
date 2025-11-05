import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { Express } from 'express';

export interface FileUploadResult {
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  uploadedAt: Date;
}

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly uploadDir = this.getUploadDirectory();
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
  ];

  constructor() {
    this.ensureUploadDirectories();
  }

  private getUploadDirectory(): string {
    // For Vercel serverless: use /tmp (writable)
    // For local/dev: use web/public/uploads
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      // Check if we're in a serverless environment
      const isServerless = !fs.existsSync(path.join(process.cwd(), '../web'));
      
      if (isServerless) {
        // Vercel serverless: use /tmp
        return '/tmp/uploads';
      }
    }
    
    // Local development: use web/public/uploads
    return path.join(process.cwd(), '../web/public/uploads');
  }

  /**
   * Ensure all upload directories exist
   */
  private ensureUploadDirectories(): void {
    const dirs = [
      this.uploadDir,
      path.join(this.uploadDir, 'submissions'),
      path.join(this.uploadDir, 'submissions/evidence'),
      path.join(this.uploadDir, 'avatars'),
      path.join(this.uploadDir, 'projects'),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.log(`Created directory: ${dir}`);
      }
    }
  }

  /**
   * Upload submission evidence files
   */
  async uploadSubmissionEvidence(
    userId: string,
    projectId: string,
    file: Express.Multer.File,
  ): Promise<FileUploadResult> {
    this.validateFile(file);

    const filename = this.generateFilename(userId, projectId, file.originalname);
    const filepath = path.join(this.uploadDir, 'submissions/evidence', filename);

    try {
      fs.writeFileSync(filepath, file.buffer);
      this.logger.log(`Uploaded evidence file: ${filename}`);

        return {
          filename,
          path: this.getPublicPath('submissions/evidence', filename),
          size: file.size,
          mimetype: file.mimetype,
          uploadedAt: new Date(),
        };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw new BadRequestException('Failed to upload file');
    }
  }

  /**
   * Upload multiple evidence files
   */
  async uploadMultipleEvidence(
    userId: string,
    projectId: string,
    files: Express.Multer.File[],
  ): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = [];

    for (const file of files) {
      const result = await this.uploadSubmissionEvidence(userId, projectId, file);
      results.push(result);
    }

    return results;
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<FileUploadResult> {
    this.validateFile(file);

    const filename = `${userId}${path.extname(file.originalname)}`;
    const filepath = path.join(this.uploadDir, 'avatars', filename);

    try {
      // Delete old avatar if exists
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }

      fs.writeFileSync(filepath, file.buffer);
      this.logger.log(`Uploaded avatar for user: ${userId}`);

        return {
          filename,
          path: this.getPublicPath('avatars', filename),
          size: file.size,
          mimetype: file.mimetype,
          uploadedAt: new Date(),
        };
    } catch (error) {
      this.logger.error(`Failed to upload avatar: ${error.message}`);
      throw new BadRequestException('Failed to upload avatar');
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(relativePath: string): Promise<void> {
    try {
      // Prevent directory traversal attacks
      if (relativePath.includes('..')) {
        throw new BadRequestException('Invalid file path');
      }

      const filepath = path.join(this.uploadDir, relativePath);
      
      // Ensure the file is within the upload directory
      if (!filepath.startsWith(this.uploadDir)) {
        throw new BadRequestException('Invalid file path');
      }

      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        this.logger.log(`Deleted file: ${relativePath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw new BadRequestException('Failed to delete file');
    }
  }

  /**
   * Get file info
   */
  async getFileInfo(relativePath: string): Promise<FileUploadResult | null> {
    try {
      if (relativePath.includes('..')) {
        throw new BadRequestException('Invalid file path');
      }

      const filepath = path.join(this.uploadDir, relativePath);

      if (!filepath.startsWith(this.uploadDir)) {
        throw new BadRequestException('Invalid file path');
      }

      if (!fs.existsSync(filepath)) {
        return null;
      }

      const stats = fs.statSync(filepath);
      return {
        filename: path.basename(filepath),
        path: `/uploads/${relativePath}`,
        size: stats.size,
        mimetype: this.getMimeType(filepath),
        uploadedAt: stats.birthtime,
      };
    } catch (error) {
      this.logger.error(`Failed to get file info: ${error.message}`);
      return null;
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit`);
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} not allowed`);
    }

    if (!file.originalname) {
      throw new BadRequestException('Invalid filename');
    }
  }

  /**
   * Generate unique filename
   */
  private generateFilename(userId: string, projectId: string, originalname: string): string {
    const timestamp = Date.now();
    const hash = crypto.randomBytes(4).toString('hex');
    const ext = path.extname(originalname);
    return `${userId}_${projectId}_${timestamp}_${hash}${ext}`;
  }

  /**
   * Get MIME type from file extension
   */
  private getPublicPath(subdir: string, filename: string): string {
    // If using /tmp (Vercel serverless), return a path that can be served
    // For local dev, return /uploads path
    if (this.uploadDir.startsWith('/tmp')) {
      // For serverless, files in /tmp are ephemeral
      // Consider using external storage or returning a URL
      return `/uploads/${subdir}/${filename}`;
    }
    return `/uploads/${subdir}/${filename}`;
  }

  private getMimeType(filepath: string): string {
    const ext = path.extname(filepath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Clean up old files (called periodically)
   */
  async cleanupOldFiles(maxAgeInDays: number = 30): Promise<number> {
    let deletedCount = 0;
    const maxAge = maxAgeInDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    try {
      const subdirs = ['submissions/evidence', 'avatars', 'projects'];

      for (const subdir of subdirs) {
        const dirPath = path.join(this.uploadDir, subdir);
        if (!fs.existsSync(dirPath)) continue;

        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const filepath = path.join(dirPath, file);
          const stats = fs.statSync(filepath);
          const fileAge = now - stats.mtimeMs;

          if (fileAge > maxAge) {
            fs.unlinkSync(filepath);
            deletedCount++;
            this.logger.log(`Cleaned up old file: ${file}`);
          }
        }
      }

      this.logger.log(`Cleaned up ${deletedCount} old files`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to cleanup old files: ${error.message}`);
      return 0;
    }
  }
}
