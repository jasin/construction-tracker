# Supabase Real-time Configuration

## Overview

The application uses **Supabase WebSocket subscriptions** for real-time updates. This provides instant UI updates when data changes in the database.

## Architecture

```
Database Change → PostgreSQL Trigger → Supabase Real-time → WebSocket → Frontend Store Update
```

## Enabled Tables

The following tables have real-time enabled:

- ✅ `projects` - Project updates
- ✅ `users` - User changes
- ⚠️ `tasks` - Needs to be enabled (see below)
- ⚠️ `rfis` - Needs to be enabled
- ⚠️ `submittals` - Needs to be enabled  
- ⚠️ `change_orders` - Needs to be enabled
- ⚠️ `documents` - Needs to be enabled
- ✅ `activity_logs` - Activity feed

## Enabling Real-time for Remaining Tables

Run this SQL in your **Supabase SQL Editor**:

```sql
-- Enable real-time for all construction management tables
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE rfis;
ALTER PUBLICATION supabase_realtime ADD TABLE submittals;
ALTER PUBLICATION supabase_realtime ADD TABLE change_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE documents;
```

## How It Works in the Frontend

### Store Pattern

Each store follows this pattern:

```javascript
// 1. Load initial data from API
const initialData = await getEntityByProject(projectId)
entities.value = initialData

// 2. Subscribe to real-time updates
const channel = supabase
  .channel(`project-${projectId}-entities`)
  .on(
    'postgres_changes',
    {
      event: '*',  // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'entities',
      filter: `project_id=eq.${projectId}`
    },
    (payload) => {
      handleRealtimeUpdate(payload)
    }
  )
  .subscribe()

// 3. Handle real-time events
function handleRealtimeUpdate(payload) {
  if (payload.eventType === 'INSERT') {
    entities.value.push(payload.new)
  } else if (payload.eventType === 'UPDATE') {
    const index = entities.value.findIndex(e => e.id === payload.new.id)
    if (index !== -1) entities.value[index] = payload.new
  } else if (payload.eventType === 'DELETE') {
    entities.value = entities.value.filter(e => e.id !== payload.old.id)
  }
}
```

### Current Implementation

**Stores using Supabase real-time:**
- ✅ `src/stores/project.js` - Projects
- ✅ `src/stores/task.js` - Tasks (user & project subscriptions)
- ✅ `src/stores/construction.js` - RFIs, Submittals, Change Orders, Documents

## Testing Real-time Updates

1. Open the app in **two browser tabs**
2. Log in to both tabs
3. Navigate to the same project in both tabs
4. In Tab 1: Create/update/delete an entity
5. In Tab 2: Watch it update automatically (no refresh needed)

### Expected Console Output

When real-time is working, you'll see:

```
✅ Subscribed to projects real-time updates
📦 Initial user tasks loaded: 5 tasks
✅ User tasks subscription started
✅ Subscribed to project construction data
```

When an update occurs:
```
🔄 Real-time: Task created - {id: 123, title: "New Task"}
🔄 Real-time: RFI updated - {id: 45, status: "responded"}
```

## Troubleshooting

### Real-time Updates Not Working

**Check 1: Is the table enabled?**
```sql
-- In Supabase SQL Editor
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

**Check 2: Is the channel subscribed?**
Look for `SUBSCRIBED` status in console logs.

**Check 3: Are filters correct?**
Filters must match your Row Level Security (RLS) policies:
```javascript
filter: `project_id=eq.${projectId}`  // Correct
filter: `projectId=eq.${projectId}`   // Wrong (snake_case in DB)
```

### Subscription Leaks

Always clean up subscriptions when components unmount:

```javascript
onUnmounted(() => {
  supabase.removeChannel(channel)
})
```

Or in stores:
```javascript
function cleanupSubscriptions() {
  subscriptions.value.forEach(channel => {
    supabase.removeChannel(channel)
  })
  subscriptions.value = []
}
```

## Performance Considerations

### Channel Limits
- Supabase free tier: **200 concurrent connections**
- Each subscription = 1 connection
- Best practice: Unsubscribe when not needed

### Filtering
Always filter subscriptions to minimize data transfer:

```javascript
// Good ✅ - Only project 123's tasks
filter: `project_id=eq.123`

// Bad ❌ - All tasks for all projects
// (no filter)
```

### Batching
For bulk operations, consider disabling real-time temporarily:

```javascript
// Disable subscription
cleanupSubscriptions()

// Perform bulk update
await Promise.all(bulkUpdates)

// Re-enable subscription
await setupSubscription()
```

## Environment Variables

Make sure these are set in `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Database Schema Notes

### Column Naming
- Database uses `snake_case` (e.g., `project_id`)
- JavaScript uses `camelCase` (e.g., `projectId`)
- Backend API handles conversion automatically

### Timestamps
- `created_at` - Set on INSERT
- `updated_at` - Auto-updated on UPDATE via trigger

## Next Steps

1. **Enable real-time** for remaining tables (run SQL above)
2. **Test real-time** with two browser tabs
3. **Monitor subscriptions** in browser dev tools (Network → WS)
4. **Add error handling** for subscription failures

## Resources

- [Supabase Real-time Docs](https://supabase.com/docs/guides/realtime)
- [Postgres Changes Documentation](https://supabase.com/docs/guides/realtime/postgres-changes)
- Backend API: `construction-tracker-backend/app/models/`

---

**Last Updated**: 2025-12-19
