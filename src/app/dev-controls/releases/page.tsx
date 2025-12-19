'use client';

import { useState, useEffect, useContext } from 'react';
import { Rocket, Plus, RefreshCw, GitBranch, ArrowRight, Play, AlertTriangle, CheckCircle, XCircle, Loader2, Server, Database, Users, Wrench, Zap, ListTodo } from 'lucide-react';
import { PageTitleContext, PageActionsContext } from '@/app/layout';
import { useUser, ProductId, ALL_PRODUCTS } from '@/app/settings/UserContext';
import NoAccess from '@/components/NoAccess';
import {
  getDevStatus,
  getDevDiff,
  gitPullDev,
  compareDevProd,
  pushDevToProd,
  pushDevToTradeline,
  pushDevToAllTradelines,
  getSlots,
  getHealthAll,
  fullSyncDeploy,
  getDevEnvironmentStatus,
  deployDevEnvironment,
  restartDevEnvironment,
} from '../api';
import DevLockPanel, { DevLock } from './components/DevLockPanel';
import BugFlagPanel, { BugFlag } from './components/BugFlagPanel';
import CanaryControls, { CanaryDeployment } from './components/CanaryControls';

// Product definitions
interface Product {
  id: ProductId;
  name: string;
  icon: React.ReactNode;
  color: string;
  patcherPort: number;
  devPort: number;
  testPort: number;
  prodPort: string;
  devDroplet: string;
  prodDroplet: string;
}

const PRODUCTS: Product[] = [
  {
    id: 'tradelines',
    name: 'NextBid Engine',
    icon: <Server className="w-4 h-4" />,
    color: 'cyan',
    patcherPort: 7101,
    devPort: 5101,
    testPort: 5001,
    prodPort: '31001-31020',
    devDroplet: '161.35.229.220',
    prodDroplet: '64.23.151.201',
  },
  {
    id: 'dev-environment' as ProductId,
    name: 'Dev Studio',
    icon: <Zap className="w-4 h-4" />,
    color: 'cyan',
    patcherPort: 7100,
    devPort: 5000,
    testPort: 5100,
    prodPort: '5000',
    devDroplet: '161.35.229.220',
    prodDroplet: '161.35.229.220',
  },
  {
    id: 'sources',
    name: 'NextSource',
    icon: <Database className="w-4 h-4" />,
    color: 'orange',
    patcherPort: 7102,
    devPort: 5102,
    testPort: 5002,
    prodPort: '8002',
    devDroplet: '161.35.229.220',
    prodDroplet: '146.190.169.112',
  },
  {
    id: 'nextbidder',
    name: 'NextBidder',
    icon: <Users className="w-4 h-4" />,
    color: 'purple',
    patcherPort: 7103,
    devPort: 5103,
    testPort: 5003,
    prodPort: '8003',
    devDroplet: '161.35.229.220',
    prodDroplet: '146.190.169.112',
  },
  {
    id: 'portals',
    name: 'NextBid Portal',
    icon: <Users className="w-4 h-4" />,
    color: 'green',
    patcherPort: 7104,
    devPort: 5104,
    testPort: 5004,
    prodPort: '8004',
    devDroplet: '161.35.229.220',
    prodDroplet: '146.190.169.112',
  },
  {
    id: 'nexttech',
    name: 'NextTech',
    icon: <Wrench className="w-4 h-4" />,
    color: 'pink',
    patcherPort: 7105,
    devPort: 5105,
    testPort: 5005,
    prodPort: '8005',
    devDroplet: '161.35.229.220',
    prodDroplet: '146.190.169.112',
  },
  {
    id: 'nexttask',
    name: 'NextTask',
    icon: <ListTodo className="w-4 h-4" />,
    color: 'yellow',
    patcherPort: 7106,
    devPort: 5106,
    testPort: 5006,
    prodPort: '8006',
    devDroplet: '161.35.229.220',
    prodDroplet: '146.190.169.112',
  },
];

// Role-based action permissions
// Engineer+ can push/pull/deploy (uses canPushToTest permission)
// Dev can only monitor, reboot, credentials, helpdesk

interface VersionInfo {
  commit: string;
  branch: string;
  message?: string;
  author?: string;
  date?: string;
}

interface SlotInfo {
  slotId: string;
  tradeline: string;
  port: number;
  status: string;
  health: string;
}

interface ProductStatus {
  devStatus: VersionInfo | null;
  prodStatus: VersionInfo | null;
  ahead: number;
  behind: number;
  needsSync: boolean;
  slots: SlotInfo[]; // Only for tradelines
  health: 'healthy' | 'degraded' | 'offline' | 'unknown';
}

type TabType = 'train' | 'locks' | 'bugs' | 'canary';

export default function ReleasesPage() {
  const { user, hasProjectAccess, hasPermission, isLoading: userLoading } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('train');
  const [selectedProduct, setSelectedProduct] = useState<ProductId>('tradelines');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [productStatus, setProductStatus] = useState<ProductStatus>({
    devStatus: null,
    prodStatus: null,
    ahead: 0,
    behind: 0,
    needsSync: false,
    slots: [],
    health: 'unknown',
  });
  const [diffContent, setDiffContent] = useState<string>('');
  const [showDiff, setShowDiff] = useState(false);
  const [deploying, setDeploying] = useState<string | null>(null);
  const [deployResult, setDeployResult] = useState<{ success: boolean; message: string } | null>(null);

  // Drag and drop state for slot ordering
  const [slotOrder, setSlotOrder] = useState<string[]>([]);
  const [draggedSlot, setDraggedSlot] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  const setPageTitle = useContext(PageTitleContext);
  const setPageActions = useContext(PageActionsContext);

  // Mock data for dev locks
  const [devLocks, setDevLocks] = useState<DevLock[]>([]);
  const [bugFlags, setBugFlags] = useState<BugFlag[]>([]);
  const [canaryDeployment, setCanaryDeployment] = useState<CanaryDeployment | null>(null);

  // Filter products by user's assigned projects (individual or team assignment)
  const allowedProducts = PRODUCTS.filter(p => hasProjectAccess(p.id));
  const currentProduct = PRODUCTS.find(p => p.id === selectedProduct) || allowedProducts[0] || PRODUCTS[0];

  // Check if user can deploy (Engineer+ can push to test/prod)
  const userCanDeploy = hasPermission('canPushToTest');

  useEffect(() => {
    setPageTitle({
      title: 'Push / Pull',
      description: `Deploy ${currentProduct.name} from Dev → Prod`
    });

    setPageActions(
      <div className="flex gap-1">
        {userCanDeploy && (
          <button
            onClick={() => handleFullSync()}
            className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/80 hover:bg-cyan-500 border border-black/30 rounded-lg text-white text-sm transition-colors"
          >
            <Rocket className="w-3.5 h-3.5" />
            Full Sync Deploy
          </button>
        )}
        <button
          onClick={() => fetchStatus()}
          className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 border border-black/30 rounded-lg text-white text-sm transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>
    );

    return () => setPageActions(null);
  }, [setPageTitle, setPageActions, currentProduct.name]);

  // Fetch status when product changes
  useEffect(() => {
    fetchStatus();
  }, [selectedProduct]);

  async function fetchStatus() {
    setRefreshing(true);
    try {
      // For tradelines, fetch from dev-sync API and health
      // For other products, we'd call their specific patcher APIs
      if (selectedProduct === 'tradelines') {
        const [devStatusRes, healthRes] = await Promise.all([
          getDevStatus().catch(() => null),
          getHealthAll().catch(() => ({ servers: [] })),
        ]);

        const status = devStatusRes as any;
        const health = healthRes as any;

        // Parse slots from health response
        const slots = (health?.servers || health || []).map((s: any) => ({
          slotId: s.slotId || s.slot || '??',
          tradeline: s.tradeline || s.name || 'unknown',
          port: s.port || s.mainPort || 0,
          status: s.pm2Status || s.status || 'unknown',
          health: s.health || (s.pm2Status === 'online' ? 'healthy' : 'offline'),
        }));

        const healthyCount = slots.filter((s: SlotInfo) => s.health === 'healthy' || s.status === 'online').length;
        const overallHealth = slots.length === 0 ? 'unknown' : healthyCount === slots.length ? 'healthy' : healthyCount > 0 ? 'degraded' : 'offline';

        setProductStatus({
          devStatus: status?.dev ? {
            commit: status.dev.commit?.slice(0, 7) || 'unknown',
            branch: status.dev.branch || 'main',
            message: status.dev.message || '',
            author: status.dev.author || '',
            date: status.dev.date || '',
          } : null,
          prodStatus: status?.prod ? {
            commit: status.prod.commit?.slice(0, 7) || 'unknown',
            branch: status.prod.branch || 'main',
            message: status.prod.message || '',
            author: status.prod.author || '',
            date: status.prod.date || '',
          } : null,
          ahead: status?.ahead || 0,
          behind: status?.behind || 0,
          needsSync: (status?.ahead || 0) > 0,
          slots,
          health: overallHealth as any,
        });
      } else if (selectedProduct === 'dev-environment') {
        // Dev Environment - get status from our custom API
        const statusRes = await getDevEnvironmentStatus().catch(() => null);
        const status = statusRes as any;

        setProductStatus({
          devStatus: { commit: 'local', branch: 'main', message: 'Windows dev' },
          prodStatus: {
            commit: status?.status === 'online' ? 'running' : 'stopped',
            branch: 'main',
            message: status?.status || 'unknown'
          },
          ahead: 0,
          behind: 0,
          needsSync: true, // Always show deploy button for dev env
          slots: [{
            slotId: 'dev-env-7501',
            tradeline: 'dev-environment',
            port: 7501,
            status: status?.status || 'unknown',
            health: status?.status === 'online' ? 'healthy' : 'offline',
          }],
          health: status?.status === 'online' ? 'healthy' : 'offline',
        });
      } else {
        // For other products, show placeholder until their patchers are built
        setProductStatus({
          devStatus: { commit: 'dev-xxx', branch: 'main', message: 'Latest changes' },
          prodStatus: { commit: 'prod-xxx', branch: 'main', message: 'Running version' },
          ahead: 0,
          behind: 0,
          needsSync: false,
          slots: [],
          health: 'unknown',
        });
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleGitPull() {
    setDeploying('pull');
    setDeployResult(null);
    try {
      await gitPullDev();
      setDeployResult({ success: true, message: 'Git pull completed on dev server' });
      await fetchStatus();
    } catch (error) {
      setDeployResult({ success: false, message: (error as Error).message });
    } finally {
      setDeploying(null);
    }
  }

  async function handleCompare() {
    setDeploying('compare');
    setDeployResult(null);
    try {
      const result = await compareDevProd() as any;
      setDeployResult({ success: true, message: `Dev is ${result.ahead || 0} commits ahead, ${result.behind || 0} behind` });
      await fetchStatus();
    } catch (error) {
      setDeployResult({ success: false, message: (error as Error).message });
    } finally {
      setDeploying(null);
    }
  }

  async function handleViewDiff() {
    setDeploying('diff');
    try {
      const diff = await getDevDiff() as any;
      setDiffContent(diff.diff || diff.output || JSON.stringify(diff, null, 2));
      setShowDiff(true);
    } catch (error) {
      setDiffContent(`Error fetching diff: ${(error as Error).message}`);
      setShowDiff(true);
    } finally {
      setDeploying(null);
    }
  }

  async function handlePushToProd() {
    if (!confirm('Push dev code to all production servers? This will restart all tradelines.')) return;

    setDeploying('push');
    setDeployResult(null);
    try {
      await pushDevToAllTradelines();
      setDeployResult({ success: true, message: 'Code pushed to all production servers' });
      await fetchStatus();
    } catch (error) {
      setDeployResult({ success: false, message: (error as Error).message });
    } finally {
      setDeploying(null);
    }
  }

  async function handleFullSync() {
    if (!confirm('Full sync deploy: git pull → push to prod → npm install → pm2 restart all. Continue?')) return;

    setDeploying('sync');
    setDeployResult(null);
    try {
      await fullSyncDeploy();
      setDeployResult({ success: true, message: 'Full sync deploy completed successfully' });
      await fetchStatus();
    } catch (error) {
      setDeployResult({ success: false, message: (error as Error).message });
    } finally {
      setDeploying(null);
    }
  }

  async function handleDeployToSlot(tradeline: string) {
    if (!confirm(`Deploy latest code to ${tradeline}? This will restart the tradeline.`)) return;

    setDeploying(tradeline);
    setDeployResult(null);
    try {
      await pushDevToTradeline(tradeline);
      setDeployResult({ success: true, message: `Deployed to ${tradeline}` });
      await fetchStatus();
    } catch (error) {
      setDeployResult({ success: false, message: (error as Error).message });
    } finally {
      setDeploying(null);
    }
  }

  // Drag and drop handlers for slot reordering
  function handleDragStart(e: React.DragEvent, slotId: string) {
    setDraggedSlot(slotId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, slotId: string) {
    e.preventDefault();
    if (slotId !== draggedSlot) {
      setDragOverSlot(slotId);
    }
  }

  function handleDragLeave() {
    setDragOverSlot(null);
  }

  function handleDrop(e: React.DragEvent, targetSlotId: string) {
    e.preventDefault();
    if (!draggedSlot || draggedSlot === targetSlotId) {
      setDraggedSlot(null);
      setDragOverSlot(null);
      return;
    }

    // Get current order or create from slots
    const currentOrder = slotOrder.length > 0 ? [...slotOrder] : productStatus.slots.map(s => s.slotId);

    const draggedIndex = currentOrder.indexOf(draggedSlot);
    const targetIndex = currentOrder.indexOf(targetSlotId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Remove from old position and insert at new position
      currentOrder.splice(draggedIndex, 1);
      currentOrder.splice(targetIndex, 0, draggedSlot);
      setSlotOrder(currentOrder);

      // Save to localStorage for persistence
      localStorage.setItem('slotOrder', JSON.stringify(currentOrder));
    }

    setDraggedSlot(null);
    setDragOverSlot(null);
  }

  function handleDragEnd() {
    setDraggedSlot(null);
    setDragOverSlot(null);
  }

  // Load saved slot order on mount
  useEffect(() => {
    const saved = localStorage.getItem('slotOrder');
    if (saved) {
      try {
        setSlotOrder(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved slot order');
      }
    }
  }, []);

  // Sort slots based on saved order
  function getSortedSlots(): SlotInfo[] {
    if (slotOrder.length === 0) return productStatus.slots;

    const slotMap = new Map(productStatus.slots.map(s => [s.slotId, s]));
    const sorted: SlotInfo[] = [];

    // Add slots in saved order first
    for (const id of slotOrder) {
      const slot = slotMap.get(id);
      if (slot) {
        sorted.push(slot);
        slotMap.delete(id);
      }
    }

    // Add any remaining slots not in saved order
    for (const slot of slotMap.values()) {
      sorted.push(slot);
    }

    return sorted;
  }

  // Handlers for dev locks & bug flags
  const handleCreateLock = async (lock: Omit<DevLock, 'id' | 'lockedAt' | 'isActive'>) => {
    const newLock: DevLock = { ...lock, id: `lock-${Date.now()}`, lockedAt: new Date().toISOString(), isActive: true };
    setDevLocks(prev => [...prev, newLock]);
  };
  const handleUnlock = async (lockId: string) => {
    setDevLocks(prev => prev.map(l => l.id === lockId ? { ...l, isActive: false } : l));
  };
  const handleCreateFlag = async (flag: Omit<BugFlag, 'id' | 'createdAt' | 'resolvedAt' | 'resolvedBy'>) => {
    const newFlag: BugFlag = { ...flag, id: `flag-${Date.now()}`, createdAt: new Date().toISOString() };
    setBugFlags(prev => [...prev, newFlag]);
  };
  const handleResolveFlag = async (flagId: string) => {
    setBugFlags(prev => prev.map(f => f.id === flagId ? { ...f, resolvedAt: new Date().toISOString(), resolvedBy: 'Current User' } : f));
  };
  const handleExpandCanary = async () => {};
  const handleRollbackCanary = async () => setCanaryDeployment(prev => prev ? { ...prev, status: 'rolled_back' } : null);
  const handleCompleteCanary = async () => setCanaryDeployment(prev => prev ? { ...prev, status: 'complete' } : null);

  const tabs: { id: TabType; label: string; badge?: number }[] = [
    { id: 'train', label: 'Pipeline' },
    { id: 'locks', label: 'Dev Locks', badge: devLocks.filter(l => l.isActive).length },
    { id: 'bugs', label: 'Bug Flags', badge: bugFlags.filter(f => !f.resolvedAt).length },
    { id: 'canary', label: 'Canary', badge: canaryDeployment ? 1 : 0 },
  ];

  const healthySlots = productStatus.slots.filter(s => s.health === 'healthy' || s.status === 'online').length;
  const totalSlots = productStatus.slots.length;

  // Color classes for products
  const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
    cyan: { bg: 'bg-cyan-500/15', border: 'border-cyan-500/30', text: 'text-cyan-400' },
    orange: { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-400' },
    purple: { bg: 'bg-purple-500/15', border: 'border-purple-500/30', text: 'text-purple-400' },
    green: { bg: 'bg-green-500/15', border: 'border-green-500/30', text: 'text-green-400' },
    pink: { bg: 'bg-pink-500/15', border: 'border-pink-500/30', text: 'text-pink-400' },
    yellow: { bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  };

  // Show NoAccess if user has no assigned projects (after all hooks)
  if (!userLoading && allowedProducts.length === 0) {
    return <NoAccess variant="not-assigned" />;
  }

  return (
    <div className="-mt-4">
      {/* Product Selector - Sticky */}
      <div className="sticky -top-4 z-20 bg-gray-900 -mx-8 px-8 pt-4 pb-3 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Product:</span>
          <div className="flex gap-2">
            {allowedProducts.map((product) => {
              const colors = colorClasses[product.color] || colorClasses.cyan;
              const isSelected = selectedProduct === product.id;
              return (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                    isSelected
                      ? `${colors.bg} ${colors.border} ${colors.text}`
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                  }`}
                >
                  {product.icon}
                  {product.name}
                  {product.id === 'tradelines' && productStatus.slots.length > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      productStatus.health === 'healthy' ? 'bg-green-500/20 text-green-400' :
                      productStatus.health === 'degraded' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {productStatus.slots.filter(s => s.health === 'healthy' || s.status === 'online').length}/{productStatus.slots.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Role indicator */}
          <div className="ml-auto flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${
              userCanDeploy ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Guest'}
              {userCanDeploy ? ' (Can Deploy)' : ' (View Only)'}
            </span>
            {allowedProducts.length < PRODUCTS.length && (
              <span className="text-xs text-gray-600">
                {PRODUCTS.length - allowedProducts.length} unassigned
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs + Status Legend - Sticky */}
      <div className="sticky top-10 z-10 bg-gray-900 flex items-center justify-between mb-6 border-b border-gray-700 pb-4 pt-4 -mx-8 px-8">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                  tab.id === 'bugs' ? 'bg-red-500/20 text-red-400' :
                  tab.id === 'locks' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-cyan-500/20 text-cyan-400'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Status Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            <span className="text-gray-400">Online/Healthy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-gray-400">Deploying</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
            <span className="text-gray-400">Needs Sync</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <span className="text-gray-400">Offline/Error</span>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'train' && (
        <div className="space-y-6">
          {/* Deploy Result Banner */}
          {deployResult && (
            <div className={`p-4 rounded-xl border ${deployResult.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <div className="flex items-center gap-2">
                {deployResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={deployResult.success ? 'text-green-400' : 'text-red-400'}>
                  {deployResult.message}
                </span>
                <button onClick={() => setDeployResult(null)} className="ml-auto text-gray-500 hover:text-white">×</button>
              </div>
            </div>
          )}

          {/* Product Release Pipeline */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">{currentProduct.name} Pipeline</h2>
                <p className="text-gray-400 text-sm">Dev ({currentProduct.devDroplet}) → Prod ({currentProduct.prodDroplet})</p>
              </div>
              <div className="flex items-center gap-2">
                {refreshing && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  productStatus.needsSync ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                }`}>
                  {productStatus.needsSync ? `${productStatus.ahead} commits ahead` : 'In Sync'}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-6">
                {/* Dev Stage */}
                <div className="bg-gray-900 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <h3 className="font-semibold text-white">Development</h3>
                    </div>
                    <span className="text-xs text-gray-500">:{currentProduct.devPort}</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">{productStatus.devStatus?.branch || 'main'}</span>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Latest Commit</div>
                      <div className="font-mono text-sm text-cyan-400">{productStatus.devStatus?.commit || '...'}</div>
                      {productStatus.devStatus?.message && (
                        <div className="text-xs text-gray-400 mt-1 truncate">{productStatus.devStatus.message}</div>
                      )}
                    </div>

                    <button
                      onClick={handleGitPull}
                      disabled={deploying !== null || !userCanDeploy}
                      title={!userCanDeploy ? 'Engineer+ required to deploy' : undefined}
                      className="w-full py-2 px-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {deploying === 'pull' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Git Pull
                    </button>
                  </div>
                </div>

                {/* Arrow + Actions */}
                <div className="flex flex-col items-center justify-center gap-4">
                  <button
                    onClick={handleCompare}
                    disabled={deploying !== null}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-sm transition-colors disabled:opacity-50"
                  >
                    {deploying === 'compare' ? 'Comparing...' : 'Compare Versions'}
                  </button>

                  <div className="flex items-center gap-2">
                    <div className="h-px w-12 bg-gray-600"></div>
                    <ArrowRight className="w-6 h-6 text-gray-500" />
                    <div className="h-px w-12 bg-gray-600"></div>
                  </div>

                  <button
                    onClick={handleViewDiff}
                    disabled={deploying !== null}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-sm transition-colors disabled:opacity-50"
                  >
                    {deploying === 'diff' ? 'Loading...' : 'View Diff'}
                  </button>

                  {userCanDeploy ? (
                    <button
                      onClick={handlePushToProd}
                      disabled={deploying !== null || !productStatus.needsSync}
                      className="px-6 py-3 bg-green-500/80 hover:bg-green-500 disabled:bg-gray-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {deploying === 'push' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Deploying...
                        </>
                      ) : (
                        <>
                          <Rocket className="w-4 h-4" />
                          Deploy to Prod
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="px-4 py-2 bg-gray-800 rounded-lg text-gray-500 text-sm text-center">
                      <div className="text-xs text-yellow-500/70 mb-1">Engineer+ required</div>
                      Deploy to Prod
                    </div>
                  )}
                </div>

                {/* Prod Stage */}
                <div className="bg-gray-900 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedProduct === 'tradelines'
                          ? (healthySlots === totalSlots ? 'bg-green-500' : healthySlots > 0 ? 'bg-yellow-500' : 'bg-red-500')
                          : 'bg-gray-500'
                      }`}></div>
                      <h3 className="font-semibold text-white">Production</h3>
                    </div>
                    <span className="text-xs text-gray-500">{currentProduct.prodPort}</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">{productStatus.prodStatus?.branch || 'main'}</span>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Running Commit</div>
                      <div className="font-mono text-sm text-green-400">{productStatus.prodStatus?.commit || '...'}</div>
                      {productStatus.prodStatus?.message && (
                        <div className="text-xs text-gray-400 mt-1 truncate">{productStatus.prodStatus.message}</div>
                      )}
                    </div>

                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-2">Slot Health</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${healthySlots === totalSlots ? 'bg-green-500' : 'bg-yellow-500'}`}
                            style={{ width: totalSlots > 0 ? `${(healthySlots / totalSlots) * 100}%` : '0%' }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-400">{healthySlots}/{totalSlots}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Slot Grid - Only for Tradelines */}
          {selectedProduct === 'tradelines' ? (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Production Slots (20)</h3>
                <span className="text-xs text-gray-500">Drag to reorder - your order is saved</span>
              </div>

              {productStatus.slots.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {loading ? 'Loading slots...' : 'No slot data available. Check patcher connection.'}
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-3">
                  {getSortedSlots().map((slot) => (
                    <div
                      key={slot.slotId}
                      draggable
                      onDragStart={(e) => handleDragStart(e, slot.slotId)}
                      onDragOver={(e) => handleDragOver(e, slot.slotId)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, slot.slotId)}
                      onDragEnd={handleDragEnd}
                      className={`bg-gray-900 border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all ${
                        draggedSlot === slot.slotId
                          ? 'opacity-50 scale-95'
                          : dragOverSlot === slot.slotId
                          ? 'border-cyan-500 ring-2 ring-cyan-500/30 scale-105'
                          : slot.health === 'healthy' || slot.status === 'online'
                          ? 'border-green-500/30 hover:border-green-500/50'
                          : slot.status === 'stopped' || slot.health === 'offline'
                          ? 'border-gray-600 hover:border-gray-500'
                          : 'border-red-500/30 hover:border-red-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs text-gray-400">:{slot.port}</span>
                        <div className={`w-2 h-2 rounded-full ${
                          slot.health === 'healthy' || slot.status === 'online' ? 'bg-green-500' :
                          slot.status === 'stopped' || slot.health === 'offline' ? 'bg-gray-500' :
                          'bg-red-500'
                        }`}></div>
                      </div>
                      <div className="text-sm font-medium text-white capitalize truncate">{slot.tradeline}</div>
                      {userCanDeploy ? (
                        <button
                          onClick={() => handleDeployToSlot(slot.tradeline)}
                          disabled={deploying !== null}
                          className="mt-2 w-full py-1 px-2 text-xs bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                        >
                          {deploying === slot.tradeline ? (
                            <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                          ) : (
                            'Deploy'
                          )}
                        </button>
                      ) : (
                        <div className="mt-2 w-full py-1 px-2 text-xs bg-gray-800/50 rounded text-gray-600 text-center">
                          View Only
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{currentProduct.name} Status</h3>
              </div>
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  {currentProduct.icon}
                </div>
                <p className="text-gray-500">
                  Patcher for {currentProduct.name} (port {currentProduct.patcherPort}) coming soon.
                </p>
                <p className="text-gray-600 text-sm mt-2">
                  Single instance running on {currentProduct.prodDroplet}:{currentProduct.prodPort}
                </p>
              </div>
            </div>
          )}

          {/* Port Reference */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Port Reference</h3>
            <div className="grid grid-cols-4 gap-6 text-sm">
              <div>
                <div className="text-gray-400 mb-2 font-medium">Dev Droplet</div>
                <div className="text-xs text-gray-500">161.35.229.220</div>
                <div className="text-xs text-gray-500 mt-1">:5101 - Engine Dev</div>
              </div>
              <div>
                <div className="text-gray-400 mb-2 font-medium">Patcher Droplet</div>
                <div className="text-xs text-gray-500">134.199.209.140</div>
                <div className="text-xs text-gray-500 mt-1">:7100 - Orchestrator</div>
                <div className="text-xs text-gray-500">:7101 - Tradeline Patcher</div>
              </div>
              <div>
                <div className="text-gray-400 mb-2 font-medium">Engine Droplet</div>
                <div className="text-xs text-gray-500">64.23.151.201</div>
                <div className="text-xs text-gray-500 mt-1">:31001-31020 - Main</div>
                <div className="text-xs text-gray-500">:31101-31120 - Fetch</div>
              </div>
              <div>
                <div className="text-gray-400 mb-2 font-medium">Portal Droplet</div>
                <div className="text-xs text-gray-500">146.190.169.112</div>
                <div className="text-xs text-gray-500 mt-1">:8002 - NextSource</div>
                <div className="text-xs text-gray-500">:8004 - Portal</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'locks' && (
        <DevLockPanel locks={devLocks} onLock={handleCreateLock} onUnlock={handleUnlock} onRefresh={() => {}} />
      )}

      {activeTab === 'bugs' && (
        <BugFlagPanel flags={bugFlags} onFlag={handleCreateFlag} onResolve={handleResolveFlag} onRefresh={() => {}} />
      )}

      {activeTab === 'canary' && (
        <CanaryControls
          deployment={canaryDeployment}
          onExpand={handleExpandCanary}
          onRollback={handleRollbackCanary}
          onComplete={handleCompleteCanary}
        />
      )}

      {/* Diff Modal */}
      {showDiff && (
        <>
          <div className="fixed inset-0 bg-black/70 z-50" onClick={() => setShowDiff(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] max-h-[80vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Code Diff (Dev vs Prod)</h3>
              <button onClick={() => setShowDiff(false)} className="text-gray-400 hover:text-white">×</button>
            </div>
            <div className="p-4 overflow-auto max-h-[60vh]">
              <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{diffContent}</pre>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
