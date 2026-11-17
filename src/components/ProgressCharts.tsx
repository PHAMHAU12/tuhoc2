import { useState } from "react";
import { SkillProgressMetric, WeeklyStudyPoint } from "../types/learning";

interface DailyGoalRingProps {
  minutes: number;
  goalMinutes: number;
  size?: number;
  inverted?: boolean;
}

export function DailyGoalRing({
  minutes,
  goalMinutes,
  size = 92,
  inverted = false,
}: DailyGoalRingProps) {
  const pct = Math.min(100, Math.round((minutes / Math.max(1, goalMinutes)) * 100));
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      aria-label={`Hoàn thành ${pct}% mục tiêu ngày`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={inverted ? "rgba(255,255,255,0.18)" : "#E2E8F0"}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={inverted ? "#38BDF8" : "#2563EB"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className={`font-display text-lg font-bold tabular-nums leading-none ${
            inverted ? "text-white" : "text-slate-900"
          }`}
        >
          {pct}%
        </span>
        <span
          className={`mt-0.5 text-[10px] font-medium tabular-nums ${
            inverted ? "text-sky-200" : "text-slate-500"
          }`}
        >
          {minutes}/{goalMinutes}p
        </span>
      </div>
    </div>
  );
}

interface WeeklyMinutesChartProps {
  data: WeeklyStudyPoint[];
  dailyGoalMinutes: number;
}

export function WeeklyMinutesChart({
  data,
  dailyGoalMinutes,
}: WeeklyMinutesChartProps) {
  const [activeIndex, setActiveIndex] = useState<number>(data.length - 1);
  const maxMinutes = Math.max(
    35,
    dailyGoalMinutes + 10,
    ...data.map((d) => d.minutes)
  );
  const goalLineBottomPct = Math.min(
    95,
    Math.round((dailyGoalMinutes / maxMinutes) * 100)
  );
  const activeDay = data[activeIndex] ?? data[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-slate-600">
          Ngày đang chọn:{" "}
          <strong className="font-semibold text-[#0F294A]">
            {activeDay.dayLabel} — {activeDay.minutes} phút
          </strong>{" "}
          ({activeDay.minutes >= dailyGoalMinutes ? "Đạt mục tiêu" : "Chưa đạt mục tiêu"})
        </span>
        <span className="font-mono text-slate-500 tabular-nums">
          Mốc mục tiêu: {dailyGoalMinutes}p/ngày
        </span>
      </div>

      <div className="relative flex h-52 items-end justify-between gap-2 border-b border-slate-200 pt-6 pb-2 sm:gap-3">
        {/* Target Dashed Reference Line */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 left-0 border-t border-dashed border-sky-400"
          style={{ bottom: `calc(${goalLineBottomPct}% * 0.72 + 28px)` }}
        />

        {data.map((day, index) => {
          const heightPct = Math.max(8, Math.round((day.minutes / maxMinutes) * 100));
          const metGoal = day.minutes >= dailyGoalMinutes;
          const isSelected = index === activeIndex;

          return (
            <button
              key={day.dayLabel}
              type="button"
              onClick={() => setActiveIndex(index)}
              onMouseEnter={() => setActiveIndex(index)}
              className="group flex flex-1 flex-col items-center justify-end gap-2 focus-visible:outline-2 focus-visible:outline-sky-600 rounded-md py-1"
            >
              <span
                className={`font-mono text-xs tabular-nums transition-colors ${
                  isSelected
                    ? "font-bold text-blue-700"
                    : "font-medium text-slate-500 group-hover:text-slate-900"
                }`}
              >
                {day.minutes}p
              </span>
              <div className="flex h-32 w-full max-w-[38px] items-end overflow-hidden rounded-t-lg bg-slate-100 shadow-inner">
                <div
                  className={`w-full rounded-t-lg transition-all duration-200 ${
                    metGoal
                      ? isSelected
                        ? "bg-gradient-to-t from-emerald-600 to-teal-400 shadow-sm shadow-emerald-500/30"
                        : "bg-emerald-500 hover:bg-emerald-600"
                      : isSelected
                        ? "bg-gradient-to-t from-blue-600 to-indigo-500 shadow-sm shadow-blue-500/30"
                        : "bg-blue-400 hover:bg-blue-500"
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span
                className={`text-xs font-semibold ${
                  isSelected ? "text-blue-700 font-bold" : "text-slate-600"
                }`}
              >
                {day.dayLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SkillRadarChartProps {
  skills: SkillProgressMetric[];
}

export function SkillRadarChart({ skills }: SkillRadarChartProps) {
  const size = 250;
  const center = size / 2;
  const maxRadius = 86;
  const levels = [25, 50, 75, 100];

  const getPoint = (index: number, valuePercent: number) => {
    const angle = (Math.PI * 2 * index) / skills.length - Math.PI / 2;
    const r = (valuePercent / 100) * maxRadius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const polygonPoints = skills
    .map((skill, idx) => {
      const pt = getPoint(idx, skill.percent);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-56 w-56 sm:h-64 sm:w-64"
        role="img"
        aria-label="Biểu đồ mạng nhện 5 kỹ năng tiếng Anh"
      >
        {levels.map((lv) => {
          const ringPoints = skills
            .map((_, idx) => {
              const pt = getPoint(idx, lv);
              return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
            })
            .join(" ");
          return (
            <polygon
              key={lv}
              points={ringPoints}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="1"
            />
          );
        })}

        {skills.map((skill, idx) => {
          const outer = getPoint(idx, 100);
          const labelPt = getPoint(idx, 120);
          return (
            <g key={skill.key}>
              <line
                x1={center}
                y1={center}
                x2={outer.x}
                y2={outer.y}
                stroke="#E2E8F0"
                strokeWidth="1"
              />
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-[#0F294A] text-[10px] font-semibold"
              >
                {skill.key}
              </text>
            </g>
          );
        })}

        <polygon
          points={polygonPoints}
          fill="rgba(29, 78, 216, 0.16)"
          stroke="#1D4ED8"
          strokeWidth="2"
        />

        {skills.map((skill, idx) => {
          const pt = getPoint(idx, skill.percent);
          return (
            <circle
              key={skill.key}
              cx={pt.x}
              cy={pt.y}
              r="3.5"
              fill="#0F294A"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          );
        })}
      </svg>
    </div>
  );
}
