# DUS App — Feature Reference

Consolidated reference for the TINY AI feedback loop, goal tracking, milestone webhooks, and parent portal features. MongoDB schemas included for migration reference.

---

## Table of Contents

1. [Feedback Loop Workflow](#feedback-loop-workflow)
2. [MongoDB Schemas](#mongodb-schemas)
3. [API Endpoints](#api-endpoints)
4. [Goal Source Tracking](#goal-source-tracking)
5. [Milestone Webhook Architecture](#milestone-webhook-architecture)
6. [AI Integration & Fallback](#ai-integration--fallback)
7. [Frontend Components](#frontend-components)
8. [Analytics & Metrics](#analytics--metrics)
9. [Integration Checklist](#integration-checklist)
10. [Testing Scenarios](#testing-scenarios)
11. [Success Metrics](#success-metrics)
12. [Future Enhancements](#future-enhancements)

---

## Feedback Loop Workflow

The core product loop — 5 steps connecting teens, AI, and parents:

```
Teen Sets Goal -> TINY Suggests Goals -> Teen Adopts Suggestion
                                              |
                                        Track Adoption
                                              |
                                    Complete Milestones
                                              |
                                   Update AI Feedback
                                              |
                                    Parent Reviews & Provides Feedback
                                              |
                                   AI Learns & Improves Suggestions
```

### Step 1: Teen Receives AI Suggestions
1. Teen opens CrystalBall (TINY button)
2. `/api/ai/tiny/advice` called with interests, archetype, existing goals, progress metrics
3. OpenAI generates personalized suggestions (or mock fallback in dev)
4. Frontend displays suggestions in GoalModal and AddGoalModal

### Step 2: Teen Adopts AI Suggestion
1. Teen clicks "Use this goal" in GoalModal
2. Goal created with `source: 'ai'`, `suggestionId`, `adoptedAt` timestamp
3. Frontend stores suggestion context in sessionStorage for milestone hints

### Step 3: Teen Works on Goal & Completes Milestones
1. Teen views goal detail with MilestoneTracker
2. Teen completes individual milestones
3. `POST /api/goals/:goalId/milestones/:index/complete` called
4. AI feedback updated with completed milestone details, progress %, timestamp
5. Toast notification confirms and mentions AI learning

### Step 4: Parent Reviews & Provides Feedback
1. Parent opens ParentDashboardComponent
2. Clicks "Review Suggestions" button
3. ParentGoalReviewModal loads AI-suggested goals
4. Parent provides feedback, encouragement, optional suggested milestones
5. `POST /api/parent/children/:childId/goals/:goalId/feedback`
6. AIGoalFeedback updated with parent context

### Step 5: AI Learns for Next Iteration
1. Next time teen requests advice, `/api/ai/tiny/advice` builds context including:
   - Previous adoption metrics
   - Parent feedback on similar goals
   - Milestone completion patterns
   - Category-specific success rates
2. OpenAI uses this context to generate better suggestions
3. Loop repeats with improved suggestions

---

## MongoDB Schemas

### Goal Schema (extended)

```typescript
interface Goal {
  _id: ObjectId;
  userId: ObjectId;
  title: string;
  description?: string;
  category?: string;           // default: "personal"
  progress: number;            // default: 0
  completed: boolean;          // default: false
  status: string;              // default: "active"
  source: 'ai' | 'manual';    // Track source of goal
  suggestionId?: string;       // Link to original AI suggestion
  suggestionTitle?: string;    // Original AI suggestion text
  adoptedAt?: Date;            // When user adopted AI suggestion
  archetypeAligned?: boolean;  // Whether goal aligns with user archetype
  milestones: [{
    title: string;
    target?: string;
    completed?: boolean;
    completedAt?: Date;
    createdAt: Date;
  }];
  plannedDays?: any;
  completedDates: Date[];
  lastCheckin?: any;
  microStep?: string;
  reminderWindow?: string;
  weekStart?: Date;
  resized: boolean;
  carriedOverFrom?: ObjectId;
  createdAt: Date;
  completedAt?: Date;
}
```

### AIGoalFeedback Schema

```typescript
interface AIGoalFeedback {
  _id: ObjectId;
  userId: ObjectId;                   // Teen who adopted goal
  goalId: ObjectId;                   // Goal that was adopted
  adoptionReason?: string;            // Why teen adopted suggestion
  completionTimeline?: string;
  parentReviewed?: boolean;           // default: false
  parentReviewedAt?: Date;
  parentFeedback?: string;
  parentSuggestedMilestones?: string[];
  parentEncouragement?: string;
  completionFeedback?: {
    milestoneTitle: string;
    completedAt: Date;
    progressPercentage: number;
  };
  milestonesCompleted: number;        // default: 0
  lastMilestoneCompletedAt?: Date;
  createdAt: Date;
}
```

### Key MongoDB Queries

```javascript
// Parent viewing AI-suggested goals for their teens
Goal.find({ userId: { $in: linkedTeenIds }, source: 'ai' })

// Feedback lookup
AIGoalFeedback.find({ userId: teenId })
AIGoalFeedback.findOne({ goalId: ObjectId("goal-123") })

// Milestone completion update
Goal.updateOne({ _id: goalId }, { $set: { "milestones.0.completed": true } })

// Debug queries
db.goals.findOne({"_id": ObjectId("goal-123")})
db.aigoalfeedbacks.findOne({"goalId": ObjectId("goal-123")})
```

### Indexes

```javascript
Goal.collection.createIndex({ userId: 1 });
Goal.collection.createIndex({ status: 1, completed: 1 });
Goal.collection.createIndex({ userId: 1, source: 1 });  // For parent portal queries
AIGoalFeedback.collection.createIndex({ userId: 1, goalId: 1 });
```

---

## API Endpoints

### AI Advice

#### `POST /api/ai/tiny/advice`
Generates personalized goal suggestions using OpenAI (or dev mock fallback).

**Request:**
```json
{
  "interests": ["sports", "coding", "music"],
  "archetype": "athlete",
  "existingGoals": ["Run 5K", "Learn TypeScript"],
  "progressMetrics": { "overallProgress": 65 }
}
```

**Response:**
```json
{
  "goals": [
    {
      "title": "Complete a fitness challenge",
      "category": "health",
      "reason": "Aligns with sports interest and athlete archetype",
      "impactScore": 9,
      "effortScore": 7
    }
  ],
  "steps": [
    {
      "description": "Start with 15 minutes daily",
      "estMinutes": 15,
      "goalTitle": "Complete a fitness challenge"
    }
  ],
  "schedule": [
    { "cadence": "daily", "when": "morning" }
  ],
  "insights": "Based on your interests..."
}
```

Features: fetches existing goals to deduplicate, builds rich context from interests/archetype/progress.

---

### Goal Tracking

#### `POST /api/goals` (enhanced)

**AI-sourced request:**
```json
{
  "title": "Run a 5K",
  "description": "Complete a 5K race this month",
  "category": "health",
  "progress": 0,
  "source": "ai",
  "suggestionId": "tiny-suggestion-123",
  "suggestionTitle": "Complete a fitness challenge",
  "archetypeAligned": true
}
```

**Manual request:**
```json
{
  "title": "Learn Python",
  "description": "Master Python basics",
  "category": "learning",
  "progress": 0
}
```

Zod validation:
```typescript
source: z.enum(['ai', 'manual']).optional().default('manual'),
suggestionId: z.string().optional(),
suggestionTitle: z.string().optional(),
archetypeAligned: z.boolean().optional()
```

#### `POST /api/goals/:goalId/mark-ai-adopted`

**Request:**
```json
{
  "suggestionId": "suggestion-123",
  "suggestionTitle": "Complete a fitness challenge",
  "archetypeAligned": true
}
```

**Response:**
```json
{
  "success": true,
  "goal": {
    "id": "goal-123",
    "source": "ai",
    "adoptedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### `POST /api/goals/:goalId/milestones/:milestoneIndex/complete`

Updates milestone, recalculates progress, updates AIGoalFeedback if AI-sourced.

**Response:**
```json
{
  "id": "goal-123",
  "title": "Complete a 5K run",
  "progress": 75,
  "milestones": [
    {
      "title": "Week 1: 30min workouts",
      "completed": true,
      "completedAt": "2024-01-16T14:20:00Z"
    }
  ]
}
```

Toast (AI-sourced): "Great progress! TINY is learning from your success and will refine future suggestions."

#### `GET /api/user/goal-analytics`

**Response:**
```json
{
  "totalGoals": 12,
  "completedGoals": 7,
  "completionRate": 58,
  "aiSuggestedGoals": 5,
  "aiAdoptionRate": 42,
  "byCategory": {
    "health": { "total": 4, "completed": 3 },
    "education": { "total": 5, "completed": 2 },
    "social": { "total": 3, "completed": 2 }
  },
  "milestoneProgress": {
    "totalMilestones": 18,
    "completedMilestones": 12,
    "completionRate": 67
  }
}
```

---

### Parent Portal

#### `GET /api/parent/ai-suggested-goals`

Lists all AI-suggested goals from connected teens.

**Response:**
```json
{
  "total": 5,
  "goals": [
    {
      "id": "goal-123",
      "userId": "teen-456",
      "title": "Complete 5K run",
      "category": "health",
      "progress": 65,
      "completed": false,
      "feedback": {
        "parentReviewed": true,
        "parentFeedback": "Great progress!"
      }
    }
  ]
}
```

#### `POST /api/parent/children/:childId/goals/:goalId/feedback`

**Request:**
```json
{
  "feedback": "Excellent progress! Remember to warm up.",
  "encouragement": "I'm so proud of your commitment!",
  "suggestedMilestones": ["Add strength training 2x per week"]
}
```

#### `GET /api/parent/dashboard`

**Response:**
```json
{
  "totalChildren": 2,
  "totalGoals": 12,
  "completedGoals": 7,
  "aiSuggestedGoals": 5,
  "averageProgress": 58,
  "byArchetype": {
    "athlete": 1,
    "scholar": 1
  }
}
```

---

### Error Responses

| Status | Response | Cause |
|--------|----------|-------|
| 401 | `{ "error": "Unauthorized" }` | Missing or invalid auth token |
| 403 | `{ "error": "Forbidden" }` | Wrong role for endpoint |
| 404 | `{ "error": "Goal not found" }` | Invalid goal ID or not owned |
| 400 | `{ "error": "Invalid milestone index" }` | Bad parameters |

---

## Goal Source Tracking

### How It Works

**Automatic source detection** — no manual flagging required:

```
AI Suggestion Flow:
1. Teen gets TINY advice -> stored in sessionStorage('tinyAdvice')
2. Teen opens AddGoalModal -> modal detects matching suggestion
3. Teen creates goal with matching title -> source='ai' + metadata
4. Backend creates Goal + AIGoalFeedback record

Manual Goal Flow:
1. Teen opens AddGoalModal -> no matching suggestion
2. Teen creates goal with custom title -> source='manual'
3. No AIGoalFeedback record created
```

### Frontend Detection Logic (`src/components/AddGoalModal.tsx`)

```typescript
const matchingSuggestion = suggestions.find(g =>
  g.title.toLowerCase() === goalTitle.toLowerCase()
);

if (matchingSuggestion) {
  goalData.source = 'ai';
  goalData.suggestion_id = matchingSuggestion.id;
  goalData.suggestion_title = matchingSuggestion.title;
}
```

### Visual Display

```
+-----------------------------------+
| Run a 5K                          |
| [Health] [TINY] [Completed]       |
| Based on: Complete a fitness      |
| challenge                         |
| Progress: 75%                     |
+-----------------------------------+
```

### Utility Functions (`src/lib/goalTracking.ts`)

| Function | Purpose |
|----------|---------|
| `findMatchingSuggestion()` | Find AI suggestion matching goal title |
| `getSessionAISuggestions()` | Retrieve TINY suggestions from session |
| `storeSessionAISuggestions()` | Save AI advice to session |
| `clearSessionAISuggestions()` | Clear cached suggestions |
| `determineGoalSource()` | Automatically detect goal source |
| `markGoalAsAIAdopted()` | API call to mark adoption |
| `fetchGoalAnalytics()` | Get adoption metrics |
| `formatGoalSource()` | Display-friendly source text |
| `getSourceBadgeConfig()` | Badge styling configuration |
| `calculateAdoptionRate()` | Percentage of AI-adopted goals |
| `filterGoalsBySource()` | Filter goals by source type |

---

## Milestone Webhook Architecture

Event-driven system for handling milestone completions asynchronously.

### Event Flow

```
Milestone Completion Request
            |
   Validate & Update Goal
            |
  Emit MilestoneCompletionEvent
            |
   +--------+----------+---------+---------+------------+
   |                    |         |         |            |
AI Learning      Analytics    Parent     Goal Auto-   Streak
(Highest Pri)    Tracking     Notif      Completion   Tracking
   |                    |         |         |            |
Async/No Block  Async/No Block Async    Sync         Async
```

### Event Interface

```typescript
interface MilestoneCompletionEvent {
  goalId: string;
  userId: string;
  milestoneIndex: number;
  milestoneTitle: string;
  goalTitle: string;
  goalCategory: string;
  progressPercentage: number;
  isAISourced: boolean;
  completedAt: Date;
  totalMilestones: number;
  completedCount: number;
}
```

### 5 Webhook Handlers

1. **AI Learning** (highest priority): Updates AIGoalFeedback with milestone title, progress %, timestamps. Enables AI to learn success patterns.

2. **Analytics Tracking**: Logs velocity, category, duration metrics. Computes days-to-completion. Distinguishes AI vs manual goals.

3. **Parent Notification**: Creates structured notification: "Your teen completed 'X' on goal 'Y'! Progress: Z%". Extensible to push notifications and email digests.

4. **Goal Auto-Completion** (synchronous): When `progressPercentage === 100`, marks goal as `completed: true`, `status: 'completed'`.

5. **Streak Tracking**: Tracks consecutive milestone completions. Prepares data for badge/achievement unlocking.

### Error Handling Philosophy

```typescript
// Handlers fail independently — never block the completion response
async (event: MilestoneCompletionEvent) => {
  try {
    // Handler logic
  } catch (err) {
    console.error(`Error in webhook handler:`, err);
    // Does not propagate - goal still completes
  }
}
```

### Handler Registration

```typescript
// server/src/webhookInit.ts
milestoneWebhook.registerHandler('ai-learning', handleAILearning);
milestoneWebhook.registerHandler('analytics', handleAnalyticsTracking);
milestoneWebhook.registerHandler('parent-notification', handleParentNotification);
milestoneWebhook.registerHandler('goal-auto-completion', handleGoalAutoCompletion);
milestoneWebhook.registerHandler('streak-tracking', handleStreakTracking);
```

### Data Flow Example: All Milestones Completed

```
1. Teen completes final milestone
   POST /api/goals/goal-123/milestones/1/complete

2. Server updates milestone, calculates progress: 100%

3. Event emitted (progressPercentage: 100, completedCount: 2/2)

4. Handlers fire:
   - AI Learning: Updates with final completion
   - Analytics: Logs goal completion (total days, velocity, success)
   - Parent Notification: Priority alert "Goal Complete! Your teen finished 'Run a 5K'!"
   - Auto-Completion: Triggers! marks goal.completed = true
   - Streak: Records completion, may unlock badge/achievement

5. Frontend shows celebration toast
```

### Scalability Path

- Current: In-process event emitter
- Future: Message queue (RabbitMQ, Kafka) for independent handler scaling
- Future: WebSocket for real-time parent notifications
- Future: Push notifications for mobile

---

## AI Integration & Fallback

### 3-Tier Priority Chain

```typescript
if (openai) {
  // 1st Priority: Use OpenAI API (real AI suggestions)
} else if (SUPABASE_URL) {
  // 2nd Priority: Use Supabase Edge Function (cloud fallback)
} else {
  // 3rd Priority: Development mock (context-aware, $0 cost)
}
```

### Mock Suggestion Logic

The mock is contextual and intelligent:

1. **Specific goal entered** (e.g., "Help me with my goal") — analyzes text, provides encouragement with impact/effort scores
2. **User has interests** — suggests relevant goals:
   - Coding/Tech -> "Build a personal project"
   - Fitness/Health -> "Exercise 3 times per week"
   - Art/Creativity -> "Create one piece of art weekly"
3. **Default fallback** — generic: "Learn something new each week"

Console output when mock is active:
```
No AI service configured. Using mock suggestions. Configure OPENAI_API_KEY or SUPABASE_URL for real AI.
```

### Cost Comparison

| Service | Cost | Quality | Best For |
|---------|------|---------|----------|
| Development Mock | $0 | Basic but functional | Dev, testing, demos |
| OpenAI API (gpt-4o-mini) | ~$0.01-0.05/request | Excellent | Production, 100+ users |
| Supabase + OpenAI | ~$0.02-0.08/request | Excellent + caching | Large scale (1000+ users) |

### Environment Variables

```env
OPENAI_API_KEY=sk-...              # OpenAI API key
OPENAI_MODEL=gpt-4o-mini           # Model (gpt-4o-mini recommended for cost)
SUPABASE_URL=https://...           # Supabase fallback
SUPABASE_ANON_KEY=...
```

### Gradual Migration Plan

1. **Week 1-2**: Use mock for internal testing
2. **Week 3**: Add OpenAI API key for beta testers
3. **Week 4+**: Monitor costs, optimize prompts
4. **Month 2**: Consider Supabase edge functions for caching

---

## Frontend Components

### ParentGoalReviewModal
```typescript
<ParentGoalReviewModal
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  onRefresh={loadDashboard}
/>
```
Features: goal list with adoption status, progress visualization, feedback form with validation, encouragement input, dark mode.

### ParentDashboardComponent
```typescript
<ParentDashboardComponent onNavigate={handleNavigation} />
```
Features: summary cards (children, goals, completion, AI suggestions), average progress bar, archetype distribution, AI coaching section with review button.

### MilestoneTracker
```typescript
<MilestoneTracker
  goalId={goalId}
  milestones={milestones}
  onMilestoneComplete={handleCompletion}
  isAISourced={goal.source === 'ai'}
/>
```
Features: milestone list with completion checkbox, real-time progress, AI learning feedback message, dark mode.

### Modal Scrolling Pattern

All modals use this pattern for proper scrolling:
- Container: `flex flex-col max-h-[90vh]`
- Header: `flex-shrink-0` (stays fixed)
- Content: `flex-1 overflow-y-auto` (scrolls independently)

---

## Analytics & Metrics

### For Teens
- Adoption rate: % of AI suggestions adopted
- Completion rate: Goals completed vs. created
- Category performance: Which goal types completed most
- Milestone velocity: How quickly milestones are completed

### For Parents
- Children's progress: Overall completion rates and trends
- AI effectiveness: Which suggestions their teen adopts and completes
- Engagement: How actively teen is setting and pursuing goals
- Archetype alignment: Whether suggested goals match teen's archetype

### For AI System
- Success patterns: Which suggestion types convert to completions
- Parent impact: How parent feedback changes future adoption
- Time-to-completion: AI-suggested vs. manual goals
- Category trends: Strengths in health, education, social, etc.

---

## Integration Checklist

### Phase 1: Page Integration
- [ ] Import ParentDashboardComponent into ParentPortalPage
- [ ] Integrate MilestoneTracker into goal detail view
- [ ] Update Index.tsx to show AI adoption badge on goals
- [ ] Update GoalModal to include adoption status
- [ ] Update AddGoalModal to show suggestion source

### Phase 2: API Integration
- [ ] Verify all endpoints with Postman/curl
- [ ] Check OpenAI API key configuration
- [ ] Test error handling for edge cases

### Phase 3: End-to-End Testing
- [ ] Teen requests AI advice -> suggestions appear
- [ ] Teen adopts suggestion -> goal marked as 'ai'
- [ ] Teen completes milestone -> progress updates, "TINY is learning" toast
- [ ] Parent views dashboard -> metrics load
- [ ] Parent provides feedback -> saves, shows "Reviewed" badge
- [ ] Analytics endpoint reflects adoption

### Phase 4: Mobile Responsiveness
- [ ] Test all components on mobile viewport
- [ ] Verify modal swipe-down closes
- [ ] Verify touch-friendly buttons

### Phase 5: Performance
- [ ] Add database indexes
- [ ] Implement pagination for large goal lists
- [ ] Add caching for parent dashboard
- [ ] Monitor OpenAI API usage

---

## Testing Scenarios

### Full Adoption Flow (curl)

```bash
# 1. Teen requests advice
curl -X POST http://localhost:5000/api/ai/tiny/advice \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"interests":["sports","coding"],"archetype":"athlete","existingGoals":[]}'

# 2. Teen adopts suggestion
curl -X POST http://localhost:5000/api/goals/goal-123/mark-ai-adopted \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"suggestionId":"sugg-999","suggestionTitle":"Complete a fitness challenge","archetypeAligned":true}'

# 3. Teen completes milestone
curl -X POST http://localhost:5000/api/goals/goal-123/milestones/0/complete \
  -H "Authorization: Bearer TOKEN"

# 4. Parent reviews goals
curl -X GET http://localhost:5000/api/parent/ai-suggested-goals \
  -H "Authorization: Bearer TOKEN"

# 5. Parent provides feedback
curl -X POST http://localhost:5000/api/parent/children/teen-456/goals/goal-123/feedback \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"feedback":"Great job!","encouragement":"Keep it up!"}'

# 6. Check analytics
curl -X GET http://localhost:5000/api/user/goal-analytics \
  -H "Authorization: Bearer TOKEN"
```

### Postman Collection

```json
{
  "info": { "name": "TINY Feedback Loop API" },
  "variable": [
    { "key": "base_url", "value": "http://localhost:5000" },
    { "key": "token", "value": "" },
    { "key": "teenId", "value": "" },
    { "key": "goalId", "value": "" }
  ],
  "item": [
    { "name": "Get AI Suggested Goals", "request": { "method": "GET", "url": "{{base_url}}/api/parent/ai-suggested-goals" } },
    { "name": "Parent Feedback", "request": { "method": "POST", "url": "{{base_url}}/api/parent/children/{{teenId}}/goals/{{goalId}}/feedback" } },
    { "name": "Complete Milestone", "request": { "method": "POST", "url": "{{base_url}}/api/goals/{{goalId}}/milestones/0/complete" } },
    { "name": "Parent Dashboard", "request": { "method": "GET", "url": "{{base_url}}/api/parent/dashboard" } }
  ]
}
```

---

## Success Metrics

### Engagement
- % of teens using TINY feature
- Average suggestions per teen per week
- % of suggestions adopted
- Time from suggestion to adoption
- % of parents reviewing AI suggestions

### Goal Completion
- Completion rate for AI-suggested vs. manual goals
- Average time to goal completion
- Milestone completion rate
- Completion rate by category/archetype

### Parent Engagement
- % of parents viewing dashboard
- % providing feedback
- Feedback sentiment (positive/constructive)
- Impact of feedback on next suggestions

### AI Learning
- Suggestion quality improvement over time
- Category-specific success rates
- Archetype alignment accuracy
- Deduplication effectiveness

---

## Future Enhancements

### Immediate (Next Sprint)
- Real-time notifications for parent feedback
- Mobile push notifications
- Goal sharing between teens
- Advanced filtering in parent dashboard

### Short-term (1-2 Months)
- Smart reminder system (see REMINDER_INTEGRATION_GUIDE.md)
- Predictive analytics
- Peer insights and comparisons
- Goal collaboration features

### Long-term (3+ Months)
- Machine learning for suggestion improvement
- Behavioral analytics
- Calendar/notifications integration
- Parent mobile app (iOS/Android)
- Social goal sharing

---

*Consolidated from: FEEDBACK_LOOP.md, GOAL_SOURCE_TRACKING.md, MILESTONE_WEBHOOK.md, API_TESTING_GUIDE.md, INTEGRATION_CHECKLIST.md, AI_DEVELOPMENT_FALLBACK.md*
