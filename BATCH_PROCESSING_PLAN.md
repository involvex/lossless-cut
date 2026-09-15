# Batch Processing Implementation Plan

## Overview
Implement batch processing features for LosslessCut:
1. **Export Queue** - Queue system for managing multiple exports
2. **Project Templates** - Templates with segment definitions
3. **Watch Folders** - Auto-process files in watched folders
4. **CLI Enhancements** - Improved command-line interface
5. **Presets** - Common encoding profiles

---

## Phase 1: Core Types and Export Queue

### 1.1 New Type Definitions
- Add types for ExportQueue, ProjectTemplate, WatchFolder, Preset
- Extend existing types in `src/renderer/src/types.ts`
- Add shared types in `src/common/types.ts`

### 1.2 Export Queue Hook (`useExportQueue`)
- Queue management (add, remove, reorder, pause/resume)
- Sequential processing with progress tracking
- Persistence via config store
- Integration with existing `useFfmpegOperations`

### 1.3 Export Queue UI Component
- New component `ExportQueue.tsx` for managing the queue
- Integration with existing ExportConfirm dialog
- Show in right sidebar or new panel

---

## Phase 2: Project Templates

### 2.1 Template Data Structure
- Template includes: segments, cut points, labels, export settings
- Save/load from JSON files
- Apply template to new files

### 2.2 Template Management Hook (`useProjectTemplates`)
- Save current project as template
- Load template and apply to current file
- Template list management (CRUD)

### 2.3 Template UI
- Template manager dialog
- Quick apply from ExportConfirm

---

## Phase 3: Watch Folders

### 3.1 Watch Folder Configuration
- Settings for watch folders (path, template, mode, output dir)
- Store in user settings

### 3.2 Watch Folder Service (Main Process)
- File system watcher using `fs.watch` or `chokidar`
- Auto-detect new media files
- Trigger processing via IPC

### 3.3 Watch Folder UI
- Settings panel for configuring watch folders
- Status indicator in UI

---

## Phase 4: CLI Enhancements

### 4.1 Batch Export Command
- `lossless-cut --batch-export <input-dir> [options]`
- Process multiple files with same settings

### 4.2 Template Application via CLI
- `lossless-cut --apply-template <template-file> <input-file>`

### 4.3 Watch Folder Daemon Mode
- `lossless-cut --watch-folders` (run as background daemon)

### 4.4 Queue Management Commands
- `lossless-cut --queue-add`, `--queue-list`, `--queue-process`

---

## Phase 5: Presets

### 5.1 Preset Data Structure
- Platform presets (YouTube, Twitter, Instagram, TikTok)
- Custom preset creation/saving
- Quick-select in ExportConfirm dialog

### 5.2 Preset Management Hook (`usePresets`)
- Built-in presets
- User custom presets
- Apply preset to export settings

### 5.3 Preset UI
- Preset selector in ExportConfirm
- Preset manager dialog

---

## Implementation Order

1. **Types** - Define all new types first
2. **Export Queue** - Core queue system with persistence
3. **Project Templates** - Template save/load/apply
4. **Presets** - Encoding profiles for quick selection
5. **Watch Folders** - Main process file watching
6. **CLI** - Command-line enhancements
7. **Integration** - Wire everything together in App.tsx

---

## Key Integration Points

### Existing Hooks to Extend/Use:
- `useFfmpegOperations` - Core export logic
- `useUserSettingsRoot` - Settings persistence
- `useSegments` - Segment management
- `useSegmentsAutoSave` - Project file handling

### IPC Communication:
- Main process ↔ Renderer for watch folders
- Queue processing events
- Progress reporting

### UI Components:
- ExportConfirm - Add preset selector, queue button
- New ExportQueue panel
- Settings - Watch folders, templates, presets tabs