import type { IncomingMessage, ServerResponse } from 'http';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { extname } from 'path';
import path from 'path';
import { applyCorsHeaders } from './cors.js';
import { getAvatarsDir } from './avatars.js';
import { isS3Configured, getFromS3 } from '../storage/s3.js';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

/**
 * Static avatar file serving handler
 * GET /static/avatars/:filename
 *
 * When S3 is configured, proxies the image from S3 (avoids ACL/public access requirements).
 * Otherwise, serves avatar files from local storage with caching headers.
 */
export async function handleStaticAvatar(req: IncomingMessage, res: ServerResponse, fileName: string): Promise<void> {
  if (!applyCorsHeaders(req, res)) return;

  // Security: validate filename to prevent path traversal
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid path' }));
    return;
  }

  // If S3 is configured, proxy the image from S3
  // This avoids requiring S3 public access / ACLs which many S3-compatible services don't support
  if (isS3Configured()) {
    const s3Key = `avatars/${fileName}`;
    const s3Object = await getFromS3(s3Key);

    if (!s3Object) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    const ext = extname(fileName).toLowerCase();
    const contentType = s3Object.contentType || MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      ...(s3Object.contentLength && { 'Content-Length': s3Object.contentLength }),
      'Cache-Control': 'public, max-age=86400', // 1 day
    });

    // Pipe the S3 stream to the response
    s3Object.stream.pipe(res);
    return;
  }

  // Serve from local storage
  const avatarsDir = getAvatarsDir();
  const filePath = path.join(avatarsDir, fileName);

  try {
    const fileStat = await stat(filePath);
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Check If-None-Match for caching
    const etag = `"${fileStat.mtime.getTime()}"`;
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      res.writeHead(304);
      res.end();
      return;
    }

    // Check If-Modified-Since for caching
    const ifModifiedSince = req.headers['if-modified-since'];
    if (ifModifiedSince) {
      const ifModifiedSinceDate = new Date(ifModifiedSince);
      if (fileStat.mtime <= ifModifiedSinceDate) {
        res.writeHead(304);
        res.end();
        return;
      }
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': fileStat.size,
      'Cache-Control': 'public, max-age=86400', // 1 day
      ETag: etag,
      'Last-Modified': fileStat.mtime.toUTCString(),
    });

    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
}
