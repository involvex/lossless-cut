import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import {
  FaPlay,
  FaPause,
  FaTrash,
  FaRedo,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import type {
  DragEndEvent,
  DragStartEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

import {
  primaryColor,
  dangerColor,
  warningColor,
  darkModeTransition,
} from "../colors";
import type { ExportQueueItem } from "../../../common/types";
import { formatDuration } from "../util/duration";

interface ExportQueueProps {
  queue: ExportQueueItem[];
  isProcessing: boolean;
  autoProcess: boolean;
  currentItemId: string | undefined;
  onAddToQueue: () => void;
  onRemoveItem: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onPauseQueue: () => void;
  onResumeQueue: () => void;
  onClearQueue: () => void;
  onRetryItem: (id: string) => void;
  onToggleAutoProcess: () => void;
  width: number;
}

function QueueItem({
  item,
  index,
  isDragging,
  isCurrent,
  onRemove,
  onRetry,
}: {
  item: ExportQueueItem;
  index: number;
  isDragging: boolean;
  isCurrent: boolean;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();

  const getStatusIcon = () => {
    switch (item.status) {
      case "pending": {
        return <FaClock style={{ color: "var(--gray-10)" }} />;
      }
      case "processing": {
        return (
          <FaPlay
            style={{
              color: primaryColor,
              animation: "spin 1s linear infinite",
            }}
          />
        );
      }
      case "completed": {
        return <FaCheckCircle style={{ color: "var(--green-10)" }} />;
      }
      case "failed": {
        return <FaExclamationTriangle style={{ color: dangerColor }} />;
      }
      case "paused": {
        return <FaPause style={{ color: warningColor }} />;
      }
    }
  };

  const getStatusText = () => {
    switch (item.status) {
      case "pending": {
        return t("Pending");
      }
      case "processing": {
        return t("Processing...");
      }
      case "completed": {
        return t("Completed");
      }
      case "failed": {
        return item.error ? `${t("Failed")}: ${item.error}` : t("Failed");
      }
      case "paused": {
        return t("Paused");
      }
    }
  };

  const statusColor =
    item.status === "failed"
      ? dangerColor
      : item.status === "completed"
        ? "var(--green-10)"
        : item.status === "processing"
          ? primaryColor
          : item.status === "paused"
            ? warningColor
            : "var(--gray-10)";

  return (
    <div
      style={{
        visibility: isDragging ? "hidden" : "visible",
        opacity: isDragging ? 0.5 : 1,
        display: "flex",
        alignItems: "center",
        gap: ".5em",
        padding: ".4em .5em",
        background: isCurrent ? "var(--blue-3)" : "transparent",
        borderLeft: isCurrent
          ? `3px solid ${primaryColor}`
          : "3px solid transparent",
        borderRadius: "0 .3em .3em 0",
        cursor: "grab",
      }}
    >
      <div style={{ flexShrink: 0, width: "1.5em", textAlign: "center" }}>
        {index + 1}.
      </div>
      <div
        style={{
          flexGrow: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: ".1em",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".3em",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <span style={{ flexShrink: 0 }}>{getStatusIcon()}</span>
          <span
            style={{
              flexShrink: 0,
              fontWeight: 500,
              color: statusColor,
              fontSize: ".85em",
            }}
          >
            {getStatusText()}
          </span>
          <span
            style={{
              flexGrow: 1,
              color: "var(--gray-10)",
              fontSize: ".8em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.filePath}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".5em",
            fontSize: ".75em",
            color: "var(--gray-9)",
          }}
        >
          <span>
            {t("Segments: {{count}}", { count: item.segments.length })}
          </span>
          <span>{t("Mode: {{mode}}", { mode: item.exportMode })}</span>
          {item.outFormat && (
            <span>{t("Format: {{fmt}}", { fmt: item.outFormat })}</span>
          )}
          {item.lossyMode && Object.keys(item.lossyMode).length > 0 && (
            <span style={{ color: "var(--orange-10)" }}>{t("Lossy")}</span>
          )}
        </div>
        {item.status === "processing" && (
          <div
            style={{
              height: 3,
              background: "var(--gray-5)",
              borderRadius: 2,
              overflow: "hidden",
              width: "100%",
            }}
          >
            <div
              style={{
                height: "100%",
                background: primaryColor,
                width: `${item.progress * 100}%`,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        )}
        {(item.status === "completed" || item.status === "failed") &&
          item.startedAt &&
          item.completedAt && (
            <div style={{ fontSize: ".7em", color: "var(--gray-9)" }}>
              {t("Duration: {{duration}}", {
                duration: formatDuration({
                  seconds: (item.completedAt - item.startedAt) / 1000,
                }),
              })}
            </div>
          )}
      </div>
      <div style={{ display: "flex", gap: ".2em" }}>
        {item.status === "failed" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRetry();
            }}
            style={{
              padding: ".2em .4em",
              background: primaryColor,
              color: "white",
              border: "none",
              borderRadius: ".3em",
              cursor: "pointer",
              fontSize: ".75em",
            }}
          >
            <FaRedo style={{ marginRight: ".2em" }} /> {t("Retry")}
          </button>
        )}
        {item.status !== "processing" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            style={{
              padding: ".2em .4em",
              background: "var(--gray-5)",
              color: dangerColor,
              border: "none",
              borderRadius: ".3em",
              cursor: "pointer",
              fontSize: ".75em",
            }}
          >
            <FaTrash style={{ marginRight: ".2em" }} /> {t("Remove")}
          </button>
        )}
      </div>
    </div>
  );
}

function ExportQueue({
  queue,
  isProcessing,
  autoProcess,
  currentItemId,
  onAddToQueue,
  onRemoveItem,
  onReorder,
  onPauseQueue,
  onResumeQueue,
  onClearQueue,
  onRetryItem,
  onToggleAutoProcess,
  width,
}: ExportQueueProps) {
  const { t } = useTranslation();
  const [draggingId, setDraggingId] = useState<UniqueIdentifier | undefined>();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingId(undefined);
    const { active, over } = event;
    if (over != null && active.id !== over?.id) {
      const oldIndex = queue.findIndex((item) => item.id === active.id);
      const newIndex = queue.findIndex((item) => item.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(oldIndex, newIndex);
      }
    }
  };

  const draggingItem = useMemo(
    () => queue.find((item) => item.id === draggingId),
    [queue, draggingId],
  );

  const pendingCount = queue.filter((item) => item.status === "pending").length;
  const processingCount = queue.filter(
    (item) => item.status === "processing",
  ).length;
  const completedCount = queue.filter(
    (item) => item.status === "completed",
  ).length;
  const failedCount = queue.filter((item) => item.status === "failed").length;

  return (
    <motion.div
      className="no-user-select"
      style={{
        width,
        background: "var(--gray-3)",
        color: "var(--gray-12)",
        borderLeft: "1px solid var(--gray-7)",
        transition: darkModeTransition,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        resize: "horizontal",
      }}
      initial={{ x: -width }}
      animate={{ x: 0 }}
      exit={{ x: -width }}
      transition={{ type: "spring", damping: 50, stiffness: 700 }}
    >
      <div
        style={{
          padding: ".5em",
          display: "flex",
          flexWrap: "wrap",
          gap: ".3em",
          alignItems: "center",
          borderBottom: "1px solid var(--gray-7)",
        }}
      >
        <div style={{ fontWeight: 600 }}>
          {t("Export Queue")} {queue.length > 0 && `(${queue.length})`}
        </div>
        <div style={{ flexGrow: 1 }} />
        <div
          style={{
            display: "flex",
            gap: ".2em",
            fontSize: ".75em",
            color: "var(--gray-10)",
          }}
        >
          <span>{t("Pending: {{count}}", { count: pendingCount })}</span>
          <span>{t("Processing: {{count}}", { count: processingCount })}</span>
          <span>{t("Done: {{count}}", { count: completedCount })}</span>
          <span>{t("Failed: {{count}}", { count: failedCount })}</span>
        </div>
        <button
          onClick={onAddToQueue}
          style={{
            padding: ".2em .5em",
            background: primaryColor,
            color: "white",
            border: "none",
            borderRadius: ".3em",
            cursor: "pointer",
            fontSize: ".8em",
          }}
        >
          + {t("Add to Queue")}
        </button>
        <button
          onClick={onToggleAutoProcess}
          style={{
            padding: ".2em .5em",
            background: autoProcess ? "var(--green-6)" : "var(--gray-5)",
            color: autoProcess ? "var(--green-12)" : "var(--gray-12)",
            border: "none",
            borderRadius: ".3em",
            cursor: "pointer",
            fontSize: ".8em",
          }}
        >
          {autoProcess ? <FaPause /> : <FaPlay />}{" "}
          {t(autoProcess ? "Auto" : "Manual")}
        </button>
        {isProcessing && (
          <button
            onClick={onPauseQueue}
            style={{
              padding: ".2em .5em",
              background: "var(--orange-6)",
              color: "var(--orange-12)",
              border: "none",
              borderRadius: ".3em",
              cursor: "pointer",
              fontSize: ".8em",
            }}
          >
            <FaPause /> {t("Pause")}
          </button>
        )}
        {!isProcessing && pendingCount > 0 && (
          <button
            onClick={onResumeQueue}
            style={{
              padding: ".2em .5em",
              background: primaryColor,
              color: "white",
              border: "none",
              borderRadius: ".3em",
              cursor: "pointer",
              fontSize: ".8em",
            }}
          >
            <FaPlay /> {t("Resume")}
          </button>
        )}
        {queue.length > 0 && (
          <button
            onClick={onClearQueue}
            style={{
              padding: ".2em .5em",
              background: "var(--red-6)",
              color: "var(--red-12)",
              border: "none",
              borderRadius: ".3em",
              cursor: "pointer",
              fontSize: ".8em",
            }}
          >
            <FaTrash /> {t("Clear")}
          </button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext
          items={queue.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div style={{ flexGrow: 1, overflow: "auto", padding: ".2em" }}>
            {queue.map((item, index) => (
              <QueueItem
                key={item.id}
                item={item}
                index={index}
                isDragging={draggingId === item.id}
                isCurrent={currentItemId === item.id}
                onRemove={() => onRemoveItem(item.id)}
                onRetry={() => onRetryItem(item.id)}
              />
            ))}
          </div>

          <DragOverlay>
            {draggingItem ? (
              <QueueItem
                item={draggingItem}
                index={queue.indexOf(draggingItem)}
                isDragging
                isCurrent={false}
                onRemove={() => {}}
                onRetry={() => {}}
              />
            ) : null}
          </DragOverlay>
        </SortableContext>
      </DndContext>
    </motion.div>
  );
}

export default memo(ExportQueue);
