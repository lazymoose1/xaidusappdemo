# Reminder & Notification System — Integration Guide

**Last Updated:** December 9, 2025

---

## Quick Start

### 1. Add Components to Bottom Navigation

**File: `src/components/BottomNav.tsx`**

```typescript
import { RemindersModal } from './RemindersModal';
import { GoalNotificationBadge } from './GoalNotificationBadge';
import { useState } from 'react';

export const BottomNav = () => {
  const [showReminders, setShowReminders] = useState(false);

  return (
    <>
      <nav className="flex items-center justify-between gap-2">
        {/* ... other buttons ... */}

        {/* Notifications Badge Button */}
        <button
          onClick={() => setShowReminders(true)}
          className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
        >
          <GoalNotificationBadge />
        </button>
      </nav>

      <RemindersModal
        isOpen={showReminders}
        onClose={() => setShowReminders(false)}
      />
    </>
  );
};
```

### 2. Add Deadline Tracker to Dashboard

**File: `src/pages/Index.tsx` or Dashboard**

```typescript
import { DeadlineTracker } from '@/components/DeadlineTracker';

export const DashboardPage = () => {
  const handleGoalClick = (goalId: string) => {
    window.location.hash = `/goal/${goalId}`;
  };

  return (
    <div className="space-y-6 pb-20">
      <section>
        <h2 className="text-2xl font-bold mb-4">Goal Deadlines</h2>
        <DeadlineTracker
          onGoalClick={handleGoalClick}
          compact={false}
        />
      </section>
    </div>
  );
};
```

### 3. Add Compact Deadline Warning to FeedsPage

**File: `src/pages/FeedsPage.tsx`**

```typescript
import { DeadlineTracker } from '@/components/DeadlineTracker';

export const FeedsPage = () => {
  return (
    <div className="space-y-4">
      <DeadlineTracker compact={true} />
      {/* Existing feed content */}
    </div>
  );
};
```

---

## Component API Reference

### RemindersModal

```typescript
interface RemindersModalProps {
  isOpen: boolean;           // Controls visibility
  onClose: () => void;       // Called when user closes modal
  goalId?: string;           // (Optional) Filter reminders to specific goal
}
```

**Features:**
- Two tabs: "Due" (urgent) and "All" (full list)
- Reminder count badges
- Action buttons: Done, Snooze, Skip
- Toast notifications on user response
- Auto-fetches from `/api/reminders` and `/api/reminders/due`

---

### DeadlineTracker

```typescript
interface DeadlineTrackerProps {
  goals?: GoalDeadline[];                    // (Optional) Pass goals directly
  onGoalClick?: (goalId: string) => void;    // Click handler
  compact?: boolean;                          // Compact alert mode (default: false)
}
```

**Full View:**
```typescript
<DeadlineTracker
  compact={false}
  onGoalClick={(id) => navigate(`/goal/${id}`)}
/>
```

**Compact View:**
```typescript
<DeadlineTracker compact={true} />
```

**Features:**
- Sections: Overdue (red), At Risk (amber), On Track (blue)
- Collapsible alerts in compact mode
- Progress bars with percentage
- Days remaining/overdue display
- TINY badge for AI-sourced goals
- Auto-fetches from `/api/goals` if not provided

---

### GoalNotificationBadge

```typescript
interface GoalNotificationBadgeProps {
  onClick?: () => void;      // Click handler (usually opens RemindersModal)
  showLabel?: boolean;        // Show "Reminders" text (default: false)
}
```

**Features:**
- Real-time badge counter (due + overdue + at-risk)
- Color-coded: Red (critical) > Amber (warning) > Blue (info)
- Polls every 60 seconds
- Auto-hides when count = 0
- Shows "9+" for high counts

---

## Styling & Theming

### Dark Mode Support

All components use Tailwind dark mode with `dark:` prefixes:
- `dark:bg-slate-900` for backgrounds
- `dark:text-white` for text
- `dark:border-slate-700` for borders

### Customization

**Change polling interval (reminder badge):**
```typescript
// In GoalNotificationBadge.tsx, line 21
const interval = setInterval(fetchNotifications, 120000); // 2 minutes
```

**Change reminder frequency colors:**
```typescript
// In RemindersModal.tsx
const frequencyColors = {
  'daily': 'bg-red-50 text-red-700 border-red-200',
  'every-2-days': 'bg-orange-50 text-orange-700 border-orange-200',
};
```

**Change deadline classification:**
```typescript
// In DeadlineTracker.tsx, calculateStatus()
const calculateStatus = (goal: any): 'on-track' | 'at-risk' | 'overdue' => {
  if (!goal.targetDate) return 'on-track';
  const daysLeft = calculateDaysUntilDeadline(goal.targetDate);
  if (daysLeft < 0) return 'overdue';
  if (daysLeft < 3 || goal.progress < 50) return 'at-risk';
  return 'on-track';
};
```

---

## Backend Requirements

### Environment Variables

```env
REMINDERS_CRON_INTERVAL=0 9 * * *    # Daily at 9 AM
SYSTEM_API_KEY=your-secret-key-here
```

### Required Routes

All routes in `server/src/routes/reminders.ts`:
- `GET /api/reminders` — User's all reminders
- `GET /api/reminders/due` — Only due reminders
- `GET /api/reminders/:goalId/analysis` — Cadence analysis
- `POST /api/reminders/:goalId/respond` — User response
- `GET /api/reminders/batch/due` — Cron job endpoint

### Database Collections

The system uses existing collections:
- `goals` — Goal data with milestones
- `reminders` — Reminder schedules (auto-created on-demand)
- `aigoalfeedback` — AI feedback tracking

---

## Testing Checklist

### Manual Testing

- [ ] **Modal Opening** — Click notification badge, modal opens, X closes it
- [ ] **Due Reminders Tab** — Switch to "Due", shows count and action buttons
- [ ] **User Responses** — Click "Done", toast appears, list updates, cadence adapts
- [ ] **Deadline Tracker** — Overdue in red, At Risk in amber, On Track in blue
- [ ] **Notification Badge** — Shows count, color changes by severity, updates every minute, hides at 0

### Automated Testing

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { RemindersModal } from '@/components/RemindersModal';

test('RemindersModal opens and closes', async () => {
  render(<RemindersModal isOpen={true} onClose={jest.fn()} />);
  expect(screen.getByText('Reminders')).toBeInTheDocument();
});

test('Due reminders tab shows correct count', async () => {
  render(<RemindersModal isOpen={true} onClose={jest.fn()} />);
  await waitFor(() => {
    const dueCount = screen.getByText(/Due \(\d+\)/);
    expect(dueCount).toBeInTheDocument();
  });
});
```

---

## Troubleshooting

### Reminder modal won't open
```typescript
// Check import and state wiring
import { RemindersModal } from '@/components/RemindersModal';
const [showReminders, setShowReminders] = useState(false);
<RemindersModal isOpen={showReminders} onClose={() => setShowReminders(false)} />
```

### No reminders showing
1. Check API: `curl http://localhost:4000/api/reminders/due -H "Authorization: Bearer TOKEN"`
2. Verify auth middleware: token should be available
3. Check browser console for fetch errors

### Deadline tracker not updating
```typescript
// Ensure goals endpoint returns targetDate field
const res = await fetch('/api/goals', { credentials: 'include' });
const goals = await res.json();
console.log(goals[0].targetDate); // Should be ISO date string
```

### Badge not showing count
1. Clear browser storage and reload
2. Check polling interval: defaults to 60 seconds
3. Verify `/api/reminders/due` returns data

### Cron job not running
```bash
# Check env var
env | grep REMINDERS_CRON_INTERVAL

# Test cron job manually
curl http://localhost:4000/api/reminders/batch/due \
  -H "x-api-key: $SYSTEM_API_KEY"
```

---

## Performance Optimization

### Reduce Polling Interval
```typescript
// In GoalNotificationBadge.tsx
const interval = setInterval(fetchNotifications, 300000); // 5 minutes
```

### Cache Goal List
```typescript
import { useMemo } from 'react';
const deadlineGoals = useMemo(() => {
  return goals.filter(g => g.targetDate && !g.completed);
}, [goals]);
```

### Lazy Load Reminders Modal
```typescript
import { lazy, Suspense } from 'react';
const RemindersModal = lazy(() => import('./RemindersModal'));

<Suspense fallback={<div>Loading...</div>}>
  <RemindersModal isOpen={showReminders} onClose={() => setShowReminders(false)} />
</Suspense>
```

---

## Security Reminders

**All components securely:**
- Use auth token automatically
- Include credentials with fetch requests
- Filter results by authenticated userId
- Validate input with Zod schemas
- No sensitive data in local state

**Never:**
- Store auth token in URL params
- Pass goalId as prop without ownership check
- Expose API keys in frontend code
- Cache reminder data longer than 1 minute

---

## Deployment Checklist

- [ ] Set `SYSTEM_API_KEY` in environment (production secret)
- [ ] Set `REMINDERS_CRON_INTERVAL` (e.g., "0 9 * * *" for 9 AM)
- [ ] Enable HTTPS for secure cookies
- [ ] Test cron job: `GET /api/reminders/batch/due` with API key
- [ ] Monitor reminder delivery in server logs
- [ ] Set up alerting on failed reminders
- [ ] Test dark mode on multiple browsers
- [ ] Verify mobile responsiveness on actual devices

---

## Next Steps

1. **Integrate Components** — Add RemindersModal to BottomNav, GoalNotificationBadge to header, DeadlineTracker to dashboard
2. **Test End-to-End** — Create goals with milestones, complete them, verify reminders adapt
3. **Monitor & Optimize** — Track delivery success rate, API response times, gather user feedback on frequency

---

*Restored from: REMINDER_INTEGRATION_GUIDE.md*
