import { formatFfmpegNumber } from "../../common/util";
import type {
  LossyMode,
  VideoEncoder,
  AudioEncoder,
  HwAccel,
} from "../../common/types";

export interface BuildLossyFfmpegArgsParams {
  inputPath: string;
  outputPath: string;
  lossyMode: LossyMode;
  cutFrom: number;
  cutTo: number;
  fileDuration: number | undefined;
  videoStreamIndex: number | undefined;
  audioStreamIndexes: Set<number>;
  subtitleStreamIndexes: Set<number>;
  copyFileStreams: { path: string; streamIds: number[] }[];
  outFormat: string;
  shortestFlag: boolean;
  ffmpegExperimental: boolean;
  preserveMetadata: "default" | "nonglobal" | "none";
  preserveMovData: boolean;
  preserveChapters: boolean;
  movFastStart: boolean;
  rotation: number | undefined;
  chaptersPath: string | undefined;
}

const movencFormats = new Set([
  "3g2",
  "3gp",
  "f4v",
  "ipod",
  "ismv",
  "mov",
  "mp4",
  "psp",
]);
const matroskaencFormats = new Set(["matroska", "webm"]);

function getMovFlags({
  outFormat,
  preserveMovData,
  movFastStart,
}: {
  outFormat: string | undefined;
  preserveMovData: boolean;
  movFastStart: boolean;
}) {
  if (outFormat != null && !movencFormats.has(outFormat)) return [];
  const flags: string[] = [];
  if (preserveMovData) flags.push("use_metadata_tags");
  if (movFastStart) flags.push("+faststart");
  if (flags.length === 0) return [];
  return flags.flatMap((flag) => ["-movflags", flag]);
}

function getMatroskaFlags(outFormat: string | undefined) {
  if (outFormat != null && !matroskaencFormats.has(outFormat)) return [];
  return ["-default_mode", "infer_no_subs"];
}

function getExperimentalArgs(ffmpegExperimental: boolean) {
  return ffmpegExperimental ? ["-strict", "experimental"] : [];
}

function getVideoTimescaleArgs(videoTimebase: number | undefined) {
  return videoTimebase != null
    ? ["-video_track_timescale", String(videoTimebase)]
    : [];
}

function getHwaccelDecodeArgs(hwaccel: HwAccel | undefined): string[] {
  if (!hwaccel || hwaccel === "none" || hwaccel === "auto") return [];
  const map: Record<HwAccel, string[]> = {
    nvenc: ["-hwaccel", "cuda"],
    qsv: ["-hwaccel", "qsv"],
    videotoolbox: ["-hwaccel", "videotoolbox"],
    vaapi: ["-hwaccel", "vaapi"],
    vdpau: ["-hwaccel", "vdpau"],
    dxva2: ["-hwaccel", "dxva2"],
    d3d11va: ["-hwaccel", "d3d11va"],
    none: [],
    auto: [],
  };
  return map[hwaccel] ?? [];
}

function getEncoderName(
  encoder: VideoEncoder | undefined,
  hwaccel: HwAccel | undefined,
): string {
  if (!encoder) return "libx264";
  if (hwaccel && hwaccel !== "none" && hwaccel !== "auto") return encoder;
  return encoder;
}

function getAudioEncoderName(encoder: AudioEncoder | undefined): string {
  return encoder ?? "aac";
}

function buildVideoFilterChain(
  filters: string[] | undefined,
): string | undefined {
  if (!filters || filters.length === 0) return undefined;
  return filters.join(",");
}

function buildAudioFilterChain(
  filters: string[] | undefined,
): string | undefined {
  if (!filters || filters.length === 0) return undefined;
  return filters.join(",");
}

export function buildLossyFfmpegArgs({
  inputPath,
  outputPath,
  lossyMode,
  cutFrom,
  cutTo,
  fileDuration,
  videoStreamIndex,
  audioStreamIndexes,
  subtitleStreamIndexes,
  copyFileStreams,
  outFormat,
  shortestFlag,
  ffmpegExperimental,
  preserveMetadata,
  preserveMovData,
  preserveChapters,
  movFastStart,
  rotation,
  chaptersPath,
}: BuildLossyFfmpegArgsParams): string[] {
  const {
    videoEncoder,
    videoBitrate,
    videoCrf,
    videoPreset,
    videoProfile,
    videoLevel,
    videoFilters,
    audioEncoder,
    audioBitrate,
    audioChannels,
    audioSampleRate,
    audioFilters,
    gifFps,
    gifScale,
    outputFormat,
    hwaccel,
  } = lossyMode;

  const effectiveOutFormat = outputFormat ?? outFormat;
  const isGif = effectiveOutFormat === "gif";

  const cuttingStart = cutFrom > 0;
  const cuttingEnd = fileDuration != null && cutTo < fileDuration;

  const cutDuration = cuttingEnd
    ? cutTo - cutFrom
    : (fileDuration ?? cutTo) - cutFrom;

  const videoFilterChain = buildVideoFilterChain(videoFilters);
  const audioFilterChain = buildAudioFilterChain(audioFilters);

  const hwaccelDecodeArgs = getHwaccelDecodeArgs(hwaccel);

  const videoEncoderName = getEncoderName(videoEncoder, hwaccel);
  const audioEncoderName = getAudioEncoderName(audioEncoder);

  const args: string[] = ["-hide_banner", "-y", ...hwaccelDecodeArgs];

  if (cuttingStart) {
    args.push("-ss", formatFfmpegNumber(cutFrom));
  }

  args.push("-i", inputPath);

  if (!cuttingStart) {
    args.push("-ss", formatFfmpegNumber(cutFrom));
  }

  if (cuttingEnd) {
    args.push("-t", formatFfmpegNumber(cutDuration));
  }

  if (rotation !== undefined) {
    args.push("-display_rotation:v:0", String(360 - rotation));
  }

  if (isGif) {
    const fps = gifFps ?? 10;
    const scale = gifScale ?? 1;
    const scaleFilter =
      scale !== 1 ? `scale=iw*${scale}:ih*${scale}:flags=lanczos` : undefined;
    const paletteFilters = [`fps=${fps}`, scaleFilter]
      .filter(Boolean)
      .join(",");

    // Two-pass GIF encoding
    args.push(
      "-filter_complex",
      `[0:v]${paletteFilters},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
      "-f",
      "gif",
    );
  } else {
    // Video encoding
    if (videoStreamIndex != null) {
      const videoArgs: string[] = ["-c:v", videoEncoderName];

      if (videoBitrate) {
        videoArgs.push("-b:v", String(videoBitrate));
      } else if (videoCrf != null) {
        videoArgs.push("-crf", String(videoCrf));
      }

      if (videoPreset) videoArgs.push("-preset", videoPreset);
      if (videoProfile) videoArgs.push("-profile:v", videoProfile);
      if (videoLevel) videoArgs.push("-level", videoLevel);

      if (videoFilterChain) {
        videoArgs.push("-vf", videoFilterChain);
      }

      args.push(...videoArgs);
    } else {
      args.push("-vn");
    }

    // Audio encoding
    if (audioStreamIndexes.size > 0) {
      const audioArgs: string[] = ["-c:a", audioEncoderName];

      if (audioBitrate) audioArgs.push("-b:a", String(audioBitrate));
      if (audioChannels) audioArgs.push("-ac", String(audioChannels));
      if (audioSampleRate) audioArgs.push("-ar", String(audioSampleRate));

      if (audioFilterChain) {
        audioArgs.push("-af", audioFilterChain);
      }

      args.push(...audioArgs);
    } else {
      args.push("-an");
    }

    // Subtitles - copy by default
    if (subtitleStreamIndexes.size > 0) {
      args.push("-c:s", "copy");
    } else {
      args.push("-sn");
    }

    // Map streams
    for (const { streamIds } of copyFileStreams) {
      for (const streamId of streamIds) {
        args.push("-map", `0:${streamId}`);
      }
    }

    // Metadata preservation
    switch (preserveMetadata) {
      case "default": {
        args.push("-map_metadata", "0");

        break;
      }
      case "none": {
        args.push("-map_metadata", "-1");

        break;
      }
      case "nonglobal": {
        args.push("-map_metadata:g", "-1");

        break;
      }
      // No default
    }

    if (preserveChapters && chaptersPath) {
      args.push("-map_chapters", String(copyFileStreams.length));
    } else if (!preserveChapters) {
      args.push("-map_chapters", "-1");
    }

    if (shortestFlag) {
      args.push("-shortest");
    }

    args.push(
      ...getMovFlags({
        outFormat: effectiveOutFormat,
        preserveMovData,
        movFastStart,
      }),
      ...getMatroskaFlags(effectiveOutFormat),
      "-ignore_unknown",
      ...getExperimentalArgs(ffmpegExperimental),
      ...getVideoTimescaleArgs(undefined),
    );
  }

  args.push("-f", effectiveOutFormat, outputPath);
  return args;
}

export function buildGifFirstPassArgs({
  inputPath,
  outputPath,
  lossyMode,
  cutFrom,
  cutTo,
  fileDuration,
}: Omit<
  BuildLossyFfmpegArgsParams,
  | "audioStreamIndexes"
  | "subtitleStreamIndexes"
  | "copyFileStreams"
  | "outFormat"
  | "shortestFlag"
  | "ffmpegExperimental"
  | "preserveMetadata"
  | "preserveMovData"
  | "preserveChapters"
  | "movFastStart"
  | "rotation"
  | "chaptersPath"
  | "videoStreamIndex"
>): string[] {
  const { gifFps, gifScale, hwaccel } = lossyMode;
  const fps = gifFps ?? 10;
  const scale = gifScale ?? 1;
  const scaleFilter =
    scale !== 1 ? `scale=iw*${scale}:ih*${scale}:flags=lanczos` : undefined;
  const paletteFilters = [`fps=${fps}`, scaleFilter].filter(Boolean).join(",");

  const hwaccelDecodeArgs = getHwaccelDecodeArgs(hwaccel);

  const args: string[] = ["-hide_banner", "-y", ...hwaccelDecodeArgs];

  if (cutFrom > 0) {
    args.push("-ss", formatFfmpegNumber(cutFrom));
  }

  args.push("-i", inputPath);

  if (cutFrom > 0) {
    args.push("-ss", "0");
  }

  if (fileDuration != null && cutTo < fileDuration) {
    args.push("-t", formatFfmpegNumber(cutTo - cutFrom));
  }

  args.push(
    "-filter_complex",
    `[0:v]${paletteFilters},palettegen`,
    "-f",
    "image2",
    "-vcodec",
    "png",
    outputPath,
  );

  return args;
}

export function buildGifSecondPassArgs({
  inputPath,
  palettePath,
  outputPath,
  lossyMode,
  cutFrom,
  cutTo,
  fileDuration,
}: {
  inputPath: string;
  palettePath: string;
  outputPath: string;
  lossyMode: LossyMode;
  cutFrom: number;
  cutTo: number;
  fileDuration: number | undefined;
}): string[] {
  const { gifFps, gifScale, hwaccel } = lossyMode;
  const fps = gifFps ?? 10;
  const scale = gifScale ?? 1;
  const scaleFilter =
    scale !== 1 ? `scale=iw*${scale}:ih*${scale}:flags=lanczos` : undefined;
  const paletteFilters = [`fps=${fps}`, scaleFilter].filter(Boolean).join(",");

  const hwaccelDecodeArgs = getHwaccelDecodeArgs(hwaccel);

  const args: string[] = ["-hide_banner", "-y", ...hwaccelDecodeArgs];

  if (cutFrom > 0) {
    args.push("-ss", formatFfmpegNumber(cutFrom));
  }

  args.push("-i", inputPath, "-i", palettePath);

  if (cutFrom > 0) {
    args.push("-ss", "0");
  }

  if (fileDuration != null && cutTo < fileDuration) {
    args.push("-t", formatFfmpegNumber(cutTo - cutFrom));
  }

  args.push(
    "-filter_complex",
    `[0:v]${paletteFilters}[1:v]paletteuse`,
    "-f",
    "gif",
    outputPath,
  );

  return args;
}

export function getDefaultLossyMode(): LossyMode {
  return {
    videoEncoder: "libx264",
    videoCrf: 23,
    videoPreset: "medium",
    audioEncoder: "aac",
    audioBitrate: 128000,
    gifFps: 10,
    gifScale: 1,
    hwaccel: "auto",
  };
}

export function getPresetLossyMode(preset: string): LossyMode {
  const presets: Record<string, LossyMode> = {
    "youtube-1080p": {
      videoEncoder: "libx264",
      videoBitrate: 8000000,
      videoPreset: "slow",
      videoProfile: "high",
      videoLevel: "4.2",
      audioEncoder: "aac",
      audioBitrate: 192000,
      audioChannels: 2,
      audioSampleRate: 48000,
      outputFormat: "mp4",
      movFastStart: true,
      hwaccel: "auto",
    },
    "youtube-4k": {
      videoEncoder: "libx265",
      videoBitrate: 35000000,
      videoPreset: "slow",
      videoProfile: "main",
      videoLevel: "5.1",
      audioEncoder: "aac",
      audioBitrate: 320000,
      audioChannels: 2,
      audioSampleRate: 48000,
      outputFormat: "mp4",
      movFastStart: true,
      hwaccel: "auto",
    },
    "instagram-reel": {
      videoEncoder: "libx264",
      videoBitrate: 3500000,
      videoPreset: "medium",
      videoProfile: "high",
      videoLevel: "4.1",
      videoFilters: [
        "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
      ],
      audioEncoder: "aac",
      audioBitrate: 128000,
      audioChannels: 2,
      audioSampleRate: 44100,
      outputFormat: "mp4",
      movFastStart: true,
      hwaccel: "auto",
    },
    tiktok: {
      videoEncoder: "libx264",
      videoBitrate: 4000000,
      videoPreset: "medium",
      videoProfile: "high",
      videoLevel: "4.1",
      videoFilters: [
        "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
      ],
      audioEncoder: "aac",
      audioBitrate: 128000,
      audioChannels: 2,
      audioSampleRate: 44100,
      outputFormat: "mp4",
      movFastStart: true,
      hwaccel: "auto",
    },
    twitter: {
      videoEncoder: "libx264",
      videoBitrate: 5000000,
      videoPreset: "medium",
      videoProfile: "high",
      videoLevel: "4.1",
      audioEncoder: "aac",
      audioBitrate: 128000,
      audioChannels: 2,
      audioSampleRate: 44100,
      outputFormat: "mp4",
      movFastStart: true,
      hwaccel: "auto",
    },
    gif: {
      outputFormat: "gif",
      gifFps: 10,
      gifScale: 0.5,
      hwaccel: "auto",
    },
    archive: {
      videoEncoder: "ffv1",
      videoProfile: "main",
      audioEncoder: "flac",
      audioChannels: 2,
      audioSampleRate: 48000,
      outputFormat: "mkv",
      hwaccel: "none",
    },
    "audio-only-opus": {
      videoEncoder: undefined,
      audioEncoder: "libopus",
      audioBitrate: 128000,
      audioChannels: 2,
      audioSampleRate: 48000,
      outputFormat: "opus",
      hwaccel: "none",
    },
    "audio-only-mp3": {
      videoEncoder: undefined,
      audioEncoder: "libmp3lame",
      audioBitrate: 192000,
      audioChannels: 2,
      audioSampleRate: 44100,
      outputFormat: "mp3",
      hwaccel: "none",
    },
  };

  return presets[preset] ?? getDefaultLossyMode();
}
