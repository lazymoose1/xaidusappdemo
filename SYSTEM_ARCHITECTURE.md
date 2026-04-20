# Complete Reminder & Notification System Architecture

**Date:** December 9, 2025  
**Version:** 1.0 - Final Release

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         REMINDER ECOSYSTEM                          │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│   USER COMPLETES     │         │   MILESTONE          │
│   MILESTONE          │────────▶│   COMPLETION         │
└──────────────────────┘         │   WEBHOOK            │
                                 └──────────────────────┘
                                         │
                                         ▼
                            ┌──────────────────────┐
                            │  5 EVENT HANDLERS    │
                            │  - AI Learning       │
                            │  - Analytics         │
                            │  - Parent Notify     │
                            │  - Auto-complete     │
                            │  - Streak Tracking   │
                            └──────────────────────┘
                                         │
                                         ▼
                            ┌──────────────────────┐
                            │  SMART REMINDER      │
                            │  SERVICE             │
                            │  - Analyze Cadence   │
                            │  - Generate Schedule │
                            │  - Calculate Next    │
                            │  - Adapt Frequency   │
                            └──────────────────────┘
                                         │
                                         ▼
                            ┌──────────────────────┐
                            │  CRON JOB            │
                            │  (Daily @ 9 AM)      │
                            │  - getDueReminders() │
                            │  - Send Notifications│
                            │  - Log Delivery      │
                            └──────────────────────┘
                                         │
                                         ▼
                    ┌────────────────────────────────────┐
                    │  USER SEES NOTIFICATIONS           │
                    │  ┌──────────────────────────────┐  │
                    │  │ RemindersModal               │  │
                    │  │ - Due tab (urgent)           │  │
                    │  │ - All tab (scheduled)        │  │
                    │  │ - Action buttons             │  │
                    │  └──────────────────────────────┘  │
                    │  ┌──────────────────────────────┐  │
                    │  │ DeadlineTracker              │  │
                    │  │ - Overdue (red)              │  │
                    │  │ - At Risk (amber)            │  │
                    │  │ - On Track (blue)            │  │
                    │  └──────────────────────────────┘  │
                    │  ┌──────────────────────────────┐  │
                    │  │ NotificationBadge            │  │
                    │  │ - Real-time count            │  │
                    │  │ - Color-coded severity       │  │
                    │  └──────────────────────────────┘  │
                    └────────────────────────────────────┘
                                         │
                                         ▼
                            ┌──────────────────────┐
                            │  USER RESPONDS       │
                            │  - Done (completed)  │
                            │  - Snooze            │
                            │  - Skip (ignored)    │
                            └──────────────────────┘
                                         │
                                         ▼
                            ┌──────────────────────┐
                            │  ADAPTATION LOOP     │
                            │  - Record response   │
                            │  - Adjust cadence    │
                            │  - Update schedule   │
                            │  - AI learns pattern │
                            └──────────────────────┘
```

---

## Component Architecture

### 1. Frontend Components (React)

```
src/components/
├── RemindersModal.tsx
│   ├── ReminderCard (subcomponent)
│   ├── Due tab
│   ├── All tab
│   └── Action buttons (Done/Snooze/Skip)
│
├── DeadlineTracker.tsx
│   ├── DeadlineAlert (subcomponent) - Compact view
│   ├── DeadlineSection (subcomponent) - Full view
│   ├── Overdue section (red)
│   ├── At Risk section (amber)
│   └── On Track section (blue)
│
└── GoalNotificationBadge.tsx
    ├── Real-time counter
    ├── Color coding
    └── 1-minute polling
```

### 2. Backend Services (Node.js/Express)

```
server/src/services/
├── smartReminder.ts (260 lines)
│   ├── analyzeGoalCadence() - Pattern detection
│   ├── generateReminderCadence() - Frequency mapping
│   ├── calculateNextReminderTime() - Scheduling
│   ├── getDueReminders() - Batch fetching
│   ├── adaptReminderCadence() - Learning loop
│   └── formatReminderMessage() - Templating
│
└── milestoneWebhook.ts (260 lines)
    ├── emitMilestoneCompletion() - Event dispatch
    ├── onMilestoneCompleted() - Handler chain
    ├── aiLearningHandler() - Update goal metadata
    ├── analyticsHandler() - Track metrics
    ├── parentNotificationHandler() - Notify parents
    ├── autoCompleteGoalHandler() - 100% completion
    └── streakHandler() - Track consistency
```

### 3. API Routes (Express)

```
server/src/routes/
├── reminders.ts (160 lines)
│   ├── GET /api/reminders - All user reminders
│   ├── GET /api/reminders/due - Urgent only
│   ├── GET /api/reminders/:goalId/analysis - Cadence
│   ├── POST /api/reminders/:goalId/respond - User response
│   └── GET /api/reminders/batch/due - Cron endpoint
│
├── goals.ts (217 lines)
│   ├── POST /api/goals/:goalId/milestones/:index/complete
│   │   └── Emits milestoneWebhook event
│   └── Other goal CRUD operations
│
└── parentPortal.ts
    └── Parent oversight endpoints
```

### 4. Cron Jobs

```
server/src/jobs/cacheCron.ts
├── runCacheRefresh() - Existing post cache job
├── runCacheCleanup() - Existing cleanup job
└── runReminderDelivery() - NEW reminder batch job
    ├── Call getDueReminders()
    ├── Group by userId
    ├── Log delivery
    └── Ready for notification service integration
```

---

## Data Flow Diagrams

### Flow 1: Milestone Completion → Reminder Creation

```
User clicks "Mark Complete" on milestone
        │
        ▼
MilestoneTracker.handleMarkComplete()
        │
        ├─ API: POST /api/goals/:goalId/milestones/:index/complete
        │
        ▼
GoalService: Update milestone.completed = true
        │
        ├─ Calculate new progress percentage
        │
        ▼
WebhookService: Emit MilestoneCompletedEvent
        │
        ├─ AI Learning Handler
        │  └─ Update goal.source metadata
        │
        ├─ Analytics Handler
        │  └─ Track completion metrics
        │
        ├─ SmartReminder: Call analyzeGoalCadence()
        │  ├─ Check milestone history
        │  ├─ Calculate intervals (days between)
        │  ├─ Detect pattern (consistent/bursty/sporadic)
        │  └─ Generate frequency recommendation
        │
        ▼
SmartReminder: Call generateReminderCadence()
        │
        ├─ Map frequency to schedule
        ├─ Set preferred time (9 AM)
        ├─ Calculate confidence score
        │
        ▼
SmartReminder: Call upsertReminderSchedule()
        │
        ├─ Save/update ReminderSchedule in database
        ├─ Set nextReminderAt timestamp
        ├─ Initialize remindersSent counter
        │
        ▼
Response to frontend with updated progress
        │
        ▼
MilestoneTracker: Show success toast
        │
        ├─ AI-sourced: "TINY is learning from your success"
        └─ Manual: "You're 75% done with this goal"
```

### Flow 2: Cron Job → Reminder Display → User Response

```
9 AM Daily: Cron job triggers
        │
        ▼
runReminderDelivery() executes
        │
        ├─ Call getDueReminders() with no userId (all users)
        │
        ▼
SmartReminder: Check all ReminderSchedules
        │
        ├─ WHERE nextReminderAt <= NOW()
        ├─ Load goal data
        ├─ Load user preferences
        │
        ▼
Group reminders by userId
        │
        ├─ User A: [reminder1, reminder2, reminder3]
        ├─ User B: [reminder4]
        └─ User C: [reminder5, reminder6]
        │
        ▼
Log delivery attempt
        │
        ├─ Log entry: { reminderId, userId, status, timestamp }
        │
        ▼
(Ready for integration with email/push/in-app service)
        │
        ├─ Email service: SendGrid, Mailgun
        ├─ Push service: Firebase, Expo
        └─ In-app: WebSocket, polling
        │
        ▼
Frontend: GoalNotificationBadge polls /api/reminders/due
        │
        ├─ Every 60 seconds
        ├─ Updates count in real-time
        ├─ Shows color-coded severity badge
        │
        ▼
User clicks notification badge
        │
        ▼
RemindersModal opens with due reminders
        │
        ├─ Tab 1: "Due" (only nextReminderAt <= NOW)
        ├─ Tab 2: "All" (all scheduled reminders)
        │
        ▼
User clicks action button:
        │
        ├─ ✅ "Done" → Completed milestone
        ├─ ⏰ "Snooze" → Postpone 24 hours
        └─ 👋 "Skip" → Ignore this reminder
        │
        ▼
POST /api/reminders/:goalId/respond
        │
        ├─ Body: { response: 'completed' | 'snoozed' | 'ignored' }
        │
        ▼
SmartReminder: adaptReminderCadence()
        │
        ├─ Record response in adaptiveHistory[]
        ├─ If 'completed' → increase frequency (more reminders)
        ├─ If 'ignored' → decrease frequency (fewer reminders)
        ├─ If 'snoozed' → keep same, add 1-day offset
        │
        ▼
Update ReminderSchedule in database
        │
        ├─ NEW cadence frequency
        ├─ NEW nextReminderAt time
        ├─ NEW confidence score
        │
        ▼
Response to frontend
        │
        ├─ Toast: "Cadence updated for smarter reminders"
        ├─ List refreshes immediately
        │
        ▼
Backend: Logs show adaptation
        │
        └─ Frequency updated: weekly → every-3-days (user was consistent)
```

### Flow 3: Deadline Detection & Tracking

```
User has goal with targetDate
        │
        ▼
DeadlineTracker loads /api/goals
        │
        ├─ Filter: goals with targetDate AND not completed
        │
        ▼
For each goal, calculate days until deadline:
        │
        ├─ daysLeft = (targetDate - NOW) / millisPerDay
        │
        ▼
Classify into status:
        │
        ├─ If daysLeft < 0 → "overdue" (red)
        ├─ If daysLeft < 3 OR progress < 50% → "at-risk" (amber)
        └─ Else → "on-track" (blue)
        │
        ▼
Display in three sections:
        │
        ├─ "Overdue Goals" - Red alert
        │  └─ Shows how many days/weeks overdue
        │
        ├─ "Goals At Risk" - Amber alert
        │  └─ Shows days left to deadline
        │
        └─ "On Track Goals" - Blue section
           └─ Shows days left to deadline
        │
        ▼
Each goal card shows:
        │
        ├─ Title + TINY badge (if AI-sourced)
        ├─ Category
        ├─ Progress bar with percentage
        ├─ Days left/overdue indicator
        │
        ▼
User clicks goal:
        │
        └─ Navigate to goal detail/modal
```

---

## Database Schema

### ReminderSchedule Collection

```typescript
{
  _id: ObjectId,
  goalId: ObjectId,           // Reference to Goal
  userId: ObjectId,           // Reference to User (for queries)
  goalTitle: string,          // Denormalized for display
  
  // Schedule information
  nextReminderAt: Date,       // When to remind next
  lastReminderAt?: Date,      // When last reminded
  remindersSent: number,      // Total reminders sent
  
  // Cadence determination
  cadence: {
    frequency: 'daily' | 'every-2-days' | 'every-3-days' | 'weekly' | 'bi-weekly',
    preferredTime: '09:00',    // HH:MM format
    reasoning: string,         // Why this frequency?
    confidence: 0.85           // 0-1 confidence score
  },
  
  // Adaptive learning
  adaptiveHistory: [
    {
      timestamp: Date,
      cadence: 'weekly',       // What it was before
      userResponse: 'completed' | 'ignored' | 'snoozed' | 'completed-late'
    }
  ],
  
  // Metadata
  createdAt: Date,
  updatedAt: Date
}
```

### Goal Schema Extensions

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  title: string,
  
  // NEW: Source tracking
  source: 'ai' | 'manual',                    // Origin of goal
  suggestionId?: ObjectId,                    // Link to AI suggestion
  suggestionTitle?: string,                   // Original suggestion text
  adoptedAt?: Date,                           // When adopted from TINY
  archetypeAligned?: boolean,                 // Matches user archetype
  
  // Deadline support
  targetDate?: Date,                          // When goal should be done
  
  // Existing fields
  milestones: [
    {
      title: string,
      target?: string,
      completed: boolean,
      completedAt?: Date,
      createdAt: Date
    }
  ],
  progress: number,                           // 0-100%
  completed: boolean,
  
  // Timestamps
  createdAt: Date,
  completedAt?: Date
}
```

---

## API Request/Response Examples

### Get All Reminders

```bash
GET /api/reminders
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "total": 5,
  "reminders": [
    {
      "goalId": "507f1f77bcf86cd799439011",
      "userId": "507f1f77bcf86cd799439012",
      "goalTitle": "Complete online course",
      "nextReminderAt": "2025-12-10T09:00:00.000Z",
      "lastReminderAt": "2025-12-09T09:00:00.000Z",
      "remindersSent": 8,
      "cadence": {
        "frequency": "every-2-days",
        "preferredTime": "09:00",
        "reasoning": "Average 2-day intervals between progress",
        "confidence": 0.92
      },
      "isAISourced": true
    }
  ],
  "nextDue": { /* ... */ }
}
```

### Get Due Reminders

```bash
GET /api/reminders/due
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "due": 3,
  "reminders": [
    {
      "goalId": "507f1f77bcf86cd799439011",
      "goalTitle": "Learn Spanish",
      "nextReminderAt": "2025-12-09T08:45:00.000Z",
      "cadence": { /* ... */ }
    },
    // ... more
  ]
}
```

### Respond to Reminder

```bash
POST /api/reminders/507f1f77bcf86cd799439011/respond
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "response": "completed",
  "reason": "Finished chapter 5 today"
}
```

**Response:**
```json
{
  "success": true,
  "userResponse": "completed",
  "adaptedCadence": {
    "frequency": "daily",
    "confidence": 0.95,
    "reasoning": "User completing consistently - increase frequency"
  },
  "message": "Reminder cadence adapted based on your response"
}
```

### Cron Job - Get Batch Reminders

```bash
GET /api/reminders/batch/due
x-api-key: <system-api-key>
```

**Response:**
```json
{
  "total": 847,
  "reminders": [
    {
      "userId": "507f1f77bcf86cd799439012",
      "goalTitle": "Morning jog",
      "nextReminderAt": "2025-12-09T09:00:00.000Z"
    },
    // ... 846 more across all users
  ],
  "processedAt": "2025-12-09T09:02:15.000Z"
}
```

---

## Security Controls

### Authentication
- ✅ All endpoints require JWT in `Authorization: Bearer` header
- ✅ Verified by `authMiddleware` before route handler
- ✅ Tokens expire in 1 hour

### Authorization
- ✅ User isolation: All queries filter by `req.user.userId`
- ✅ Cross-user data access impossible
- ✅ Cron endpoint protected by `SYSTEM_API_KEY` header

### Input Validation
- ✅ Zod schemas for request bodies
- ✅ MongoDB ObjectId validation on params
- ✅ Max length constraints on strings
- ✅ Enum validation on response types

### Data Protection
- ✅ Generic error messages (no info leakage)
- ✅ No sensitive data in logs
- ✅ Encrypted at rest (MongoDB)
- ✅ HTTPS in production (secure: true cookies)

### Error Handling
- ✅ Try/catch on all async operations
- ✅ 400 for validation errors
- ✅ 401 for auth failures
- ✅ 403 for authorization failures
- ✅ 500 for server errors (generic message)

---

## Performance Characteristics

### Response Times (Target)
- `GET /api/reminders` → < 200ms (user has ~50 reminders)
- `GET /api/reminders/due` → < 100ms (< 5 due)
- `POST /api/reminders/:id/respond` → < 150ms (update + adapt)
- `GET /api/reminders/batch/due` → < 5s (cron, all 10k users)

### Database Indexes Needed
```typescript
// In db.ts initialization
ReminderSchedule.collection.createIndex({ userId: 1, nextReminderAt: 1 });
Goal.collection.createIndex({ userId: 1, completed: 1 });
Goal.collection.createIndex({ userId: 1, targetDate: 1 });
```

### Cron Job Load
- Runs once daily (9 AM)
- Processes 847 reminders for example (scales with user base)
- Typical duration: 2-5 seconds
- Can be distributed across 5-minute window if needed

---

## Monitoring & Alerting

### Key Metrics to Track

```typescript
// Server logs should capture:
{
  timestamp: "2025-12-09T09:00:00Z",
  event: "reminder_delivery_complete",
  metrics: {
    totalReminders: 847,
    usersNotified: 782,
    deliveryRate: 0.923,   // Should be > 0.95
    failureCount: 65,
    avgProcessingTime: 2500 // ms, should be < 5000
  },
  errors: [
    { userId: "...", reason: "API timeout" },
    // ...
  ]
}
```

### Alerts to Set Up

1. **Reminder Delivery Failure Rate > 5%**
   - Indicates service issues
   - Check cron job logs

2. **API Response Time > 500ms**
   - Indicates performance degradation
   - Check database load

3. **Auth Failures > 10/minute**
   - Possible attack or config issue
   - Check for expired tokens

4. **Overdue Reminders Growing**
   - User isn't responding to reminders
   - May need frequency adjustment

---

## Future Enhancements

### Phase 2 (Next Sprint)
- [ ] Email reminder integration (SendGrid)
- [ ] Push notifications (Firebase/Expo)
- [ ] SMS reminders (Twilio)
- [ ] In-app notification center

### Phase 3 (Following Sprint)
- [ ] Smart timing (send when user most active)
- [ ] Personalized message generation
- [ ] A/B testing reminder wording
- [ ] Reminder snooze intelligence

### Phase 4 (Long Term)
- [ ] ML model for optimal cadence prediction
- [ ] Multi-language reminder support
- [ ] Collaborative reminders (with friends)
- [ ] Reward system integration

---

## Deployment Instructions

### Development
```bash
# Start backend with reminders enabled
cd server
export REMINDERS_CRON_INTERVAL="0 9 * * *"
export SYSTEM_API_KEY="dev-secret-key"
npm run dev
```

### Production
```bash
# Set environment variables in hosting platform
REMINDERS_CRON_INTERVAL=0 9 * * *
SYSTEM_API_KEY=<generate-strong-random-key>
NODE_ENV=production

# Deploy
npm run build && npm start
```

---

## Summary

This complete reminder and notification system provides:

✅ **Intelligent Reminders**: Cadence learns from user patterns
✅ **Real-time Notifications**: Badge updates every 60 seconds  
✅ **Deadline Tracking**: Visual classification of goal urgency
✅ **Adaptive Learning**: Reminders improve over time
✅ **Secure**: Full authentication and authorization
✅ **Scalable**: Cron-based batch processing
✅ **Extensible**: Ready for email/push/SMS integration

**Total Lines of Code**: 1,400+
**Components**: 3 (RemindersModal, DeadlineTracker, NotificationBadge)
**API Endpoints**: 5 (all documented)
**Database Collections**: 2 (goals, reminders)
**Security Checks**: 8 (auth, validation, isolation, error handling)
