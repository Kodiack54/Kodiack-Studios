'use client';

import { useState } from 'react';
import Link from 'next/link';

interface PortalCredentialsTableProps {
  portals: any[];
  credentials: any;
  selectedPortal?: string;
}

export default function PortalCredentialsTable({
  portals,
  credentials,
  selectedPortal,
}: PortalCredentialsTableProps) {
  const [editing, setEditing] = useState<string | null>(null);

  const filteredPortals = selectedPortal
    ? portals.filter((p) => p.id === selectedPortal)
    : portals;

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-black/30 border-b border-gray-700">
            <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-medium">Portal</th>
            <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-medium">Company</th>
            <th className="px-4 py-3 text-center text-xs uppercase text-gray-500 font-medium">PlanetBids</th>
            <th className="px-4 py-3 text-center text-xs uppercase text-gray-500 font-medium">SAM.gov</th>
            <th className="px-4 py-3 text-center text-xs uppercase text-gray-500 font-medium">GovWin</th>
            <th className="px-4 py-3 text-right text-xs uppercase text-gray-500 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredPortals.map((portal) => {
            const portalCreds = credentials[portal.id] || {};

            return (
              <tr key={portal.id} className="border-b border-gray-700 hover:bg-blue-500/5">
                <td className="px-4 py-3">
                  <Link
                    href={`/servers/portals/${portal.id}`}
                    className="font-medium text-white hover:text-blue-400 transition-colors"
                  >
                    {portal.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {portal.company_name || portal.company_id}
                </td>
                <td className="px-4 py-3 text-center">
                  <CredentialStatus status={portalCreds.planetbids?.status} />
                </td>
                <td className="px-4 py-3 text-center">
                  <CredentialStatus status={portalCreds.sam_gov?.status} />
                </td>
                <td className="px-4 py-3 text-center">
                  <CredentialStatus status={portalCreds.govwin?.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setEditing(portal.id)}
                    className="px-3 py-1 text-xs font-semibold rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500 hover:text-white transition-colors"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {filteredPortals.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No portals found
        </div>
      )}
    </div>
  );
}

function CredentialStatus({ status }: { status?: string }) {
  const statusColors: Record<string, string> = {
    active: 'bg-green-500',
    expiring: 'bg-yellow-500',
    expired: 'bg-red-500',
    missing: 'bg-gray-600',
  };

  return (
    <div
      className={`w-3 h-3 rounded-full mx-auto ${statusColors[status || 'missing']}`}
      title={status || 'Not configured'}
    />
  );
}
