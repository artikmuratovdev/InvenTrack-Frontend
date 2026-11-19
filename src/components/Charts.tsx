import { useState } from 'react';
import type { EquipmentStatus, UsageStatus } from '../types/inventory';

interface StatusPoint {
  status: EquipmentStatus;
  label: string;
  count: number;
}

const STATUS_COLORS: Record<EquipmentStatus, string> = {
  ACTIVE: '#16a34a',
  IN_REPAIR: '#d97706',
  RESERVE: '#64748b',
  WRITTEN_OFF: '#dc2626',
};

export function StatusDonutChart({
  data,
  onSelectStatus,
}: {
  data: StatusPoint[];
  onSelectStatus?: (status: EquipmentStatus) => void;
}) {
  const [hovered, setHovered] = useState<EquipmentStatus | null>(null);
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const radius = 56;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;
  const segments = data.map((item) => {
    const fraction = total > 0 ? item.count / total : 0;
    const length = fraction * circumference;
    const segment = {
      ...item,
      length,
      offset: cumulativeOffset,
      percent: total > 0 ? Math.round((item.count / total) * 100) : 0,
      color: STATUS_COLORS[item.status],
    };
    cumulativeOffset += length;
    return segment;
  });

  const activeSegment = segments.find((s) => s.status === hovered);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-40 h-40 shrink-0">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90" role="img" aria-label="Jihozlar holati bo'yicha taqsimot">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />
          {total > 0 &&
            segments.map((seg) =>
              seg.count > 0 ? (
                <circle
                  key={seg.status}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={hovered === seg.status ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={`${seg.length} ${circumference - seg.length}`}
                  strokeDashoffset={-seg.offset}
                  className="transition-all duration-150 cursor-pointer"
                  onMouseEnter={() => setHovered(seg.status)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSelectStatus?.(seg.status)}
                />
              ) : null
            )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-semibold text-slate-900 tabular-nums">
            {activeSegment ? activeSegment.count : total}
          </span>
          <span className="text-xs text-slate-500">
            {activeSegment ? activeSegment.label : 'Jami jihoz'}
          </span>
        </div>
      </div>

      <div className="w-full flex-1 space-y-2.5">
        {segments.map((seg) => (
          <button
            key={seg.status}
            type="button"
            onMouseEnter={() => setHovered(seg.status)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onSelectStatus?.(seg.status)}
            className="w-full flex items-center justify-between py-1.5 px-2 rounded-md text-left hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-2.5 text-sm text-slate-700">
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: seg.color }}
                aria-hidden="true"
              />
              <span>{seg.label}</span>
            </span>
            <span className="flex items-center gap-3 text-sm tabular-nums">
              <span className="font-semibold text-slate-900">{seg.count}</span>
              <span className="text-xs text-slate-500 w-10 text-right">{seg.percent}%</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface UsagePoint {
  usage: UsageStatus;
  label: string;
  count: number;
}

const USAGE_COLORS: Record<UsageStatus, string> = {
  IN_USE: '#1d4ed8',
  SHARED: '#0284c7',
  IDLE: '#94a3b8',
};

export function UsageBarChart({ data }: { data: UsagePoint[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="space-y-4">
      {data.map((item) => {
        const widthPercent = Math.round((item.count / max) * 100);
        const sharePercent = total > 0 ? Math.round((item.count / total) * 100) : 0;
        return (
          <div key={item.usage} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700 font-medium">{item.label}</span>
              <span className="text-slate-900 font-semibold tabular-nums">
                {item.count}{' '}
                <span className="text-xs font-normal text-slate-500">({sharePercent}%)</span>
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all duration-300"
                style={{
                  width: `${item.count > 0 ? Math.max(4, widthPercent) : 0}%`,
                  backgroundColor: USAGE_COLORS[item.usage],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
