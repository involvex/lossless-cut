import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { produce } from "immer";

import type {
  ExportQueue,
  ExportQueueItem,
  LossyMode,
} from "../../../common/types";
import useUserSettingsRoot from "./useUserSettingsRoot";

const remote = window.require("@electron/remote");
const { configStore } = remote.require("./index.js");

const QUEUE_STORAGE_KEY = "exportQueue";

function loadQueueFromConfig(): ExportQueue {
  try {
    const stored = configStore.get(QUEUE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(JSON.stringify(stored));
      if (parsed.items && Array.isArray(parsed.items)) {
        return {
          items: parsed.items,
          isProcessing: false,
          currentItemId: undefined,
          autoProcess: parsed.autoProcess ?? true,
        };
      }
    }
  } catch (err) {
    console.error("Failed to load export queue from config", err);
  }
  return {
    items: [],
    isProcessing: false,
    currentItemId: undefined,
    autoProcess: true,
  };
}

function saveQueueToConfig(queue: ExportQueue) {
  try {
    configStore.set(QUEUE_STORAGE_KEY, queue);
  } catch (err) {
    console.error("Failed to save export queue to config", err);
  }
}

export function useExportQueue() {
  const {
    settings: {
      keyframeCut,
      enableSmartCut,
      preserveMetadata,
      preserveMovData,
      preserveChapters,
      movFastStart,
      avoidNegativeTs,
      ffmpegExperimental,
      autoMerge,
      autoDeleteMergedSegments,
      segmentsToChaptersOnly,
    },
  } = useUserSettingsRoot();

  const [queue, setQueue] = useState<ExportQueue>(() => loadQueueFromConfig());
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    saveQueueToConfig(queue);
  }, [queue]);

  const effectiveExportMode =
    autoMerge && autoDeleteMergedSegments
      ? "merge"
      : autoMerge
        ? "merge+separate"
        : segmentsToChaptersOnly
          ? "segments_to_chapters"
          : "separate";

  const addToQueue = useCallback(
    (
      filePath: string,
      segments: ExportQueueItem["segments"],
      outFormat: string | undefined,
      outputDir: string,
      cutFileTemplate: string,
      cutMergedFileTemplate: string,
      lossyMode: LossyMode | undefined,
      presetId: string | undefined,
      rotation: number | undefined,
      shortestFlag: boolean,
    ) => {
      const newItem: ExportQueueItem = {
        id: uuidv4(),
        filePath,
        segments,
        outFormat,
        outputDir,
        cutFileTemplate,
        cutMergedFileTemplate,
        exportMode: effectiveExportMode,
        lossyMode,
        presetId,
        keyframeCut,
        enableSmartCut,
        preserveMetadata,
        preserveMovData,
        preserveChapters,
        movFastStart,
        avoidNegativeTs,
        ffmpegExperimental,
        shortestFlag,
        rotation,
        status: "pending",
        progress: 0,
        createdAt: Date.now(),
      };

      setQueue((prev) =>
        produce(prev, (draft) => {
          draft.items.push(newItem);
        }),
      );

      return newItem.id;
    },
    [
      effectiveExportMode,
      keyframeCut,
      enableSmartCut,
      preserveMetadata,
      preserveMovData,
      preserveChapters,
      movFastStart,
      avoidNegativeTs,
      ffmpegExperimental,
    ],
  );

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) =>
      produce(prev, (draft) => {
        const index = draft.items.findIndex((item) => item.id === id);
        if (index !== -1) {
          draft.items.splice(index, 1);
          if (draft.currentItemId === id) {
            draft.currentItemId = undefined;
            draft.isProcessing = false;
          }
        }
      }),
    );
  }, []);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    setQueue((prev) =>
      produce(prev, (draft) => {
        const [removed] = draft.items.splice(fromIndex, 1);
        if (removed) {
          draft.items.splice(toIndex, 0, removed);
        }
      }),
    );
  }, []);

  const pauseQueue = useCallback(() => {
    setQueue((prev) =>
      produce(prev, (draft) => {
        draft.isProcessing = false;
      }),
    );
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const resumeQueue = useCallback(() => {
    setQueue((prev) =>
      produce(prev, (draft) => {
        if (draft.items.some((item) => item.status === "pending")) {
          draft.isProcessing = true;
        }
      }),
    );
  }, []);

  const clearQueue = useCallback(() => {
    setQueue((prev) =>
      produce(prev, (draft) => {
        draft.items = [];
        draft.isProcessing = false;
        draft.currentItemId = undefined;
      }),
    );
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const retryItem = useCallback((id: string) => {
    setQueue((prev) =>
      produce(prev, (draft) => {
        const item = draft.items.find((i) => i.id === id);
        if (item && (item.status === "failed" || item.status === "paused")) {
          item.status = "pending";
          item.progress = 0;
          delete item.error;
          delete item.startedAt;
          delete item.completedAt;
          delete item.outputPaths;
        }
      }),
    );
  }, []);

  const toggleAutoProcess = useCallback(() => {
    setQueue((prev) =>
      produce(prev, (draft) => {
        draft.autoProcess = !draft.autoProcess;
      }),
    );
  }, []);

  const getPendingItems = useCallback(
    () => queue.items.filter((item) => item.status === "pending"),
    [queue.items],
  );

  const getProcessingItem = useCallback(
    () => queue.items.find((item) => item.status === "processing"),
    [queue.items],
  );

  const getCompletedItems = useCallback(
    () => queue.items.filter((item) => item.status === "completed"),
    [queue.items],
  );

  const getFailedItems = useCallback(
    () => queue.items.filter((item) => item.status === "failed"),
    [queue.items],
  );

  return {
    queue,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    pauseQueue,
    resumeQueue,
    clearQueue,
    retryItem,
    toggleAutoProcess,
    getPendingItems,
    getProcessingItem,
    getCompletedItems,
    getFailedItems,
    isProcessing: queue.isProcessing,
    autoProcess: queue.autoProcess,
  };
}

export type UseExportQueue = ReturnType<typeof useExportQueue>;
