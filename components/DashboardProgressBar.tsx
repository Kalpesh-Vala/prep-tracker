interface DashboardProgressBarProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
}

export function DashboardProgressBar({ label, current, target, unit = 'h' }: DashboardProgressBarProps) {
  const percent = target > 0 ? Math.min(100, Math.max(0, Math.round((current / target) * 100))) : 0;

  return (
    <div className="rounded border border-gray-200 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-700">
          {current} / {target} {unit}
        </p>
      </div>
      <div
        className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="h-full rounded-full bg-gray-900" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-xs text-gray-500">{percent}% of target</p>
    </div>
  );
}
