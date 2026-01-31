import VirtualizedTable from "../components/VirtualizedTable";
import type { FileItem } from "../zustand/fileStore";
import { renderFileCell } from "./RenderCell";
import { PREFETCH_THRESHOLD, FILE_TABLE_COLUMNS } from "../constants/contants";

type Props = {
  files: FileItem[];
  totalCount: number;
  isLoading: boolean;
  onLoadMore: () => void;
  onDoubleClick: (item: FileItem) => void;
};

export function FileTable({
  files,
  totalCount,
  isLoading,
  onLoadMore,
  onDoubleClick,
}: Props) {
  if (isLoading) {
    return <div className="py-8 text-center">Loading...</div>;
  }

  return (
    <VirtualizedTable
      data={files}
      columns={FILE_TABLE_COLUMNS}
      totalCount={totalCount}
      renderCell={renderFileCell}
      onEndReached={(index) => {
        if (index >= files.length - PREFETCH_THRESHOLD) {
          onLoadMore();
        }
      }}
      onRowDoubleClick={onDoubleClick}
    />
  );
}
