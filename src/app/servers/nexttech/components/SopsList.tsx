'use client';

interface Sop {
  id: string;
  title: string;
  category: string;
  version: string;
  status: string;
  last_updated?: string;
}

interface SopsListProps {
  sops: Sop[];
}

export default function SopsList({ sops }: SopsListProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Standard Operating Procedures</h3>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors">
          + New SOP
        </button>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="divide-y divide-gray-700">
          {sops.map((sop) => (
            <div
              key={sop.id}
              className="p-4 hover:bg-blue-500/5 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-white">{sop.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                      {sop.category}
                    </span>
                    <span className="text-xs text-gray-500">v{sop.version}</span>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  sop.status === 'active'
                    ? 'bg-green-500/20 text-green-400'
                    : sop.status === 'draft'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {sop.status}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Last updated: {sop.last_updated || 'Never'}
              </div>
            </div>
          ))}

          {sops.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No SOPs created yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
