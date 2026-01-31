import "../App.css";
import { useEffect, useRef, useCallback, useState, use } from "react";
import VirtualizedTable from "../components/VirtualizedTable";
import { useFileStore } from "../zustand/fileStore";
import type { FileItem } from "../zustand/fileStore";
import {
  getFilesByParentId,
  hasIndexedDBData,
  countChildrenByParentId,
  getFileById,
} from "../db/utils";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import HomeIcon from "@mui/icons-material/Home";
import FolderIcon from "@mui/icons-material/Folder";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

const INITIAL_BATCH_SIZE = 75; // Load 70-80 items initially
const BATCH_SIZE = 75; // Load 70-80 items per scroll batch

export default function Table() {
  const {
    files,
    isLoading,
    setFiles,
    appendFiles,
    setLoading,
    totalCount,
    setTotalCount,
  } = useFileStore();

  const hasInitialized = useRef(false);
  const workerRef = useRef<Worker | null>(null);
  const [currentParentId, setCurrentParentId] = useState<string>("0");
  const [breadcrumb, setBreadcrumb] = useState<FileItem[]>([]);
  const [isDbReady, setIsDbReady] = useState(false);
  const isLoadingMoreRef = useRef(false);

  const columns = [
    { key: "name", label: "Name", width: "240px" },
    { key: "type", label: "Type", width: "100px" },
    { key: "size", label: "Size", width: "100px" },
    { key: "extension", label: "Extension", width: "100px" },
  ];

  // Initialize path: count total items first, then load initial batch
  const initializeParentId = useCallback(
    async (parentId: string = "0") => {
      try {
        setLoading(true);

        // First, count all children for this parent
        const total = await countChildrenByParentId(parentId);
        setTotalCount(total);

        // Then load initial batch
        const initialFiles = (await getFilesByParentId(
          parentId,
          INITIAL_BATCH_SIZE,
          0
        )) as unknown as FileItem[];
        setFiles(initialFiles);
      } catch (error) {
        console.error("Error initializing parent:", error);
        setTotalCount(0);
        setFiles([]);
      } finally {
        setLoading(false);
      }
    },
    [setFiles, setLoading, setTotalCount]
  );

  // Load more files when scrolling (appends to existing files)
  const loadMoreFiles = useCallback(
    async (parentId: string = "0") => {
      // Prevent multiple simultaneous loads
      if (isLoadingMoreRef.current || isLoading) return;

      // Check if we've loaded all items
      if (files.length >= totalCount) return;

      try {
        isLoadingMoreRef.current = true;
        const offset = files.length;
        const filesData = (await getFilesByParentId(
          parentId,
          BATCH_SIZE,
          offset
        )) as unknown as FileItem[];

        if (filesData.length > 0) {
          appendFiles(filesData);
        }
      } catch (error) {
        console.error("Error loading more files:", error);
      } finally {
        isLoadingMoreRef.current = false;
      }
    },
    [files.length, totalCount, isLoading, appendFiles]
  );

  // Initialize: check if IndexedDB has data, if not start worker to parse
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initialize = async () => {
      setLoading(true);
      const hasData = await hasIndexedDBData();

      if (hasData) {
        setIsDbReady(true);
        await initializeParentId("0");
      } else {
        // Start worker to parse and populate IndexedDB
        workerRef.current = new Worker(
          new URL("../worker/dbWorker.ts", import.meta.url),
          { type: "module" }
        );

        workerRef.current.postMessage({ type: "INIT_PARSE" });

        workerRef.current.onmessage = async (e) => {
          if (e.data.type === "complete") {
            setIsDbReady(true);
            await initializeParentId("0");
          }
        };
      }
    };

    initialize();

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [initializeParentId, setLoading]);

  // Initialize parent when currentParentId changes (after DB is ready)
  useEffect(() => {
    if (!isDbReady) return;
    initializeParentId(currentParentId);
  }, [currentParentId, isDbReady, initializeParentId]);

  // Transform files to include index signature compatibility
  const tableData = files.map((file) => ({
    ...file,
    id: file.id,
  }));

  const onRowDoubleClick = (row: FileItem) => {
    if (row.type === "folder") {
      // Navigate to the folder by setting its ID as parent_id
      setCurrentParentId(row.id);
      setBreadcrumb((prev) => [...prev, row]);
    }
  };

  const renderCell = (
    row: { id: number | string; [key: string]: unknown },
    column: { key: string; label: string; width: string }
  ) => {
    if (column.key === "name") {
      const isDirectory = row.type === "directory";
      return (
        <div className="flex items-center gap-2">
          {isDirectory ? (
            <FolderIcon className="text-blue-500" sx={{ fontSize: 20 }} />
          ) : (
            <InsertDriveFileIcon
              className="text-gray-500"
              sx={{ fontSize: 20 }}
            />
          )}
          <span>{String(row.name)}</span>
        </div>
      );
    }
    return String(row[column.key] ?? "");
  };

  const handleBack = async () => {
    if (currentParentId === "0") {
      setCurrentParentId("0");
      setBreadcrumb([]);
      return;
    }

    // Get parent's parent to go back one level
    const currentItem = await getFileById(currentParentId);
    if (currentItem) {
      setCurrentParentId(currentItem.parent_id ?? "0");
    } else {
      setCurrentParentId("0");
    }
    setBreadcrumb((prev) => prev.slice(0, -1));
  };

  const handleEndReached = async (lastIndex: number) => {
    // Load more when user scrolls near the end of loaded items
    // Trigger when within 10 items of the end
    if (lastIndex >= files.length - 10) {
      await loadMoreFiles(currentParentId);
    }
  };

  const renderBreadcrumb = () => {
    // Build breadcrumb by storing the navigation hierarchy
    // For now, show simple breadcrumb with folder names from current files

    return (
      <div className="flex items-center gap-1 text-sm">
        <button
          onClick={() => {
            setCurrentParentId("0");
          }}
          className={`px-2 py-1 rounded transition-colors ${
            currentParentId === "0"
              ? "text-gray-900 font-semibold bg-blue-50"
              : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
          }`}
        >
          Root
        </button>
        {breadcrumb.map((item, index) => (
          <div key={item.id} className="flex items-center gap-1">
            <span className="text-gray-400">/</span>
            <button
              onClick={() => {
                setCurrentParentId(item.id);
                setBreadcrumb((prev) => {
                  return prev.slice(0, index + 1);
                });
              }}
              className={`px-2 py-1 rounded transition-colors ${
                currentParentId === item.id
                  ? "text-gray-900 font-semibold bg-blue-50"
                  : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
              }`}
            >
              {item.name}
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="w-full bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:hover:shadow-md"
            onClick={handleBack}
            disabled={currentParentId === "0"}
          >
            <ArrowBackIcon sx={{ fontSize: 20 }} />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2 flex-1 bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-200">
            <FolderOpenIcon className="text-blue-600" sx={{ fontSize: 22 }} />
            {renderBreadcrumb()}
          </div>
        </div>
      </div>

      <div className="w-full">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading files...</div>
        ) : (
          <VirtualizedTable
            data={tableData}
            columns={columns}
            title="File Manager"
            totalCount={totalCount}
            onEndReached={handleEndReached}
            onRowDoubleClick={(row) =>
              onRowDoubleClick(row as unknown as FileItem)
            }
            renderCell={renderCell}
          />
        )}
      </div>
    </div>
  );
}
