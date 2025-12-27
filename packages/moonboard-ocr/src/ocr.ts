import Tesseract from 'tesseract.js';
import sharp from 'sharp';

export interface OcrResult {
  name: string;
  setter: string;
  angle: number;
  userGrade: string;
  setterGrade: string;
  isBenchmark: boolean;
  warnings: string[];
}

/**
 * Extract text from the header region of a MoonBoard screenshot
 */
export async function extractHeaderText(
  imageBuffer: Buffer,
  headerRegion: { x: number; y: number; width: number; height: number }
): Promise<OcrResult> {
  const warnings: string[] = [];

  // Crop to header region and enhance for OCR
  const croppedBuffer = await sharp(imageBuffer)
    .extract({
      left: headerRegion.x,
      top: headerRegion.y,
      width: headerRegion.width,
      height: headerRegion.height,
    })
    // Convert to grayscale and increase contrast for better OCR
    .grayscale()
    .normalize()
    .toBuffer();

  // Run OCR on the header
  const result = await Tesseract.recognize(croppedBuffer, 'eng', {
    // logger: (m) => console.log(m), // Uncomment for debugging
  });

  const text = result.data.text;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Parse the extracted text
  return parseHeaderText(lines, warnings);
}

/**
 * Parse the OCR'd text lines into structured data
 *
 * Expected format:
 * Line 1: "CLIMB NAME ♡" or "CLIMB NAME"
 * Line 2: "Set by [setter] @ [angle]°"
 * Line 3: "Grade: User [grade]/ Setter [grade]"
 */
function parseHeaderText(lines: string[], warnings: string[]): OcrResult {
  let name = '';
  let setter = '';
  let angle = 40; // Default angle
  let userGrade = '';
  let setterGrade = '';
  let isBenchmark = false;

  // Check for benchmark indicator (orange "B" appears as standalone "B" or "8" in OCR)
  // It's typically on a line by itself near the climb name
  for (const line of lines) {
    const trimmed = line.trim();
    // Look for standalone "B" or "8" (OCR might read orange B as 8)
    if (trimmed === 'B' || trimmed === '8' || trimmed === '[B]' || trimmed === '(B)') {
      isBenchmark = true;
      break;
    }
  }

  // Try to find climb name (usually first meaningful line)
  // Collect candidate lines and pick the best one
  const nameCandidates: string[] = [];

  for (const line of lines) {
    // Skip lines that look like metadata
    if (line.toLowerCase().includes('set by') ||
        line.toLowerCase().includes('grade:') ||
        line.toLowerCase().includes('any marked') ||
        line.toLowerCase().includes('user') ||
        line.toLowerCase().includes('setter')) {
      continue;
    }
    // Skip very short lines (likely OCR noise)
    if (line.length < 3) {
      continue;
    }
    // Remove heart emoji and OCR artifacts, trim
    const cleaned = line
      .replace(/[♡❤️🤍&©®]/g, '')  // Remove heart, ampersand, copyright symbols
      .replace(/\s*[QO@()]+\s*$/i, '')  // Remove trailing Q/O/@/() (OCR error for heart/icons)
      .replace(/^\d+[)\]]\s*/, '')  // Remove leading numbers like "0)"
      .replace(/^[yl]\s+/i, '')  // Remove leading y/l (OCR artifacts)
      .trim();

    if (cleaned.length >= 3) {
      nameCandidates.push(cleaned);
    }
  }

  // Pick the best candidate (prefer longer names, all-caps is common for climb names)
  if (nameCandidates.length > 0) {
    // Sort by: prefer all-caps, then by length
    nameCandidates.sort((a, b) => {
      const aAllCaps = a === a.toUpperCase();
      const bAllCaps = b === b.toUpperCase();
      if (aAllCaps && !bAllCaps) return -1;
      if (!aAllCaps && bAllCaps) return 1;
      return b.length - a.length;  // Longer names first
    });
    name = nameCandidates[0];
  }

  // Find setter and angle
  for (const line of lines) {
    const setterMatch = line.match(/set\s+by\s+(.+?)\s*@\s*(\d+)/i);
    if (setterMatch) {
      setter = setterMatch[1].trim();
      angle = parseInt(setterMatch[2], 10);
      break;
    }
    // Alternative format without @
    const setterOnlyMatch = line.match(/set\s+by\s+(.+)/i);
    if (setterOnlyMatch && !setter) {
      setter = setterOnlyMatch[1].trim();
    }
  }

  // Find grades
  for (const line of lines) {
    // Format: "Grade: User 8A/V11/ Setter 8A/V11"
    const gradeMatch = line.match(/grade[:\s]+user\s+([^\s/]+(?:\/[^\s/]+)?)\s*[/|]\s*setter\s+([^\s]+)/i);
    if (gradeMatch) {
      userGrade = gradeMatch[1].trim();
      setterGrade = gradeMatch[2].trim();
      break;
    }
    // Alternative: just look for grade patterns
    const simpleGradeMatch = line.match(/(\d[ABC]?\+?\/V\d+)/gi);
    if (simpleGradeMatch && simpleGradeMatch.length >= 1) {
      if (!userGrade) userGrade = simpleGradeMatch[0];
      if (!setterGrade && simpleGradeMatch.length >= 2) {
        setterGrade = simpleGradeMatch[1];
      }
    }
  }

  // Add warnings for missing data
  if (!name) warnings.push('Could not extract climb name');
  if (!setter) warnings.push('Could not extract setter name');
  if (!userGrade) warnings.push('Could not extract user grade');
  if (!setterGrade) warnings.push('Could not extract setter grade');

  return {
    name: name || 'Unknown',
    setter: setter || 'Unknown',
    angle,
    userGrade: userGrade || 'Unknown',
    setterGrade: setterGrade || userGrade || 'Unknown',
    isBenchmark,
    warnings,
  };
}

/**
 * Pre-process image for better OCR results
 */
export async function preprocessForOcr(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .grayscale()
    .normalize()
    .sharpen()
    .toBuffer();
}
