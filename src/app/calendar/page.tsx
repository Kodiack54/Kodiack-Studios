'use client';

import { useState, useEffect, useRef, useContext, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageTitleContext, PageActionsContext } from '@/app/layout';
import { ChevronLeft, ChevronRight, Plus, Clock, Edit3 } from 'lucide-react';
import WeekView from './components/WeekView';
import MonthView from './components/MonthView';
import CreateEventModal from './components/CreateEventModal';
import EditEventModal from './components/EditEventModal';
import TimeOffRequestModal from './components/TimeOffRequestModal';
import TimeAdjustmentModal from './components/TimeAdjustmentModal';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime?: string;
  event_type: string;
  color?: string;
  location_address?: string;
  status: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  color: string;
}

// Wrapper component with Suspense for useSearchParams
export default function CalendarPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CalendarContent />
    </Suspense>
  );
}

function CalendarContent() {
  const setPageTitle = useContext(PageTitleContext);
  const setPageActions = useContext(PageActionsContext);
  const searchParams = useSearchParams();
  const calendarMode = searchParams?.get('mode') || 'my';

  const [currentView, setCurrentView] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [showTimeOffRequest, setShowTimeOffRequest] = useState(false);
  const [showTimeAdjustment, setShowTimeAdjustment] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedHour, setSelectedHour] = useState<number>(9);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const [myPendingTimeOff, setMyPendingTimeOff] = useState<any[]>([]);
  const [myPendingAdjustments, setMyPendingAdjustments] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const calendarRef = useRef<HTMLDivElement>(null);
  const primaryColor = '#3B82F6';

  useEffect(() => {
    loadEvents();
    loadTeamMembers();
    setLoading(false);
  }, [calendarMode]); // Reload when mode changes

  useEffect(() => {
    // Set page title and actions in the header bar
    setPageTitle({
      title: getHeaderText(),
      description: calendarMode === 'team' ? 'Team schedules & projects' : 'Your personal calendar'
    });

    setPageActions(
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleNavigate(-1)}
          className="p-2 rounded-xl transition-colors bg-white/10 hover:bg-white/20 text-white border border-black/50"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={handleToday}
          className="px-4 py-2 text-sm font-medium rounded-xl transition-colors bg-white/10 hover:bg-white/20 text-white border border-black/50"
        >
          Today
        </button>

        <button
          onClick={() => handleNavigate(1)}
          className="p-2 rounded-xl transition-colors bg-white/10 hover:bg-white/20 text-white border border-black/50"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={() => setCurrentView('week')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors border border-black/50 ${
              currentView === 'week'
                ? 'bg-white/30 text-white shadow-sm'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setCurrentView('month')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors border border-black/50 ${
              currentView === 'month'
                ? 'bg-white/30 text-white shadow-sm'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            Month
          </button>
        </div>

        <button
          onClick={() => setShowTimeAdjustment(true)}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors bg-white/10 hover:bg-white/20 text-white border border-black/50 relative"
        >
          <Edit3 className="w-4 h-4" />
          <span>Timesheet Adjustment</span>
          {myPendingAdjustments.length > 0 && (
            <div className="absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
              ⏳
            </div>
          )}
        </button>

        <button
          onClick={() => setShowTimeOffRequest(true)}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors bg-white/10 hover:bg-white/20 text-white border border-black/50 relative"
        >
          <Clock className="w-4 h-4" />
          <span>Time Off Request</span>
          {myPendingTimeOff.length > 0 && (
            <div className="absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
              ⏳
            </div>
          )}
        </button>

        <button
          onClick={() => setShowCreateEvent(true)}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors bg-white/30 hover:bg-white/40 text-white border border-black/50"
        >
          <Plus className="w-4 h-4" />
          <span>Create Event</span>
        </button>
      </div>
    );

    return () => {
      setPageTitle({ title: 'Dashboard', description: 'Your daily overview' });
      setPageActions(null);
    };
  }, [currentDate, currentView, myPendingTimeOff.length, myPendingAdjustments.length]);

  useEffect(() => {
    if (currentView === 'week' && calendarRef.current) {
      const timer = setTimeout(() => {
        if (calendarRef.current) {
          const hourHeight = 80;
          const targetHour = 7;
          calendarRef.current.scrollTop = targetHour * hourHeight;
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentView, events]);

  async function loadTeamMembers() {
    // TODO: Load from dev_team_members table
    setTeamMembers([
      { id: '1', name: 'Michael', role: 'Lead Developer', color: '#3B82F6' },
      { id: '2', name: 'Dev Team', role: 'Development', color: '#10B981' },
      { id: '3', name: 'Support', role: 'Support', color: '#F59E0B' },
    ]);
  }

  async function loadEvents() {
    // TODO: Load from dev_calendar_events table
    // For now, mock data using today's date
    const today = new Date();

    // My events - personal tasks
    const myEvents: CalendarEvent[] = [
      {
        id: '1',
        title: 'Sprint Planning',
        start_datetime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0).toISOString(),
        end_datetime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0).toISOString(),
        event_type: 'meeting',
        color: '#8B5CF6',
        status: 'scheduled'
      },
      {
        id: '2',
        title: 'Deploy Tradelines v2.5',
        start_datetime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0).toISOString(),
        end_datetime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0).toISOString(),
        event_type: 'deploy',
        color: '#10B981',
        status: 'scheduled'
      },
    ];

    // Team events - all team members' schedules
    const teamEvents: CalendarEvent[] = [
      ...myEvents,
      {
        id: '3',
        title: 'Michael: Code Review',
        description: 'Review PR #234 for tradelines',
        start_datetime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0).toISOString(),
        end_datetime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0).toISOString(),
        event_type: 'task',
        color: '#3B82F6',
        status: 'scheduled'
      },
      {
        id: '4',
        title: 'Dev Team: Portal Updates',
        description: 'Working on user portal enhancements',
        start_datetime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0).toISOString(),
        end_datetime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 0).toISOString(),
        event_type: 'project',
        color: '#10B981',
        status: 'in_progress'
      },
      {
        id: '5',
        title: 'Support: Client Call',
        description: 'Weekly check-in with ABC Corp',
        start_datetime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0).toISOString(),
        end_datetime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0).toISOString(),
        event_type: 'meeting',
        color: '#F59E0B',
        status: 'scheduled'
      },
      {
        id: '6',
        title: 'Dev Team: NextBidder API',
        description: 'Auction suppliers integration',
        start_datetime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 0).toISOString(),
        end_datetime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 14, 0).toISOString(),
        event_type: 'project',
        color: '#10B981',
        status: 'scheduled'
      },
    ];

    setEvents(calendarMode === 'team' ? teamEvents : myEvents);
  }

  function handleNavigate(direction: number) {
    const newDate = new Date(currentDate);
    if (currentView === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  }

  function handleToday() {
    setCurrentDate(new Date());
  }

  function getHeaderText() {
    if (currentView === 'week') {
      const weekStart = new Date(currentDate);
      const dayOfWeek = weekStart.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStart.setDate(weekStart.getDate() + diffToMonday);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${weekStart.toLocaleDateString('en-US', { month: 'long' })} ${weekStart.getDate()}-${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
      } else {
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${weekEnd.getFullYear()}`;
      }
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }

  function getWeekDates() {
    const dates = [];
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }

    return dates;
  }

  function formatHour(hour: number) {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  }

  function isToday(date: Date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  function handleSlotClick(date: Date, hour: number) {
    setSelectedDate(date);
    setSelectedHour(hour);
    setShowCreateEvent(true);
  }

  function handleEventClick(event: CalendarEvent) {
    setSelectedEvent(event);
    setShowEventDetail(true);
  }

  async function handleEventDrop(eventId: string, newDate: Date, newHour: number) {
    // Update event in state
    setEvents(prevEvents => prevEvents.map(event => {
      if (event.id === eventId) {
        const oldStart = new Date(event.start_datetime);
        const oldEnd = event.end_datetime ? new Date(event.end_datetime) : null;
        const duration = oldEnd ? oldEnd.getTime() - oldStart.getTime() : 60 * 60 * 1000;

        const newStart = new Date(newDate);
        newStart.setHours(newHour, 0, 0, 0);

        const newEnd = new Date(newStart.getTime() + duration);

        return {
          ...event,
          start_datetime: newStart.toISOString(),
          end_datetime: newEnd.toISOString()
        };
      }
      return event;
    }));

    // TODO: Save to dev_calendar_events table
    console.log('Moved event', eventId, 'to', newDate, newHour);
  }

  function handleWeekClick(date: Date) {
    setCurrentDate(date);
    setCurrentView('week');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {currentView === 'week' && (
            <WeekView
              weekDates={getWeekDates()}
              events={events}
              primaryColor={primaryColor}
              isToday={isToday}
              formatHour={formatHour}
              onSlotClick={handleSlotClick}
              onEventClick={handleEventClick}
              onEventDrop={handleEventDrop}
              onCreateEvent={(date, hour) => {
                setSelectedDate(date);
                setSelectedHour(hour);
                setShowCreateEvent(true);
              }}
              onAddEvent={(newEvent) => {
                setEvents(prev => [...prev, newEvent]);
              }}
              onRefresh={loadEvents}
              calendarRef={calendarRef}
            />
          )}

          {currentView === 'month' && (
            <MonthView
              currentDate={currentDate}
              events={events}
              primaryColor={primaryColor}
              isToday={isToday}
              onWeekClick={handleWeekClick}
            />
          )}
        </div>
      </div>

      {/* Event Detail Modal */}
      {showEventDetail && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEventDetail(false)}>
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-96 border border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Event Details</h3>
              <button
                onClick={() => setShowEventDetail(false)}
                className="w-8 h-8 rounded flex items-center justify-center hover:bg-gray-700 transition-colors"
              >
                <span className="text-gray-400 text-xl">×</span>
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <p className="text-sm text-gray-400">Title</p>
                <p className="font-medium text-white">{selectedEvent.title}</p>
              </div>

              {selectedEvent.description && (
                <div>
                  <p className="text-sm text-gray-400">Description</p>
                  <p className="text-sm text-gray-300">{selectedEvent.description}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-400">Time</p>
                <p className="text-sm text-gray-300">
                  {new Date(selectedEvent.start_datetime).toLocaleString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {selectedEvent.location_address && (
                <div>
                  <p className="text-sm text-gray-400">Location</p>
                  <p className="text-sm text-gray-300">{selectedEvent.location_address}</p>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowEventDetail(false);
                  setShowEditEvent(true);
                }}
                className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                Edit
              </button>
              <button
                onClick={() => {
                  setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
                  setShowEventDetail(false);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateEvent && (
        <CreateEventModal
          initialDate={selectedDate}
          initialHour={selectedHour}
          onClose={() => setShowCreateEvent(false)}
          onSuccess={() => {
            setShowCreateEvent(false);
            loadEvents();
          }}
        />
      )}

      {showTimeOffRequest && (
        <TimeOffRequestModal
          onClose={() => setShowTimeOffRequest(false)}
          onSuccess={() => {
            setShowTimeOffRequest(false);
            loadEvents();
          }}
        />
      )}

      {showTimeAdjustment && (
        <TimeAdjustmentModal
          onClose={() => setShowTimeAdjustment(false)}
          onSuccess={() => {
            setShowTimeAdjustment(false);
          }}
        />
      )}

      {showEditEvent && selectedEvent && (
        <EditEventModal
          event={selectedEvent}
          onClose={() => setShowEditEvent(false)}
          onSuccess={(updatedEvent) => {
            setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
            setSelectedEvent(updatedEvent);
            setShowEditEvent(false);
          }}
          onDelete={(eventId) => {
            setEvents(prev => prev.filter(e => e.id !== eventId));
            setShowEditEvent(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
}
