'use client';

import Link from 'next/link';
import { useEffect, useContext } from 'react';
import {
  Rocket, GitBranch, Database, Shield, Users,
  Headphones, Terminal, Activity, Clock, CheckCircle
} from 'lucide-react';
import { PageTitleContext, PageActionsContext } from '@/app/layout';

// Section card type
interface SectionCard {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  hoverColor: string;
  status?: 'active' | 'warning' | 'error' | 'coming-soon';
  badge?: string;
  stats?: { label: string; value: string | number }[];
}

export default function DevControlsPage() {
  const setPageTitle = useContext(PageTitleContext);
  const setPageActions = useContext(PageActionsContext);

  // Set page title and actions in navbar
  useEffect(() => {
    setPageTitle({
      title: 'Studio Ops Console',
      description: '6 products • Push/Pull • Source Manager • Security'
    });

    // Quick action buttons for navbar
    setPageActions(
      <div className="flex gap-1">
        <Link
          href="/dev-controls/deploy"
          className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 border border-black/30 rounded-lg text-white text-sm transition-colors"
        >
          <Rocket className="w-3.5 h-3.5" />
          Deploy
        </Link>
        <Link
          href="/dev-controls/git"
          className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 border border-black/30 rounded-lg text-white text-sm transition-colors"
        >
          <GitBranch className="w-3.5 h-3.5" />
          Git
        </Link>
        <Link
          href="/dev-controls/logs"
          className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 border border-black/30 rounded-lg text-white text-sm transition-colors"
        >
          <Activity className="w-3.5 h-3.5" />
          Logs
        </Link>
      </div>
    );

    return () => {
      setPageActions(null);
    };
  }, [setPageTitle, setPageActions]);

  const sections: SectionCard[] = [
    // Row 1: Core Operations
    {
      id: 'releases',
      title: 'Push / Pull',
      description: 'Pull from Dev/Test, Push to Test/Prod, rollbacks',
      href: '/dev-controls/releases',
      icon: <Rocket className="w-6 h-6" />,
      color: 'text-cyan-400',
      hoverColor: 'hover:border-cyan-500/50 hover:bg-cyan-500/5',
      status: 'active',
      stats: [
        { label: 'Pending', value: 0 },
        { label: 'In Test', value: 0 },
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'Metrics, reporting, and insights across all products',
      href: '/dev-controls/analytics',
      icon: <Activity className="w-6 h-6" />,
      color: 'text-blue-400',
      hoverColor: 'hover:border-blue-500/50 hover:bg-blue-500/5',
      status: 'active',
      stats: [
        { label: 'Products', value: 6 },
        { label: 'Metrics', value: '~' },
      ]
    },

    // Row 2: Operations & Admin
    {
      id: 'security',
      title: 'Security & Access',
      description: 'Audit logs, secrets manager, role management, approvals',
      href: '/dev-controls/security',
      icon: <Shield className="w-6 h-6" />,
      color: 'text-green-400',
      hoverColor: 'hover:border-green-500/50 hover:bg-green-500/5',
      status: 'active',
      stats: [
        { label: 'Users', value: 4 },
        { label: 'Secrets', value: '~' },
      ]
    },
    {
      id: 'federation',
      title: 'Federation',
      description: 'Contributor leaderboards, trust scoring, merge rules',
      href: '/dev-controls/federation',
      icon: <Users className="w-6 h-6" />,
      color: 'text-pink-400',
      hoverColor: 'hover:border-pink-500/50 hover:bg-pink-500/5',
      status: 'coming-soon',
      badge: 'Quest Ready',
    },
    {
      id: 'customer-ops',
      title: 'Customer Ops',
      description: 'Tenant health, impersonation, quotas, data exports',
      href: '/dev-controls/customer-ops',
      icon: <Headphones className="w-6 h-6" />,
      color: 'text-yellow-400',
      hoverColor: 'hover:border-yellow-500/50 hover:bg-yellow-500/5',
      status: 'coming-soon',
    },
    {
      id: 'terminal',
      title: 'Terminal',
      description: 'SSH access, logs viewer, PM2 control',
      href: '/dev-controls/ssh',
      icon: <Terminal className="w-6 h-6" />,
      color: 'text-gray-400',
      hoverColor: 'hover:border-gray-500/50 hover:bg-gray-500/5',
      status: 'active',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="flex gap-4 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
        <StatusItem
          icon={<CheckCircle className="w-4 h-4 text-green-400" />}
          label="Systems"
          value="Operational"
          valueColor="text-green-400"
        />
        <StatusItem
          icon={<Activity className="w-4 h-4 text-cyan-400" />}
          label="Servers"
          value="20 online"
          valueColor="text-cyan-400"
        />
        <StatusItem
          icon={<Clock className="w-4 h-4 text-blue-400" />}
          label="Last Deploy"
          value="2h ago"
          valueColor="text-gray-400"
        />
        <StatusItem
          icon={<GitBranch className="w-4 h-4 text-purple-400" />}
          label="Branch"
          value="main"
          valueColor="text-purple-400"
        />
      </div>

      {/* Main Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sections.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
      </div>

      {/* Project Quick Access */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">Project Controls</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <ProjectCard
            name="Engine"
            port="31001-31020"
            slots={20}
            status="degraded"
            href="/dev-controls/tradelines"
          />
          <ProjectCard
            name="NextSource"
            port="8002"
            slots={3}
            status="offline"
            href="/dev-controls/sources"
          />
          <ProjectCard
            name="NextBidder"
            port="8003"
            slots={5}
            status="offline"
            href="/dev-controls/nextbidder"
          />
          <ProjectCard
            name="Portal"
            port="8004"
            slots={2}
            status="offline"
            href="/dev-controls/portals"
          />
          <ProjectCard
            name="NextTech"
            port="8005"
            slots={3}
            status="offline"
            href="/dev-controls/nexttech"
          />
          <ProjectCard
            name="NextTask"
            port="8006"
            slots={2}
            status="offline"
            href="/dev-controls/nexttask"
          />
        </div>
      </div>
    </div>
  );
}

// Status item component
function StatusItem({ icon, label, value, valueColor }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  valueColor: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 border-r border-gray-700 last:border-r-0">
      {icon}
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className={`text-sm font-medium ${valueColor}`}>{value}</div>
      </div>
    </div>
  );
}

// Section card component
function SectionCard({ section }: { section: SectionCard }) {
  return (
    <Link
      href={section.href}
      className={`relative bg-gray-800 border border-gray-700 rounded-xl p-5 transition-all ${section.hoverColor}`}
    >
      {/* Badge */}
      {section.badge && (
        <span className={`absolute top-3 right-3 px-2 py-0.5 text-xs font-medium rounded-full ${
          section.status === 'error' ? 'bg-red-500/20 text-red-400' :
          section.status === 'coming-soon' ? 'bg-gray-500/20 text-gray-400' :
          'bg-cyan-500/20 text-cyan-400'
        }`}>
          {section.badge}
        </span>
      )}

      {/* Icon */}
      <div className={`${section.color} mb-3`}>
        {section.icon}
      </div>

      {/* Title */}
      <h3 className="text-white font-semibold mb-1">{section.title}</h3>

      {/* Description */}
      <p className="text-gray-500 text-xs mb-3 line-clamp-2">{section.description}</p>

      {/* Stats */}
      {section.stats && (
        <div className="flex gap-4 pt-3 border-t border-gray-700">
          {section.stats.map((stat, i) => (
            <div key={i}>
              <div className="text-lg font-bold text-white">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Coming Soon Overlay */}
      {section.status === 'coming-soon' && (
        <div className="absolute inset-0 bg-gray-900/60 rounded-xl flex items-center justify-center">
          <span className="text-gray-400 text-sm font-medium">Coming Soon</span>
        </div>
      )}
    </Link>
  );
}

// Project quick access card
function ProjectCard({ name, port, slots, status, href }: {
  name: string;
  port: string;
  slots: number;
  status: 'healthy' | 'degraded' | 'offline';
  href: string;
}) {
  const statusColors = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    offline: 'bg-red-500',
  };

  return (
    <Link
      href={href}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 hover:bg-gray-800 hover:border-gray-600 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
        <span className="text-white font-medium text-sm">{name}</span>
      </div>
      <div className="text-xs text-gray-500">
        <span className="font-mono">{port}</span> &bull; {slots} slots
      </div>
    </Link>
  );
}
