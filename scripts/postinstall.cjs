#!/usr/bin/env node

/**
 * Postinstall script to copy PDF.js worker file to public directory
 * This ensures the worker is available for the application without CDN dependency
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const targetFile = path.join(__dirname, '..', 'public', 'pdf.worker.min.mjs');

try {
  // Ensure public directory exists
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Copy the worker file
  fs.copyFileSync(sourceFile, targetFile);
  console.log('✓ PDF.js worker file copied successfully to public/pdf.worker.min.mjs');
} catch (error) {
  console.error('Error copying PDF.js worker file:', error.message);
  // Don't fail the install if copy fails - the app will just fall back to CDN behavior
  process.exit(0);
}
