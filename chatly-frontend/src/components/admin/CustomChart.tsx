import { useId, useState } from "react";

interface ChartDataPoint {
  date: string;
  count: number;
}

type ChartVariant = "line" | "bar";
type ChartAccent = "violet" | "emerald" | "blue" | "amber" | "rose";

interface CustomChartProps {
  data: ChartDataPoint[];
  title?: string;
  subtitle?: string;
  variant?: ChartVariant;
  accent?: ChartAccent;
}

const CHART_WIDTH = 520;
const CHART_HEIGHT = 190;
const MIN_CHART_VALUE = 10;
const CHART_PADDING = { top: 20, right: 30, bottom: 32, left: 48 };
const GRID_RATIOS = [0, 0.25, 0.5, 0.75, 1];

const CHART_ACCENTS: Record<
  ChartAccent,
  { stroke: string; fill: string; tooltip: string }
> = {
  violet: {
    stroke: "#7c3aed",
    fill: "#7c3aed",
    tooltip: "bg-[#7c3aed]",
  },
  emerald: {
    stroke: "#059669",
    fill: "#10b981",
    tooltip: "bg-emerald-600",
  },
  blue: {
    stroke: "#2563eb",
    fill: "#3b82f6",
    tooltip: "bg-blue-600",
  },
  amber: {
    stroke: "#d97706",
    fill: "#f59e0b",
    tooltip: "bg-amber-600",
  },
  rose: {
    stroke: "#e11d48",
    fill: "#f43f5e",
    tooltip: "bg-rose-600",
  },
};

function formatCompactValue(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }

  return value.toString();
}

export function CustomChart({
  data,
  title = "Chart",
  subtitle,
  variant = "line",
  accent = "violet",
}: CustomChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const gradientId = useId().replace(/:/g, "");
  const chartAccent = CHART_ACCENTS[accent];

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm h-full">
        <h3 className="font-bold text-slate-800 text-lg font-outfit">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
          No data available
        </div>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.count), MIN_CHART_VALUE);
  const chartWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const chartHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  const points = data.map((d, index) => {
    const x =
      CHART_PADDING.left + (index / Math.max(data.length - 1, 1)) * chartWidth;
    const y =
      CHART_PADDING.top + chartHeight - (d.count / maxVal) * chartHeight;
    return { x, y, label: d.date, value: d.count };
  });

  const baselineY = CHART_PADDING.top + chartHeight;
  const areaPath =
    points.length > 0
      ? `${points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
          .join(" ")} L ${points[points.length - 1].x} ${baselineY} L ${
          points[0].x
        } ${baselineY} Z`
      : "";

  const linePath =
    points.length > 0
      ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
      : "";

  const barSlotWidth = chartWidth / Math.max(data.length, 1);
  const barWidth = Math.max(18, Math.min(42, barSlotWidth * 0.46));

  return (
    <div className="relative w-full h-full bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-800 text-lg font-outfit">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {hoveredIdx !== null && (
          <div
            className={`${chartAccent.tooltip} text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-md animate-fade-in`}
          >
            {points[hoveredIdx].label}:{" "}
            <span className="font-bold">
              {points[hoveredIdx].value.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <div className="relative h-48 w-full">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartAccent.fill} stopOpacity="0.25" />
              <stop offset="100%" stopColor={chartAccent.fill} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {GRID_RATIOS.map((ratio, i) => {
            const y = CHART_PADDING.top + chartHeight * ratio;
            const value = Math.round(maxVal * (1 - ratio));
            return (
              <g key={i} className="opacity-40">
                <line
                  x1={CHART_PADDING.left}
                  y1={y}
                  x2={CHART_WIDTH - CHART_PADDING.right}
                  y2={y}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={CHART_PADDING.left - 8}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="10"
                  textAnchor="end"
                  className="font-medium"
                >
                  {formatCompactValue(value)}
                </text>
              </g>
            );
          })}

          {variant === "line" ? (
            <>
              <path
                d={areaPath}
                fill={`url(#${gradientId})`}
                className="transition-all duration-500 ease-out"
              />
              <path
                d={linePath}
                fill="none"
                stroke={chartAccent.stroke}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-500 ease-out"
              />
            </>
          ) : (
            points.map((p, i) => (
              <rect
                key={i}
                x={p.x - barWidth / 2}
                y={p.y}
                width={barWidth}
                height={baselineY - p.y}
                rx="7"
                fill={chartAccent.fill}
                opacity={hoveredIdx === i ? "1" : "0.72"}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            ))
          )}

          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="12"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
              {variant === "line" && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={hoveredIdx === i ? "6" : "4"}
                  fill={hoveredIdx === i ? "#ffffff" : chartAccent.fill}
                  stroke={chartAccent.stroke}
                  strokeWidth={hoveredIdx === i ? "3" : "2"}
                  className="pointer-events-none transition-all duration-150"
                />
              )}
            </g>
          ))}

          {points.map((p, i) => (
            <text
              key={i}
              x={p.x}
              y={CHART_HEIGHT - 8}
              fill="#64748b"
              fontSize="10"
              textAnchor="middle"
              className="font-medium pointer-events-none"
            >
              {p.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
export default CustomChart;
