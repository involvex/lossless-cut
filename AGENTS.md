# LosslessCut - Agent Instructions

This file provides comprehensive guidance for AI agents working on the LosslessCut codebase. LosslessCut is a cross-platform FFmpeg GUI for fast, lossless video/audio editing built with Electron, React, and TypeScript.

---

## Project Overview

**LosslessCut** is an Electron-based desktop application that provides a GUI for FFmpeg, enabling lossless cutting, trimming, merging, and remuxing of video/audio files. The main feature is lossless trimming/cutting which is extremely fast because it does direct data copy without re-encoding.

### Key Technologies

| Category | Technology |
|----------|------------|
| **Framework** | Electron 42+ with electron-vite |
| **Frontend** | React 19, TypeScript 6, Vite 7 |
| **Styling** | CSS Modules, Radix UI Themes, Motion (Framer Motion) |
| **State Management** | React Hooks, Immer, Context API |
| **Internationalization** | i18next, react-i18next |
| **Testing** | Vitest, Bun test runner |
| **Linting** | ESLint with @typescript-eslint, eslint-config-mifi |
| **Package Manager** | Bun (required >=1.3.0) |
| **Build** | electron-builder, electron-vite |
| **FFmpeg** | Bundled via custom builds (ffmpeg-build-script) |
| **Code Quality** | TypeScript strict mode, ESLint, Prettier (via eslint-config-mifi) |

### Architecture

```
src/
├── main/              # Electron main process (Node.js)
│   ├── index.ts       # Main entry point
│   ├── ffmpeg.ts      # FFmpeg operations
│   ├── httpServer.ts  # HTTP API server
│   ├── configStore.ts # Configuration persistence
│   ├── logger.ts      # Winston logger
│   └── menu.ts        # Application menu
├── preload/           # Preload scripts (bridge main/renderer)
├── renderer/          # React frontend (Chromium)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── util/          # Utility functions
│   │   ├── App.tsx        # Main app component
│   │   ├── ffmpeg.ts      # FFmpeg wrapper for renderer
│   │   ├── segments.ts    # Segment logic
│   │   └── types.ts       # TypeScript types
│   └── ...
└── common/            # Shared code between main/renderer
    ├── types.ts
    ├── util.ts
    └── ffprobe.ts
```

---

## Useful Commands

### Development

```bash
# Install dependencies (uses Bun)
bun install

# Install Electron dependencies
bun run install-electron

# Download FFmpeg for current platform
bun run download-ffmpeg-darwin-x64    # macOS Intel
bun run download-ffmpeg-darwin-arm64  # macOS Apple Silicon
bun run download-ffmpeg-linux-x64     # Linux x64
bun run download-ffmpeg-win32-x64     # Windows x64
bun run download-ffmpeg-win32-arm64   # Windows ARM64

# Run in development mode
bun run dev

# Build for production
bun run build

# Run all checks (typecheck, lint, test, build, i18n scan, docs)
bun run check

# Type checking only
bun run tsc

# Linting only
bun run lint

# Run tests
bun run test

# Generate app icon
bun run generate-icon

# Scan for new i18n strings
bun run scan-i18n

# Generate licenses file
bun run generate-licenses

# Generate documentation
bun run generate-docs
```

### Platform-Specific Builds

```bash
# macOS DMG (universal)
bun run pack-mac

# macOS App Store (development)
bun run pack-mas-dev

# Windows 7z (x64)
bun run pack-win

# Linux (tar.bz2, AppImage, Snap)
bun run pack-linux
```

### Release Process

```bash
# 1. Prepare release notes (manually from commit history)
# 2. Create version file: versions/x.y.z.md
# 3. Generate versions and commit
node script/generateVersions.ts
git add versions/*.md src/renderer/src/versions.json
git commit -m 'Update change log'

# 4. Version bump and tag
npm version minor    # or patch for hotfixes
git push --follow-tags

# 5. Wait for GitHub Actions build
# 6. Release draft on GitHub
```

---

## Development Guidelines

### Code Style & Standards

1. **TypeScript**: Strict mode enabled. Use explicit types, avoid `any`.
2. **ESLint**: Extends `eslint-config-mifi`. Run `bun run lint` before committing.
3. **Formatting**: Handled by ESLint (no separate Prettier).
4. **Imports**: Use path aliases (`@/`, `@common/`, `@main/`, `@preload/`, `@renderer/`).
5. **React**: Functional components with hooks. Use `useMemo`/`useCallback` for optimization.
6. **State**: Prefer local state + Context over global stores. Immer for immutable updates.
7. **Async**: Use `async/await`. Handle errors with try/catch. Use `withErrorHandling` hook.
8. **Testing**: Write tests for utility functions. Use Vitest for unit tests.

### Project Structure Conventions

- **Main process**: `src/main/` - Node.js environment, full Node.js API access
- **Renderer process**: `src/renderer/src/` - Browser environment (Chromium)
- **Preload**: `src/preload/` - Secure bridge between main/renderer
- **Common**: `src/common/` - Shared types and utilities
- **Components**: `src/renderer/src/components/` - Reusable UI components
- **Hooks**: `src/renderer/src/hooks/` - Custom React hooks (business logic)
- **Utils**: `src/renderer/src/util/` - Pure utility functions

### Electron-Specific Patterns

1. **IPC Communication**: Use `ipcMain`/`ipcRenderer` with typed message passing
2. **Remote API**: `@electron/remote` for main-process APIs in renderer (legacy, being phased out)
3. **New RPC**: `__electron_rpc__` handler for modern async IPC
4. **Context Isolation**: Disabled (`contextIsolation: false`) for legacy compatibility
5. **Node Integration**: Enabled in renderer (`nodeIntegration: true`)

### FFmpeg Integration

- FFmpeg binaries are bundled per-platform in `ffmpeg/{platform}-{arch}/`
- Main process spawns FFmpeg via `execa`
- Renderer communicates with main via IPC for FFmpeg operations
- Smart cut (re-encoding) uses `libx264`/`libx265`/`libsvtav1`
- Lossless operations use `-c copy` (stream copy)

### Internationalization (i18n)

- Strings in `locales/{lang}/translation.json`
- Use `useTranslation()` hook: `const { t } = useTranslation()`
- Scan for new strings: `bun run scan-i18n`
- Weblate integration for translations (auto PRs)

---

## Best Practices

### Performance

1. **Memoization**: Use `useMemo`/`useCallback` for expensive computations
2. **Virtualization**: Use `@tanstack/react-virtual` for long lists
3. **Lazy Loading**: Dynamic imports for heavy components
4. **Debouncing**: Use `lodash.debounce` for frequent updates (window resize, etc.)
5. **Web Workers**: Offload heavy parsing (evalWorker, waveform generation)

### Error Handling

1. **User-facing errors**: Use `errorToast`, `showExportFailedDialog`, `GenericDialog`
2. **Logging**: Use `logger` (Winston) with appropriate levels
3. **Error boundaries**: `ErrorDialog` component for React errors
4. **Graceful degradation**: Handle missing FFmpeg, unsupported formats

### Security

1. **No arbitrary code execution**: Avoid `eval`, `Function` constructor
2. **Input validation**: Use Zod schemas for IPC messages
3. **Path sanitization**: Validate file paths, prevent directory traversal
4. **Network isolation**: `--disable-networking` CLI flag for air-gapped environments
5. **CSP**: `webSecurity: !isDev` in production

### Testing

1. **Unit tests**: `src/**/*.test.ts` - pure functions, utilities
2. **Integration tests**: Test IPC, FFmpeg operations
3. **Run tests**: `bun run test` (uses Vitest)
4. **Coverage**: Not currently configured, but Vitest supports it

### Accessibility

1. **Keyboard navigation**: All features accessible via keyboard
2. **ARIA labels**: Use Radix UI primitives (accessible by default)
3. **Focus management**: Proper focus trapping in dialogs
4. **Screen readers**: Test with NVDA/VoiceOver

---

## Key Files Reference

### Configuration

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts, electron-builder config |
| `tsconfig.json` | TypeScript project references |
| `electron.vite.config.ts` | Vite config for main/preload/renderer |
| `.eslintrc.cjs` | ESLint configuration |
| `vitest.config.ts` | Vitest configuration |
| `i18next.config.ts` | i18n extraction config |

### Core Logic

| File | Purpose |
|------|---------|
| `src/main/index.ts` | Main process entry, window management, IPC |
| `src/main/ffmpeg.ts` | FFmpeg command building, execution |
| `src/main/httpServer.ts` | HTTP API server |
| `src/renderer/src/App.tsx` | Main React component, state orchestration |
| `src/renderer/src/segments.ts` | Segment logic (cut points, markers) |
| `src/renderer/src/ffmpeg.ts` | Renderer-side FFmpeg utilities |
| `src/renderer/src/hooks/useFfmpegOperations.ts` | Export/concat/extract operations |
| `src/renderer/src/hooks/useSegments.ts` | Segment state management |
| `src/renderer/src/util/outputNameTemplate.ts` | File naming templates |

### Build & Release

| File | Purpose |
|------|---------|
| `script/generateVersions.ts` | Generate changelog from commits |
| `script/postversion.ts` | Post-version hook |
| `script/generateIcon.ts` | Generate app icons |
| `script/generateLicenses.ts` | Generate licenses.txt |
| `script/generateDocs.ts` | Generate documentation |

---

## Common Workflows

### Adding a New Feature

1. Create issue/PR discussion first for large features
2. Add types in `src/common/types.ts` or `src/renderer/src/types.ts`
3. Implement main process logic in `src/main/`
4. Add IPC handlers in `src/main/index.ts`
5. Implement renderer hooks in `src/renderer/src/hooks/`
6. Create UI components in `src/renderer/src/components/`
7. Wire up in `App.tsx`
8. Add tests
9. Run `bun run check`
10. Update documentation if needed

### Adding a New Keyboard Shortcut

1. Add action to `KeyboardAction` type in `src/common/types.ts`
2. Add default binding in `src/renderer/src/util/constants.ts`
3. Handle in `useKeyboard.ts` hook
4. Add to `KeyboardShortcuts` component for UI

### Adding a New Export Format

1. Add format to `outFormats.ts`
2. Update `getDefaultOutFormat` in `ffmpeg.ts`
3. Add FFmpeg parameters in `ffmpegParameters.ts`
4. Test with various codecs/containers

### Debugging

```bash
# Enable debug logging
DEBUG=* bun run dev

# Main process debugging
# Use VS Code launch config or `node --inspect`

# Renderer debugging
# Open DevTools in app (Ctrl+Shift+I)
# Or use React DevTools (auto-installed in dev)
```

---

## Platform-Specific Notes

### macOS

- App Store builds: `mas` target, hardened runtime, notarization
- Development provisioning profile: `LosslessCut_Dev.provisionprofile` (gitignored)
- Minimum version: `LSMinimumSystemVersion` in Info.plist
- File associations: Video/audio UTIs in `package.json` build.mac

### Windows

- Targets: 7z (portable), AppX (MS Store)
- AppX requires Desktop Bridge (`runFullTrust` capability)
- FFmpeg DLLs bundled in `ffmpeg/win32-{arch}/lib/`
- File associations in `package.json` build.win

### Linux

- Targets: tar.bz2, AppImage, Snap
- Snap plugs: `default`, `removable-media`
- AppImage toolset: `1.0.3`
- No auto-update (handled by package managers)

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | `development`/`production` |
| `ELECTRON_DISABLE_SECURITY_WARNINGS` | Suppress security warnings in dev |
| Custom: `--disable-networking` | Disable all network access |
| Custom: `--config-dir` | Custom config directory |
| Custom: `--settings-json` | Inline settings JSON |
| Custom: `--lossy-mode` | Enable lossy re-encode mode |
| Custom: `--http-api` | Enable HTTP API server |

---

## Troubleshooting Common Issues

| Issue | Solution |
|-------|----------|
| FFmpeg not found | Run `bun run download-ffmpeg-<platform>` |
| TypeScript errors | Run `bun run tsc` to see full errors |
| Lint failures | Run `bun run lint --fix` |
| Test failures | Run `bun run test -- --reporter=verbose` |
| Build fails | Clean with `bun run clean` then rebuild |
| i18n missing strings | Run `bun run scan-i18n` |
| Electron not launching | Check `electron-builder` version compatibility |

---

## Contribution Guidelines

1. **Small PRs preferred** - Large PRs less likely to be merged
2. **Create issue first** - Discuss viability before implementing
3. **Follow existing patterns** - Consistency over novelty
4. **Update docs** - README, docs/, CHANGELOG for user-facing changes
5. **Test manually** - Verify on target platforms when possible
6. **No squash merges** for Weblate translation PRs (rebase+merge)

---

## Resources

- **Website**: https://losslesscut.app
- **Repository**: https://github.com/mifi/lossless-cut
- **Documentation**: https://github.com/mifi/lossless-cut/tree/master/docs
- **Issues**: https://github.com/mifi/lossless-cut/issues
- **Discord**: https://discord.gg/fhnEREfUJ3
- **FFmpeg Builds**: https://github.com/mifi/ffmpeg-builds
- **Electron Docs**: https://www.electronjs.org/docs
- **React Docs**: https://react.dev

---

## Agent-Specific Notes

### For Code Generation

- Follow existing component patterns in `src/renderer/src/components/`
- Use hooks for business logic, components for UI
- Prefer composition over inheritance
- Use TypeScript discriminated unions for state machines

### For Refactoring

- Run `bun run check` before and after changes
- Update types first, then implementation
- Maintain backward compatibility for IPC messages
- Test on all three platforms if possible

### For Reviews

- Check TypeScript strict compliance
- Verify ESLint passes
- Ensure tests cover new logic
- Validate FFmpeg command construction
- Check for memory leaks (event listeners, intervals)

---

*Last updated: 2026-09-14*
*Project version: 3.69.0*