#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { parseScreenshot, parseMultipleScreenshots, deduplicateClimbs } from './parser.js';
import { extractFrames, isVideoFile, isImageFile } from './video.js';
import { MoonBoardClimb } from './types.js';

const program = new Command();

program
  .name('moonboard-ocr')
  .description('Extract MoonBoard climb data from screenshots using OCR')
  .version('0.1.0');

// Parse command - main entry point
program
  .command('parse <input>')
  .description('Parse MoonBoard screenshot(s) or video and extract climb data')
  .option('-o, --output <file>', 'Output JSON file', 'climbs.json')
  .option('-i, --interval <seconds>', 'Frame extraction interval for videos', '2')
  .option('--frames-dir <dir>', 'Directory to store extracted frames', './frames')
  .option('--keep-frames', 'Keep extracted frames after processing', false)
  .option('--no-dedupe', 'Skip deduplication of climbs')
  .action(async (input: string, options) => {
    try {
      const inputPath = path.resolve(input);
      const stat = await fs.stat(inputPath);
      let imagePaths: string[] = [];

      console.log(`Processing: ${input}`);

      if (stat.isDirectory()) {
        // Process all images in directory
        const files = await fs.readdir(inputPath);
        imagePaths = files
          .filter((f) => isImageFile(f))
          .map((f) => path.join(inputPath, f))
          .sort();
        console.log(`Found ${imagePaths.length} image files`);
      } else if (isVideoFile(inputPath)) {
        // Extract frames from video first
        console.log('Extracting frames from video...');
        const framesDir = path.resolve(options.framesDir);
        const interval = parseInt(options.interval, 10);

        imagePaths = await extractFrames({
          inputPath,
          outputDir: framesDir,
          intervalSeconds: interval,
          onProgress: (percent) => {
            process.stdout.write(`\rExtracting frames: ${percent.toFixed(1)}%`);
          },
        });
        console.log(`\nExtracted ${imagePaths.length} frames`);
      } else if (isImageFile(inputPath)) {
        // Single image
        imagePaths = [inputPath];
      } else {
        console.error('Input must be an image, video, or directory of images');
        process.exit(1);
      }

      if (imagePaths.length === 0) {
        console.error('No images found to process');
        process.exit(1);
      }

      // Parse all images
      console.log('Parsing screenshots...');
      const { climbs, errors } = await parseMultipleScreenshots(imagePaths, (current, total, file) => {
        process.stdout.write(`\rProcessing: ${current}/${total} - ${file}`);
      });
      console.log(''); // New line after progress

      // Report errors
      if (errors.length > 0) {
        console.log(`\nWarnings (${errors.length} files had errors):`);
        for (const err of errors.slice(0, 10)) {
          console.log(`  - ${err.file}: ${err.error}`);
        }
        if (errors.length > 10) {
          console.log(`  ... and ${errors.length - 10} more`);
        }
      }

      // Deduplicate if requested
      let finalClimbs = climbs;
      if (options.dedupe !== false && climbs.length > 1) {
        finalClimbs = deduplicateClimbs(climbs);
        console.log(`\nDeduplicated: ${climbs.length} -> ${finalClimbs.length} unique climbs`);
      }

      // Write output
      const outputPath = path.resolve(options.output);
      await fs.writeFile(outputPath, JSON.stringify(finalClimbs, null, 2));
      console.log(`\nOutput written to: ${outputPath}`);
      console.log(`Total climbs extracted: ${finalClimbs.length}`);

      // Cleanup frames if requested
      if (isVideoFile(inputPath) && !options.keepFrames) {
        console.log('Cleaning up temporary frames...');
        await fs.rm(path.resolve(options.framesDir), { recursive: true, force: true });
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Extract frames command - for manual workflow
program
  .command('extract-frames <video>')
  .description('Extract frames from a video file')
  .option('-o, --output <dir>', 'Output directory for frames', './frames')
  .option('-i, --interval <seconds>', 'Extraction interval in seconds', '2')
  .action(async (video: string, options) => {
    try {
      const inputPath = path.resolve(video);
      const outputDir = path.resolve(options.output);
      const interval = parseInt(options.interval, 10);

      console.log(`Extracting frames from: ${video}`);
      console.log(`Output directory: ${outputDir}`);
      console.log(`Interval: ${interval} seconds`);

      const frames = await extractFrames({
        inputPath,
        outputDir,
        intervalSeconds: interval,
        onProgress: (percent) => {
          process.stdout.write(`\rProgress: ${percent.toFixed(1)}%`);
        },
      });

      console.log(`\nExtracted ${frames.length} frames to ${outputDir}`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Dedupe command - remove duplicate climbs from JSON
program
  .command('dedupe <input>')
  .description('Remove duplicate climbs from a JSON file')
  .option('-o, --output <file>', 'Output JSON file')
  .action(async (input: string, options) => {
    try {
      const inputPath = path.resolve(input);
      const content = await fs.readFile(inputPath, 'utf-8');
      const climbs: MoonBoardClimb[] = JSON.parse(content);

      console.log(`Loaded ${climbs.length} climbs from ${input}`);

      const dedupedClimbs = deduplicateClimbs(climbs);
      console.log(`Deduplicated to ${dedupedClimbs.length} unique climbs`);

      const outputPath = options.output ? path.resolve(options.output) : inputPath;
      await fs.writeFile(outputPath, JSON.stringify(dedupedClimbs, null, 2));
      console.log(`Output written to: ${outputPath}`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Single image test command - useful for debugging
program
  .command('test <image>')
  .description('Test parsing a single image and show detailed output')
  .action(async (image: string) => {
    try {
      const imagePath = path.resolve(image);
      console.log(`Testing: ${imagePath}\n`);

      const result = await parseScreenshot(imagePath);

      if (result.success && result.climb) {
        console.log('=== Parsed Climb Data ===');
        console.log(`Name: ${result.climb.name}${result.climb.isBenchmark ? ' [BENCHMARK]' : ''}`);
        console.log(`Setter: ${result.climb.setter}`);
        console.log(`Angle: ${result.climb.angle}°`);
        console.log(`User Grade: ${result.climb.userGrade}`);
        console.log(`Setter Grade: ${result.climb.setterGrade}`);
        console.log(`Benchmark: ${result.climb.isBenchmark ? 'Yes' : 'No'}`);
        console.log('\n=== Holds ===');
        console.log(`Start: ${result.climb.holds.start.join(', ') || 'None detected'}`);
        console.log(`Hand: ${result.climb.holds.hand.join(', ') || 'None detected'}`);
        console.log(`Finish: ${result.climb.holds.finish.join(', ') || 'None detected'}`);

        if (result.warnings.length > 0) {
          console.log('\n=== Warnings ===');
          for (const warning of result.warnings) {
            console.log(`- ${warning}`);
          }
        }

        console.log('\n=== Raw JSON ===');
        console.log(JSON.stringify(result.climb, null, 2));
      } else {
        console.log('=== Parse Failed ===');
        console.log(`Error: ${result.error}`);
        if (result.warnings.length > 0) {
          console.log('\nWarnings:');
          for (const warning of result.warnings) {
            console.log(`- ${warning}`);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
