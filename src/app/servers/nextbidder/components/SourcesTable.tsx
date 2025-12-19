'use client';

interface Source {
  id: string;
  name: string;
  url: string;
  type: string;
  status: string;
  last_scraped?: string;
  opportunities_count?: number;
}

interface SourcesTableProps {
  sources: Source[];
}

export default function SourcesTable({ sources }: SourcesTableProps) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-black/30 border-b border-gray-700">
            <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-medium">Source</th>
            <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-medium">Type</th>
            <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-medium">Status</th>
            <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-medium">Last Scraped</th>
            <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-medium">Opportunities</th>
            <th className="px-4 py-3 text-right text-xs uppercase text-gray-500 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr key={source.id} className="border-b border-gray-700 hover:bg-blue-500/5">
              <td className="px-4 py-3">
                <div className="font-medium text-white">{source.name}</div>
                <div className="text-xs text-gray-500 truncate max-w-xs">{source.url}</div>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                  {source.type}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  source.status === 'active'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {source.status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-400 text-sm">
                {source.last_scraped || 'Never'}
              </td>
              <td className="px-4 py-3 text-white font-mono">
                {source.opportunities_count || 0}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button className="px-3 py-1 text-xs font-semibold rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-colors">
                    Edit
                  </button>
                  <button className="px-3 py-1 text-xs font-semibold rounded bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {sources.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No auction sources configured
        </div>
      )}
    </div>
  );
}
