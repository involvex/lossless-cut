import { useCallback, useEffect, useState } from "react";
import { produce } from "immer";
import i18n from "i18next";
import { errorToast } from "../swal";

import type {
  ProjectTemplate,
  SegmentBase,
  LossyMode,
  ExportMode,
  PreserveMetadata,
  AvoidNegativeTs,
} from "../../../common/types";
import useUserSettingsRoot from "./useUserSettingsRoot";

const remote = window.require("@electron/remote");
const { configStore } = remote.require("./index.js");

const TEMPLATES_STORAGE_KEY = "projectTemplates";

function loadTemplatesFromConfig(): ProjectTemplate[] {
  try {
    const stored = configStore.get(TEMPLATES_STORAGE_KEY);
    if (stored) {
      const parsed = structuredClone(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to load project templates from config", err);
  }
  return [];
}

function saveTemplatesToConfig(templates: ProjectTemplate[]) {
  try {
    configStore.set(TEMPLATES_STORAGE_KEY, templates);
  } catch (err) {
    console.error("Failed to save project templates to config", err);
  }
}

export function useProjectTemplates() {
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
      cutFileTemplate,
      cutMergedFileTemplate,
      mergedFileTemplate,
    },
  } = useUserSettingsRoot();

  const [templates, setTemplates] = useState<ProjectTemplate[]>(() =>
    loadTemplatesFromConfig(),
  );

  useEffect(() => {
    saveTemplatesToConfig(templates);
  }, [templates]);

  const getEffectiveExportMode = useCallback(() => {
    if (autoMerge && autoDeleteMergedSegments) return "merge";
    if (autoMerge) return "merge+separate";
    if (segmentsToChaptersOnly) return "segments_to_chapters";
    return "separate";
  }, [autoMerge, autoDeleteMergedSegments, segmentsToChaptersOnly]);

  const effectiveExportMode = getEffectiveExportMode();

  const saveAsTemplate = useCallback(
    (
      name: string,
      segments: SegmentBase[],
      description?: string,
      lossyMode?: LossyMode,
      outFormat?: string,
      shortestFlag?: boolean,
    ) => {
      type ExportSettings = {
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

      const exportSettings: ExportSettings = {
        exportMode: effectiveExportMode,
        keyframeCut,
        enableSmartCut,
        preserveMetadata,
        preserveMovData,
        preserveChapters,
        movFastStart,
        avoidNegativeTs,
        ffmpegExperimental,
        shortestFlag: shortestFlag ?? false,
      };

      if (outFormat !== undefined) {
        exportSettings.outFormat = outFormat;
      }
      if (lossyMode !== undefined) {
        exportSettings.lossyMode = lossyMode;
      }

      const newTemplate: ProjectTemplate = {
        id: `template-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name,
        ...(description !== undefined ? { description } : {}),
        segments,
        cutFileTemplate: cutFileTemplate ?? "",
        cutMergedFileTemplate: cutMergedFileTemplate ?? "",
        mergedFileTemplate: mergedFileTemplate ?? "",
        exportSettings,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setTemplates((prev) =>
        produce(prev, (draft) => {
          draft.push(newTemplate);
        }),
      );

      return newTemplate.id;
    },
    [
      cutFileTemplate,
      cutMergedFileTemplate,
      mergedFileTemplate,
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

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((prev) =>
      produce(prev, (draft) => {
        const index = draft.findIndex((t) => t.id === id);
        if (index !== -1) draft.splice(index, 1);
      }),
    );
  }, []);

  const updateTemplate = useCallback(
    (id: string, updates: Partial<ProjectTemplate>) => {
      setTemplates((prev) =>
        produce(prev, (draft) => {
          const template = draft.find((t) => t.id === id);
          if (template) {
            Object.assign(template, { ...updates, updatedAt: Date.now() });
          }
        }),
      );
    },
    [],
  );

  const getTemplate = useCallback(
    (id: string) => templates.find((t) => t.id === id),
    [templates],
  );

  const applyTemplate = useCallback(
    (template: ProjectTemplate) => ({
      segments: template.segments.map((s) => ({ ...s })),
      cutFileTemplate: template.cutFileTemplate,
      cutMergedFileTemplate: template.cutMergedFileTemplate,
      mergedFileTemplate: template.mergedFileTemplate,
      exportSettings: { ...template.exportSettings },
    }),
    [],
  );

  const importTemplate = useCallback((templateData: string) => {
    try {
      const template = JSON.parse(templateData) as ProjectTemplate;
      if (!template.id || !template.name || !Array.isArray(template.segments)) {
        throw new Error("Invalid template format");
      }
      const newTemplate: ProjectTemplate = {
        ...template,
        id: `template-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setTemplates((prev) =>
        produce(prev, (draft) => {
          draft.push(newTemplate);
        }),
      );
      return newTemplate;
    } catch (err) {
      errorToast(
        i18n.t("Failed to import template: {{error}}", { error: String(err) }),
      );
      return null;
    }
  }, []);

  const exportTemplate = useCallback(
    (id: string) => {
      const template = templates.find((t) => t.id === id);
      if (template) {
        return JSON.stringify(template, null, 2);
      }
      return null;
    },
    [templates],
  );

  return {
    templates,
    saveAsTemplate,
    deleteTemplate,
    updateTemplate,
    getTemplate,
    applyTemplate,
    importTemplate,
    exportTemplate,
  };
}

export type UseProjectTemplates = ReturnType<typeof useProjectTemplates>;
