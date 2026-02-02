import React, { useEffect, useRef } from "react";

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuOption {
  label?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  divider?: boolean;
  className?: string;
}

interface ContextMenuProps {
  position: ContextMenuPosition | null;
  options: ContextMenuOption[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  position,
  options,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [position, onClose]);

  if (!position) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-2xl shadow-2xl border-2 border-blue-300 min-w-[220px] py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        boxShadow:
          "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
        backdropFilter: "blur(10px)",
      }}
    >
      {options.map((option, index) => {
        if (option.divider) {
          return (
            <div
              key={`divider-${index}`}
              className="my-2 border-t border-gradient from-slate-100 to-slate-50"
            />
          );
        }

        return (
          <button
            key={`option-${index}`}
            onClick={() => {
              option.onClick?.();
              onClose();
            }}
            disabled={option.disabled}
            className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-all duration-200 group ${
              option.disabled
                ? "text-slate-300 cursor-not-allowed opacity-50"
                : "text-slate-700 hover:bg-gradient-to-r hover:to-white hover:text-white active:scale-95"
            } ${option.className || ""}`}
          >
            {option.icon && (
              <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 transition-all duration-200 group-hover:scale-110 text-slate-500 group-hover:text-white">
                {option.icon}
              </span>
            )}
            {option.label && (
              <span className="font-500 tracking-tight">{option.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
