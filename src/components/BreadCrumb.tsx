import type { FileItem } from "../zustand/fileStore";
import { ROOT_ID } from "../constants/contants";

type Props = {
  breadcrumb: FileItem[];
  currentParentId: string;
  onNavigate: (id: string, index?: number) => void;
};

export function Breadcrumb({ breadcrumb, currentParentId, onNavigate }: Props) {
  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        onClick={() => onNavigate(ROOT_ID)}
        className={currentParentId === ROOT_ID ? "font-semibold" : ""}
      >
        Root
      </button>

      {breadcrumb.map((item, index) => (
        <div key={item.id} className="flex items-center gap-1">
          <span>/</span>
          <button onClick={() => onNavigate(item.id, index)}>
            {item.name}
          </button>
        </div>
      ))}
    </div>
  );
}
