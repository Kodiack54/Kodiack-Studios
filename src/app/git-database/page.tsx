'use client';

import { useState, useEffect, useContext } from 'react';
import { PageTitleContext, PageActionsContext } from '@/app/layout';
import GitDriftBoard from './components/GitDriftBoard';
import { useUserContext } from '@/app/contexts/UserContextProvider';

type ViewFilter = 'all' | 'studio' | 'ai_team';

export default function GitDatabasePage() {
  const [activeTab, setActiveTab] = useState<'git' | 'schema'>('git');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [dropletFilter, setDropletFilter] = useState<string>('all');
  const [availableDroplets, setAvailableDroplets] = useState<string[]>([]);
  const setPageTitle = useContext(PageTitleContext);
  const setPageActions = useContext(PageActionsContext);
  const { effectiveProject } = useUserContext();
  // Studio/AI Team toggle always shows on this dashboard (it's the Studio platform)

  
  // Fetch available droplets for filter
  useEffect(() => {
    const fetchDroplets = async () => {
      try {
        const res = await fetch('/git-database/api/drift');
        const data = await res.json();
        if (data.success && data.nodes) {
          const droplets = data.nodes.map((n: any) => n.node_id).filter(Boolean).sort();
          setAvailableDroplets(droplets);
        }
      } catch (e) {
        console.error('Failed to fetch droplets:', e);
      }
    };
    fetchDroplets();
  }, []);

  useEffect(() => {
    setPageTitle({
      title: 'Git / Database',
      description: 'Drift tracking for repositories and database schemas',
    });
    
    setPageActions(
      <div className="flex items-center gap-2 ml-auto">
        {/* View Filter Buttons - Only show for Studio project */}
        <>
            <button
              onClick={() => setViewFilter('studio')}
          className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all border border-black ${
            viewFilter === 'studio'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          STUDIO
        </button>
        <button
          onClick={() => setViewFilter('ai_team')}
          className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all border border-black ${
            viewFilter === 'ai_team'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
              AI TEAM
            </button>
            {/* Droplet Filter */}
            <select
              value={dropletFilter}
              onChange={(e) => setDropletFilter(e.target.value)}
              className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600 cursor-pointer"
            >
              <option value="all">All Droplets</option>
              {availableDroplets.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <div className="w-px h-6 bg-gray-600 mx-2" />
          </>

        {/* Tab Buttons */}
        <button
          onClick={() => setActiveTab('git')}
          className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all border border-black ${
            activeTab === 'git'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          GIT DRIFT
        </button>
        <button
          onClick={() => setActiveTab('schema')}
          className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all border border-black ${
            activeTab === 'schema'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          SCHEMA DRIFT
        </button>
      </div>
    );
    
    return () => setPageActions(null);
  }, [setPageTitle, setPageActions, activeTab, viewFilter]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'git' ? (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <SummaryCard 
                title="Server Repos" 
                value="—" 
                subtitle="Tracked repositories"
                color="blue"
              />
              <SummaryCard 
                title="In Sync" 
                value="—" 
                subtitle="Clean & matching"
                color="green"
              />
              <SummaryCard 
                title="Drifted" 
                value="—" 
                subtitle="Dirty or diverged"
                color="orange"
              />
              <SummaryCard 
                title="PC Repos" 
                value="—" 
                subtitle="Local tracked"
                color="purple"
              />
            </div>

            {/* Git Drift Board */}
            <GitDriftBoard viewFilter={viewFilter} dropletFilter={dropletFilter} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Schema Drift - placeholder for now */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
              <div className="text-4xl mb-4">🗄️</div>
              <h3 className="text-lg font-semibold text-white mb-2">Schema Drift Tracking</h3>
              <p className="text-gray-400 text-sm">
                Database schema comparison coming soon.<br />
                Will show schema hash differences between environments.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ 
  title, 
  value, 
  subtitle, 
  color 
}: { 
  title: string; 
  value: string; 
  subtitle: string; 
  color: 'blue' | 'green' | 'orange' | 'purple';
}) {
  const colors = {
    blue: 'border-blue-500/30 bg-blue-500/10',
    green: 'border-green-500/30 bg-green-500/10',
    orange: 'border-orange-500/30 bg-orange-500/10',
    purple: 'border-purple-500/30 bg-purple-500/10',
  };

  const textColors = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    purple: 'text-purple-400',
  };

  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <div className="text-xs text-gray-500 uppercase font-medium">{title}</div>
      <div className={`text-3xl font-bold mt-1 ${textColors[color]}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
    </div>
  );
}
