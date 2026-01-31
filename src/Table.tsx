import { useEffect } from "react";
import { useIndexedDbBootstrap } from "./hooks/useIndexedDbBootstrap";
import { useFileExplorer } from "./hooks/useFileExplorer";
import { FileTable } from "./components/FileTable";
import { Breadcrumb } from "./components/BreadCrumb";
import { ROOT_ID } from "./constants/contants";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

export default function Table() {
  const isDbReady = useIndexedDbBootstrap();
  const {
    files,
    totalCount,
    isLoading,
    breadcrumb,
    currentParentId,
    loadParent,
    loadMore,
    navigateTo,
    goBack,
    setCurrentParentId,
    setBreadcrumb,
  } = useFileExplorer();

  useEffect(() => {
    if (isDbReady) {
      loadParent(ROOT_ID);
    }
  }, [isDbReady, loadParent]);

  const handleNavigate = (id: string, index?: number) => {
    setCurrentParentId(id);
    if (index !== undefined) {
      setBreadcrumb((prev) => prev.slice(0, index + 1));
    } else {
      setBreadcrumb([]);
    }
    loadParent(id);
  };

  return (
    <>
      <div className="mb-4 flex items-center gap-4">
        <Tooltip title="Go back">
          <span>
            <IconButton
              onClick={goBack}
              disabled={currentParentId === ROOT_ID}
              size="medium"
              sx={{
                color: "white",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                },
                "&:disabled": {
                  color: "rgba(255, 255, 255, 0.5)",
                },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          </span>
        </Tooltip>

        <Breadcrumb
          breadcrumb={breadcrumb}
          currentParentId={currentParentId}
          onNavigate={handleNavigate}
        />
      </div>

      <FileTable
        files={files}
        totalCount={totalCount}
        isLoading={isLoading}
        onLoadMore={loadMore}
        onDoubleClick={navigateTo}
      />
    </>
  );
}
