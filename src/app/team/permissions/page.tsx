import Link from 'next/link';
import { getPermissions, getPermissionGroups } from '../api';
import PermissionsMatrix from './components/PermissionsMatrix';

export default async function TeamPermissionsPage() {
  let permissions: any[] = [];
  let groups: any[] = [];
  let error: string | null = null;

  try {
    [permissions, groups] = await Promise.all([
      getPermissions().catch(() => []),
      getPermissionGroups().catch(() => []),
    ]);
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/team" className="hover:text-white transition-colors">
              Team
            </Link>
            <span>/</span>
            <span className="text-white">Permissions</span>
          </div>
          <h2 className="text-2xl font-semibold text-white">Permissions</h2>
          <p className="text-gray-400 text-sm">
            View and manage system permissions
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Permissions Matrix */}
      <PermissionsMatrix permissions={permissions} groups={groups} />
    </div>
  );
}
