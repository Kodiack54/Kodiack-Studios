'use client';

/**
 * Roadmap Page - Ryan's Home
 * Shows all projects and their phases
 * Planning mode - no project required
 */

import { useContext, useEffect } from 'react';
import { PageTitleContext, PageActionsContext } from '@/app/layout';
import { usePlanningAutoFlip } from '@/app/hooks/useContextAutoFlip';
import { Map, FolderKanban, Calendar, Target } from 'lucide-react';

export default function RoadmapPage() {
  // Auto-flip to PLANNING mode
  usePlanningAutoFlip();

  const setPageTitle = useContext(PageTitleContext);
  const setPageActions = useContext(PageActionsContext);

  useEffect(() => {
    setPageTitle({
      title: 'Roadmap & Planning',
      description: "Ryan's workspace - Project phases and milestones",
    });
    setPageActions(null);
    return () => setPageActions(null);
  }, [setPageTitle, setPageActions]);

  return (
    <div className="p-6 space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-xs text-gray-400">Active Projects</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Map className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-xs text-gray-400">Total Phases</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-xs text-gray-400">Milestones</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-xs text-gray-400">Due This Week</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-3 gap-6">
        {/* Projects List */}
        <div className="col-span-2 bg-gray-800 border border-gray-700 rounded-xl">
          <div className="px-4 py-3 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Projects & Phases</h2>
            <p className="text-xs text-gray-400">All projects with their development phases</p>
          </div>
          <div className="p-4">
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Map className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No projects yet</p>
              <p className="text-sm">Projects and their phases will appear here</p>
            </div>
          </div>
        </div>

        {/* Sidebar - Timeline / Upcoming */}
        <div className="space-y-6">
          {/* Upcoming Milestones */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl">
            <div className="px-4 py-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-white">Upcoming Milestones</h3>
            </div>
            <div className="p-4">
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Target className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No upcoming milestones</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl">
            <div className="px-4 py-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
            </div>
            <div className="p-4">
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Calendar className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
