import React, { useState } from 'react';
import { UserGrowthData } from '../services/types';

interface CustomChartProps {
  data: UserGrowthData[];
}

export const CustomChart: React.FC<CustomChartProps> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        No growth data available
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d.count), 10);
  const width = 500;
  const height = 180;
  const padding = { top: 20, right: 30, bottom: 30, left: 40 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate coordinates
  const points = data.map((d, index) => {
    const x = padding.left + (index / (data.length - 1)) * chartWidth;
    // Invert y axis
    const y = padding.top + chartHeight - (d.count / maxVal) * chartHeight;
    return { x, y, label: d.date, value: d.count };
  });

  // Area path
  const areaPath = points.length > 0
    ? `${points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
    : '';

  // Line path
  const linePath = points.length > 0
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  return (
    <div className="relative w-full bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">User Growth</h3>
          <p className="text-xs text-slate-500">Cumulative total registered users over last 7 days</p>
        </div>
        {hoveredIdx !== null && (
          <div className="bg-[#005ab3] text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-md animate-fade-in">
            {points[hoveredIdx].label}: <span className="font-bold">{points[hoveredIdx].value} users</span>
          </div>
        )}
      </div>

      <div className="relative h-48 w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#005ab3" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#005ab3" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = padding.top + chartHeight * ratio;
            const value = Math.round(maxVal * (1 - ratio));
            return (
              <g key={i} className="opacity-40">
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="10"
                  textAnchor="end"
                  className="font-medium"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {/* Area under the line */}
          <path d={areaPath} fill="url(#chartGrad)" className="transition-all duration-500 ease-out" />

          {/* The line itself */}
          <path
            d={linePath}
            fill="none"
            stroke="#005ab3"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-500 ease-out"
          />

          {/* Interaction dots */}
          {points.map((p, i) => (
            <g key={i}>
              {/* Invisible touch target */}
              <circle
                cx={p.x}
                cy={p.y}
                r="12"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
              {/* Visual dot */}
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredIdx === i ? '6' : '4'}
                fill={hoveredIdx === i ? '#ffffff' : '#005ab3'}
                stroke="#005ab3"
                strokeWidth={hoveredIdx === i ? '3' : '2'}
                className="pointer-events-none transition-all duration-150"
              />
            </g>
          ))}

          {/* X axis labels */}
          {points.map((p, i) => (
            <text
              key={i}
              x={p.x}
              y={height - 8}
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
};
