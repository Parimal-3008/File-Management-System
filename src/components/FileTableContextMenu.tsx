import React from "react";
import {
  ContextMenu,
  type ContextMenuOption,
  type ContextMenuPosition,
} from "./ContextMenu";
import type { FileItem } from "../zustand/fileStore";

type Props = {
  contextMenu:
    | {
        position: ContextMenuPosition;
        item: FileItem;
      }
    | null;
  options: ContextMenuOption[];
  onClose: () => void;
};

export function FileTableContextMenu({ contextMenu, options, onClose }: Props) {
  return (
    <ContextMenu
      position={contextMenu?.position ?? null}
      options={options}
      onClose={onClose}
    />
  );
}
