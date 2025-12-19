'use client';

import React, { useState } from 'react';

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

interface WeekViewProps {
  weekDates: Date[];
  events: CalendarEvent[];
  primaryColor: string;
  isToday: (date: Date) => boolean;
  formatHour: (hour: number) => string;
  onSlotClick: (date: Date, hour: number) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventDrop?: (eventId: string, newDate: Date, newHour: number) => void;
  onCreateEvent?: (date: Date, hour: number) => void;
  onAddEvent?: (event: CalendarEvent) => void;
  onRefresh: () => void;
  calendarRef: React.RefObject<HTMLDivElement | null>;
}

export default function WeekView({
  weekDates,
  events,
  primaryColor,
  isToday,
  formatHour,
  onSlotClick,
  onEventClick,
  onEventDrop,
  onCreateEvent,
  onAddEvent,
  onRefresh,
  calendarRef
}: WeekViewProps) {
  const allHours = Array.from({ length: 24 }, (_, i) => i);
  const [dragStart, setDragStart] = useState<{ date: Date; hour: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ date: Date; hour: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);

  // Custom drag state for moving events
  const [draggingEvent, setDraggingEvent] = useState<CalendarEvent | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Quick Add state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [quickAddData, setQuickAddData] = useState<{ date: Date | null; hour: number | null; endHour: number | null; title: string }>({
    date: null,
    hour: null,
    endHour: null,
    title: ''
  });

  const HOUR_HEIGHT = 80;

  function getEventsForSlot(date: Date, hour: number) {
    return events.filter(event => {
      const eventStart = new Date(event.start_datetime);
      const eventDate = eventStart.toDateString();
      const slotDate = date.toDateString();
      const eventHour = eventStart.getHours();

      return eventDate === slotDate && eventHour === hour;
    });
  }

  // Handle custom drag start for events
  const handleEventMouseDown = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();
    setDraggingEvent(event);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setDragPosition({
      x: e.clientX - (e.clientX - rect.left),
      y: e.clientY - (e.clientY - rect.top)
    });
  };

  // Handle quick add task
  async function handleQuickAddTask() {
    if (!quickAddData.title.trim() || !quickAddData.date || quickAddData.hour === null) return;

    try {
      const startDateTime = new Date(quickAddData.date);
      startDateTime.setHours(quickAddData.hour, 0, 0, 0);

      // Use endHour if set (multi-hour drag), otherwise default to 1 hour
      const durationHours = quickAddData.endHour !== null ? (quickAddData.endHour - quickAddData.hour + 1) : 1;
      const endDateTime = new Date(startDateTime.getTime() + durationHours * 60 * 60 * 1000);

      const newEvent: CalendarEvent = {
        id: `task-${Date.now()}`,
        title: quickAddData.title.trim(),
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
        event_type: 'task',
        color: primaryColor,
        status: 'scheduled'
      };

      if (onAddEvent) {
        onAddEvent(newEvent);
      }

      setShowQuickAdd(false);
      setQuickAddData({ date: null, hour: null, endHour: null, title: '' });
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Error creating task. Please try again.');
    }
  }

  // Handle mouse move/up for event dragging
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingEvent) {
        setDragPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (draggingEvent && onEventDrop) {
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        const slotElement = elements.find(el => el.hasAttribute('data-slot'));

        if (slotElement) {
          const dateStr = slotElement.getAttribute('data-date');
          const hour = parseInt(slotElement.getAttribute('data-hour') || '0');

          if (dateStr) {
            const dropDate = new Date(dateStr);
            onEventDrop(draggingEvent.id, dropDate, hour);
          }
        }
      }

      setDraggingEvent(null);
    };

    if (draggingEvent) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingEvent, dragOffset, onEventDrop]);

  // Get current time position for the indicator line
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeTop = (currentHour * HOUR_HEIGHT) + ((currentMinutes / 60) * HOUR_HEIGHT);

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Week Header */}
        <div className="flex sticky top-0 bg-gray-900 z-20 shadow-sm overflow-y-scroll">
          <div className="w-20 flex-shrink-0 bg-gray-900"></div>

          {weekDates.map((date, idx) => (
            <div
              key={idx}
              className="flex-1 bg-gray-800 border border-gray-700 mx-0.5 rounded-t-lg overflow-hidden"
            >
              <div className={`text-center py-3 ${isToday(date) ? 'bg-blue-500/20' : 'bg-gray-800'}`}>
                <div className={`text-xs font-medium uppercase ${isToday(date) ? 'text-blue-400' : 'text-gray-400'}`}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-2xl font-bold mt-1 ${isToday(date) ? 'text-blue-400' : 'text-white'}`}>
                  {date.getDate()}
                </div>
              </div>
              <div
                className="h-2"
                style={{ backgroundColor: primaryColor }}
              ></div>
            </div>
          ))}
        </div>

        {/* Time Slots */}
        <div ref={calendarRef} className="flex-1 overflow-auto bg-gray-900 relative">
          {/* Noon indicator line - separates morning/afternoon */}
          <div
            className="absolute left-0 right-0 h-1 z-10 pointer-events-none"
            style={{
              backgroundColor: primaryColor,
              top: `${12 * HOUR_HEIGHT}px`,
              opacity: 0.5
            }}
          />

          {/* Current time indicator line */}
          <div
            className="absolute left-0 right-0 h-0.5 z-30 pointer-events-none"
            style={{
              backgroundColor: '#EF4444',
              top: `${currentTimeTop}px`,
              boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)'
            }}
          >
            <div
              className="absolute left-16 -top-1.5 w-3 h-3 rounded-full"
              style={{ backgroundColor: '#EF4444' }}
            />
          </div>

          <div className="flex">
            {/* Hours Column */}
            <div className="w-20 flex-shrink-0 bg-gray-900">
              {allHours.map((hour) => (
                <div
                  key={hour}
                  className="h-20 text-right pr-2 pt-1 text-xs text-gray-500 border-b border-gray-800"
                >
                  {formatHour(hour)}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {weekDates.map((date, dateIdx) => (
              <div
                key={dateIdx}
                className="flex-1 bg-gray-800 border border-gray-700 mx-0.5 mb-2 rounded-b-lg overflow-hidden"
              >
                {allHours.map((hour) => {
                  const slotEvents = getEventsForSlot(date, hour);

                  return (
                    <div
                      key={hour}
                      data-slot="true"
                      data-date={date.toISOString()}
                      data-hour={hour}
                      className={`h-20 relative ${isToday(date) ? 'bg-blue-500/5' : ''
                        } hover:bg-gray-700/50 transition-colors cursor-pointer border-b border-gray-700 ${isDragging && dragStart && dragEnd &&
                          date.toDateString() === dragStart.date.toDateString() &&
                          hour >= Math.min(dragStart.hour, dragEnd.hour) &&
                          hour <= Math.max(dragStart.hour, dragEnd.hour)
                          ? 'bg-blue-500/20 ring-2 ring-blue-500'
                          : ''
                        }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setDragStart({ date, hour });
                        setDragEnd({ date, hour });
                        setIsDragging(true);
                      }}
                      onMouseEnter={() => {
                        if (isDragging && dragStart && date.toDateString() === dragStart.date.toDateString()) {
                          setDragEnd({ date, hour });
                        }
                      }}
                      onMouseUp={() => {
                        if (isDragging && dragStart && dragEnd) {
                          const now = Date.now();
                          if (now - lastClickTime < 300) {
                            setIsDragging(false);
                            setDragStart(null);
                            setDragEnd(null);
                            return;
                          }

                          setLastClickTime(now);
                          const startHour = Math.min(dragStart.hour, dragEnd.hour);
                          const endHour = Math.max(dragStart.hour, dragEnd.hour);

                          // Open choice modal (works for both single click and multi-hour drag)
                          if (dragStart.date.toDateString() === date.toDateString()) {
                            setQuickAddData({
                              date: dragStart.date,
                              hour: startHour,
                              endHour: startHour !== endHour ? endHour : null,
                              title: ''
                            });
                            setShowChoiceModal(true);
                          }
                        }
                        setIsDragging(false);
                        setDragStart(null);
                        setDragEnd(null);
                      }}
                    >
                      {slotEvents.map((event) => {
                        const eventStart = new Date(event.start_datetime);
                        const eventEnd = event.end_datetime ? new Date(event.end_datetime) : null;

                        let height = HOUR_HEIGHT;
                        if (eventEnd) {
                          const durationMs = eventEnd.getTime() - eventStart.getTime();
                          const durationHours = durationMs / (1000 * 60 * 60);
                          height = Math.max(40, durationHours * HOUR_HEIGHT);
                        }

                        const minutes = eventStart.getMinutes();
                        const topOffset = (minutes / 60) * HOUR_HEIGHT;

                        const isDimmed = draggingEvent && draggingEvent.id === event.id;

                        return (
                          <div
                            key={event.id}
                            className={`absolute left-1 right-1 rounded p-1 text-xs font-medium text-white overflow-hidden transition-all z-10 ${isDimmed ? 'opacity-30 scale-95' : ''
                              }`}
                            style={{
                              backgroundColor: event.color || primaryColor,
                              height: `${height}px`,
                              top: `${topOffset}px`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!draggingEvent) {
                                onEventClick(event);
                              }
                            }}
                          >
                            {/* Only the top portion (first hour) is draggable */}
                            <div
                              onMouseDown={(e) => handleEventMouseDown(e, event)}
                              className="cursor-move hover:bg-white/10 rounded transition-colors"
                              style={{
                                height: `${Math.min(height, HOUR_HEIGHT)}px`,
                                position: 'relative'
                              }}
                            >
                              <div className="font-semibold truncate p-0.5">
                                {event.title}
                              </div>

                              {event.location_address && height > 55 && (
                                <div className="text-xs opacity-90 truncate px-0.5">
                                  📍 {event.location_address}
                                </div>
                              )}

                              {eventEnd && height > 50 && (
                                <div className="text-xs opacity-75 mt-0.5 px-0.5">
                                  {eventStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} -
                                  {eventEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                </div>
                              )}
                            </div>

                            {/* Rest of the card is NOT draggable - show hint */}
                            {height > HOUR_HEIGHT && (
                              <div className="px-1 py-0.5 pointer-events-none">
                                <div className="text-xs opacity-50 text-center border-t border-white/20 pt-1">
                                  (Drag from top to move)
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* CUSTOM DRAG PREVIEW */}
        {draggingEvent && (
          <div
            className="fixed pointer-events-none z-50 rounded p-1 text-xs font-medium text-white shadow-2xl"
            style={{
              backgroundColor: draggingEvent.color || primaryColor,
              left: `${dragPosition.x}px`,
              top: `${dragPosition.y}px`,
              width: '150px',
              height: (() => {
                const eventStart = new Date(draggingEvent.start_datetime);
                const eventEnd = draggingEvent.end_datetime ? new Date(draggingEvent.end_datetime) : null;
                let height = HOUR_HEIGHT;
                if (eventEnd) {
                  const durationMs = eventEnd.getTime() - eventStart.getTime();
                  const durationHours = durationMs / (1000 * 60 * 60);
                  height = Math.max(40, durationHours * HOUR_HEIGHT);
                }
                return `${height}px`;
              })(),
              transform: 'none',
              opacity: 1
            }}
          >
            <div className="font-semibold truncate">{draggingEvent.title}</div>
            {draggingEvent.location_address && (
              <div className="text-xs opacity-90 truncate">📍 {draggingEvent.location_address}</div>
            )}
          </div>
        )}
      </div>

      {/* Choice Modal - Quick Add or Create Event */}
      {showChoiceModal && quickAddData.date && quickAddData.hour !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowChoiceModal(false)}
        >
          <div
            className="bg-gray-800 rounded-lg shadow-xl p-6 w-96 border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-2">What would you like to create?</h3>
            <p className="text-sm text-gray-400 mb-6">
              {quickAddData.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {quickAddData.endHour !== null
                ? ` from ${formatHour(quickAddData.hour)} to ${formatHour(quickAddData.endHour + 1)}`
                : ` at ${formatHour(quickAddData.hour)}`
              }
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowChoiceModal(false);
                  setShowQuickAdd(true);
                }}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-500/10 transition-all group"
              >
                <div className="text-left">
                  <div className="font-semibold text-white group-hover:text-blue-400">Quick Add Task</div>
                  <div className="text-xs text-gray-500">Fast way to block time</div>
                </div>
                <div className="text-2xl">⚡</div>
              </button>

              <button
                onClick={() => {
                  setShowChoiceModal(false);
                  if (onCreateEvent && quickAddData.date && quickAddData.hour !== null) {
                    onCreateEvent(quickAddData.date, quickAddData.hour);
                  }
                }}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-600 rounded-lg hover:border-purple-500 hover:bg-purple-500/10 transition-all group"
              >
                <div className="text-left">
                  <div className="font-semibold text-white group-hover:text-purple-400">Create Event</div>
                  <div className="text-xs text-gray-500">Full details, assigned devs</div>
                </div>
                <div className="text-2xl">📅</div>
              </button>
            </div>

            <button
              onClick={() => setShowChoiceModal(false)}
              className="w-full mt-4 px-4 py-2 text-sm text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quick Add Modal */}
      {showQuickAdd && quickAddData.date && quickAddData.hour !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowQuickAdd(false)}
        >
          <div
            className="bg-gray-800 rounded-lg shadow-xl p-6 w-96 border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4">Quick Add Task</h3>
            <p className="text-sm text-gray-400 mb-4">
              {quickAddData.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {quickAddData.endHour !== null
                ? ` from ${formatHour(quickAddData.hour)} to ${formatHour(quickAddData.endHour + 1)}`
                : ` at ${formatHour(quickAddData.hour)}`
              }
            </p>
            <input
              type="text"
              value={quickAddData.title}
              onChange={(e) => setQuickAddData({ ...quickAddData, title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleQuickAddTask();
                } else if (e.key === 'Escape') {
                  setShowQuickAdd(false);
                }
              }}
              placeholder="What needs to be done?"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              autoFocus
            />
            <div className="flex space-x-3">
              <button
                onClick={() => setShowQuickAdd(false)}
                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickAddTask}
                className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
