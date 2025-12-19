'use client';

interface CalendarEvent {
  id: string;
  title: string;
  start_datetime: string;
  color?: string;
}

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  primaryColor: string;
  isToday: (date: Date) => boolean;
  onWeekClick: (date: Date) => void;
}

export default function MonthView({
  currentDate,
  events,
  primaryColor,
  isToday,
  onWeekClick
}: MonthViewProps) {

  function getMonthWeeks() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    const dayOfWeek = startDate.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + diffToMonday);

    const weeks = [];
    for (let week = 0; week < 5; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + (week * 7) + day);
        weekDays.push(date);
      }
      weeks.push(weekDays);
    }

    return weeks;
  }

  function getEventsForDay(date: Date) {
    return events.filter(event => {
      const eventDate = new Date(event.start_datetime).toDateString();
      return eventDate === date.toDateString();
    });
  }

  const weeks = getMonthWeeks();
  const currentMonth = currentDate.getMonth();

  return (
    <div className="flex flex-col bg-gray-900 h-full overflow-hidden">
      {/* Day Headers */}
      <div className="flex bg-gray-900 shadow-sm flex-shrink-0">
        <div className="w-20 flex-shrink-0 bg-gray-900"></div>

        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div
            key={day}
            className="flex-1 bg-gray-800 border border-gray-700 mx-0.5 rounded-t-lg overflow-hidden"
          >
            <div className="text-center py-3">
              <div className="text-xs font-semibold text-gray-400 uppercase">
                {day}
              </div>
            </div>
            <div
              className="h-2"
              style={{ backgroundColor: primaryColor }}
            ></div>
          </div>
        ))}
      </div>

      {/* 5 Week Rows - Each gets exactly 20% height */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {weeks.map((weekDays, weekIdx) => {
          const weekStart = weekDays[0];

          return (
            <div
              key={weekIdx}
              className="flex border-b border-gray-700 last:border-b-0"
              style={{ height: '20%' }}
            >
              <button
                onClick={() => onWeekClick && onWeekClick(weekStart)}
                className="w-20 flex-shrink-0 text-white flex items-center justify-center transition-opacity hover:opacity-80 border-r border-gray-700"
                style={{
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed',
                  backgroundColor: primaryColor
                }}
                title="Click to view this week"
              >
                <span className="font-semibold text-sm tracking-wide">
                  Week of
                </span>
              </button>

              {weekDays.map((date, dayIdx) => {
                const dayEvents = getEventsForDay(date);
                const isCurrentMonth = date.getMonth() === currentMonth;
                const isTodayDate = isToday(date);

                return (
                  <div
                    key={dayIdx}
                    onClick={() => onWeekClick && onWeekClick(date)}
                    className={`flex-1 bg-gray-800 border-r border-gray-700 last:border-r-0 p-2 overflow-hidden flex flex-col cursor-pointer hover:bg-gray-700 transition-colors ${
                      !isCurrentMonth ? 'opacity-30' : ''
                    } ${isTodayDate ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                    title="Click to view this week"
                  >
                    <div className={`text-xl font-bold mb-1 ${
                      isTodayDate
                        ? 'text-blue-400'
                        : isCurrentMonth
                        ? 'text-white'
                        : 'text-gray-500'
                    }`}>
                      {date.getDate()}
                    </div>

                    <div className="space-y-1 flex-1 overflow-auto">
                      {dayEvents.slice(0, 6).map((event) => (
                        <div
                          key={event.id}
                          className="text-xs px-2 py-1 rounded truncate text-white font-medium cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: event.color || primaryColor }}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 6 && (
                        <div className="text-xs text-gray-400 font-medium px-2">
                          +{dayEvents.length - 6} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
