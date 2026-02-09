export const INITIAL_BATCH_SIZE = 75;
export const BATCH_SIZE = 75;
export const PREFETCH_THRESHOLD = 10;
export const ROOT_ID = "root_00000000";

export const FILE_TABLE_COLUMNS = [
  { key: "name", label: "Name", width: "240px" },
  { key: "type", label: "Type", width: "100px" },
  { key: "sizeDisplay", label: "Size", width: "100px" },
  { key: "extension", label: "Extension", width: "100px" },
] as const;
