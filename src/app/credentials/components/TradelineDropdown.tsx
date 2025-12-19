'use client';

// Tradelines for filtering
const TRADELINES = [
  { name: 'all', displayName: 'All Tradelines' },
  { name: 'security', displayName: 'Security' },
  { name: 'administrative', displayName: 'Administrative' },
  { name: 'facilities', displayName: 'Facilities' },
  { name: 'logistics', displayName: 'Logistics' },
  { name: 'electrical', displayName: 'Electrical' },
  { name: 'lowvoltage', displayName: 'Low Voltage' },
  { name: 'landscaping', displayName: 'Landscaping' },
  { name: 'hvac', displayName: 'HVAC' },
  { name: 'plumbing', displayName: 'Plumbing' },
  { name: 'janitorial', displayName: 'Janitorial' },
  { name: 'support', displayName: 'Support' },
  { name: 'waste', displayName: 'Waste' },
  { name: 'construction', displayName: 'Construction' },
  { name: 'roofing', displayName: 'Roofing' },
  { name: 'painting', displayName: 'Painting' },
  { name: 'flooring', displayName: 'Flooring' },
  { name: 'demolition', displayName: 'Demolition' },
  { name: 'environmental', displayName: 'Environmental' },
  { name: 'concrete', displayName: 'Concrete' },
  { name: 'fencing', displayName: 'Fencing' },
];

interface TradelineDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TradelineDropdown({ value, onChange }: TradelineDropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
    >
      {TRADELINES.map((t) => (
        <option key={t.name} value={t.name}>{t.displayName}</option>
      ))}
    </select>
  );
}
