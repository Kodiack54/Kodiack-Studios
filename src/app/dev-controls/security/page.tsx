'use client';

import { useState, useEffect, useContext } from 'react';
import { Shield, Key, Users, FileText, Eye, EyeOff, Clock, RefreshCw, Plus } from 'lucide-react';
import { PageTitleContext, PageActionsContext } from '@/app/layout';

export default function SecurityPage() {
  const setPageTitle = useContext(PageTitleContext);
  const setPageActions = useContext(PageActionsContext);

  // Set page title and actions in navbar
  useEffect(() => {
    setPageTitle({
      title: 'Security & Access',
      description: 'Audit logs, secrets management, and role-based access'
    });

    setPageActions(
      <div className="flex gap-1">
        <button className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 border border-black/30 rounded-lg text-white text-sm transition-colors">
          <FileText className="w-3.5 h-3.5" />
          Audit Log
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 border border-black/30 rounded-lg text-white text-sm transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Add Secret
        </button>
      </div>
    );

    return () => {
      setPageActions(null);
    };
  }, [setPageTitle, setPageActions]);

  return (
    <div className="space-y-6">

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-500">Team Members</span>
          </div>
          <div className="text-2xl font-bold text-white">4</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-500">Active Secrets</span>
          </div>
          <div className="text-2xl font-bold text-white">12</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-500">Audit Events (24h)</span>
          </div>
          <div className="text-2xl font-bold text-white">0</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-500">Security Score</span>
          </div>
          <div className="text-2xl font-bold text-green-400">A+</div>
        </div>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Access Matrix */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl">
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-white">Role Access Matrix</h2>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left py-2">Permission</th>
                  <th className="text-center py-2">Admin</th>
                  <th className="text-center py-2">Lead</th>
                  <th className="text-center py-2">Engineer</th>
                  <th className="text-center py-2">Dev</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <AccessRow permission="View dashboards" admin lead engineer dev />
                <AccessRow permission="Reboot servers" admin lead engineer dev />
                <AccessRow permission="Kill switches" admin lead engineer />
                <AccessRow permission="Push to Test" admin lead engineer />
                <AccessRow permission="Push to Prod" admin lead />
                <AccessRow permission="Manage users" admin lead />
                <AccessRow permission="Rotate secrets" admin />
              </tbody>
            </table>
          </div>
        </div>

        {/* Secrets Manager */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl">
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-white">Secrets Manager</h2>
            <button className="text-xs text-cyan-400 hover:text-cyan-300">+ Add Secret</button>
          </div>
          <div className="p-4 space-y-2">
            <SecretRow name="OPENAI_API_KEY" lastRotated="30 days ago" status="ok" />
            <SecretRow name="SUPABASE_KEY" lastRotated="60 days ago" status="warning" />
            <SecretRow name="SAM_API_KEY" lastRotated="15 days ago" status="ok" />
            <SecretRow name="PLANETBIDS_PASS" lastRotated="45 days ago" status="ok" />
            <SecretRow name="ENGINE_SSH_KEY" lastRotated="90 days ago" status="warning" />
          </div>
        </div>

        {/* Audit Log */}
        <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl">
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-white">Recent Audit Log</h2>
            <button className="text-xs text-gray-400 hover:text-white">View All</button>
          </div>
          <div className="p-4">
            <div className="text-center text-gray-500 py-8">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No audit events yet</p>
              <p className="text-xs mt-1">Actions will be logged here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccessRow({ permission, admin, lead, engineer, dev }: {
  permission: string;
  admin?: boolean;
  lead?: boolean;
  engineer?: boolean;
  dev?: boolean;
}) {
  const Check = () => <span className="text-green-400">✓</span>;
  const Cross = () => <span className="text-gray-600">—</span>;

  return (
    <tr className="border-t border-gray-700">
      <td className="py-2">{permission}</td>
      <td className="text-center py-2">{admin ? <Check /> : <Cross />}</td>
      <td className="text-center py-2">{lead ? <Check /> : <Cross />}</td>
      <td className="text-center py-2">{engineer ? <Check /> : <Cross />}</td>
      <td className="text-center py-2">{dev ? <Check /> : <Cross />}</td>
    </tr>
  );
}

function SecretRow({ name, lastRotated, status }: {
  name: string;
  lastRotated: string;
  status: 'ok' | 'warning' | 'error';
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
      <div className="flex items-center gap-3">
        <Key className={`w-4 h-4 ${
          status === 'ok' ? 'text-green-400' :
          status === 'warning' ? 'text-yellow-400' :
          'text-red-400'
        }`} />
        <div>
          <div className="text-sm text-white font-mono">{name}</div>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Rotated {lastRotated}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setVisible(!visible)}
          className="p-1 text-gray-400 hover:text-white"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button className="p-1 text-gray-400 hover:text-cyan-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
