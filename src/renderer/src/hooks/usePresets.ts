import { useCallback, useEffect, useMemo, useState } from "react";
import { produce } from "immer";
import i18n from "i18next";
import { errorToast } from "../swal";

import type { Preset, LossyMode } from "../../../common/types";
import { builtinPresets, getPresetById } from "../util/presets";

const remote = window.require("@electron/remote");
const { configStore } = remote.require("./index.js");

const PRESETS_STORAGE_KEY = "customPresets";

function loadCustomPresetsFromConfig(): Preset[] {
  try {
    const stored = configStore.get(PRESETS_STORAGE_KEY);
    if (stored) {
      const parsed = structuredClone(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to load custom presets from config", err);
  }
  return [];
}

function saveCustomPresetsToConfig(presets: Preset[]) {
  try {
    configStore.set(PRESETS_STORAGE_KEY, presets);
  } catch (err) {
    console.error("Failed to save custom presets to config", err);
  }
}

export function usePresets() {
  const [customPresets, setCustomPresets] = useState<Preset[]>(() =>
    loadCustomPresetsFromConfig(),
  );

  useEffect(() => {
    saveCustomPresetsToConfig(customPresets);
  }, [customPresets]);

  const allPresets = useMemo(
    () => [...builtinPresets, ...customPresets],
    [customPresets],
  );

  const getPreset = useCallback(
    (id: string) =>
      allPresets.find((preset) => preset.id === id) ?? getPresetById(id),
    [allPresets],
  );

  const getPresetsByPlatform = useCallback(
    (platform: Preset["platform"]) =>
      allPresets.filter((preset) => preset.platform === platform),
    [allPresets],
  );

  const getPresetsByCategory = useCallback(
    (category: Preset["category"]) =>
      allPresets.filter((preset) => preset.category === category),
    [allPresets],
  );

  const savePreset = useCallback(
    (
      name: string,
      lossyMode: LossyMode,
      outFormat: string,
      description?: string,
      platform?: Preset["platform"],
      tags?: string[],
    ) => {
      const newPreset: Preset = {
        id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name,
        category: "custom",
        lossyMode,
        outFormat,
        tags: tags ?? [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as Preset;

      if (description !== undefined) {
        newPreset.description = description;
      }

      if (platform !== undefined) {
        newPreset.platform = platform;
      }

      setCustomPresets((prev) =>
        produce(prev, (draft) => {
          draft.push(newPreset);
        }),
      );

      return newPreset.id;
    },
    [],
  );

  const deletePreset = useCallback(
    (id: string) => {
      const preset = customPresets.find((p) => p.id === id);
      if (preset?.category === "builtin") {
        errorToast(i18n.t("Cannot delete built-in preset"));
        return;
      }
      setCustomPresets((prev) =>
        produce(prev, (draft) => {
          const index = draft.findIndex((p) => p.id === id);
          if (index !== -1) draft.splice(index, 1);
        }),
      );
    },
    [customPresets],
  );

  const updatePreset = useCallback(
    (id: string, updates: Partial<Preset>) => {
      const preset = customPresets.find((p) => p.id === id);
      if (preset?.category === "builtin") {
        errorToast(i18n.t("Cannot modify built-in preset"));
        return;
      }
      setCustomPresets((prev) =>
        produce(prev, (draft) => {
          const presetItem = draft.find((p) => p.id === id);
          if (presetItem) {
            Object.assign(presetItem, { ...updates, updatedAt: Date.now() });
          }
        }),
      );
    },
    [customPresets],
  );

  const applyPreset = useCallback(
    (preset: Preset, currentLossyMode: LossyMode): LossyMode => ({
      ...currentLossyMode,
      ...preset.lossyMode,
    }),
    [],
  );

  const exportPreset = useCallback(
    (id: string) => {
      const preset = allPresets.find((p) => p.id === id);
      if (preset) {
        return JSON.stringify(preset, null, 2);
      }
      return null;
    },
    [allPresets],
  );

  const importPreset = useCallback((presetData: string) => {
    try {
      const preset = JSON.parse(presetData) as Preset;
      if (
        !preset.id ||
        !preset.name ||
        !preset.lossyMode ||
        !preset.outFormat
      ) {
        throw new Error("Invalid preset format");
      }
      const newPreset: Preset = {
        ...preset,
        id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        category: "custom",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setCustomPresets((prev) =>
        produce(prev, (draft) => {
          draft.push(newPreset);
        }),
      );
      return newPreset;
    } catch (err) {
      errorToast(
        i18n.t("Failed to import preset: {{error}}", { error: String(err) }),
      );
      return null;
    }
  }, []);

  return {
    presets: allPresets,
    builtinPresets,
    customPresets,
    getPreset,
    getPresetsByPlatform,
    getPresetsByCategory,
    savePreset,
    deletePreset,
    updatePreset,
    applyPreset,
    exportPreset,
    importPreset,
  };
}

export type UsePresets = ReturnType<typeof usePresets>;
