import React, { useState, useMemo, useCallback, memo } from "react";
import type { CSSProperties } from "react";
import { TableVirtuoso } from "react-virtuoso";
import type { TableComponents } from "react-virtuoso";

// ============ TYPES ============
interface Column {
  key: string;
  label: string;
  width: string;
}

interface RowData {
  id: number | string;
  [key: string]: unknown;
}

interface VirtuosoTableProps {
  data?: RowData[];
  columns?: Column[];
  title?: string;
  height?: string;
  showCheckbox?: boolean;
  onSelectionChange?: (selectedIds: (number | string)[]) => void;
  renderCell?: (row: RowData, column: Column) => React.ReactNode;
  onRowDoubleClick?: (row: RowData) => void;
  onEndReached?: (index: number) => void;
  totalCount?: number;
}

const TABLE_STYLE: CSSProperties = {
  width: "100%",
  tableLayout: "fixed",
  borderCollapse: "separate",
  borderSpacing: 0,
};

const CHECKBOX_CELL_STYLE: CSSProperties = {
  width: "60px",
  minWidth: "60px",
  maxWidth: "60px",
};

const HEADER_CHECKBOX_STYLE: CSSProperties = {
  ...CHECKBOX_CELL_STYLE,
  position: "sticky",
  top: 0,
  zIndex: 10,
  background: "linear-gradient(to right, rgb(37, 99, 235), rgb(29, 78, 216))",
};

const STATUS_CLASSES: Record<string, string> = {
  Active: "bg-green-100 text-green-800",
  "On Leave": "bg-yellow-100 text-yellow-800",
  Remote: "bg-blue-100 text-blue-800",
};

// Memoized Table component
const MemoizedTable = memo<React.ComponentProps<"table">>(
  ({ style, ...props }) => (
    <table {...props} style={{ ...TABLE_STYLE, ...style }} />
  )
);
MemoizedTable.displayName = "MemoizedTable";

// Context for passing data and handlers to table row
interface TableContext {
  data: RowData[];
  onRowDoubleClick?: (row: RowData) => void;
}

// Memoized TableRow component with double-click support
const MemoizedTableRow = memo<
  React.ComponentProps<"tr"> & { "data-index"?: number; context?: TableContext }
>(({ style, context, ...props }) => {
  const index = props["data-index"] ?? 0;
  const row = context?.data?.[index];

  const handleDoubleClick = useCallback(() => {
    if (row && context?.onRowDoubleClick && row.type === "folder") {
      context.onRowDoubleClick(row);
    }
  }, [row, context]);

  return (
    <tr
      {...props}
      className={`hover:bg-blue-50 transition-colors cursor-pointer ${
        index % 2 === 0 ? "bg-white" : "bg-slate-50"
      }`}
      style={style}
      onDoubleClick={handleDoubleClick}
    />
  );
});
MemoizedTableRow.displayName = "MemoizedTableRow";

// Memoized Status Badge
const StatusBadge = memo<{ value: string }>(({ value }) => (
  <span
    className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
      STATUS_CLASSES[value] || "bg-gray-100 text-gray-800"
    }`}
  >
    {value}
  </span>
));
StatusBadge.displayName = "StatusBadge";

// Memoized Cell component
const TableCell = memo<{
  row: RowData;
  column: Column;
  renderCell?: (row: RowData, column: Column) => React.ReactNode;
}>(({ row, column, renderCell }) => {
  const value = row[column.key];

  if (renderCell) {
    return <>{renderCell(row, column)}</>;
  }

  if (column.key === "status" && typeof value === "string") {
    return <StatusBadge value={value} />;
  }

  if (column.key === "id") {
    return <span className="font-medium text-slate-900">{String(value)}</span>;
  }

  if (column.key === "salary") {
    return (
      <span className="font-semibold text-green-700">{String(value)}</span>
    );
  }

  return <>{String(value ?? "")}</>;
});
TableCell.displayName = "TableCell";

// Memoized Checkbox component
const RowCheckbox = memo<{
  checked: boolean;
  onChange: () => void;
}>(({ checked, onChange }) => (
  <td
    className="px-6 py-4 border-b border-slate-100 text-left"
    style={CHECKBOX_CELL_STYLE}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
    />
  </td>
));
RowCheckbox.displayName = "RowCheckbox";

// Memoized Header Checkbox
const HeaderCheckbox = memo<{
  isAllSelected: boolean;
  isSomeSelected: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}>(({ isAllSelected, isSomeSelected, onChange }) => (
  <th className="px-6 py-4 text-left" style={HEADER_CHECKBOX_STYLE}>
    <input
      type="checkbox"
      checked={isAllSelected}
      ref={(el) => {
        if (el) el.indeterminate = isSomeSelected;
      }}
      onChange={onChange}
      className="w-4 h-4 rounded border-white text-blue-600 focus:ring-2 focus:ring-white cursor-pointer"
    />
  </th>
));
HeaderCheckbox.displayName = "HeaderCheckbox";

// Memoized Header Cell
const HeaderCell = memo<{ column: Column }>(({ column }) => {
  const style = useMemo<CSSProperties>(
    () => ({
      width: column.width,
      minWidth: column.width,
      maxWidth: column.width,
      position: "sticky",
      top: 0,
      zIndex: 10,
      background:
        "linear-gradient(to right, rgb(37, 99, 235), rgb(29, 78, 216))",
    }),
    [column.width]
  );

  return (
    <th
      className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-b-2 border-blue-800"
      style={style}
    >
      {column.label}
    </th>
  );
});
HeaderCell.displayName = "HeaderCell";

// ============ MAIN COMPONENT ============
const VirtuosoTable = memo<VirtuosoTableProps>(
  ({
    data: propData,
    columns: propColumns,
    title = "Employee Directory",
    height = "600px",
    showCheckbox = true,
    onSelectionChange,
    renderCell,
    onRowDoubleClick,
    onEndReached,
    totalCount,
  }) => {
    const [selectedRows, setSelectedRows] = useState<Set<number | string>>(
      () => new Set()
    );
    const data = propData ?? [];
    const columns = propColumns ?? [];

    // Use totalCount if provided, otherwise use data.length
    const effectiveTotalCount = totalCount ?? data.length;

    // Memoize computed selection states
    const { isAllSelected, isSomeSelected } = useMemo(
      () => ({
        isAllSelected: selectedRows.size === data.length && data.length > 0,
        isSomeSelected:
          selectedRows.size > 0 && selectedRows.size < data.length,
      }),
      [selectedRows.size, data.length]
    );

    // Memoize select all handler
    const handleSelectAll = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSelected = e.target.checked
          ? new Set(data.map((row) => row.id))
          : new Set<number | string>();
        setSelectedRows(newSelected);
        onSelectionChange?.(Array.from(newSelected));
      },
      [data, onSelectionChange]
    );

    // Create stable row select handlers using a Map to avoid recreation
    const handleRowSelect = useCallback(
      (id: number | string) => {
        setSelectedRows((prev) => {
          const newSelected = new Set(prev);
          if (newSelected.has(id)) {
            newSelected.delete(id);
          } else {
            newSelected.add(id);
          }
          onSelectionChange?.(Array.from(newSelected));
          return newSelected;
        });
      },
      [onSelectionChange]
    );

    // Memoize table components object
    const tableComponents = useMemo<TableComponents<RowData, TableContext>>(
      () => ({
        Table: MemoizedTable,
        TableRow: MemoizedTableRow,
      }),
      []
    );

    // Context for passing data and handlers to table row
    const tableContext = useMemo<TableContext>(
      () => ({
        data,
        onRowDoubleClick,
      }),
      [data, onRowDoubleClick]
    );

    // Memoize fixed header content
    const fixedHeaderContent = useCallback(
      () => (
        <tr className="bg-gradient-to-r from-blue-600 to-blue-700">
          {showCheckbox && (
            <HeaderCheckbox
              isAllSelected={isAllSelected}
              isSomeSelected={isSomeSelected}
              onChange={handleSelectAll}
            />
          )}
          {columns.map((column) => (
            <HeaderCell key={column.key} column={column} />
          ))}
        </tr>
      ),
      [showCheckbox, isAllSelected, isSomeSelected, handleSelectAll, columns]
    );

    // Memoize item content renderer
    const itemContent = useCallback(
      (_index: number, row: RowData | undefined) => {
        // Handle case where row might be undefined (sparse data with totalCount)
        if (!row) {
          return (
            <>
              {showCheckbox && (
                <td
                  className="px-6 py-4 border-b border-slate-100 text-left"
                  style={CHECKBOX_CELL_STYLE}
                />
              )}
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="px-6 py-4 text-sm text-slate-700 border-b border-slate-100 whitespace-nowrap text-left"
                  style={{
                    width: column.width,
                    minWidth: column.width,
                    maxWidth: column.width,
                  }}
                >
                  <div className="text-gray-400 text-xs">Loading...</div>
                </td>
              ))}
            </>
          );
        }

        return (
          <>
            {showCheckbox && (
              <RowCheckbox
                checked={selectedRows.has(row.id)}
                onChange={() => handleRowSelect(row.id)}
              />
            )}
            {columns.map((column) => (
              <td
                key={column.key}
                className="px-6 py-4 text-sm text-slate-700 border-b border-slate-100 whitespace-nowrap text-left"
                style={{
                  width: column.width,
                  minWidth: column.width,
                  maxWidth: column.width,
                }}
              >
                <TableCell row={row} column={column} renderCell={renderCell} />
              </td>
            ))}
          </>
        );
      },
      [showCheckbox, selectedRows, handleRowSelect, columns, renderCell]
    );

    // Memoize container style
    const containerStyle = useMemo(() => ({ height }), [height]);

    return (
      <div className="w-full bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-slate-800 mb-1">{title}</h1>
            <p className="text-slate-600 text-sm">
              Showing {data.length} of {effectiveTotalCount}{" "}
              {effectiveTotalCount === 1 ? "item" : "items"}
              {showCheckbox &&
                selectedRows.size > 0 &&
                ` · ${selectedRows.size} selected`}
            </p>
          </div>

          <div className="w-full bg-white rounded-lg shadow-lg overflow-hidden border border-slate-200">
            <TableVirtuoso
              style={containerStyle}
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
        </div>
      </div>
    );
  }
);

VirtuosoTable.displayName = "VirtuosoTable";

export default VirtuosoTable;
