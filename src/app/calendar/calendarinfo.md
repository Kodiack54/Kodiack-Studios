# Calendar System Documentation

## Overview
The calendar system is a full-featured scheduling tool for the Dev Command dashboard, modeled after MyKeystone's calendar. It supports week/month views, drag-and-drop events, team calendars with role-based access, and integrates with time-off requests and timesheet adjustments.

---

## File Structure

```
src/
├── app/calendar/
│   ├── page.tsx                    # Main calendar page
│   └── components/
│       ├── WeekView.tsx            # Week view with hourly grid
│       ├── MonthView.tsx           # Month view with day cells
│       ├── CreateEventModal.tsx    # Modal to create new events
│       ├── EditEventModal.tsx      # Modal to edit existing events
│       ├── TimeOffRequestModal.tsx # Time off request form
│       └── TimeAdjustmentModal.tsx # Timesheet adjustment form
├── components/
│   └── Sidebar.tsx                 # Sidebar with calendar navigation
└── sql/
    └── dev_tables.sql              # Database tables for calendar
```

---

## Key Features

### 1. Week View (`WeekView.tsx`)
- **Hourly grid**: 24 hours displayed with 80px height per hour
- **Drag-and-drop events**: Drag events to reschedule
- **Multi-hour selection**: Click and drag across hours to create events spanning multiple hours
- **Quick add**: Click empty slot to quickly add an event
- **Noon indicator**: Colored line at 12:00 to separate morning/afternoon
- **Header alignment**: Uses `overflow-y-scroll` on header to match content scrollbar

### 2. Month View (`MonthView.tsx`)
- **Day cells**: Shows events for each day
- **Click to week**: Click on a week to jump to week view for that date

### 3. Event Management
- **Create Event Modal**: Title, description, type, project, date/time, color, location, assignees
- **Edit Event Modal**: Full edit with delete confirmation
- **Event types**: task, meeting, deploy, sprint, standup, review, maintenance, release, timeoff

### 4. Team Calendar with Role-Based Access
- **Admin/Lead roles**: Can see ALL teams and ALL individual calendars
- **Engineer/Developer roles**: Only see teams they belong to
- **URL params**:
  - `?mode=my` - Personal calendar
  - `?mode=team` - Team calendars view
  - `?mode=team&team=X` - Specific team's calendar
  - `?mode=team&member=Y` - Specific member's calendar

### 5. Sidebar Calendar Section
- **Collapsible "Today's Overview"**: Stats cards (Events, Meetings, Tasks, Time Off)
- **My Calendar**: Personal tasks & meetings
- **Team Calendars**: Expandable teams with nested members
- **Auto-collapse servers**: Server list collapses when on calendar page

### 6. Time Off Requests (`TimeOffRequestModal.tsx`)
- Request types: vacation, sick, personal, unpaid, other
- Date range selection
- Reason field
- Pending indicator badge in header

### 7. Timesheet Adjustments (`TimeAdjustmentModal.tsx`)
- Adjustment types: missed_punch, clock_in_correction, clock_out_correction, missed_break, other
- Original vs requested times
- Break minutes
- Reason and detailed description

---

## Database Tables

### `dev_calendar_events`
```sql
- id UUID PRIMARY KEY
- title VARCHAR(500) NOT NULL
- description TEXT
- start_datetime TIMESTAMPTZ NOT NULL
- end_datetime TIMESTAMPTZ
- event_type VARCHAR(50) -- task, meeting, deploy, sprint, standup, review, maintenance, release, timeoff
- color VARCHAR(50) DEFAULT '#3B82F6'
- location_address TEXT
- status VARCHAR(50) -- scheduled, in_progress, completed, cancelled
- created_by_id UUID REFERENCES dev_team_members(id)
- created_by_name VARCHAR(255)
- assigned_to_ids UUID[] DEFAULT '{}'
- project VARCHAR(100)
- is_all_day BOOLEAN DEFAULT FALSE
- recurrence_rule TEXT -- iCal RRULE format
```

### `dev_time_off_requests`
```sql
- id UUID PRIMARY KEY
- user_id UUID REFERENCES dev_team_members(id)
- user_name VARCHAR(255)
- request_type VARCHAR(50) -- vacation, sick, personal, unpaid, other
- start_date DATE NOT NULL
- end_date DATE NOT NULL
- reason TEXT
- status VARCHAR(50) -- pending, approved, denied, cancelled
- reviewed_by_id UUID
- reviewed_by_name VARCHAR(255)
- review_notes TEXT
```

### `dev_timesheet_adjustments`
```sql
- id UUID PRIMARY KEY
- user_id UUID REFERENCES dev_team_members(id)
- user_name VARCHAR(255)
- request_type VARCHAR(50) -- missed_punch, clock_in_correction, clock_out_correction, missed_break, other
- adjustment_date DATE NOT NULL
- original_clock_in TIME
- original_clock_out TIME
- requested_clock_in TIME NOT NULL
- requested_clock_out TIME NOT NULL
- requested_break_minutes INT DEFAULT 0
- reason TEXT NOT NULL
- detailed_description TEXT
- status VARCHAR(50) -- pending, approved, denied
```

---

## Header Actions (Gradient Banner)

Located in `page.tsx`, injected via `PageActionsContext`:

```
[< Prev] [Today] [Next >] | [Week] [Month] | [Timesheet Adjustment] [Time Off Request] [Create Event]
```

- All buttons have `border border-black/50` for visibility on gradient
- Pending request badges show hourglass emoji with count

---

## Key Code Patterns

### 1. Page Title & Actions Context
```tsx
const setPageTitle = useContext(PageTitleContext);
const setPageActions = useContext(PageActionsContext);

useEffect(() => {
  setPageTitle({ title: 'December 8-14, 2024', description: 'Your personal calendar' });
  setPageActions(<div>...buttons...</div>);
  return () => {
    setPageTitle({ title: 'Dashboard', description: 'Your daily overview' });
    setPageActions(null);
  };
}, [dependencies]);
```

### 2. Calendar Mode from URL
```tsx
const searchParams = useSearchParams();
const calendarMode = searchParams?.get('mode') || 'my';
const selectedMemberId = searchParams?.get('member');
const selectedTeamId = searchParams?.get('team');
```

### 3. Role-Based Filtering
```tsx
const isAdminOrLead = currentUser.role === 'admin' || currentUser.role === 'lead';

const visibleTeams = isAdminOrLead
  ? allTeams
  : allTeams.filter(team => currentUser.teams.includes(team.id));
```

### 4. Week View Header Alignment Fix
The scrollbar alignment issue was fixed by adding `overflow-y-scroll` to the header:
```tsx
<div className="flex sticky top-0 bg-gray-900 z-20 shadow-sm overflow-y-scroll">
```
This forces a scrollbar gutter in the header that matches the content area below.

### 5. Prevent Calendar Scroll Reset
Load events only on mount, not on date changes:
```tsx
useEffect(() => {
  loadEvents();
  setLoading(false);
}, [calendarMode]); // Only reload when mode changes, not currentDate
```

---

## User Roles

| Role | See All Teams | See All Individuals | Manage Others |
|------|--------------|---------------------|---------------|
| admin | Yes | Yes | Yes |
| lead | Yes | Yes | Yes |
| engineer | Only their teams | Only team members | No |
| developer | Only their teams | Only team members | No |

---

## Styling Notes

- **Primary color**: `#3B82F6` (blue-500)
- **Dark theme**: gray-800/gray-900 backgrounds
- **Hour height**: 80px in week view
- **Event colors**: Customizable per event, stored in `color` field
- **Noon line**: 50% opacity primary color at hour 12

---

## TODO / Future Improvements

1. **Connect to Supabase**: Replace mock data with real database queries
2. **Realtime updates**: Use Supabase realtime for live event updates
3. **Recurring events**: Implement RRULE parsing for recurring events
4. **Drag to resize**: Allow dragging event edges to change duration
5. **Event notifications**: Push notifications for upcoming events
6. **Calendar sharing**: Public/private calendar links
7. **Google Calendar sync**: Import/export with Google Calendar
8. **Conflict detection**: Warn when scheduling overlapping events
