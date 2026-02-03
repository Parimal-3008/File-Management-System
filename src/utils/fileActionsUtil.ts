import type { FileItem } from "../zustand/fileStore";
import { deleteFilesByIds, insertFiles } from "../db/utils";

type FileStoreApi = {
  clipboard: FileItem[] | null;
  clipboardOperation: "copy" | "cut" | null;
  copyFiles: (files: FileItem[]) => void;
  cutFiles: (files: FileItem[]) => void;
  pasteFiles: () => FileItem[] | null;
  deleteFiles: (fileIds: (string | number)[]) => void;
  clearClipboard: () => void;
  setFiles: (files: FileItem[]) => void;
  setTotalCount: (count: number) => void;
};

export function copySelected(
  files: FileItem[],
  selectedRows: Set<number | string>,
  fileStore: FileStoreApi
) {
  const itemsToCopy = files.filter((file) => selectedRows.has(file.id));
  fileStore.copyFiles(itemsToCopy);
}

export function cutSelected(
  files: FileItem[],
  selectedRows: Set<number | string>,
  fileStore: FileStoreApi
) {
  const itemsToCut = files.filter((file) => selectedRows.has(file.id));
  fileStore.cutFiles(itemsToCut);
}

export async function pasteClipboard(
  files: FileItem[],
  totalCount: number,
  currentParentId: string | undefined,
  fileStore: FileStoreApi
) {
  const clipboardItems = fileStore.pasteFiles();
  if (!clipboardItems) return;
  if (!currentParentId) {
    console.warn("Paste skipped: currentParentId is not set");
    return;
  }

  const now = new Date().toISOString();
  const makeCopy = (item: FileItem): FileItem => ({
    ...item,
    id: crypto.randomUUID(),
    name: `${item.name} copy`,
    parent_id: currentParentId,
    modified: now,
  });
  const makeMove = (item: FileItem): FileItem => ({
    ...item,
    parent_id: currentParentId,
    modified: now,
  });

  if (fileStore.clipboardOperation === "cut") {
    const idsInCurrent = new Set(files.map((file) => file.id));
    const movedItems = clipboardItems.map(makeMove);
    const updatedFiles = files.map((file) =>
      idsInCurrent.has(file.id)
        ? movedItems.find((m) => m.id === file.id) ?? file
        : file
    );
    const itemsToAdd = movedItems.filter(
      (item) => !idsInCurrent.has(item.id)
    );
    await deleteFilesByIds(clipboardItems.map((item) => item.id));
    await insertFiles(movedItems);
    fileStore.setFiles([...updatedFiles, ...itemsToAdd]);
    if (itemsToAdd.length > 0) {
      fileStore.setTotalCount(totalCount + itemsToAdd.length);
    }
    fileStore.clearClipboard();
    return;
  }

  const copiedItems = clipboardItems.map(makeCopy);
  await insertFiles(copiedItems);
  fileStore.setFiles([...files, ...copiedItems]);
  fileStore.setTotalCount(totalCount + copiedItems.length);
}

export async function deleteSelected(
  selectedRows: Set<number | string>,
  filesLength: number,
  totalCount: number,
  prefetchThreshold: number,
  onLoadMore: () => void,
  fileStore: FileStoreApi
) {
  const idsToDelete = Array.from(selectedRows);
  const deletedCount = idsToDelete.length;
  await deleteFilesByIds(idsToDelete);
  fileStore.deleteFiles(idsToDelete);

  const newTotalCount = Math.max(0, totalCount - deletedCount);
  fileStore.setTotalCount(newTotalCount);

  if (
    filesLength - deletedCount < prefetchThreshold &&
    newTotalCount > filesLength - deletedCount
  ) {
    onLoadMore();
  }
}
