import { useEffect } from "react";
import { useIndexedDbBootstrap } from "./hooks/useIndexedDbBootstrap";
import { useFileExplorer } from "./hooks/useFileExplorer";
import { FileTable } from "./components/FileTable";
import { Breadcrumb } from "./components/BreadCrumb";
import { ROOT_ID } from "./constants/contants";
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

  return (
    <>
      <button onClick={goBack} disabled={currentParentId === ROOT_ID}>
        Back
      </button>

      <Breadcrumb
        breadcrumb={breadcrumb}
        currentParentId={currentParentId}
        onNavigate={(id, index) => {
          setCurrentParentId(id);
          if (index !== undefined) {
            setBreadcrumb((prev) => prev.slice(0, index + 1));
          } else {
            setBreadcrumb([]);
          }
          loadParent(id);
        }}
      />

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
