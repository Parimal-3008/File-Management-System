import React from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function FileTableFilterInput({ value, onChange }: Props) {
  return (
    <div className="flex items-center">
      <div className="relative w-full max-w-md">
        <input
          type="text"
          placeholder="Type to filter"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="shadow-sm"
          style={{
            width: "16rem",
            height: "2rem",
            borderRadius: "16px",
            border: "1px solid #cbd5f5",
            padding: "0 1rem",
            fontSize: "16px",
            fontWeight: 600,
            color: "#ffffff",
            outline: "2px solid transparent",
            outlineOffset: "2px",
          }}
          onFocus={(event) => {
            event.currentTarget.style.outline = "2px solid #3b82f6";
          }}
          onBlur={(event) => {
            event.currentTarget.style.outline = "2px solid transparent";
          }}
        />
      </div>
    </div>
  );
}
