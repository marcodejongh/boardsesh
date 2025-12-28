import type { IncomingMessage, ServerResponse } from 'http';
import Busboy from 'busboy';
import path from 'path';
import fs from 'fs';
import { writeFile, unlink, access } from 'fs/promises';
import { applyCorsHeaders } from './cors.js';

// Avatar upload configuration
const AVATARS_DIR = './avatars';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

// UUID validation regex for path traversal prevention
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUserId(userId: string): boolean {
  return UUID_REGEX.test(userId);
}

// Ensure avatars directory exists
if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

/**
 * Helper to delete existing avatars for a user (all extensions)
 */
async function deleteExistingAvatars(userId: string): Promise<void> {
  const extensions = ['jpg', 'png', 'gif', 'webp'];
  for (const ext of extensions) {
    const filePath = path.join(AVATARS_DIR, `${userId}.${ext}`);
    try {
      await access(filePath);
      await unlink(filePath);
    } catch {
      // File doesn't exist, ignore
    }
  }
}

/**
 * Avatar upload handler
 * POST /api/avatars
 *
 * Expects multipart form data with:
 * - avatar: the image file
 * - userId: the user ID (UUID format)
 */
export async function handleAvatarUpload(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!applyCorsHeaders(req, res)) return;

  return new Promise<void>((resolve) => {
    let busboy: ReturnType<typeof Busboy>;

    try {
      busboy = Busboy({
        headers: req.headers as { 'content-type': string },
        limits: { fileSize: MAX_FILE_SIZE, files: 1 },
      });
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request format' }));
      resolve();
      return;
    }

    let userId: string | undefined;
    let fileBuffer: Buffer | undefined;
    let mimeType: string | undefined;
    let fileTruncated = false;
    let invalidMimeType = false;

    busboy.on('field', (name: string, value: string) => {
      if (name === 'userId') userId = value;
    });

    busboy.on('file', (name: string, stream: NodeJS.ReadableStream, info: { mimeType: string }) => {
      if (name !== 'avatar') {
        stream.resume();
        return;
      }

      mimeType = info.mimeType;
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        invalidMimeType = true;
        stream.resume();
        return;
      }

      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
      });
      stream.on('limit', () => {
        fileTruncated = true;
      });
    });

    busboy.on('finish', async () => {
      // Validate file size
      if (fileTruncated) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File size must be less than 2MB' }));
        resolve();
        return;
      }

      // Validate MIME type
      if (invalidMimeType) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Only JPG, PNG, GIF, and WebP images are allowed' }));
        resolve();
        return;
      }

      // Validate userId
      if (!userId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'userId is required' }));
        resolve();
        return;
      }

      if (!validateUserId(userId)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid userId format' }));
        resolve();
        return;
      }

      // Validate file was uploaded
      if (!fileBuffer || !mimeType) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No file uploaded' }));
        resolve();
        return;
      }

      // Delete any existing avatars for this user (all extensions)
      await deleteExistingAvatars(userId);

      // Determine file extension and save the file
      const ext = MIME_TO_EXT[mimeType] || 'jpg';
      const filePath = path.join(AVATARS_DIR, `${userId}.${ext}`);

      try {
        await writeFile(filePath, fileBuffer);
      } catch (writeErr) {
        console.error('Failed to write avatar file:', writeErr);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to save avatar' }));
        resolve();
        return;
      }

      const avatarUrl = `/static/avatars/${userId}.${ext}`;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, avatarUrl }));
      resolve();
    });

    busboy.on('error', (err: Error) => {
      console.error('Busboy error:', err);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      resolve();
    });

    req.pipe(busboy);
  });
}

/**
 * Get the avatars directory path (for static file serving)
 */
export function getAvatarsDir(): string {
  return AVATARS_DIR;
}
