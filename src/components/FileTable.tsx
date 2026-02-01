import VirtualizedTable from "../components/VirtualizedTable";
import type { FileItem } from "../zustand/fileStore";
import { renderFileCell } from "./RenderCell";
import { PREFETCH_THRESHOLD, FILE_TABLE_COLUMNS } from "../constants/contants";
import { useState, useEffect } from "react";

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

  // Reset selectedRows when parentID changes
  useEffect(() => {
    setSelectedRows(new Set());
  }, [currentParentId]);

  const handleSelectionChange = (selectedIds: (number | string)[]) => {
    setSelectedRows(new Set(selectedIds));
  };

  const handleRowClick = (item: FileItem) => {
    setSelectedRows((prev) => {
      const newSelected = new Set(prev);
      newSelected.add(item.id);
      return newSelected;
    });
  };

  if (isLoading) {
    return <div className="py-8 text-center">Loading...</div>;
  }

  return (
    <VirtualizedTable
      data={files}
      columns={FILE_TABLE_COLUMNS}
      totalCount={totalCount}
      renderCell={renderFileCell}
      showCheckbox={true}
      onSelectionChange={handleSelectionChange}
      onEndReached={(index) => {
        if (index >= files.length - PREFETCH_THRESHOLD) {
          onLoadMore();
        }
      }}
      onRowClick={handleRowClick}
      onRowDoubleClick={onDoubleClick}
      selectedRows={selectedRows}
    />
  );
}
