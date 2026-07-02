interface DashboardStatCardProps {
  label: string;
  value: string;
  hint?: string;
}

export function DashboardStatCard({ label, value, hint }: DashboardStatCardProps) {
  return (
    <div className="rounded border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}
