# PDF.js Worker Configuration Fix

## Problem
When uploading PDF documents on the Document Import page, users encountered the error:
```
setting up fake worker failed
```

## Root Cause
The PDF.js worker was configured to load from a CDN using a protocol-relative URL:
```javascript
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
```

This approach can fail in certain environments due to:
- Network restrictions
- CORS policies
- Protocol mismatches (http vs https)
- CDN availability issues

## Solution
Changed the configuration to use a local worker file instead:

1. **Added postinstall script** in `package.json` and created `scripts/postinstall.cjs` to automatically copy the worker file from `node_modules/pdfjs-dist/build/` to the `public/` directory after installing dependencies. The script is cross-platform compatible (works on Windows, macOS, and Linux).

2. **Updated worker configuration** in `src/components/DocumentUpload.tsx` to reference the local worker file:
```javascript
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
```

## Benefits
- ✅ No dependency on external CDN
- ✅ Faster load times (local file)
- ✅ Works in all network environments
- ✅ Automatic deployment with the application
- ✅ Version consistency (worker always matches the pdfjs-dist version)

## Setup
The worker file is automatically copied during `npm install` via the postinstall script. No manual setup required.

## Files Changed
- `src/components/DocumentUpload.tsx` - Updated worker source path
- `package.json` - Added postinstall script to copy worker file
- `scripts/postinstall.cjs` - Cross-platform script to copy worker file
- `public/pdf.worker.min.mjs` - Worker file (automatically copied, not committed to git)

## Testing
To verify the fix:
1. Run `npm install` to ensure the worker file is copied
2. Upload a PDF file on the Document Import page
3. The PDF should be processed without the "setting up fake worker failed" error
