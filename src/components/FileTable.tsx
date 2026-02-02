import VirtualizedTable from "../components/VirtualizedTable";
import type { FileItem } from "../zustand/fileStore";
import { useFileStore } from "../zustand/fileStore";
import {
  copySelected,
  cutSelected,
  deleteSelected,
  pasteClipboard,
} from "../utils/fileActionsUtil";
import { renderFileCell } from "./RenderCell";
import { PREFETCH_THRESHOLD, FILE_TABLE_COLUMNS } from "../constants/contants";
import {
  ContextMenu,
  type ContextMenuOption,
  type ContextMenuPosition,
} from "./ContextMenu";
import { useState, useEffect, useRef, useCallback } from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import DeleteIcon from "@mui/icons-material/Delete";

type Props = {
  files: FileItem[];
  totalCount: number;
  isLoading: boolean;
  onLoadMore: () => void;
  onDoubleClick: (item: FileItem) => void;
  currentParentId?: string;
};

export function FileTable({
  files,
  totalCount,
  isLoading,
  onLoadMore,
  onDoubleClick,
  currentParentId,
}: Props) {
  const [selectedRows, setSelectedRows] = useState<Set<number | string>>(
    () => new Set()
  );
  const [contextMenu, setContextMenu] = useState<{
    position: ContextMenuPosition;
    item: FileItem;
  } | null>(null);
  const lastSelectedIndexRef = useRef<number | null>(null);
  const fileStore = useFileStore();

  // Reset selectedRows when parentID changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectedRows(new Set());
      lastSelectedIndexRef.current = null;
    }, 0);

    return () => clearTimeout(timer);
  }, [currentParentId]);

  // Fetch more data if current files are below threshold
  useEffect(() => {
    if (
      files.length < PREFETCH_THRESHOLD &&
      files.length < totalCount &&
      !isLoading
    ) {
      onLoadMore();
    }
  }, [files.length, totalCount, isLoading, onLoadMore]);

  const handleSelectionChange = (selectedIds: (number | string)[]) => {
    setSelectedRows(new Set(selectedIds));
  };

  const handleRowClick = (item: FileItem, event: React.MouseEvent) => {
    const currentIndex = files.findIndex((file) => file.id === item.id);

    // Shift+Click: Select range from last selected to current
    if (event.shiftKey && lastSelectedIndexRef.current !== null) {
      const start = Math.min(lastSelectedIndexRef.current, currentIndex);
      const end = Math.max(lastSelectedIndexRef.current, currentIndex);

      setSelectedRows((prev) => {
        const newSelected = new Set(prev);
        for (let i = start; i <= end; i++) {
          newSelected.add(files[i].id);
        }
        return newSelected;
      });
    } else {
      // Regular click: Toggle selection
      setSelectedRows((prev) => {
        const newSelected = new Set(prev);
        if (newSelected.has(item.id)) {
          newSelected.delete(item.id);
          return newSelected;
        }
        newSelected.add(item.id);
        return newSelected;
      });
    }

    // Update last selected index
    lastSelectedIndexRef.current = currentIndex;
  };

  const handleContextMenu = useCallback(
    (item: FileItem, position: ContextMenuPosition) => {
      // Select the right-clicked item if not already selected
      if (!selectedRows.has(item.id)) {
        setSelectedRows(new Set([item.id]));
      }
      setContextMenu({ position, item });
    },
    [selectedRows]
  );

  const handleCopy = useCallback(() => {
    copySelected(files, selectedRows, fileStore);
  }, [files, selectedRows, fileStore]);

  const handleCut = useCallback(() => {
    cutSelected(files, selectedRows, fileStore);
  }, [files, selectedRows, fileStore]);

  const handlePaste = useCallback(() => {
    pasteClipboard(files, totalCount, currentParentId, fileStore);
  }, [files, totalCount, currentParentId, fileStore]);

  const handleDelete = useCallback(() => {
    setSelectedRows(new Set());
    deleteSelected(
      selectedRows,
      files.length,
      totalCount,
      PREFETCH_THRESHOLD,
      onLoadMore,
      fileStore
    );
  }, [selectedRows, files.length, totalCount, onLoadMore, fileStore]);

  const contextMenuOptions: ContextMenuOption[] = [
    {
      label: "Copy",
      icon: <ContentCopyIcon fontSize="small" />,
      onClick: handleCopy,
    },
    {
      label: "Cut",
      icon: <ContentCutIcon fontSize="small" />,
      onClick: handleCut,
    },
    {
      label: "Paste",
      icon: <ContentPasteIcon fontSize="small" />,
      onClick: handlePaste,
      disabled: !fileStore.clipboard,
    },
    { divider: true },
    {
      label: "Delete",
      icon: <DeleteIcon fontSize="small" />,
      onClick: handleDelete,
      className: "text-red-600 hover:bg-red-50",
    },
  ];

  if (isLoading) {
    return <div className="py-8 text-center">Loading...</div>;
  }

  return (
    <>
      <ContextMenu
        position={contextMenu?.position ?? null}
        options={contextMenuOptions}
        onClose={() => setContextMenu(null)}
      />
      <VirtualizedTable
        data={files}
        columns={[...FILE_TABLE_COLUMNS]}
        totalCount={totalCount}
        renderCell={renderFileCell}
        showCheckbox={true}
        onSelectionChange={handleSelectionChange}
        onEndReached={(index) => {
          if (index >= files.length - PREFETCH_THRESHOLD) {
            onLoadMore();
          }
        }}
        onRowClick={(item, event) => handleRowClick(item as FileItem, event)}
        onRowDoubleClick={(item) => onDoubleClick(item as FileItem)}
        onContextMenu={(item, position) =>
          handleContextMenu(item as FileItem, position)
        }
        selectedRows={selectedRows}
      />
    </>
  );
}
