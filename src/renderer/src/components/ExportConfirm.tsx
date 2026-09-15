import type { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";
import { memo, useCallback, useMemo, useState } from "react";
import {
  FaExclamationTriangle,
  FaInfoCircle,
  FaRegCheckCircle,
} from "react-icons/fa";
import i18n from "i18next";
import { useTranslation, Trans } from "react-i18next";
import { IoIosHelpCircle, IoIosSettings } from "react-icons/io";
import type { SweetAlertIcon } from "sweetalert2";

import ExportButton from "./ExportButton";
import ExportModeButton from "./ExportModeButton";
import FileNameTemplateEditor from "./FileNameTemplateEditor";
import HighlightedText from "./HighlightedText";
import Select from "./Select";
import Switch from "./Switch";

import { primaryTextColor, warningColor } from "../colors";
import { withBlur } from "../util";
import getSwal from "../swal";
import { isMov as ffmpegIsMov } from "../util/streams";
import useUserSettings from "../hooks/useUserSettings";
import styles from "./ExportConfirm.module.css";
import type { SegmentToExport } from "../types";
import type { GenerateOutFileNames } from "../util/outputNameTemplate";
import {
  defaultCutFileTemplate,
  defaultCutMergedFileTemplate,
} from "../util/outputNameTemplate";
import type { FFprobeStream } from "../../../common/ffprobe";
import type {
  AvoidNegativeTs,
  PreserveMetadata,
  LossyMode,
} from "../../../common/types";
import TextInput from "./TextInput";
import type { UseSegments } from "../hooks/useSegments";
import { usePresets } from "../hooks/usePresets";
import ExportSheet from "./ExportSheet";
import ToggleExportConfirm from "./ToggleExportConfirm";
import AnimatedTr from "./AnimatedTr";
import type { Frame } from "../ffmpeg";
import type { FindNearestKeyframeTime } from "../hooks/useKeyframes";
import { troubleshootingUrl } from "../../../common/constants";
import OutDirSelector from "./OutDirSelector";
import mainApi from "../mainApi";

const adjustCutFromValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const adjustCutToValues = [
  -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
];

const HelpIcon = ({
  onClick,
  style,
}: {
  onClick: () => void;
  style?: CSSProperties;
}) => (
  <IoIosHelpCircle
    role="button"
    onClick={withBlur(onClick)}
    style={{
      cursor: "pointer",
      color: primaryTextColor,
      verticalAlign: "middle",
      fontSize: "1.5em",
      ...style,
    }}
  />
);

function ShiftTimes({
  values,
  num,
  setNum,
}: {
  values: number[];
  num: number;
  setNum: (n: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <Select
      value={num}
      onChange={(e) => setNum(Number(e.target.value))}
      style={{ height: 20, marginLeft: 5 }}
    >
      {values.map((v) => (
        <option key={v} value={v}>
          {t("{{numFrames}} frames", {
            numFrames: v >= 0 ? `+${v}` : v,
            count: v,
          })}
        </option>
      ))}
    </Select>
  );
}

const videoEncoders = [
  "libx264",
  "libx265",
  "libsvtav1",
  "h264_nvenc",
  "hevc_nvenc",
  "h264_qsv",
  "hevc_qsv",
  "h264_videotoolbox",
  "hevc_videotoolbox",
  "ffv1",
] as const;

const audioEncoders = [
  "aac",
  "libmp3lame",
  "libopus",
  "flac",
  "ac3",
  "eac3",
] as const;

const hwAccels = [
  "none",
  "auto",
  "nvenc",
  "qsv",
  "videotoolbox",
  "vaapi",
  "vdpau",
  "dxva2",
  "d3d11va",
] as const;

const videoPresets = [
  "ultrafast",
  "superfast",
  "veryfast",
  "faster",
  "fast",
  "medium",
  "slow",
  "slower",
  "veryslow",
] as const;

interface LossyModeSectionProps {
  lossyMode: LossyMode;
  updateLossyMode: (updates: Partial<LossyMode>) => void;
  outFormat: string | undefined;
  t: ReturnType<typeof useTranslation>["t"];
  showHelpText: (options: {
    icon?: SweetAlertIcon;
    timer?: number;
    text: string;
  }) => void;
}

function LossyModeSection({
  lossyMode,
  updateLossyMode,
  outFormat,
  t,
  showHelpText,
}: LossyModeSectionProps) {
  const isGif = outFormat === "gif";
  const isVideo = !isGif;

  const onLossyModeHelpPress = useCallback(() => {
    showHelpText({
      text: t(
        "Lossy mode re-encodes the video/audio with the selected encoder and settings. This allows applying filters, changing codecs, or creating GIFs. Note: this is slower than lossless cutting.",
      ),
    });
  }, [showHelpText, t]);

  const onVideoEncoderHelpPress = useCallback(() => {
    showHelpText({
      text: t(
        "Select the video encoder. libx264/libx265 are CPU-based. nvenc/qsv/videotoolbox use hardware acceleration. ffv1 is lossless.",
      ),
    });
  }, [showHelpText, t]);

  const onVideoBitrateHelpPress = useCallback(() => {
    showHelpText({
      text: t(
        "Target video bitrate in kbit/s. Leave empty to use CRF-based quality instead.",
      ),
    });
  }, [showHelpText, t]);

  const onVideoCrfHelpPress = useCallback(() => {
    showHelpText({
      text: t(
        "Constant Rate Factor (quality-based). Lower = better quality. Typical range: 18-28. Ignored if bitrate is set.",
      ),
    });
  }, [showHelpText, t]);

  const onVideoPresetHelpPress = useCallback(() => {
    showHelpText({
      text: t(
        "Encoding preset. Faster presets = larger files. Slower presets = better compression.",
      ),
    });
  }, [showHelpText, t]);

  const onVideoFiltersHelpPress = useCallback(() => {
    showHelpText({
      text: t(
        "FFmpeg video filters (comma-separated). Examples: 'crop=1920:1080:0:0', 'scale=1280:720', 'rotate=90', 'eq=brightness=0.1:contrast=1.2', 'hqdn3d' (denoise). See FFmpeg filters documentation.",
      ),
    });
  }, [showHelpText, t]);

  const onAudioEncoderHelpPress = useCallback(() => {
    showHelpText({
      text: t("Select the audio encoder."),
    });
  }, [showHelpText, t]);

  const onAudioBitrateHelpPress = useCallback(() => {
    showHelpText({
      text: t("Target audio bitrate in kbit/s."),
    });
  }, [showHelpText, t]);

  const onAudioChannelsHelpPress = useCallback(() => {
    showHelpText({
      text: t("Number of audio channels (1=mono, 2=stereo, 6=5.1, etc.)."),
    });
  }, [showHelpText, t]);

  const onAudioSampleRateHelpPress = useCallback(() => {
    showHelpText({
      text: t("Audio sample rate in Hz (e.g., 44100, 48000)."),
    });
  }, [showHelpText, t]);

  const onAudioFiltersHelpPress = useCallback(() => {
    showHelpText({
      text: t(
        "FFmpeg audio filters (comma-separated). Examples: 'volume=2', 'loudnorm', 'aresample=48000'.",
      ),
    });
  }, [showHelpText, t]);

  const onGifFpsHelpPress = useCallback(() => {
    showHelpText({
      text: t("Frames per second for GIF output. Lower = smaller file."),
    });
  }, [showHelpText, t]);

  const onGifScaleHelpPress = useCallback(() => {
    showHelpText({
      text: t(
        "Scale GIF width (height calculated to preserve aspect). -1 = original size.",
      ),
    });
  }, [showHelpText, t]);

  const onHwaccelHelpPress = useCallback(() => {
    showHelpText({
      text: t(
        "Hardware acceleration. 'auto' detects available hardware. Requires compatible GPU/drivers.",
      ),
    });
  }, [showHelpText, t]);

  return (
    <>
      <AnimatedTr>
        <td>
          {t("Lossy mode (re-encode)")}
          <HelpIcon onClick={onLossyModeHelpPress} />
        </td>
        <td>
          <Switch
            checked={!!(lossyMode && Object.keys(lossyMode).length > 0)}
            onCheckedChange={(checked) => {
              if (checked) {
                updateLossyMode({ videoEncoder: "libx264" });
              } else {
                updateLossyMode({});
              }
            }}
          />
        </td>
        <td />
      </AnimatedTr>

      {lossyMode && Object.keys(lossyMode).length > 0 && (
        <>
          {isVideo && (
            <>
              <AnimatedTr>
                <td>
                  {t("Video encoder")}
                  <HelpIcon onClick={onVideoEncoderHelpPress} />
                </td>
                <td>
                  <Select
                    value={lossyMode.videoEncoder || "libx264"}
                    onChange={(e) =>
                      updateLossyMode({
                        videoEncoder: e.target
                          .value as (typeof videoEncoders)[0],
                      })
                    }
                    style={{ height: 20, marginLeft: 5, minWidth: "12em" }}
                  >
                    {videoEncoders.map((enc) => (
                      <option key={enc} value={enc}>
                        {enc}
                      </option>
                    ))}
                  </Select>
                </td>
                <td />
              </AnimatedTr>

              <AnimatedTr>
                <td>
                  {t("Video bitrate (kbit/s)")}
                  <HelpIcon onClick={onVideoBitrateHelpPress} />
                </td>
                <td>
                  <TextInput
                    value={lossyMode.videoBitrate ?? ""}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (Number.isNaN(v) || v <= 0) {
                        updateLossyMode({ videoBitrate: undefined });
                      } else {
                        updateLossyMode({ videoBitrate: v });
                      }
                    }}
                    style={{ width: "6em" }}
                    placeholder={t("Auto (CRF)")}
                  />
                  <span style={{ marginLeft: ".5em", color: "var(--gray-11)" }}>
                    {t("or CRF:")}
                    <HelpIcon
                      onClick={onVideoCrfHelpPress}
                      style={{
                        fontSize: "0.9em",
                        marginLeft: ".3em",
                        verticalAlign: "middle",
                      }}
                    />
                  </span>
                  <TextInput
                    value={lossyMode.videoCrf ?? ""}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (Number.isNaN(v) || v < 0 || v > 51) {
                        updateLossyMode({ videoCrf: undefined });
                      } else {
                        updateLossyMode({ videoCrf: v });
                      }
                    }}
                    style={{ width: "3em", marginLeft: ".5em" }}
                    placeholder={t("23")}
                  />
                </td>
                <td />
              </AnimatedTr>

              <AnimatedTr>
                <td>
                  {t("Video preset")}
                  <HelpIcon onClick={onVideoPresetHelpPress} />
                </td>
                <td>
                  <Select
                    value={lossyMode.videoPreset || "medium"}
                    onChange={(e) =>
                      updateLossyMode({
                        videoPreset: e.target.value as (typeof videoPresets)[0],
                      })
                    }
                    style={{ height: 20, marginLeft: 5 }}
                  >
                    {videoPresets.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </td>
                <td />
              </AnimatedTr>

              <AnimatedTr>
                <td>
                  {t("Video filters")}
                  <HelpIcon onClick={onVideoFiltersHelpPress} />
                </td>
                <td>
                  <TextInput
                    value={lossyMode.videoFilters?.join(",") ?? ""}
                    onChange={(e) =>
                      updateLossyMode({
                        videoFilters: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    style={{ width: "100%", minWidth: "20em" }}
                    placeholder={t("e.g., crop=1920:1080:0:0,scale=1280:720")}
                  />
                </td>
                <td />
              </AnimatedTr>

              <AnimatedTr>
                <td>
                  {t("Audio encoder")}
                  <HelpIcon onClick={onAudioEncoderHelpPress} />
                </td>
                <td>
                  <Select
                    value={lossyMode.audioEncoder || "aac"}
                    onChange={(e) =>
                      updateLossyMode({
                        audioEncoder: e.target
                          .value as (typeof audioEncoders)[0],
                      })
                    }
                    style={{ height: 20, marginLeft: 5 }}
                  >
                    {audioEncoders.map((enc) => (
                      <option key={enc} value={enc}>
                        {enc}
                      </option>
                    ))}
                  </Select>
                </td>
                <td />
              </AnimatedTr>

              <AnimatedTr>
                <td>
                  {t("Audio bitrate (kbit/s)")}
                  <HelpIcon onClick={onAudioBitrateHelpPress} />
                </td>
                <td>
                  <TextInput
                    value={lossyMode.audioBitrate ?? ""}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (Number.isNaN(v) || v <= 0) {
                        updateLossyMode({ audioBitrate: undefined });
                      } else {
                        updateLossyMode({ audioBitrate: v });
                      }
                    }}
                    style={{ width: "6em" }}
                    placeholder={t("Auto")}
                  />
                </td>
                <td />
              </AnimatedTr>

              <AnimatedTr>
                <td>
                  {t("Audio channels")}
                  <HelpIcon onClick={onAudioChannelsHelpPress} />
                </td>
                <td>
                  <TextInput
                    value={lossyMode.audioChannels ?? ""}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (Number.isNaN(v) || v <= 0) {
                        updateLossyMode({ audioChannels: undefined });
                      } else {
                        updateLossyMode({ audioChannels: v });
                      }
                    }}
                    style={{ width: "4em" }}
                    placeholder={t("Auto")}
                  />
                </td>
                <td />
              </AnimatedTr>

              <AnimatedTr>
                <td>
                  {t("Audio sample rate (Hz)")}
                  <HelpIcon onClick={onAudioSampleRateHelpPress} />
                </td>
                <td>
                  <TextInput
                    value={lossyMode.audioSampleRate ?? ""}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (Number.isNaN(v) || v <= 0) {
                        updateLossyMode({ audioSampleRate: undefined });
                      } else {
                        updateLossyMode({ audioSampleRate: v });
                      }
                    }}
                    style={{ width: "6em" }}
                    placeholder={t("Auto")}
                  />
                </td>
                <td />
              </AnimatedTr>

              <AnimatedTr>
                <td>
                  {t("Audio filters")}
                  <HelpIcon onClick={onAudioFiltersHelpPress} />
                </td>
                <td>
                  <TextInput
                    value={lossyMode.audioFilters?.join(",") ?? ""}
                    onChange={(e) =>
                      updateLossyMode({
                        audioFilters: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    style={{ width: "100%", minWidth: "20em" }}
                    placeholder={t("e.g., volume=2,loudnorm")}
                  />
                </td>
                <td />
              </AnimatedTr>
            </>
          )}

          {isGif && (
            <>
              <AnimatedTr>
                <td>
                  {t("GIF FPS")}
                  <HelpIcon onClick={onGifFpsHelpPress} />
                </td>
                <td>
                  <TextInput
                    value={lossyMode.gifFps ?? 10}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (Number.isNaN(v) || v <= 0) {
                        updateLossyMode({ gifFps: 10 });
                      } else {
                        updateLossyMode({ gifFps: v });
                      }
                    }}
                    style={{ width: "4em" }}
                  />
                </td>
                <td />
              </AnimatedTr>

              <AnimatedTr>
                <td>
                  {t("GIF scale (width)")}
                  <HelpIcon onClick={onGifScaleHelpPress} />
                </td>
                <td>
                  <TextInput
                    value={lossyMode.gifScale ?? -1}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (Number.isNaN(v)) {
                        updateLossyMode({ gifScale: -1 });
                      } else {
                        updateLossyMode({ gifScale: v });
                      }
                    }}
                    style={{ width: "4em" }}
                    placeholder={t("-1 = original")}
                  />
                </td>
                <td />
              </AnimatedTr>
            </>
          )}

          <AnimatedTr>
            <td>
              {t("Hardware acceleration")}
              <HelpIcon onClick={onHwaccelHelpPress} />
            </td>
            <td>
              <Select
                value={lossyMode.hwaccel || "auto"}
                onChange={(e) =>
                  updateLossyMode({
                    hwaccel: e.target.value as (typeof hwAccels)[0],
                  })
                }
                style={{ height: 20, marginLeft: 5 }}
              >
                {hwAccels.map((hw) => (
                  <option key={hw} value={hw}>
                    {hw}
                  </option>
                ))}
              </Select>
            </td>
            <td />
          </AnimatedTr>
        </>
      )}
    </>
  );
}

function renderNoticeIcon(
  notice: { warning?: boolean | undefined } | undefined,
  style?: CSSProperties,
) {
  if (!notice) return undefined;
  return notice.warning ? (
    <FaExclamationTriangle
      style={{
        flexShrink: "0",
        fontSize: ".8em",
        verticalAlign: "baseline",
        color: warningColor,
        ...style,
      }}
    />
  ) : (
    <FaInfoCircle
      style={{
        flexShrink: "0",
        fontSize: ".8em",
        verticalAlign: "baseline",
        color: "var(--cyan-10)",
        ...style,
      }}
    />
  );
}

interface Notice {
  warning?: true;
  text: ReactNode;
}

interface GenericNotice {
  warning?: true;
  text: string;
  url?: string;
}

function Notice({ notice }: { notice: Notice | GenericNotice }) {
  const noticeStyle: CSSProperties = {};
  const infoStyle: CSSProperties = { ...noticeStyle, color: primaryTextColor };
  const warningStyle: CSSProperties = { ...noticeStyle, color: warningColor };

  const { text, warning } = notice;
  return (
    <div
      style={{
        ...(warning ? warningStyle : infoStyle),
        display: "flex",
        alignItems: "center",
        gap: "0 .5em",
      }}
    >
      {renderNoticeIcon({ warning }, { fontSize: "1em", flexShrink: 0 })}{" "}
      <span style={{ fontSize: ".9em" }}>{text}</span>
    </div>
  );
}

function renderNotice(notice: Notice | undefined) {
  if (notice == null) return null;
  const { text } = notice;
  return (
    <Notice notice={notice} key={typeof text === "string" ? text : undefined} />
  );
}

function renderGenericNotice(notice: GenericNotice) {
  const { url } = notice;
  return (
    <tr key={notice.text} className={styles["notice-row"]}>
      <td colSpan={2}>
        <Notice notice={notice} />
      </td>
      <td>
        {url != null && (
          <IoIosHelpCircle
            style={{
              cursor: "pointer",
              fontSize: "1.5em",
              flexShrink: 0,
              color: primaryTextColor,
            }}
            title={i18n.t("Learn more")}
            role="button"
            tabIndex={0}
            onClick={() => mainApi.openExternal(url)}
          />
        )}
      </td>
    </tr>
  );
}

const rightIconStyle: CSSProperties = {
  fontSize: "1.2em",
  verticalAlign: "middle",
};

function ExportConfirm({
  areWeCutting,
  segmentsToExport,
  willMerge,
  visible,
  onClosePress,
  onExportConfirm,
  onAddToQueue,
  outFormat,
  renderOutFmt,
  outputDir,
  numStreamsTotal,
  numStreamsToCopy,
  onShowStreamsSelectorClick,
  cutFileTemplate,
  cutMergedFileTemplate,
  generateCutFileNames,
  generateCutMergedFileNames,
  currentSegIndexSafe,
  segmentsOrInverse,
  mainCopiedThumbnailStreams,
  needSmartCut,
  isEncoding,
  encBitrate,
  setEncBitrate,
  toggleSettings,
  outputPlaybackRate,
  neighbouringKeyFrames,
  findNearestKeyFrameTime,
}: {
  areWeCutting: boolean;
  segmentsToExport: SegmentToExport[];
  willMerge: boolean;
  visible: boolean;
  onClosePress: () => void;
  onExportConfirm: () => void;
  outFormat: string | undefined;
  renderOutFmt: (style: CSSProperties) => ReactNode;
  outputDir: string | undefined;
  numStreamsTotal: number;
  numStreamsToCopy: number;
  onShowStreamsSelectorClick: () => void;
  onAddToQueue: (
    lossyMode: LossyMode | undefined,
    presetId: string | undefined,
  ) => void;
  cutFileTemplate: string;
  cutMergedFileTemplate: string;
  generateCutFileNames: GenerateOutFileNames;
  generateCutMergedFileNames: GenerateOutFileNames;
  currentSegIndexSafe: number;
  segmentsOrInverse: UseSegments["segmentsOrInverse"];
  mainCopiedThumbnailStreams: FFprobeStream[];
  needSmartCut: boolean;
  isEncoding: boolean;
  encBitrate: number | undefined;
  setEncBitrate: Dispatch<SetStateAction<number | undefined>>;
  toggleSettings: () => void;
  outputPlaybackRate: number;
  neighbouringKeyFrames: Frame[];
  findNearestKeyFrameTime: FindNearestKeyframeTime;
}) {
  const { t } = useTranslation();

  const {
    keyframeCut,
    toggleKeyframeCut,
    preserveMovData,
    setPreserveMovData,
    preserveMetadata,
    setPreserveMetadata,
    preserveChapters,
    setPreserveChapters,
    movFastStart,
    setMovFastStart,
    avoidNegativeTs,
    setAvoidNegativeTs,
    autoDeleteMergedSegments,
    exportConfirmEnabled,
    toggleExportConfirmEnabled,
    segmentsToChapters,
    setSegmentsToChapters,
    preserveMetadataOnMerge,
    setPreserveMetadataOnMerge,
    enableSmartCut,
    setEnableSmartCut,
    effectiveExportMode,
    enableOverwriteOutput,
    setEnableOverwriteOutput,
    ffmpegExperimental,
    setFfmpegExperimental,
    cutFromAdjustmentFrames,
    setCutFromAdjustmentFrames,
    cutToAdjustmentFrames,
    setCutToAdjustmentFrames,
    setCutFileTemplate,
    setCutMergedFileTemplate,
    simpleMode,
    keyframesEnabled,
    lossyMode: configLossyMode,
    setLossyMode,
  } = useUserSettings();

  const { presets } = usePresets();

  const [showAdvanced, setShowAdvanced] = useState(!simpleMode);

  const [selectedPresetId, setSelectedPresetId] = useState<
    string | undefined
  >();

  const [localLossyMode, setLocalLossyMode] = useState<LossyMode>(
    configLossyMode ?? {},
  );

  const updateLossyMode = useCallback(
    (updates: Partial<LossyMode>) => {
      const newLossyMode = { ...localLossyMode, ...updates };
      setLocalLossyMode(newLossyMode);
      setLossyMode(newLossyMode);
    },
    [localLossyMode, setLossyMode],
  );

  const togglePreserveChapters = useCallback(
    () => setPreserveChapters((val) => !val),
    [setPreserveChapters],
  );
  const togglePreserveMovData = useCallback(
    () => setPreserveMovData((val) => !val),
    [setPreserveMovData],
  );
  const toggleMovFastStart = useCallback(
    () => setMovFastStart((val) => !val),
    [setMovFastStart],
  );
  const toggleSegmentsToChapters = useCallback(
    () => setSegmentsToChapters((v) => !v),
    [setSegmentsToChapters],
  );
  const togglePreserveMetadataOnMerge = useCallback(
    () => setPreserveMetadataOnMerge((v) => !v),
    [setPreserveMetadataOnMerge],
  );

  const isMov = ffmpegIsMov(outFormat);
  const isIpod = outFormat === "ipod";

  // some thumbnail streams (png,jpg etc) cannot always be cut correctly, so we warn if they try to.
  const areWeCuttingProblematicStreams =
    areWeCutting && mainCopiedThumbnailStreams.length > 0;

  const haveSegmentWithProblematicKeyframe = useMemo(() => {
    if (neighbouringKeyFrames.length === 0) return false; // we don't know
    return segmentsToExport.some(({ start, end }) => {
      const nearestPreviousKeyframeTime =
        findNearestKeyFrameTime({ time: start, direction: -1 }) ?? 0;
      const segmentDuration = end - start;
      const estimatedExportedSegmentDuration =
        end - nearestPreviousKeyframeTime;
      // if estimated actual output length of segment is more than 1.5 times the intended segment duration, then we consider it problematic and warn the user about it.
      return estimatedExportedSegmentDuration > segmentDuration * 1.5;
    });
  }, [neighbouringKeyFrames.length, segmentsToExport, findNearestKeyFrameTime]);

  const notices = useMemo(() => {
    const specific: Record<
      | "exportMode"
      | "problematicStreams"
      | "movFastStart"
      | "preserveMovData"
      | "smartCut"
      | "cutMode"
      | "avoidNegativeTs"
      | "overwriteOutput",
      Notice | undefined
    > = {
      exportMode:
        effectiveExportMode === "segments_to_chapters"
          ? {
              text: i18n.t(
                "Segments to chapters mode is active, this means that the file will not be cut. Instead chapters will be created from the segments.",
              ),
            }
          : undefined,
      problematicStreams: areWeCuttingProblematicStreams
        ? {
            warning: true,
            text: (
              <Trans>
                Warning: Cutting thumbnail tracks is known to cause problems.
                Consider disabling track{" "}
                {{
                  trackNumber: mainCopiedThumbnailStreams[0]
                    ? mainCopiedThumbnailStreams[0].index + 1
                    : 0,
                }}
                .
              </Trans>
            ),
          }
        : undefined,
      movFastStart:
        isMov && isIpod && !movFastStart
          ? {
              warning: true,
              text: t(
                "For the ipod format, it is recommended to activate this option",
              ),
            }
          : undefined,
      preserveMovData:
        isMov && isIpod && preserveMovData
          ? {
              warning: true,
              text: t(
                "For the ipod format, it is recommended to deactivate this option",
              ),
            }
          : undefined,
      smartCut:
        areWeCutting && needSmartCut
          ? {
              warning: true,
              text: t(
                "Smart cut is experimental and will not work on all files.",
              ),
            }
          : undefined,
      cutMode:
        areWeCutting && !isEncoding && !keyframeCut
          ? {
              text: t(
                "Note: Keyframe cut is recommended for most common files",
              ),
            }
          : undefined,
      avoidNegativeTs: !isEncoding
        ? (() => {
            if (willMerge) {
              if (avoidNegativeTs !== "make_non_negative") {
                return {
                  text: t(
                    'When merging, it\'s generally recommended to set this to "make_non_negative"',
                  ),
                };
              }
              return undefined;
            }
            if (!["make_zero", "auto"].includes(avoidNegativeTs)) {
              return {
                text: t(
                  "It's generally recommended to set this to one of: {{values}}",
                  { values: '"auto", "make_zero"' },
                ),
              };
            }
            return undefined;
          })()
        : undefined,
      overwriteOutput: enableOverwriteOutput
        ? { text: t("Existing files will be overwritten without warning!") }
        : undefined,
    };

    const generic: GenericNotice[] = [];

    if (simpleMode) {
      generic.push({
        text: t(
          "You are in simple mode, meaning some functionality has been simplified or hidden.",
        ),
      });
    }

    if (
      (effectiveExportMode === "separate" ||
        effectiveExportMode === "merge" ||
        effectiveExportMode === "merge+separate") &&
      !areWeCutting
    ) {
      generic.push({
        text: t(
          "Exporting whole file without cutting, because there are no segments to export.",
        ),
      });
    }

    if (areWeCutting) {
      // https://github.com/mifi/lossless-cut/issues/1809
      if (outFormat === "flac") {
        generic.push({
          text: t(
            "There is a known issue in FFmpeg with cutting FLAC files. The file will be re-encoded, which is still lossless, but the export may be slower.",
          ),
        });
      }
      if (outputPlaybackRate !== 1) {
        generic.push({
          warning: true,
          text: t(
            "Adjusting the output FPS and cutting at the same time will cause incorrect cuts. Consider instead doing it in two separate steps.",
          ),
        });
      }
      if (keyframesEnabled && haveSegmentWithProblematicKeyframe) {
        generic.push({
          warning: true,
          text: t(
            "A segment may result in an unexpectedly long output file length after exporting, because your video file doesn't have any keyframes near the start time of the segment you're trying to cut.",
          ),
          url: troubleshootingUrl,
        });
      }
    }

    return {
      generic,
      specific,
      totalNum:
        generic.filter((n) => n.warning).length +
        Object.values(specific).filter((n) => n != null && n.warning).length,
    };
  }, [
    effectiveExportMode,
    areWeCuttingProblematicStreams,
    mainCopiedThumbnailStreams,
    isMov,
    isIpod,
    movFastStart,
    t,
    preserveMovData,
    areWeCutting,
    needSmartCut,
    isEncoding,
    keyframeCut,
    enableOverwriteOutput,
    simpleMode,
    willMerge,
    avoidNegativeTs,
    outFormat,
    outputPlaybackRate,
    keyframesEnabled,
    haveSegmentWithProblematicKeyframe,
  ]);

  const exportModeDescription = useMemo(
    () =>
      ({
        segments_to_chapters: t(
          "Don't cut the file, but instead export an unmodified original which has chapters generated from segments",
        ),
        merge: t("Auto merge segments to one file after export"),
        "merge+separate": t(
          "Auto merge segments into one file after export, but keep exported per-segment files too",
        ),
        separate: t("Export each segment to a separate file"),
      })[effectiveExportMode],
    [effectiveExportMode, t],
  );

  const showHelpText = useCallback(
    ({
      icon = "info",
      timer = 10000,
      text,
    }: {
      icon?: SweetAlertIcon;
      timer?: number;
      text: string;
    }) => getSwal().toast.fire({ icon, timer, text }),
    [],
  );

  const onPreserveChaptersPress = useCallback(() => {
    showHelpText({
      text: i18n.t("Whether to preserve chapters from source file."),
    });
  }, [showHelpText]);

  const onPreserveMovDataHelpPress = useCallback(() => {
    showHelpText({
      text: i18n.t(
        "Preserve all MOV/MP4 metadata tags (e.g. EXIF, GPS position etc.) from source file? Note that some players have trouble playing back files where all metadata is preserved, like iTunes and other Apple software",
      ),
    });
  }, [showHelpText]);

  const onPreserveMetadataHelpPress = useCallback(() => {
    showHelpText({
      text: i18n.t(
        "Whether to preserve metadata from source file. Default: Global (file metadata), per-track and per-chapter metadata will be copied. Non-global: Only per-track and per-chapter metadata will be copied. None: No metadata will be copied",
      ),
    });
  }, [showHelpText]);

  const onMovFastStartHelpPress = useCallback(() => {
    showHelpText({
      text: i18n.t(
        "Enabling this will allow faster playback of the exported file. This makes processing use 3 times as much export I/O, which is negligible for small files but might slow down exporting of large files.",
      ),
    });
  }, [showHelpText]);

  const onOutFmtHelpPress = useCallback(() => {
    showHelpText({
      text: i18n.t(
        "Defaults to same format as input file. You can losslessly change the file format (container) of the file with this option. Not all formats support all codecs. Matroska/MP4/MOV support the most common codecs. Sometimes it's even impossible to export to the same output format as input.",
      ),
    });
  }, [showHelpText]);

  const onKeyframeCutHelpPress = useCallback(() => {
    showHelpText({
      text: i18n.t(
        'With "keyframe cut", we will cut at the nearest keyframe before the desired start cutpoint. This is recommended for most files. With "Normal cut" you may have to manually set the cutpoint a few frames before the next keyframe to achieve a precise cut',
      ),
    });
  }, [showHelpText]);

  const onSmartCutHelpPress = useCallback(() => {
    showHelpText({
      text: i18n.t(
        "This experimental feature will re-encode the part of the video from the cutpoint until the next keyframe in order to attempt to make a 100% accurate cut. Only works on some files. I've had success with some h264 files, and only a few h265 files. See more here: {{url}}",
        { url: "https://github.com/mifi/lossless-cut/issues/126" },
      ),
    });
  }, [showHelpText]);

  const onTracksHelpPress = useCallback(() => {
    showHelpText({
      text: i18n.t(
        "Not all formats support all track types, and LosslessCut is unable to properly cut some track types, so you may have to sacrifice some tracks by disabling them in order to get correct result.",
      ),
    });
  }, [showHelpText]);

  const onSegmentsToChaptersHelpPress = useCallback(() => {
    showHelpText({
      text: i18n.t(
        "When merging, do you want to create chapters in the merged file, according to the cut segments? NOTE: This may dramatically increase processing time",
      ),
    });
  }, [showHelpText]);

  const onPreserveMetadataOnMergeHelpPress = useCallback(() => {
    showHelpText({
      text: i18n.t(
        "When merging, do you want to preserve metadata from your original file? NOTE: This may dramatically increase processing time",
      ),
    });
  }, [showHelpText]);

  const onCutFileTemplateHelpPress = useCallback(() => {
    showHelpText({
      text: i18n.t(
        "You can customize the file name of the output segment(s) using special variables.",
        { count: segmentsToExport.length },
      ),
    });
  }, [segmentsToExport.length, showHelpText]);

  const onCutMergedFileTemplateHelpPress = useCallback(() => {
    showHelpText({
      text: i18n.t(
        "You can customize the file name of the merged file using special variables.",
      ),
    });
  }, [showHelpText]);

  const onExportModeHelpPress = useCallback(() => {
    showHelpText({ text: exportModeDescription });
  }, [exportModeDescription, showHelpText]);

  const onAvoidNegativeTsHelpPress = useCallback(() => {
    // https://ffmpeg.org/ffmpeg-all.html#Format-Options
    // https://github.com/mifi/lossless-cut/issues/1206
    const texts = {
      make_non_negative: i18n.t(
        "Shift timestamps to make them non-negative. Also note that this affects only leading negative timestamps, and not non-monotonic negative timestamps.",
      ),
      make_zero: i18n.t(
        "Shift timestamps so that the first timestamp is 0. (LosslessCut default)",
      ),
      auto: i18n.t("Enables shifting when required by the target format."),
      disabled: i18n.t("Disables shifting of timestamp."),
    };
    showHelpText({ text: `${avoidNegativeTs}: ${texts[avoidNegativeTs]}` });
  }, [avoidNegativeTs, showHelpText]);

  const onCutFromAdjustmentFramesHelpPress = useCallback(() => {
    showHelpText({
      text: i18n.t(
        "This option allows you to shift all segment start times forward by one or more frames before cutting. This can be useful if the output video starts from the wrong (preceding) keyframe.",
      ),
    });
  }, [showHelpText]);

  const onFfmpegExperimentalHelpPress = useCallback(() => {
    showHelpText({ text: t("Enable experimental ffmpeg features flag?") });
  }, [showHelpText, t]);

  const canEditSegTemplate = !willMerge || !autoDeleteMergedSegments;

  const handleEncBitrateToggle = useCallback(
    (checked: boolean) => {
      setEncBitrate(() => (checked ? undefined : 10000));
    },
    [setEncBitrate],
  );

  const handleEncBitrateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseInt(e.target.value, 10);
      if (Number.isNaN(v) || v <= 0) return;
      setEncBitrate(v);
    },
    [setEncBitrate],
  );

  return (
    <ExportSheet
      width="50em"
      visible={visible}
      title={t("Export options")}
      onClosePress={onClosePress}
      renderButton={() => (
        <div style={{ display: "flex", gap: ".5em" }}>
          <ExportButton
            segmentsToExport={segmentsToExport}
            areWeCutting={areWeCutting}
            onClick={withBlur(() => onExportConfirm())}
            style={{ fontSize: "1.3em" }}
          />
          <ExportButton
            segmentsToExport={segmentsToExport}
            areWeCutting={areWeCutting}
            onClick={withBlur(() =>
              onAddToQueue(localLossyMode, selectedPresetId),
            )}
            style={{
              fontSize: "1.3em",
              background: "var(--blue-7)",
              color: "var(--blue-0)",
              borderColor: "var(--blue-8)",
            }}
          >
            {t("Add to Queue")}
          </ExportButton>
        </div>
      )}
      renderBottom={() => (
        <>
          <ToggleExportConfirm size="1.5em" />
          <div
            style={{
              fontSize: ".8em",
              marginLeft: ".4em",
              marginRight: ".5em",
              maxWidth: "8.5em",
              lineHeight: "100%",
              color: exportConfirmEnabled ? "var(--gray-12)" : "var(--gray-11)",
              cursor: "pointer",
            }}
            role="button"
            onClick={toggleExportConfirmEnabled}
          >
            {t("Show this page before exporting?")}
          </div>
          {notices.totalNum > 0 &&
            renderNoticeIcon(
              { warning: true },
              { fontSize: "1.5em", marginRight: ".5em" },
            )}
        </>
      )}
    >
      <table className={styles["options"]}>
        <tbody>
          {notices.generic.map((notice) => renderGenericNotice(notice))}

          {segmentsOrInverse.selected.length !==
            segmentsOrInverse.all.length && (
            <tr>
              <td colSpan={2}>
                <FaRegCheckCircle size={12} style={{ marginRight: 3 }} />
                {t(
                  "{{selectedSegments}} of {{nonFilteredSegments}} segments selected",
                  {
                    selectedSegments: segmentsOrInverse.selected.length,
                    nonFilteredSegments: segmentsOrInverse.all.length,
                  },
                )}
              </td>
              <td />
            </tr>
          )}

          <tr>
            <td>
              {segmentsOrInverse.selected.length > 1
                ? t("Export mode for {{segments}} segments", {
                    segments: segmentsOrInverse.selected.length,
                  })
                : t("Export mode")}
              {renderNotice(notices.specific["exportMode"])}
            </td>
            <td>
              <ExportModeButton
                selectedSegments={segmentsOrInverse.selected}
                style={{ height: "1.8em" }}
              />
            </td>
            <td>
              {renderNoticeIcon(
                notices.specific["exportMode"],
                rightIconStyle,
              ) ?? <HelpIcon onClick={onExportModeHelpPress} />}
            </td>
          </tr>

          <tr>
            <td>{t("Output container format:")}</td>
            <td>{renderOutFmt({ height: "1.8em", maxWidth: 150 })}</td>
            <td>
              <HelpIcon onClick={onOutFmtHelpPress} />
            </td>
          </tr>

          <tr>
            <td>{t("Encoding preset:")}</td>
            <td>
              <Select
                value={selectedPresetId ?? ""}
                onChange={(e) =>
                  setSelectedPresetId(e.target.value || undefined)
                }
                style={{ height: 20, marginLeft: 5 }}
              >
                <option value="">{t("None (use current settings)")}</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </td>
            <td>
              <HelpIcon
                onClick={() =>
                  showHelpText({
                    text: t(
                      "Select a built-in preset to quickly apply common encoding settings for different platforms. Presets configure video/audio codecs, bitrate, and other settings automatically.",
                    ),
                  })
                }
              />
            </td>
          </tr>

          <tr>
            <td>
              <Trans>Input has {{ numStreamsTotal }} tracks</Trans>
              {renderNotice(notices.specific["problematicStreams"])}
            </td>
            <td>
              <HighlightedText
                style={{ cursor: "pointer" }}
                onClick={onShowStreamsSelectorClick}
              >
                <Trans>Keeping {{ numStreamsToCopy }} tracks</Trans>
              </HighlightedText>
            </td>
            <td>
              {renderNoticeIcon(
                notices.specific["problematicStreams"],
                rightIconStyle,
              ) ?? <HelpIcon onClick={onTracksHelpPress} />}
            </td>
          </tr>

          <tr>
            <td>{t("Save output to path:")}</td>
            <td>
              <OutDirSelector>
                <HighlightedText
                  role="button"
                  style={{ wordBreak: "break-all", cursor: "pointer" }}
                >
                  {outputDir}
                </HighlightedText>
              </OutDirSelector>
            </td>
            <td />
          </tr>

          {canEditSegTemplate && (
            <tr>
              <td colSpan={2}>
                <FileNameTemplateEditor
                  mode="separate"
                  template={cutFileTemplate}
                  setTemplate={setCutFileTemplate}
                  defaultTemplate={defaultCutFileTemplate}
                  generateFileNames={generateCutFileNames}
                  currentSegIndexSafe={currentSegIndexSafe}
                />
              </td>
              <td>
                <HelpIcon onClick={onCutFileTemplateHelpPress} />
              </td>
            </tr>
          )}

          {willMerge && (
            <tr>
              <td colSpan={2}>
                <FileNameTemplateEditor
                  mode="merge-segments"
                  template={cutMergedFileTemplate}
                  setTemplate={setCutMergedFileTemplate}
                  defaultTemplate={defaultCutMergedFileTemplate}
                  generateFileNames={generateCutMergedFileNames}
                />
              </td>
              <td>
                <HelpIcon onClick={onCutMergedFileTemplateHelpPress} />
              </td>
            </tr>
          )}

          <tr>
            <td>
              {t("Overwrite existing files")}
              {renderNotice(notices.specific["overwriteOutput"])}
            </td>
            <td>
              <Switch
                checked={enableOverwriteOutput}
                onCheckedChange={setEnableOverwriteOutput}
              />
            </td>
            <td>
              {renderNoticeIcon(
                notices.specific["overwriteOutput"],
                rightIconStyle,
              ) ?? (
                <HelpIcon
                  onClick={() =>
                    showHelpText({
                      text: t(
                        "Overwrite files when exporting, if a file with the same name as the output file name exists?",
                      ),
                    })
                  }
                />
              )}
            </td>
          </tr>
        </tbody>
      </table>

      <h3 style={{ marginBottom: ".5em" }}>{t("Advanced options")}</h3>

      <table className={styles["options"]}>
        <tbody>
          <tr>
            <td
              style={{
                paddingTop: ".5em",
                color: "var(--gray-11)",
                fontSize: ".9em",
              }}
              colSpan={2}
            >
              {t(
                "Depending on your specific file/player, you may have to try different options for best results.",
              )}
            </td>
            <td />
          </tr>

          <tr>
            <td>{t("Show advanced options")}</td>
            <td>
              <Switch
                checked={showAdvanced}
                onCheckedChange={setShowAdvanced}
              />
            </td>
            <td />
          </tr>

          {showAdvanced && (
            <>
              {areWeCutting && (
                <>
                  <AnimatedTr>
                    <td>{t("Shift all start times")}</td>
                    <td>
                      <ShiftTimes
                        values={adjustCutFromValues}
                        num={cutFromAdjustmentFrames}
                        setNum={setCutFromAdjustmentFrames}
                      />
                    </td>
                    <td>
                      <HelpIcon onClick={onCutFromAdjustmentFramesHelpPress} />
                    </td>
                  </AnimatedTr>
                  <AnimatedTr>
                    <td>{t("Shift all end times")}</td>
                    <td>
                      <ShiftTimes
                        values={adjustCutToValues}
                        num={cutToAdjustmentFrames}
                        setNum={setCutToAdjustmentFrames}
                      />
                    </td>
                    <td />
                  </AnimatedTr>
                </>
              )}

              {isMov && (
                <>
                  <AnimatedTr>
                    <td>{t("Enable MOV Faststart?")}</td>
                    <td>
                      <Switch
                        checked={movFastStart}
                        onCheckedChange={toggleMovFastStart}
                      />
                      {renderNotice(notices.specific["movFastStart"])}
                    </td>
                    <td>
                      {renderNoticeIcon(
                        notices.specific["movFastStart"],
                        rightIconStyle,
                      ) ?? <HelpIcon onClick={onMovFastStartHelpPress} />}
                    </td>
                  </AnimatedTr>

                  <AnimatedTr>
                    <td>
                      {t("Preserve all MP4/MOV metadata?")}
                      {renderNotice(notices.specific["preserveMovData"])}
                    </td>
                    <td>
                      <Switch
                        checked={preserveMovData}
                        onCheckedChange={togglePreserveMovData}
                      />
                    </td>
                    <td>
                      {renderNoticeIcon(
                        notices.specific["preserveMovData"],
                        rightIconStyle,
                      ) ?? <HelpIcon onClick={onPreserveMovDataHelpPress} />}
                    </td>
                  </AnimatedTr>
                </>
              )}

              <AnimatedTr>
                <td>{t("Preserve chapters")}</td>
                <td>
                  <Switch
                    checked={preserveChapters}
                    onCheckedChange={togglePreserveChapters}
                  />
                </td>
                <td>
                  <HelpIcon onClick={onPreserveChaptersPress} />
                </td>
              </AnimatedTr>

              <AnimatedTr>
                <td>{t("Preserve metadata")}</td>
                <td>
                  <Select
                    value={preserveMetadata}
                    onChange={(e) =>
                      setPreserveMetadata(e.target.value as PreserveMetadata)
                    }
                    style={{ height: 20, marginLeft: 5 }}
                  >
                    <option value={"default" satisfies PreserveMetadata}>
                      {t("Default")}
                    </option>
                    <option value={"none" satisfies PreserveMetadata}>
                      {t("None")}
                    </option>
                    <option value={"nonglobal" satisfies PreserveMetadata}>
                      {t("Non-global")}
                    </option>
                  </Select>
                </td>
                <td>
                  <HelpIcon onClick={onPreserveMetadataHelpPress} />
                </td>
              </AnimatedTr>

              {willMerge && (
                <>
                  <AnimatedTr>
                    <td>{t("Create chapters from merged segments? (slow)")}</td>
                    <td>
                      <Switch
                        checked={segmentsToChapters}
                        onCheckedChange={toggleSegmentsToChapters}
                      />
                    </td>
                    <td>
                      <HelpIcon onClick={onSegmentsToChaptersHelpPress} />
                    </td>
                  </AnimatedTr>

                  <AnimatedTr>
                    <td>
                      {t("Preserve original metadata when merging? (slow)")}
                    </td>
                    <td>
                      <Switch
                        checked={preserveMetadataOnMerge}
                        onCheckedChange={togglePreserveMetadataOnMerge}
                      />
                    </td>
                    <td>
                      <HelpIcon onClick={onPreserveMetadataOnMergeHelpPress} />
                    </td>
                  </AnimatedTr>
                </>
              )}

              {areWeCutting && (
                <>
                  <AnimatedTr>
                    <td>
                      {t("Smart cut (experimental):")}
                      {renderNotice(notices.specific["smartCut"])}
                    </td>
                    <td>
                      <Switch
                        checked={enableSmartCut}
                        onCheckedChange={() => setEnableSmartCut((v) => !v)}
                      />
                    </td>
                    <td>
                      {renderNoticeIcon(
                        notices.specific["smartCut"],
                        rightIconStyle,
                      ) ?? <HelpIcon onClick={onSmartCutHelpPress} />}
                    </td>
                  </AnimatedTr>

                  {!isEncoding && (
                    <AnimatedTr>
                      <td>
                        {t("Keyframe cut mode")}
                        {renderNotice(notices.specific["cutMode"])}
                      </td>
                      <td>
                        <Switch
                          checked={keyframeCut}
                          onCheckedChange={() => toggleKeyframeCut()}
                        />
                      </td>
                      <td>
                        {renderNoticeIcon(
                          notices.specific["cutMode"],
                          rightIconStyle,
                        ) ?? <HelpIcon onClick={onKeyframeCutHelpPress} />}
                      </td>
                    </AnimatedTr>
                  )}
                </>
              )}

              {isEncoding && (
                <AnimatedTr>
                  <td>{t("Smart cut auto detect bitrate")}</td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                      }}
                    >
                      {encBitrate != null && (
                        <>
                          <TextInput
                            value={encBitrate}
                            onChange={handleEncBitrateChange}
                            style={{
                              width: "4em",
                              flexGrow: 0,
                              marginRight: ".3em",
                            }}
                          />
                          <span style={{ marginRight: ".3em" }}>
                            {t("kbit/s")}
                          </span>
                        </>
                      )}
                      <span>
                        <Switch
                          checked={encBitrate == null}
                          onCheckedChange={handleEncBitrateToggle}
                        />
                      </span>
                    </div>
                  </td>
                  <td />
                </AnimatedTr>
              )}

              {showAdvanced && (
                <LossyModeSection
                  lossyMode={localLossyMode}
                  updateLossyMode={updateLossyMode}
                  outFormat={outFormat}
                  t={t}
                  showHelpText={showHelpText}
                />
              )}

              {!isEncoding && (
                <AnimatedTr>
                  <td>
                    &quot;ffmpeg&quot;{" "}
                    <code className="highlighted">avoid_negative_ts</code>
                    {renderNotice(notices.specific["avoidNegativeTs"])}
                  </td>
                  <td>
                    <Select
                      value={avoidNegativeTs}
                      onChange={(e) =>
                        setAvoidNegativeTs(e.target.value as AvoidNegativeTs)
                      }
                      style={{ height: 20, marginLeft: 5 }}
                    >
                      <option value={"auto" satisfies AvoidNegativeTs}>
                        auto
                      </option>
                      <option value={"make_zero" satisfies AvoidNegativeTs}>
                        make_zero
                      </option>
                      <option
                        value={"make_non_negative" satisfies AvoidNegativeTs}
                      >
                        make_non_negative
                      </option>
                      <option value={"disabled" satisfies AvoidNegativeTs}>
                        disabled
                      </option>
                    </Select>
                  </td>
                  <td>
                    {renderNoticeIcon(
                      notices.specific["avoidNegativeTs"],
                      rightIconStyle,
                    ) ?? <HelpIcon onClick={onAvoidNegativeTsHelpPress} />}
                  </td>
                </AnimatedTr>
              )}

              <AnimatedTr>
                <td>{t('"ffmpeg" experimental flag')}</td>
                <td>
                  <Switch
                    checked={ffmpegExperimental}
                    onCheckedChange={setFfmpegExperimental}
                  />
                </td>
                <td>
                  <HelpIcon onClick={onFfmpegExperimentalHelpPress} />
                </td>
              </AnimatedTr>

              <AnimatedTr>
                <td>{t("More settings")}</td>
                <td>
                  <IoIosSettings
                    size={24}
                    role="button"
                    onClick={toggleSettings}
                    style={{ marginLeft: 5 }}
                  />
                </td>
                <td />
              </AnimatedTr>
            </>
          )}
        </tbody>
      </table>
    </ExportSheet>
  );
}

export default memo(ExportConfirm);
