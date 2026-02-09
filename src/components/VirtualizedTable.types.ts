import type React from "react";

export interface Column {
  key: string;
  label: string;
  width: string;
}

export interface RowData {
  id: number | string;
  [key: string]: unknown;
}

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface VirtuosoTableProps {
  data?: RowData[];
  columns?: Column[];
  title?: string;
  headerRight?: React.ReactNode;
  isSearching?: boolean;
  height?: string;
  showCheckbox?: boolean;
  onSelectionChange?: (selectedIds: (number | string)[]) => void;
  renderCell?: (row: RowData, column: Column) => React.ReactNode;
  onRowClick?: (row: RowData, event: React.MouseEvent) => void;
  onRowDoubleClick?: (row: RowData) => void;
  onContextMenu?: (row: RowData, position: ContextMenuPosition) => void;
  onEndReached?: (index: number) => void;
  totalCount?: number;
  selectedRows?: Set<number | string>;
}

export interface TableContext {
  data: RowData[];
  onRowClick?: (row: RowData, event: React.MouseEvent) => void;
  onRowDoubleClick?: (row: RowData) => void;
  onContextMenu?: (row: RowData, position: ContextMenuPosition) => void;
  selectedRows?: Set<number | string>;
}
