import { useCallback, useRef, useState } from "react";
import {
  countChildrenByParentId,
  getFilesByParentId,
  getFileById,
  ensureParentIndexed,
} from "../db/utils";
import { useFileStore } from "../zustand/fileStore";
import type { FileItem } from "../zustand/fileStore";
import { ROOT_ID, INITIAL_BATCH_SIZE, BATCH_SIZE } from "../constants/contants";
export function useFileExplorer() {
  const {
    files,
    setFiles,
    appendFiles,
    totalCount,
    setTotalCount,
    isLoading,
    setLoading,
  } = useFileStore();

  const [currentParentId, setCurrentParentId] = useState(ROOT_ID);
  const [breadcrumb, setBreadcrumb] = useState<FileItem[]>([]);
  const loadingMoreRef = useRef(false);
  const requestIdRef = useRef(0);

  const loadParent = useCallback(
    async (parentId: string) => {
      const requestId = ++requestIdRef.current;

      try {
        setLoading(true);
        const total = await countChildrenByParentId(parentId);
        if (requestId !== requestIdRef.current) return;

        setTotalCount(total);

        const initialFiles = await getFilesByParentId(
          parentId,
          INITIAL_BATCH_SIZE,
          0
        );

        if (requestId !== requestIdRef.current) return;
        setFiles(initialFiles as FileItem[]);
        ensureParentIndexed(parentId);
      } finally {
        setLoading(false);
      }
    },
    [setFiles, setLoading, setTotalCount]
  );

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || isLoading) return;
    if (files.length >= totalCount) return;

    loadingMoreRef.current = true;
    try {
      const data = await getFilesByParentId(
        currentParentId,
        BATCH_SIZE,
        files.length
      );
      appendFiles(data as FileItem[]);
    } finally {
      loadingMoreRef.current = false;
    }
  }, [files.length, totalCount, currentParentId, appendFiles, isLoading]);

  const navigateTo = async (item: FileItem) => {
    setCurrentParentId(item.id);
    setBreadcrumb((prev) => [...prev, item]);
    await loadParent(item.id);
  };

  const goBack = async () => {
    if (currentParentId === ROOT_ID) return;

    const current = await getFileById(currentParentId);
    const parentId = current?.parentID ?? ROOT_ID;

    setCurrentParentId(parentId);
    setBreadcrumb((prev) => prev.slice(0, -1));
    await loadParent(parentId);
  };

  return {
    files,
    totalCount,
    currentParentId,
    breadcrumb,
    isLoading,
    loadParent,
    loadMore,
    navigateTo,
    goBack,
    setCurrentParentId,
    setBreadcrumb,
  };
}
