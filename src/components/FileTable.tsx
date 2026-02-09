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
import type { ContextMenuOption, ContextMenuPosition } from "./ContextMenu";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  lazy,
  Suspense,
} from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { FileTableFilterInput } from "./FileTableFilterInput";
import { FileTableContextMenu } from "./FileTableContextMenu";
import { searchFilesByNameAndParentId } from "../db/utils";
import { debounce } from "../utils/debounce";

const ROOT_PARENT_ID = "0";
const SEARCH_LIMIT = 5000;
const SEARCH_DEBOUNCE_MS = 150;
const FileInfoDialog = lazy(() => import("./FileInfoDialog"));

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
  const [filterText, setFilterText] = useState("");
  const [filteredFiles, setFilteredFiles] = useState<FileItem[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    position: ContextMenuPosition;
    item: FileItem;
  } | null>(null);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [infoItem, setInfoItem] = useState<FileItem | null>(null);
  const lastSelectedIndexRef = useRef<number | null>(null);
  const searchRequestIdRef = useRef(0);

  const fileStore = useFileStore();
  const effectiveParentId = currentParentId ?? ROOT_PARENT_ID;
  const normalizedFilter = filterText.trim();
  const isFilterActive = normalizedFilter.length > 0;
  const shouldSearchByIndex = normalizedFilter.length >= 3;
  const activeFiles = filteredFiles ?? files;
  const activeTotalCount = filteredFiles ? filteredFiles.length : totalCount;

  const runIndexedSearch = useCallback(
    async (
      normalized: string,
      parentId: string | number,
      requestId: number
    ) => {
      const results = (await searchFilesByNameAndParentId(
        normalized,
        parentId,
        SEARCH_LIMIT
      )) as unknown as FileItem[];

      if (requestId !== searchRequestIdRef.current) return;
      setFilteredFiles(results);
      setIsSearching(false);
    },
    []
  );

  const debouncedSearch = useMemo(
    () =>
      debounce((normalized: string, parentId: string | number, requestId: number) => {
        void runIndexedSearch(normalized, parentId, requestId);
      }, SEARCH_DEBOUNCE_MS),
    [runIndexedSearch]
  );

  // Reset table local state when moving between folders.
  useEffect(() => {
    searchRequestIdRef.current += 1;
    setSelectedRows(new Set());
    lastSelectedIndexRef.current = null;
    setFilterText("");
    setFilteredFiles(null);
    setIsSearching(false);
  }, [currentParentId]);

  useEffect(() => {
    if (!isFilterActive) {
      setFilteredFiles(null);
      setIsSearching(false);
      return;
    }

    if (!shouldSearchByIndex) {
      setFilteredFiles(null);
      setIsSearching(false);
      return;
    }

    const requestId = ++searchRequestIdRef.current;
    setIsSearching(true);
    debouncedSearch(normalizedFilter, effectiveParentId, requestId);
  }, [
    isFilterActive,
    shouldSearchByIndex,
    normalizedFilter,
    effectiveParentId,
    debouncedSearch,
  ]);

  // Fetch more data if current files are below threshold
  useEffect(() => {
    if (
      !isFilterActive &&
      files.length < PREFETCH_THRESHOLD &&
      files.length < totalCount &&
      !isLoading
    ) {
      onLoadMore();
    }
  }, [isFilterActive, files.length, totalCount, isLoading, onLoadMore]);

  const handleSelectionChange = useCallback((selectedIds: (number | string)[]) => {
    setSelectedRows(new Set(selectedIds));
  }, []);

  const handleRowClick = useCallback((item: FileItem, event: React.MouseEvent) => {
    const currentIndex = activeFiles.findIndex((file) => file.id === item.id);
    if (currentIndex === -1) return;

    // Shift+Click: Select range from last selected to current
    if (event.shiftKey && lastSelectedIndexRef.current !== null) {
      const start = Math.min(lastSelectedIndexRef.current, currentIndex);
      const end = Math.max(lastSelectedIndexRef.current, currentIndex);

      setSelectedRows((prev) => {
        const newSelected = new Set(prev);
        for (let i = start; i <= end; i++) {
          newSelected.add(activeFiles[i].id);
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
  }, [activeFiles]);

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
    copySelected(activeFiles, selectedRows, fileStore);
  }, [activeFiles, selectedRows, fileStore]);

  const handleCut = useCallback(() => {
    cutSelected(activeFiles, selectedRows, fileStore);
  }, [activeFiles, selectedRows, fileStore]);

  const handlePaste = useCallback(async () => {
    await pasteClipboard(files, totalCount, currentParentId, fileStore);
  }, [files, totalCount, currentParentId, fileStore]);

  const handleDelete = useCallback(async () => {
    setSelectedRows(new Set());
    await deleteSelected(
      selectedRows,
      activeFiles.length,
      totalCount,
      PREFETCH_THRESHOLD,
      onLoadMore,
      fileStore
    );
  }, [selectedRows, activeFiles.length, totalCount, onLoadMore, fileStore]);

  const handleGetInfo = useCallback(() => {
    const item = contextMenu?.item;
    if (!item) return;
    setInfoItem(item);
    setIsInfoDialogOpen(true);
  }, [contextMenu]);

  const handleEndReached = useCallback(
    (index: number) => {
      if (!isFilterActive && index >= files.length - PREFETCH_THRESHOLD) {
        onLoadMore();
      }
    },
    [isFilterActive, files.length, onLoadMore]
  );

  const contextMenuOptions: ContextMenuOption[] = useMemo(
    () => [
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
      {
        label: "Get info",
        icon: <InfoOutlinedIcon fontSize="small" />,
        onClick: handleGetInfo,
        disabled: !contextMenu?.item,
      },
      { divider: true },
      {
        label: "Delete",
        icon: <DeleteIcon fontSize="small" />,
        onClick: handleDelete,
        className: "text-red-600 hover:bg-red-50",
      },
    ],
    [
      handleCopy,
      handleCut,
      handlePaste,
      handleGetInfo,
      handleDelete,
      fileStore.clipboard,
      contextMenu,
    ]
  );

  if (isLoading) {
    return <div className="py-8 text-center">Loading...</div>;
  }

  return (
    <>
      <FileTableContextMenu
        contextMenu={contextMenu}
        options={contextMenuOptions}
        onClose={() => setContextMenu(null)}
      />
      {isInfoDialogOpen ? (
        <Suspense fallback={null}>
          <FileInfoDialog
            open={isInfoDialogOpen}
            item={infoItem}
            onClose={() => setIsInfoDialogOpen(false)}
          />
        </Suspense>
      ) : null}
      <VirtualizedTable
        data={activeFiles}
        columns={[...FILE_TABLE_COLUMNS]}
        totalCount={activeTotalCount}
        isSearching={isSearching}
        headerRight={
          <div className="flex items-center">
            <FileTableFilterInput
              value={filterText}
              onChange={setFilterText}
            />
          </div>
        }
        renderCell={renderFileCell}
        showCheckbox={true}
        onSelectionChange={handleSelectionChange}
        onEndReached={handleEndReached}
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
