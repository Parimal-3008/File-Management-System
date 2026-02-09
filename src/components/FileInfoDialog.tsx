import { useEffect, useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import type { FileItem } from "../zustand/fileStore";
import {
  getFileById,
  getFolderInfoById,
  type FileRecord,
  type FolderInfo,
} from "../db/utils";

type Props = {
  open: boolean;
  item: FileItem | null;
  onClose: () => void;
};

const toMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  return String(value);
};

function InfoSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: unknown }>;
}) {
  return (
    <div className="rounded-xl bg-slate-900/70 px-4 py-3">
      <Typography
        variant="subtitle2"
        sx={{
          color: "#93c5fd",
          fontWeight: 700,
          fontSize: "1rem",
          letterSpacing: "0.02em",
          mb: 1.25,
        }}
      >
        {title}
      </Typography>
      <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="min-w-0 rounded-md bg-slate-800/70 px-2.5 py-2 text-sm"
            title={`${row.label}: ${formatValue(row.value)}`}
          >
            <div className="flex items-center gap-1 whitespace-nowrap leading-5">
              <span className="font-semibold text-slate-200">{row.label}:</span>
              <span className="text-slate-500"> </span>
              <span className="truncate text-slate-300">
                {formatValue(row.value)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FileInfoDialog({ open, item, onClose }: Props) {
  const [record, setRecord] = useState<FileRecord | null>(null);
  const [folderInfo, setFolderInfo] = useState<FolderInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !item) return;

    let active = true;
    setIsLoading(true);
    setError(null);
    setRecord(null);
    setFolderInfo(null);

    void getFileById(item.id)
      .then(async (baseRecord) => {
        if (!active) return;
        if (!baseRecord) {
          setError("Unable to fetch item info.");
          return;
        }
        setRecord(baseRecord);

        if (String(baseRecord.type) !== "folder") return;
        const info = await getFolderInfoById(item.id);
        if (!active) return;
        setFolderInfo(info);
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to fetch item info.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, item]);

  const metadataRows = useMemo(() => {
    if (!record) return [];
    return [
      { label: "Name", value: record.name },
      { label: "Type", value: record.type },
      { label: "Path", value: record.path },
      {
        label: "Parent",
        value: record.parentID ?? record.parentId ?? record.parent_id,
      },
      { label: "Extension", value: record.extension },
      {
        label: "Size",
        value: record.sizeDisplay ?? record.sizeMB ?? record.size,
      },
      { label: "MIME Type", value: record.mimeType },
      { label: "Status", value: record.status },
      { label: "Priority", value: record.priority },
      { label: "Owner", value: record.owner },
      { label: "Department", value: record.department },
      { label: "Project", value: record.project },
    ];
  }, [record]);

  const lifecycleRows = useMemo(() => {
    if (!record) return [];
    return [
      { label: "Created", value: record.createdAt ?? record.created },
      { label: "Modified", value: record.modifiedAt ?? record.modified },
      { label: "Accessed", value: record.accessedAt },
      { label: "Created By", value: record.createdBy },
      { label: "Modified By", value: record.modifiedBy },
      { label: "Permissions", value: record.permissions },
      { label: "Security Level", value: record.securityLevel },
      { label: "Compliance", value: record.complianceTag },
    ];
  }, [record]);

  const statsRows = useMemo(() => {
    if (!folderInfo) return [];
    return [
      { label: "Total Size", value: toMb(folderInfo.totalSizeBytes) },
      { label: "Total Files", value: folderInfo.totalFiles },
      { label: "Total Folders", value: folderInfo.totalFolders },
      { label: "Total Items", value: folderInfo.totalItems },
      { label: "Direct Children", value: folderInfo.directChildren },
    ];
  }, [folderInfo]);

  const flagRows = useMemo(() => {
    if (!record) return [];
    return [
      { label: "Shared", value: record.isShared ? "Yes" : "No" },
      { label: "Encrypted", value: record.isEncrypted ? "Yes" : "No" },
      { label: "Locked", value: record.isLocked ? "Yes" : "No" },
      { label: "Favorite", value: record.isFavorite ? "Yes" : "No" },
      { label: "Public", value: record.isPublic ? "Yes" : "No" },
      { label: "Scanned", value: record.scanStatus ?? "-" },
    ];
  }, [record]);

  const tags = useMemo(() => {
    if (!Array.isArray(record?.tags)) return [];
    return record.tags.slice(0, 8);
  }, [record]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      sx={{
        "& .MuiDialog-container": {
          p: 2.5,
        },
      }}
      PaperProps={{
        sx: {
          width: "90vw",
          maxWidth: 860,
          minHeight: 520,
          display: "flex",
          flexDirection: "column",
          bgcolor: "#0f172a",
          color: "#e2e8f0",
          border: "none",
          borderRadius: 3,
          boxShadow:
            "0 20px 35px -18px rgba(2, 6, 23, 0.85), 0 12px 20px -14px rgba(2, 6, 23, 0.7)",
        },
      }}
    >
      <DialogTitle sx={{ borderBottom: "1px solid #334155", pb: 1.5 }}>
        {String(record?.type) === "folder" ? "Folder Info" : "File Info"}
      </DialogTitle>
      <DialogContent
        sx={{
          borderBottom: "1px solid #334155",
          px: isLoading ? 0 : 8,
          py: isLoading ? 0 : 8,
          flex: 1,
          display: isLoading ? "flex" : "block",
          ...(isLoading && {
            alignItems: "center",
            justifyContent: "center",
          }),
        }}
      >
        {isLoading ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
            }}
          >
            <CircularProgress size={18} />
            <Typography variant="body2" sx={{ color: "#cbd5e1" }}>
              Fetching info...
            </Typography>
          </div>
        ) : error ? (
          <Typography sx={{ color: "#f87171" }}>{error}</Typography>
        ) : record ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              rowGap: "24px",
              marginTop: "16px",
              marginBottom: "16px",
              overflowY: "auto",
            }}
          >
            <InfoSection title="Flags & Scan" rows={flagRows} />
            <InfoSection title="Metadata" rows={metadataRows} />
            <InfoSection title="Lifecycle & Access" rows={lifecycleRows} />
            {String(record.type) === "folder" && folderInfo ? (
              <InfoSection title="Folder Stats" rows={statsRows} />
            ) : null}
            {tags.length > 0 ? (
              <div className="rounded-xl bg-slate-900/70 px-4 py-3">
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: "#93c5fd",
                    mb: 1.5,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                  }}
                >
                  Tags
                </Typography>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={String(tag)}
                      className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200"
                    >
                      {String(tag)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <Typography variant="body2" sx={{ color: "#cbd5e1" }}>
            No data.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2.5 }}>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
