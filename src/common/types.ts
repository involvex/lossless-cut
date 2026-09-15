import type { SupportedLanguage } from "./i18n.ts";

export type KeyboardAction =
  | "addSegment"
  | "togglePlayResetSpeed"
  | "togglePlayNoResetSpeed"
  | "reducePlaybackRate"
  | "reducePlaybackRateMore"
  | "increasePlaybackRate"
  | "increasePlaybackRateMore"
  | "timelineToggleComfortZoom"
  | "seekPreviousFrame"
  | "seekNextFrame"
  | "captureSnapshot"
  | "captureSnapshotToClipboard"
  | "setCutStart"
  | "setCutEnd"
  | "removeCurrentSegment"
  | "removeCurrentCutpoint"
  | "cleanupFilesDialog"
  | "splitCurrentSegment"
  | "focusSegmentAtCursor"
  | "selectSegmentsAtCursor"
  | "increaseRotation"
  | "goToTimecode"
  | "seekBackwards"
  | "seekBackwards2"
  | "seekBackwards3"
  | "seekBackwardsPercent"
  | "seekBackwardsPercent"
  | "seekBackwardsKeyframe"
  | "jumpCutStart"
  | "seekForwards"
  | "seekForwards2"
  | "seekForwards3"
  | "seekForwardsPercent"
  | "seekForwardsPercent"
  | "seekForwardsKeyframe"
  | "jumpCutEnd"
  | "jumpTimelineStart"
  | "jumpTimelineEnd"
  | "jumpFirstSegment"
  | "jumpPrevSegment"
  | "jumpSeekFirstSegment"
  | "jumpSeekPrevSegment"
  | "timelineZoomIn"
  | "timelineZoomIn"
  | "batchPreviousFile"
  | "jumpLastSegment"
  | "jumpNextSegment"
  | "jumpSeekLastSegment"
  | "jumpSeekNextSegment"
  | "timelineZoomOut"
  | "timelineZoomOut"
  | "batchNextFile"
  | "batchOpenSelectedFile"
  | "batchOpenPreviousFile"
  | "batchOpenNextFile"
  | "undo"
  | "undo"
  | "redo"
  | "redo"
  | "copySegmentsToClipboard"
  | "copySegmentsToClipboard"
  | "toggleFullscreenVideo"
  | "labelCurrentSegment"
  | "export"
  | "toggleKeyboardShortcuts"
  | "increaseVolume"
  | "decreaseVolume"
  | "toggleMuted"
  | "detectBlackScenes"
  | "detectSilentScenes"
  | "detectSceneChanges"
  | "toggleLastCommands"
  | "play"
  | "pause"
  | "reloadFile"
  | "html5ify"
  | "makeCursorTimeZero"
  | "togglePlayOnlyCurrentSegment"
  | "toggleLoopOnlyCurrentSegment"
  | "toggleLoopStartEndOnlyCurrentSegment"
  | "togglePlaySelectedSegments"
  | "toggleLoopSelectedSegments"
  | "editCurrentSegmentTags"
  | "duplicateCurrentSegment"
  | "reorderSegsByStartTime"
  | "invertAllSegments"
  | "fillSegmentsGaps"
  | "shiftAllSegmentTimes"
  | "alignSegmentTimesToKeyframes"
  | "readAllKeyframes"
  | "createSegmentsFromKeyframes"
  | "createFixedDurationSegments"
  | "createNumSegments"
  | "createFixedByteSizedSegments"
  | "createRandomSegments"
  | "shuffleSegments"
  | "combineOverlappingSegments"
  | "combineSelectedSegments"
  | "clearSegments"
  | "toggleSegmentsList"
  | "selectOnlyCurrentSegment"
  | "deselectAllSegments"
  | "selectAllSegments"
  | "toggleCurrentSegmentSelected"
  | "invertSelectedSegments"
  | "removeSelectedSegments"
  | "toggleStreamsSelector"
  | "extractAllStreams"
  | "showStreamsSelector"
  | "showIncludeExternalStreamsDialog"
  | "captureSnapshotAsCoverArt"
  | "extractCurrentSegmentFramesAsImages"
  | "extractSelectedSegmentsFramesAsImages"
  | "convertFormatBatch"
  | "convertFormatCurrentFile"
  | "fixInvalidDuration"
  | "decimate"
  | "closeBatch"
  | "concatBatch"
  | "toggleKeyframeCutMode"
  | "toggleCaptureFormat"
  | "toggleStripAudio"
  | "toggleStripVideo"
  | "toggleStripSubtitle"
  | "toggleStripThumbnail"
  | "toggleStripCurrentFilter"
  | "toggleStripAll"
  | "toggleDarkMode"
  | "setStartTimeOffset"
  | "toggleWaveformMode"
  | "toggleShowThumbnails"
  | "toggleShowKeyframes"
  | "toggleSettings"
  | "openSendReportDialog"
  | "openFilesDialog"
  | "openDirDialog"
  | "exportYouTube"
  | "closeCurrentFile"
  | "quit"
  | "selectAllMarkers"
  | "generateOverviewWaveform"
  | "selectSegmentsByLabel"
  | "selectSegmentsByExpr"
  | "labelSelectedSegments"
  | "mutateSegmentsByExpr";

export interface KeyBinding {
  keys: string;
  action: KeyboardAction;
}

export type FfmpegHwAccel =
  | "none"
  | "auto"
  | "vdpau"
  | "dxva2"
  | "d3d11va"
  | "vaapi"
  | "qsv"
  | "videotoolbox";

/**
 * The parts of an audio stream's ffprobe data needed to decide whether its channel layout
 * has to be fixed up before ffmpeg can resample or downmix it. See `getFixChannelLayoutFilter`.
 */
export interface AudioChannelInfo {
  channels?: number | undefined;
  channelLayout?: string | undefined;
}

export interface AudioStreamInfo extends AudioChannelInfo {
  index: number;
}

export type CaptureFormat = "jpeg" | "png" | "webp";

export type TimecodeFormat =
  | "timecodeWithDecimalFraction"
  | "frameCount"
  | "seconds"
  | "timecodeWithFramesFraction";

export type AvoidNegativeTs =
  | "make_zero"
  | "auto"
  | "make_non_negative"
  | "disabled";

export type ModifierKey = "ctrl" | "shift" | "alt" | "meta";

export type PreserveMetadata = "default" | "nonglobal" | "none";

export type WaveformMode = "big-waveform" | "waveform";

export type EnableImportChapters = "always" | "never" | "ask";

export interface Config {
  version: number;
  lastAppVersion: string;
  captureFormat: CaptureFormat;
  enableCustomOutDir: boolean;
  recentCustomOutDirs: string[];
  keyframeCut: boolean;
  autoMerge: boolean;
  autoDeleteMergedSegments: boolean;
  segmentsToChaptersOnly: boolean;
  enableSmartCut: boolean;
  timecodeFormat: TimecodeFormat;
  invertCutSegments: boolean;
  autoExportExtraStreams: boolean;
  exportConfirmEnabled: boolean;
  askBeforeClose: boolean;
  enableImportChapters: EnableImportChapters;
  enableAskForFileOpenAction: boolean;
  playbackVolume: number;
  autoSaveProjectFile: boolean;
  wheelSensitivity: number;
  waveformHeight: number;
  language: SupportedLanguage | null;
  ffmpegExperimental: boolean;
  preserveChapters: boolean;
  preserveMetadata: PreserveMetadata;
  preserveMetadataOnMerge: boolean;
  preserveMovData: boolean;
  movFastStart: boolean;
  avoidNegativeTs: AvoidNegativeTs;
  hideNotifications: "all" | undefined;
  hideOsNotifications: "all" | undefined;
  autoLoadTimecode: boolean;
  segmentsToChapters: boolean;
  simpleMode: boolean;
  /** todo: rename to cutFileTemplate */
  outSegTemplate: string | undefined;
  /** todo: rename to cutMergedFileTemplate */
  mergedFileTemplate: string | undefined;
  /** todo: rename to mergedFileTemplate */
  mergedFilesTemplate: string | undefined;
  keyboardSeekAccFactor: number;
  keyboardNormalSeekSpeed: number;
  keyboardSeekSpeed2: number;
  keyboardSeekSpeed3: number;
  treatInputFileModifiedTimeAsStart: boolean;
  treatOutputFileModifiedTimeAsStart: boolean | undefined | null;
  outFormatLocked: string | undefined;
  safeOutputFileName: boolean;
  windowBounds:
    | {
        x: number;
        y: number;
        width: number;
        height: number;
        isMaximized?: boolean;
      }
    | undefined;
  storeWindowBounds: boolean;
  enableAutoHtml5ify: boolean;
  keyBindings: KeyBinding[];
  customFfPath: string | undefined;
  storeProjectInWorkingDir: boolean;
  enableOverwriteOutput: boolean;
  mouseWheelZoomModifierKey: ModifierKey;
  mouseWheelFrameSeekModifierKey: ModifierKey;
  mouseWheelKeyframeSeekModifierKey: ModifierKey;
  segmentMouseModifierKey: ModifierKey;
  captureFrameMethod: "videotag" | "ffmpeg";
  captureFrameQuality: number;
  captureFrameFileNameFormat: "timestamp" | "index";
  enableNativeHevc: boolean;
  enableUpdateCheck: boolean;
  cleanupChoices: {
    trashTmpFiles: boolean;
    askForCleanup: boolean;
    closeFile: boolean;
    cleanupAfterExport?: boolean | undefined;
  };
  allowMultipleInstances: boolean;
  darkMode: boolean;
  preferStrongColors: boolean;
  outputFileNameMinZeroPadding: number;
  cutFromAdjustmentFrames: number;
  cutToAdjustmentFrames: number;
  invertTimelineScroll: boolean | undefined;
  waveformMode: WaveformMode | undefined;
  thumbnailsEnabled: boolean;
  keyframesEnabled: boolean;
  reducedMotion: "always" | "never" | "user";
  ffmpegHwaccel: FfmpegHwAccel;
  lossyMode: LossyMode;
  exportQueue: ExportQueue;
  projectTemplates: ProjectTemplate[];
  watchFolders: WatchFolder[];
  customPresets: Preset[];
}

export interface ApiActionRequest {
  id: number;
  action: string;
  args?: unknown[] | undefined;
}

export type Html5ifyMode =
  | "fastest"
  | "fast-audio-remux"
  | "fast-audio"
  | "fast"
  | "slow"
  | "slow-audio"
  | "slowest";

export type VideoEncoder =
  | "libx264"
  | "libx265"
  | "libsvtav1"
  | "h264_nvenc"
  | "hevc_nvenc"
  | "h264_qsv"
  | "hevc_qsv"
  | "h264_videotoolbox"
  | "hevc_videotoolbox"
  | "ffv1";

export type AudioEncoder =
  | "aac"
  | "libmp3lame"
  | "libopus"
  | "flac"
  | "ac3"
  | "eac3";

export type HwAccel =
  | "none"
  | "auto"
  | "nvenc"
  | "qsv"
  | "videotoolbox"
  | "vaapi"
  | "vdpau"
  | "dxva2"
  | "d3d11va";

export interface LossyMode {
  videoEncoder?: VideoEncoder | undefined;
  videoBitrate?: number | undefined;
  videoCrf?: number | undefined;
  videoPreset?:
    | "ultrafast"
    | "superfast"
    | "veryfast"
    | "faster"
    | "fast"
    | "medium"
    | "slow"
    | "slower"
    | "veryslow"
    | undefined;
  videoProfile?: string | undefined;
  videoLevel?: string | undefined;
  videoFilters?: string[] | undefined;
  audioEncoder?: AudioEncoder | undefined;
  audioBitrate?: number | undefined;
  audioChannels?: number | undefined;
  audioSampleRate?: number | undefined;
  audioFilters?: string[] | undefined;
  gifFps?: number | undefined;
  gifScale?: number | undefined;
  outputFormat?: string | undefined;
  hwaccel?: HwAccel | undefined;
  movFastStart?: boolean | undefined;
}

// Batch Processing Shared Types

export type ExportMode =
  | "segments_to_chapters"
  | "merge"
  | "merge+separate"
  | "separate";

export interface ExportQueueItem {
  id: string;
  filePath: string;
  segments: SegmentToExport[];
  outFormat: string | undefined;
  outputDir: string;
  cutFileTemplate: string;
  cutMergedFileTemplate: string;
  exportMode: ExportMode;
  lossyMode: LossyMode | undefined;
  presetId: string | undefined;
  keyframeCut: boolean;
  enableSmartCut: boolean;
  preserveMetadata: PreserveMetadata;
  preserveMovData: boolean;
  preserveChapters: boolean;
  movFastStart: boolean;
  avoidNegativeTs: AvoidNegativeTs;
  ffmpegExperimental: boolean;
  shortestFlag: boolean;
  rotation: number | undefined;
  status: "pending" | "processing" | "completed" | "failed" | "paused";
  progress: number;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  outputPaths?: string[];
}

export interface ExportQueue {
  items: ExportQueueItem[];
  isProcessing: boolean;
  currentItemId: string | undefined;
  autoProcess: boolean;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  segments: SegmentBase[];
  cutFileTemplate: string;
  cutMergedFileTemplate: string;
  mergedFileTemplate: string;
  exportSettings: {
    outFormat?: string;
    exportMode: ExportMode;
    lossyMode?: LossyMode;
    keyframeCut: boolean;
    enableSmartCut: boolean;
    preserveMetadata: PreserveMetadata;
    preserveMovData: boolean;
    preserveChapters: boolean;
    movFastStart: boolean;
    avoidNegativeTs: AvoidNegativeTs;
    ffmpegExperimental: boolean;
    shortestFlag: boolean;
  };
  createdAt: number;
  updatedAt: number;
}

export interface WatchFolder {
  id: string;
  path: string;
  enabled: boolean;
  templateId?: string | undefined;
  presetId?: string | undefined;
  outputDir: string;
  recursive: boolean;
  filePattern: string;
  lossyMode?: LossyMode | undefined;
  deleteAfterProcessing: boolean;
  processExisting: boolean;
}

export interface Preset {
  id: string;
  name: string;
  description?: string;
  category: "builtin" | "custom";
  platform?: "youtube" | "twitter" | "instagram" | "tiktok" | "generic";
  lossyMode: LossyMode;
  outFormat: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface BatchProcessOptions {
  inputPaths: string[];
  templateId?: string;
  presetId?: string;
  outputDir: string;
  exportMode: ExportMode;
  lossyMode?: LossyMode;
  recursive: boolean;
  filePattern: string;
}

export interface SegmentBase {
  start: number;
  end?: number | undefined;
  name?: string | undefined;
}

export interface SegmentToExport extends SegmentBase {
  originalIndex: number;
  name?: string | undefined;
  end: number;
}
