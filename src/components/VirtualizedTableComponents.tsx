import React from "react";
import type { CSSProperties } from "react";
import { Resizable } from "re-resizable";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import type { TableComponents } from "react-virtuoso";

import type {
  Column,
  RowData,
  TableContext,
} from "./VirtualizedTable.types";

export const parseWidth = (width: string) => {
  const parsed = Number.parseFloat(width);
  return Number.isFinite(parsed) ? parsed : 120;
};

export const MIN_COLUMN_WIDTH = 160;

export const TABLE_STYLE: CSSProperties = {
  width: "100%",
  tableLayout: "fixed",
  borderCollapse: "separate",
  borderSpacing: 0,
};

export const CHECKBOX_CELL_STYLE: CSSProperties = {
  width: "16px",
  minWidth: "16px",
  maxWidth: "16px",
};

export const HEADER_CHECKBOX_STYLE: CSSProperties = {
  ...CHECKBOX_CELL_STYLE,
  position: "sticky",
  top: 0,
  zIndex: 10,
  background: "linear-gradient(to right, rgb(37, 99, 235), rgb(29, 78, 216))",
};

export const STATUS_CLASSES: Record<string, string> = {
  Active: "bg-green-100 text-green-800",
  "On Leave": "bg-yellow-100 text-yellow-800",
  Remote: "bg-blue-100 text-blue-800",
};

export const Table = ({
  style,
  ...props
}: React.ComponentProps<"table">) => (
  <table {...props} style={{ ...TABLE_STYLE, ...style }} />
);

export const TableRow = ({
  style,
  context,
  ...props
}: React.ComponentProps<"tr"> & {
  "data-index"?: number;
  context?: TableContext;
}) => {
  const index = props["data-index"] ?? 0;
  const row = context?.data?.[index];
  const isSelected = row && context?.selectedRows?.has(row.id);

  const handleClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    if (row && context?.onRowClick) {
      context.onRowClick(row, e);
    }
  };

  const handleDoubleClick = () => {
    if (row && context?.onRowDoubleClick && row.type === "folder") {
      context.onRowDoubleClick(row);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    if (row && context?.onContextMenu) {
      context.onContextMenu(row, {
        x: e.clientX,
        y: e.clientY,
      });
    }
  };

  return (
    <tr
      {...props}
      className={`transition-colors cursor-pointer select-none ${
        isSelected
          ? "bg-blue-200 hover:bg-blue-300"
          : index % 2 === 0
          ? "bg-white hover:bg-blue-50"
          : "bg-slate-50 hover:bg-blue-50"
      }`}
      style={style}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    />
  );
};

export const tableComponents: TableComponents<RowData, TableContext> = {
  Table,
  TableRow,
};

export const StatusBadge = ({ value }: { value: string }) => (
  <span
    className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
      STATUS_CLASSES[value] || "bg-gray-100 text-gray-800"
    }`}
  >
    {value}
  </span>
);

export const TableCell = ({
  row,
  column,
  renderCell,
}: {
  row: RowData;
  column: Column;
  renderCell?: (row: RowData, column: Column) => React.ReactNode;
}) => {
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
};

export const RowCheckbox = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) => (
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
);

export const HeaderCheckbox = ({
  isAllSelected,
  isSomeSelected,
  onChange,
}: {
  isAllSelected: boolean;
  isSomeSelected: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
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
);

export const ColumnHeaderCell = ({
  column,
  width,
  setHeaderCellRef,
  onResizeStop,
}: {
  column: Column;
  width: number;
  setHeaderCellRef: (key: string, element: HTMLTableCellElement | null) => void;
  onResizeStop: (key: string, newWidth: number) => void;
}) => (
  <th
    key={column.key}
    ref={(el) => setHeaderCellRef(column.key, el)}
    className="border-b-2 border-blue-800 p-0 m-0"
    style={{
      width,
      minWidth: MIN_COLUMN_WIDTH,
      position: "sticky",
      top: 0,
      zIndex: 10,
      background:
        "linear-gradient(to right, rgb(37, 99, 235), rgb(29, 78, 216))",
      boxSizing: "border-box",
    }}
  >
    <Resizable
      size={{
        width: "100%",
        height: "100%",
      }}
      enable={{ right: true }}
      minWidth={MIN_COLUMN_WIDTH}
      onResizeStop={(_e, _dir, ref) => {
        onResizeStop(column.key, ref.offsetWidth);
      }}
      handleStyles={{
        right: {
          width: "20px",
          right: "0",
          top: "0",
          bottom: "0",
          cursor: "col-resize",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(59, 130, 246, 0.2)",
        },
      }}
      handleClasses={{
        right: "hover:bg-blue-400",
      }}
      handleComponent={{
        right: (
          <SwapHorizIcon
            fontSize="small"
            sx={{ color: "rgba(255, 255, 255, 0.9)" }}
          />
        ),
      }}
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider select-none w-full">
        {column.label}
      </div>
    </Resizable>
  </th>
);

export const HeaderRow = ({
  columns,
  columnWidths,
  showCheckbox,
  isAllSelected,
  isSomeSelected,
  onSelectAll,
  setHeaderCellRef,
  onResizeStop,
}: {
  columns: Column[];
  columnWidths: Record<string, number>;
  showCheckbox: boolean;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  onSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setHeaderCellRef: (key: string, element: HTMLTableCellElement | null) => void;
  onResizeStop: (key: string, newWidth: number) => void;
}) => (
  <tr className="bg-gradient-to-r from-blue-600 to-blue-700">
    {showCheckbox && (
      <HeaderCheckbox
        isAllSelected={isAllSelected}
        isSomeSelected={isSomeSelected}
        onChange={onSelectAll}
      />
    )}
    {columns.map((column) => {
      const width = columnWidths[column.key] ?? parseWidth(column.width);
      return (
        <ColumnHeaderCell
          key={column.key}
          column={column}
          width={width}
          setHeaderCellRef={setHeaderCellRef}
          onResizeStop={onResizeStop}
        />
      );
    })}
  </tr>
);

export const LoadingRowCells = ({
  columns,
  columnWidths,
  showCheckbox,
}: {
  columns: Column[];
  columnWidths: Record<string, number>;
  showCheckbox: boolean;
}) => (
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
          width: columnWidths[column.key] ?? parseWidth(column.width),
          minWidth: columnWidths[column.key] ?? parseWidth(column.width),
          maxWidth: columnWidths[column.key] ?? parseWidth(column.width),
          boxSizing: "border-box",
        }}
      >
        <div className="text-gray-400 text-xs">Loading...</div>
      </td>
    ))}
  </>
);

export const DataRowCells = ({
  row,
  columns,
  columnWidths,
  showCheckbox,
  selectedRows,
  onRowSelect,
  renderCell,
}: {
  row: RowData;
  columns: Column[];
  columnWidths: Record<string, number>;
  showCheckbox: boolean;
  selectedRows: Set<number | string>;
  onRowSelect: (id: number | string) => void;
  renderCell?: (row: RowData, column: Column) => React.ReactNode;
}) => (
  <>
    {showCheckbox && (
      <RowCheckbox
        checked={selectedRows.has(row.id)}
        onChange={() => onRowSelect(row.id)}
      />
    )}
    {columns.map((column) => (
      <td
        key={column.key}
        className="px-6 py-4 text-sm text-slate-700 border-b border-slate-100 whitespace-nowrap text-left"
        style={{
          width: columnWidths[column.key] ?? parseWidth(column.width),
          minWidth: columnWidths[column.key] ?? parseWidth(column.width),
          maxWidth: columnWidths[column.key] ?? parseWidth(column.width),
          boxSizing: "border-box",
        }}
      >
        <TableCell row={row} column={column} renderCell={renderCell} />
      </td>
    ))}
  </>
);
