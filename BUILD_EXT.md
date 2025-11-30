# Building Excalidraw for Chrome Extension (CSP Compliance)

This document describes how to build Excalidraw with CSP (Content Security Policy) compliance for use in Chrome extensions.

## Overview

Chrome extensions with Manifest V3 have strict CSP requirements that prevent:
- Loading external resources (fonts, scripts, iframes)
- Dynamic code execution
- Remote content loading

This build configuration allows you to disable features that violate these policies.

## Environment Variables

### DISABLE_EMBEDDED

Controls whether embedded content (iframes, external embeds) is enabled.

- **Default**: `false`
- **For Chrome Extension**: Set to `true`
- **Effect**: 
  - Hides the embedded tool button in the toolbar
  - Prevents creation of embedded elements
  - Existing embedded elements in loaded files are ignored

### DISABLE_FONT_CDN

Controls whether fonts are loaded from CDN.

- **Default**: `false`
- **For Chrome Extension**: Set to `true`
- **Effect**:
  - Skips all font CDN requests
  - Uses system fonts or pre-bundled fonts
  - Prevents CSP violations from font loading

## Configuration Files

### 1. Environment Files

The environment variables are defined in:
- `.env.development` - Development environment settings
- `.env.production` - Production environment settings

Both files now include:
```bash
# CSP Compliance flags for Chrome Extension
DISABLE_EMBEDDED=false
DISABLE_FONT_CDN=false
```

### 2. Environment Variable Parser

The `packages/excalidraw/env.cjs` file has been updated to allow command-line environment variables to override values from `.env` files:

```javascript
// Override with process.env values if they exist
// This allows command-line environment variables to take precedence
if (process.env.DISABLE_EMBEDDED !== undefined) {
  envVars.DISABLE_EMBEDDED = process.env.DISABLE_EMBEDDED;
}
if (process.env.DISABLE_FONT_CDN !== undefined) {
  envVars.DISABLE_FONT_CDN = process.env.DISABLE_FONT_CDN;
}
```

This enables the `build:ext` command to set these variables via the command line.

### 3. Build Script

The `scripts/buildPackage.js` file has been updated to inject these environment variables as global window properties during the build process.

The variables are injected using esbuild's `define` option:
```javascript
define: {
  "window.DISABLE_EMBEDDED": JSON.stringify(ENV_VARS.production.DISABLE_EMBEDDED === "true"),
  "window.DISABLE_FONT_CDN": JSON.stringify(ENV_VARS.production.DISABLE_FONT_CDN === "true"),
}
```

### 4. Vite Configuration

The `excalidraw-app/vite.config.mts` file has been updated to support these variables for the app build.

### 5. Type Definitions

The `packages/excalidraw/global.d.ts` file includes type definitions for these variables:
```typescript
interface Window {
  DISABLE_EMBEDDED: boolean | undefined;
  DISABLE_FONT_CDN: boolean | undefined;
  // ... other properties
}
```

## Build Commands

### Standard Build (All Features Enabled)

```bash
# Build all packages
yarn build:packages

# Build just the excalidraw package
yarn build:excalidraw
```

### Extension Build (CSP Compliant)

```bash
# Build with CSP compliance (disables embedded and font CDN)
yarn build:ext
```

This is equivalent to:
```bash
DISABLE_EMBEDDED=true DISABLE_FONT_CDN=true yarn build:packages
```

### Custom Build

You can set the environment variables individually:

```bash
# Disable only embedded content
DISABLE_EMBEDDED=true yarn build:packages

# Disable only font CDN
DISABLE_FONT_CDN=true yarn build:packages

# Disable both
DISABLE_EMBEDDED=true DISABLE_FONT_CDN=true yarn build:packages
```

## Build Output

After running the build, the output will be in:
```
packages/excalidraw/dist/
├── dev/          # Development build (with source maps)
├── prod/         # Production build (minified)
└── types/        # TypeScript type definitions
```

## Integration with Chrome Extension

### Method 1: Local File Reference

In your Chrome extension's `package.json`:

```json
{
  "dependencies": {
    "@excalidraw/excalidraw": "file:../excalidraw/packages/excalidraw"
  }
}
```

### Method 2: Yarn Link

```bash
# In the excalidraw project
cd packages/excalidraw
yarn link

# In your Chrome extension project
yarn link "@excalidraw/excalidraw"
```

### Method 3: Private npm Registry

Publish the built package to your private npm registry.

## Verification

### 1. Check Environment Variables

Verify the variables are being read correctly:

```bash
node -e "const { parseEnvVariables } = require('./packages/excalidraw/env.cjs'); const env = parseEnvVariables('.env.development'); console.log('DISABLE_EMBEDDED:', env.DISABLE_EMBEDDED); console.log('DISABLE_FONT_CDN:', env.DISABLE_FONT_CDN);"
```

### 2. Check Build Output

After building, verify the dist directory exists:

```bash
ls -la packages/excalidraw/dist/
```

### 3. Verify Environment Variables in Build

Check that the variables are correctly injected:

```bash
# For standard build (should show "false")
yarn build:excalidraw
grep -o "DISABLE_EMBEDDED:\"[^\"]*\",DISABLE_FONT_CDN:\"[^\"]*\"" packages/excalidraw/dist/prod/*.js | head -1

# For extension build (should show "true")
yarn build:ext
grep -o "DISABLE_EMBEDDED:\"[^\"]*\",DISABLE_FONT_CDN:\"[^\"]*\"" packages/excalidraw/dist/prod/*.js | head -1
```

### 4. Test in Chrome Extension

1. Build with `yarn build:ext`
2. Link or copy to your Chrome extension project
3. Build your Chrome extension
4. Load the extension in Chrome
5. Open DevTools and check:
   - No CSP violations in the console
   - No network requests to font CDNs
   - Embedded tool button is not visible
   - Core drawing features work correctly

## Troubleshooting

### Build Fails with Type Errors

If you see errors about duplicate `Window` interface declarations:

1. Clean all build artifacts: `yarn rm:build`
2. Try building again: `yarn build:ext`

The issue is usually caused by stale type definition files from previous builds.

### Environment Variables Not Applied

1. Check that the variables are set in the correct `.env` file
2. Verify the syntax in `packages/excalidraw/env.cjs`
3. Try setting variables directly in the command line: `DISABLE_EMBEDDED=true DISABLE_FONT_CDN=true yarn build:packages`

### CSP Violations Still Occur

1. Verify you built with `yarn build:ext` or with both flags set to `true`
2. Check that your Chrome extension is using the newly built package
3. Clear your extension's cache and reload
4. Verify the build output contains the correct values (see Verification section above)

### cross-env Command Not Found

The `cross-env` package should already be installed as a dev dependency. If not:

```bash
yarn add -D cross-env
```

## Updating from Upstream

When syncing with the upstream Excalidraw repository:

1. Merge upstream changes to your fork
2. Verify the environment variable checks are still in place:
   - `packages/excalidraw/fonts/Fonts.ts`
   - `packages/excalidraw/components/Actions.tsx`
   - `packages/element/src/embeddable.ts`
3. Verify the build configuration is intact:
   - `packages/excalidraw/env.cjs`
   - `scripts/buildPackage.js`
   - `excalidraw-app/vite.config.mts`
4. Rebuild with `yarn build:ext`
5. Test in your Chrome extension

## Notes

- The environment variables are injected at build time, not runtime
- You must rebuild after changing environment variables
- The default values (`false`) maintain full Excalidraw functionality
- Setting both to `true` ensures maximum CSP compliance for Chrome extensions
- The `build:ext` command uses `cross-env` for cross-platform compatibility

## Summary of Changes

This build configuration includes the following modifications:

1. **Environment Variables**: Added `DISABLE_EMBEDDED` and `DISABLE_FONT_CDN` to `.env` files
2. **Parser Enhancement**: Modified `env.cjs` to allow command-line overrides
3. **Build Script**: Updated `buildPackage.js` to inject variables as window properties
4. **Vite Config**: Updated `vite.config.mts` to support the variables
5. **Type Definitions**: Added type declarations in `global.d.ts`
6. **Build Command**: Added `build:ext` script to `package.json`

All changes are designed to be maintainable and easy to sync with upstream updates.
