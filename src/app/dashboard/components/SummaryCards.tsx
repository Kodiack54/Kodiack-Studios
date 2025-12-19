interface SummaryCardsProps {
  healthy: number;
  partial: number;
  stopped: number;
  total: number;
}

export default function SummaryCards({ healthy, partial, stopped, total }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <SummaryCard icon="✓" iconClass="healthy" value={healthy} label="Healthy" />
      <SummaryCard icon="⚠" iconClass="partial" value={partial} label="Partial" />
      <SummaryCard icon="✕" iconClass="stopped" value={stopped} label="Stopped" />
      <SummaryCard icon="≡" iconClass="total" value={total} label="Total Tradelines" />
    </div>
  );
}

function SummaryCard({
  icon,
  iconClass,
  value,
  label
}: {
  icon: string;
  iconClass: string;
  value: number;
  label: string;
}) {
  const bgColors: Record<string, string> = {
    healthy: 'bg-green-500/20 text-green-400',
    partial: 'bg-yellow-500/20 text-yellow-400',
    stopped: 'bg-red-500/20 text-red-400',
    total: 'bg-blue-500/20 text-blue-400',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${bgColors[iconClass]}`}>
        {icon}
      </div>
      <div>
        <h3 className="text-3xl font-semibold text-white">{value}</h3>
        <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
    </div>
  );
}
