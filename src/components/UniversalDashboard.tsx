'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, AlertTriangle, Calendar, Clock, Plus, CheckCircle,
  ChevronLeft, ChevronRight, Settings, Server, Activity,
  Rocket, Ticket, Users, LayoutGrid
} from 'lucide-react';

interface DayEvent {
  id: string;
  title: string;
  start_datetime: string;
  description?: string;
  event_type?: 'meeting' | 'deploy' | 'task' | 'reminder';
  color?: string;
}

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  created_at: string;
  resolved: boolean;
}

interface HealthSummary {
  total: number;
  online: number;
  offline: number;
  degraded: number;
}

export default function UniversalDashboard() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayEvents, setDayEvents] = useState<DayEvent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const primaryColor = '#3B82F6'; // Blue

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    loadDayEvents();
  }, [selectedDate]);

  async function loadDashboardData() {
    await Promise.all([
      loadAlerts(),
      loadHealthSummary()
    ]);
    setLoading(false);
  }

  async function loadDayEvents() {
    // Mock data for now - will integrate with dev_calendar_events
    setDayEvents([
      {
        id: '1',
        title: 'Sprint Planning',
        start_datetime: new Date().setHours(10, 0, 0, 0).toString(),
        event_type: 'meeting',
        description: 'Weekly sprint planning meeting'
      },
      {
        id: '2',
        title: 'Deploy Tradelines v2.4',
        start_datetime: new Date().setHours(14, 0, 0, 0).toString(),
        event_type: 'deploy',
        description: 'Production deployment'
      },
    ]);
  }

  async function loadAlerts() {
    // Mock alerts - will integrate with dev_alerts table
    setAlerts([
      {
        id: '1',
        title: 'Server 3012 Degraded',
        message: 'Response time above threshold (>500ms)',
        severity: 'warning',
        created_at: new Date(Date.now() - 1800000).toISOString(),
        resolved: false
      }
    ]);
  }

  async function loadHealthSummary() {
    try {
      const res = await fetch('/api/engine/health');
      const data = await res.json();
      setHealthSummary({
        total: data.total || 0,
        online: data.online || 0,
        offline: data.offline || 0,
        degraded: data.degraded || 0
      });
    } catch {
      setHealthSummary({ total: 100, online: 95, offline: 3, degraded: 2 });
    }
  }

  function changeDay(direction: number) {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
  }

  function isToday() {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  }

  function WidgetPlaceholder({ slotNumber }: { slotNumber: number }) {
    return (
      <div
        onClick={() => router.push('/dashboard/widgets')}
        className="bg-gray-800 rounded-xl shadow-sm border-2 border-dashed border-gray-600 p-6 flex flex-col items-center justify-center min-h-[200px] hover:border-blue-500 hover:bg-gray-800/80 transition-all cursor-pointer group"
      >
        <Plus className="w-12 h-12 text-gray-500 group-hover:text-blue-400 mb-3 transition-colors" />
        <h3 className="text-lg font-semibold text-gray-400 group-hover:text-blue-400 mb-1 transition-colors">Widget Slot {slotNumber}</h3>
        <p className="text-sm text-gray-500 group-hover:text-blue-400/80 text-center transition-colors">
          Click to add a widget
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6">

      {/* LEFT COLUMN - 3 columns wide */}
      <div className="col-span-3 space-y-6">

        {/* ALERTS & MESSAGES - PERMANENT */}
        <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-bold text-white">Alerts</h2>
            </div>
            <span className="text-sm font-medium text-orange-400">{alerts.length}</span>
          </div>

          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 bg-green-500/10 rounded-lg border border-green-500/30">
              <CheckCircle className="w-12 h-12 text-green-400 mb-2" />
              <p className="text-green-400 font-medium text-sm">All clear!</p>
              <p className="text-green-400/70 text-xs">No alerts at this time</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.severity === 'error' ? 'bg-red-500/10 border-red-500' :
                    alert.severity === 'warning' ? 'bg-orange-500/10 border-orange-500' :
                    'bg-blue-500/10 border-blue-500'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      alert.severity === 'error' ? 'text-red-400' :
                      alert.severity === 'warning' ? 'text-orange-400' :
                      'text-blue-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm">{alert.title}</p>
                      <p className="text-xs text-gray-400 mt-1">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(alert.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QUICK ACCESS */}
        <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <LayoutGrid className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Quick Access</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push('/servers/tradelines')}
              className="p-3 bg-gray-900 rounded-lg hover:bg-blue-500/10 transition-colors text-left"
            >
              <Server className="w-5 h-5 text-blue-400 mb-2" />
              <div className="text-sm font-medium text-white">Servers</div>
              <div className="text-xs text-gray-500">View all</div>
            </button>

            <button
              onClick={() => router.push('/dev-controls')}
              className="p-3 bg-gray-900 rounded-lg hover:bg-green-500/10 transition-colors text-left"
            >
              <Rocket className="w-5 h-5 text-green-400 mb-2" />
              <div className="text-sm font-medium text-white">Deploy</div>
              <div className="text-xs text-gray-500">Dev tools</div>
            </button>

            <button
              onClick={() => router.push('/helpdesk')}
              className="p-3 bg-gray-900 rounded-lg hover:bg-purple-500/10 transition-colors text-left"
            >
              <Ticket className="w-5 h-5 text-purple-400 mb-2" />
              <div className="text-sm font-medium text-white">Tickets</div>
              <div className="text-xs text-gray-500">Support</div>
            </button>

            <button
              onClick={() => router.push('/team')}
              className="p-3 bg-gray-900 rounded-lg hover:bg-pink-500/10 transition-colors text-left"
            >
              <Users className="w-5 h-5 text-pink-400 mb-2" />
              <div className="text-sm font-medium text-white">Team</div>
              <div className="text-xs text-gray-500">Development</div>
            </button>
          </div>
        </div>

        {/* WIDGET SLOT 1 */}
        <WidgetPlaceholder slotNumber={1} />

      </div>

      {/* CENTER COLUMN - 5 columns wide */}
      <div className="col-span-5 space-y-6">

        {/* SYSTEM HEALTH OVERVIEW */}
        <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-bold text-white">System Health</h2>
            </div>
            <button
              onClick={() => router.push('/servers/tradelines')}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              View Details
            </button>
          </div>

          {healthSummary && (
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">{healthSummary.total}</div>
                <div className="text-xs text-gray-500">Total Services</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{healthSummary.online}</div>
                <div className="text-xs text-gray-500">Online</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <div className={`text-2xl font-bold ${healthSummary.degraded > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                  {healthSummary.degraded}
                </div>
                <div className="text-xs text-gray-500">Degraded</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <div className={`text-2xl font-bold ${healthSummary.offline > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                  {healthSummary.offline}
                </div>
                <div className="text-xs text-gray-500">Offline</div>
              </div>
            </div>
          )}

          {/* Health Bar */}
          {healthSummary && healthSummary.total > 0 && (
            <div className="mt-4">
              <div className="flex h-3 rounded-full overflow-hidden bg-gray-700">
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${(healthSummary.online / healthSummary.total) * 100}%` }}
                />
                <div
                  className="bg-yellow-500 transition-all"
                  style={{ width: `${(healthSummary.degraded / healthSummary.total) * 100}%` }}
                />
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${(healthSummary.offline / healthSummary.total) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>{Math.round((healthSummary.online / healthSummary.total) * 100)}% Online</span>
                <span>{healthSummary.total} Total Services</span>
              </div>
            </div>
          )}
        </div>

        {/* WIDGET SLOTS 2, 3 */}
        <WidgetPlaceholder slotNumber={2} />
        <WidgetPlaceholder slotNumber={3} />

      </div>

      {/* RIGHT COLUMN - 4 columns wide - DAY PLANNER */}
      <div className="col-span-4">

        {/* DAY PLANNER - PERMANENT, FULL HEIGHT */}
        <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6 flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>

          {/* DATE NAVIGATION */}
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <button
              onClick={() => changeDay(-1)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>

            <div className="text-center">
              <h2 className="text-lg font-bold text-white">
                {isToday() ? 'Today' : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </h2>
              <p className="text-sm text-gray-500">
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>

            <button
              onClick={() => changeDay(1)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* EVENTS SECTION - SCROLLABLE */}
          <div className="flex-1 overflow-y-auto mb-4">
            {dayEvents.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No events scheduled</p>
                <button
                  onClick={() => router.push('/calendar')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-sm hover:bg-blue-700 transition-all"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Add Event
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {dayEvents.map(event => {
                  const eventColors = {
                    meeting: 'border-purple-500 bg-purple-500/10',
                    deploy: 'border-green-500 bg-green-500/10',
                    task: 'border-blue-500 bg-blue-500/10',
                    reminder: 'border-orange-500 bg-orange-500/10',
                  };
                  const color = eventColors[event.event_type || 'task'];

                  return (
                    <div
                      key={event.id}
                      className={`p-3 rounded-lg border-l-4 hover:opacity-80 transition-colors cursor-pointer ${color}`}
                      onClick={() => router.push('/calendar')}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm truncate">{event.title}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <p className="text-xs text-gray-400">
                              {new Date(parseInt(event.start_datetime)).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          {event.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{event.description}</p>
                          )}
                        </div>
                        {event.event_type && (
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                            event.event_type === 'meeting' ? 'bg-purple-500/20 text-purple-400' :
                            event.event_type === 'deploy' ? 'bg-green-500/20 text-green-400' :
                            event.event_type === 'task' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-orange-500/20 text-orange-400'
                          }`}>
                            {event.event_type}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* FOOTER BUTTONS - FIXED AT BOTTOM */}
          <div className="flex-shrink-0 space-y-3 border-t border-gray-700 pt-4">
            {dayEvents.length > 0 && (
              <button
                onClick={() => router.push('/calendar')}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium transition-all shadow-sm hover:bg-blue-700"
              >
                View Full Calendar
              </button>
            )}

            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Quick Actions</h3>
              <button
                onClick={() => router.push('/calendar')}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-700 text-blue-400 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule Event</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
