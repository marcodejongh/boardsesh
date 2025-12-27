import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';

export interface ExtractFramesOptions {
  inputPath: string;
  outputDir: string;
  intervalSeconds: number;
  onProgress?: (percent: number) => void;
}

/**
 * Extract frames from a video file at regular intervals
 */
export async function extractFrames(options: ExtractFramesOptions): Promise<string[]> {
  const { inputPath, outputDir, intervalSeconds, onProgress } = options;

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Get video duration
  const duration = await getVideoDuration(inputPath);
  const totalFrames = Math.floor(duration / intervalSeconds);

  return new Promise((resolve, reject) => {
    const outputPattern = path.join(outputDir, 'frame_%05d.png');
    const extractedFrames: string[] = [];

    ffmpeg(inputPath)
      .outputOptions([
        `-vf fps=1/${intervalSeconds}`, // Extract 1 frame every N seconds
        '-q:v 2', // High quality
      ])
      .output(outputPattern)
      .on('progress', (progress) => {
        if (progress.percent && onProgress) {
          onProgress(progress.percent);
        }
      })
      .on('end', async () => {
        // List the extracted frames
        const files = await fs.readdir(outputDir);
        const frames = files
          .filter((f) => f.startsWith('frame_') && f.endsWith('.png'))
          .map((f) => path.join(outputDir, f))
          .sort();

        resolve(frames);
      })
      .on('error', (err) => {
        reject(new Error(`Frame extraction failed: ${err.message}`));
      })
      .run();
  });
}

/**
 * Get the duration of a video file in seconds
 */
export function getVideoDuration(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Could not probe video: ${err.message}`));
        return;
      }

      const duration = metadata.format.duration;
      if (typeof duration !== 'number') {
        reject(new Error('Could not determine video duration'));
        return;
      }

      resolve(duration);
    });
  });
}

/**
 * Check if a file is a video based on extension
 */
export function isVideoFile(filePath: string): boolean {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
  const ext = path.extname(filePath).toLowerCase();
  return videoExtensions.includes(ext);
}

/**
 * Check if a file is an image based on extension
 */
export function isImageFile(filePath: string): boolean {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff'];
  const ext = path.extname(filePath).toLowerCase();
  return imageExtensions.includes(ext);
}
