import { CefrLevel } from "../types/learning";

const LEVELS: Array<"ALL" | CefrLevel> = ["ALL", "A1", "A2", "B1", "B2", "C1", "C2"];

interface CefrFilterBarProps {
  value: "ALL" | CefrLevel;
  onChange: (level: "ALL" | CefrLevel) => void;
  includeAll?: boolean;
  label?: string;
}

export function CefrFilterBar({
  value,
  onChange,
  includeAll = true,
  label = "Lọc theo cấp độ CEFR",
}: CefrFilterBarProps) {
  const items = includeAll ? LEVELS : LEVELS.filter((item) => item !== "ALL");

  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1"
    >
      {items.map((level) => {
        const isActive = value === level;
        return (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              isActive
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-bold"
                : "text-slate-600 hover:text-blue-700 hover:bg-white/80"
            }`}
          >
            {level === "ALL" ? "Tất cả" : level}
          </button>
        );
      })}
    </div>
  );
}
