import { create } from "zustand";

export interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  parent_id: string | number;
  created: string;
  modified: string;
  size: number;
  depth: number;
  extension: string | null;
  [key: string]: unknown;
}

interface FileState {
  files: FileItem[];
  isLoading: boolean;
  currentParentId: string | number;
  totalCount: number;
  clipboard: FileItem[] | null;
  clipboardOperation: "copy" | "cut" | null;
  setFiles: (files: FileItem[]) => void;
  appendFiles: (files: FileItem[]) => void;
  setLoading: (loading: boolean) => void;
  setCurrentParentId: (parentId: string | number) => void;
  setTotalCount: (count: number) => void;
  copyFiles: (files: FileItem[]) => void;
  cutFiles: (files: FileItem[]) => void;
  pasteFiles: () => FileItem[] | null;
  deleteFiles: (fileIds: (string | number)[]) => void;
  clearClipboard: () => void;
}

export const useFileStore = create<FileState>((set, get) => ({
  files: [],
  isLoading: false,
  currentParentId: 0,
  totalCount: 0,
  clipboard: null,
  clipboardOperation: null,
  setFiles: (files) => set({ files }),
  appendFiles: (files) =>
    set((state) => ({
      files: [...state.files, ...files],
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setCurrentParentId: (currentParentId) => set({ currentParentId }),
  setTotalCount: (totalCount) => set({ totalCount }),
  copyFiles: (files) =>
    set({
      clipboard: files,
      clipboardOperation: "copy",
    }),
  cutFiles: (files) =>
    set({
      clipboard: files,
      clipboardOperation: "cut",
    }),
  pasteFiles: () => {
    const state = get();
    if (!state.clipboard) return null;
    return state.clipboard;
  },
  deleteFiles: (fileIds) =>
    set((state) => ({
      files: state.files.filter((file) => !fileIds.includes(file.id)),
      totalCount: state.totalCount - fileIds.length,
    })),
  clearClipboard: () =>
    set({
      clipboard: null,
      clipboardOperation: null,
    }),
}));
