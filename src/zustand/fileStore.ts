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
  setFiles: (files: FileItem[]) => void;
  appendFiles: (files: FileItem[]) => void;
  setLoading: (loading: boolean) => void;
  setCurrentParentId: (parentId: string | number) => void;
  setTotalCount: (count: number) => void;
}

export const useFileStore = create<FileState>((set) => ({
  files: [],
  isLoading: false,
  currentParentId: 0,
  totalCount: 0,
  setFiles: (files) => set({ files }),
  appendFiles: (files) =>
    set((state) => ({
      files: [...state.files, ...files],
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setCurrentParentId: (currentParentId) => set({ currentParentId }),
  setTotalCount: (totalCount) => set({ totalCount }),
}));
