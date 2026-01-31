import FolderIcon from "@mui/icons-material/Folder";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

export function renderFileCell(row: any, column: { key: string }) {
  if (column.key === "name") {
    const isFolder = row.type === "folder";

    return (
      <div className="flex items-center gap-2">
        {isFolder ? (
          <FolderIcon sx={{ fontSize: 20 }} />
        ) : (
          <InsertDriveFileIcon sx={{ fontSize: 20 }} />
        )}
        <span>{row.name}</span>
      </div>
    );
  }

  return String(row[column.key] ?? "");
}
