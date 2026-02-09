import React, { useEffect, useRef, useState } from "react";
import { TableVirtuoso } from "react-virtuoso";

import type { RowData, TableContext, VirtuosoTableProps } from "./VirtualizedTable.types";
import {
  DataRowCells,
  HeaderRow,
  LoadingRowCells,
  parseWidth,
  tableComponents,
} from "./VirtualizedTableComponents";

// ============ MAIN COMPONENT ============
const VirtuosoTable = ({
  data: propData,
  columns: propColumns,
  title = "Employee Directory",
  headerRight,
  isSearching = false,
  height = "600px",
  showCheckbox = true,
  onSelectionChange,
  renderCell,
  onRowClick,
  onRowDoubleClick,
  onContextMenu,
  onEndReached,
  totalCount,
  selectedRows: propSelectedRows,
}: VirtuosoTableProps) => {
  const [internalSelectedRows, setInternalSelectedRows] = useState<
    Set<number | string>
  >(() => new Set());

  // Use provided selectedRows or internal state
  const selectedRows = propSelectedRows ?? internalSelectedRows;
  const data = propData ?? [];
  const columns = propColumns ?? [];

  // Initialize with parsed widths first
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    columns.reduce<Record<string, number>>((acc, col) => {
      acc[col.key] = parseWidth(col.width);
      return acc;
    }, {})
  );

  // Track if widths have been initialized from DOM
  const [widthsInitialized, setWidthsInitialized] = useState(false);

  // Refs to store header cell elements
  const headerCellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());

  // Measure actual widths after initial render
  useEffect(() => {
    if (widthsInitialized || columns.length === 0) return;

    // Wait for next frame to ensure DOM is rendered
    requestAnimationFrame(() => {
      const measuredWidths: Record<string, number> = {};
      let hasAllMeasurements = true;

      columns.forEach((column) => {
        const cellRef = headerCellRefs.current.get(column.key);
        if (cellRef) {
          measuredWidths[column.key] = cellRef.offsetWidth;
        } else {
          hasAllMeasurements = false;
        }
      });

      if (hasAllMeasurements && Object.keys(measuredWidths).length > 0) {
        setColumnWidths(measuredWidths);
        setWidthsInitialized(true);
      }
    });
  }, [columns, widthsInitialized]);

  // Callback to store header cell refs
  const setHeaderCellRef = (
    key: string,
    element: HTMLTableCellElement | null
  ) => {
    if (element) {
      headerCellRefs.current.set(key, element);
    } else {
      headerCellRefs.current.delete(key);
    }
  };

  // Use totalCount if provided, otherwise use data.length
  const effectiveTotalCount = totalCount ?? data.length;

  const isAllSelected = selectedRows.size === data.length && data.length > 0;
  const isSomeSelected =
    selectedRows.size > 0 && selectedRows.size < data.length;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSelected = e.target.checked
      ? new Set(data.map((row) => row.id))
      : new Set<number | string>();
    if (propSelectedRows) {
      onSelectionChange?.(Array.from(newSelected));
    } else {
      setInternalSelectedRows(newSelected);
      onSelectionChange?.(Array.from(newSelected));
    }
  };

  const handleRowSelect = (id: number | string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    if (propSelectedRows) {
      onSelectionChange?.(Array.from(newSelected));
    } else {
      setInternalSelectedRows(newSelected);
      onSelectionChange?.(Array.from(newSelected));
    }
  };

  // Context for passing data and handlers to table row
  const tableContext: TableContext = {
    data,
    onRowClick,
    onRowDoubleClick,
    onContextMenu,
    selectedRows,
  };

  const handleResizeStop = (key: string, newWidth: number) => {
    setColumnWidths((prev) => ({
      ...prev,
      [key]: newWidth,
    }));
  };

  const fixedHeaderContent = () => (
    <HeaderRow
      columns={columns}
      columnWidths={columnWidths}
      showCheckbox={showCheckbox}
      isAllSelected={isAllSelected}
      isSomeSelected={isSomeSelected}
      onSelectAll={handleSelectAll}
      setHeaderCellRef={setHeaderCellRef}
      onResizeStop={handleResizeStop}
    />
  );

  const itemContent = (_index: number, row: RowData | undefined) => {
    if (!row) {
      return (
        <LoadingRowCells
          columns={columns}
          columnWidths={columnWidths}
          showCheckbox={showCheckbox}
        />
      );
    }

    return (
      <DataRowCells
        row={row}
        columns={columns}
        columnWidths={columnWidths}
        showCheckbox={showCheckbox}
        selectedRows={selectedRows}
        onRowSelect={handleRowSelect}
        renderCell={renderCell}
      />
    );
  };

  return (
    <div className="w-full bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full">
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
          </div>
          <p className="text-slate-600 text-sm">
            Showing {data.length} of {effectiveTotalCount}{" "}
            {effectiveTotalCount === 1 ? "item" : "items"}
            {showCheckbox &&
              selectedRows.size > 0 &&
              ` · ${selectedRows.size} selected`}
          </p>
        </div>

        {isSearching ? (
          <div className="mb-3 rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700">
            Searching...
          </div>
        ) : null}

        {!isSearching ? (
          <div className="w-full bg-white rounded-lg shadow-lg overflow-hidden border border-slate-200">
            <TableVirtuoso
              style={{ height }}
              data={data}
              totalCount={effectiveTotalCount}
              context={tableContext}
              fixedHeaderContent={fixedHeaderContent}
              itemContent={itemContent}
              components={tableComponents}
              overscan={10}
              endReached={onEndReached}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default VirtuosoTable;
