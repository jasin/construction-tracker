# Firebase to Python Backend Migration Notes

## Cleanup Summary (Completed)

### ✅ Removed Files and Directories
- `src/configs/firebase.js` - Firebase configuration
- `src/configs/firebase.d.ts` - TypeScript definitions
- `src/services/firebase/` - All Firebase repositories and core files
  - `core/BaseRepository.ts`
  - `core/FirebaseCore.ts`
  - `mixins/CrudMixin.ts`
  - `mixins/RealtimeMixin.ts`
  - `Repositories/*.ts` (All repository files)
  - `schemas/index.ts`
  - `types/repository.d.ts`
- `src/services/logging/ActivityService.ts` - Firebase-based activity logging
- `src/services/logging/Logger.ts` - TypeScript logger
- `src/types/` - TypeScript type definitions directory
- `firebase.json` - Firebase project config
- `database.rules.json` - Firebase database rules
- `.firebaserc` - Firebase project reference
- `CLAUDE.md` - Old development documentation
- `project_info.txt` - Old project info

### ✅ Created New Documentation
- `DEVELOPMENT.md` - Comprehensive development guide for Vue 3 + Python backend
- Updated `README.md` - Simple project overview

## Files Requiring Updates (In Progress)

The following 22 files still contain Firebase Repository imports that need to be replaced with API service calls:

### Stores (Priority 1)
1. `src/stores/rfi.js` - Replace RFIRepository with rfisApi
2. `src/stores/submittal.js` - Replace SubmittalRepository with submittalsApi
3. `src/stores/changeOrder.js` - Replace ChangeOrderRepository with changeOrdersApi
4. `src/stores/document.js` - Replace DocumentRepository with documentsApi
5. `src/stores/activity.js` - Replace ActivityService with activityLogsApi
6. `src/stores/userSettings.js` - Remove firebase config import
7. `src/stores/project.js` - Remove ActivityService import

### Components - Forms (Priority 2)
8. `src/components/forms/RFIDialog.vue`
9. `src/components/forms/SubmittalDialog.vue`
10. `src/components/forms/ChangeOrderDialog.vue`
11. `src/components/forms/TaskDialog.vue`
12. `src/components/forms/ProjectDialog.vue`
13. `src/components/forms/ClientDialog.vue`
14. `src/components/forms/DocumentDialog.vue`

### Components - Features & Widgets (Priority 3)
15. `src/components/features/documents/DocumentUploader.vue`
16. `src/components/features/documents/DocumentViewer.vue`
17. `src/components/features/projects/ProjectTree.vue`
18. `src/components/widgets/EntityAttachments.vue`
19. `src/components/widgets/ProjectMenu.vue`
20. `src/components/modals/AttachExistingModal.vue`

### Components - Sections (Priority 3)
21. `src/components/sections/ConstructionManagementSection.vue`

### Views (Priority 2)
22. `src/views/tasks/TaskListView.vue`
23. `src/views/clients/ClientListView.vue`
24. `src/views/admin/UserManagementView.vue`
25. `src/views/dashboard/DashboardView.vue` - Remove ActivityService import

### Composables (Priority 3)
26. `src/composables/useUserActivity.js` - Replace ActivityService
27. `src/composables/useProjectSearch.js` - Remove firebase config import
28. `src/composables/useDocuments.js` - Already using DocumentRepository (needs update)

## Migration Pattern

### Before (Firebase Repository):
```javascript
import TaskRepository from '@/services/firebase/Repositories/TaskRepository'

// In component/store
const tasks = await TaskRepository.getAll()
const task = await TaskRepository.getById(taskId)
await TaskRepository.create(taskData)
await TaskRepository.update(taskId, updates)
await TaskRepository.delete(taskId)
```

### After (Python API Service):
```javascript
import { getAllTasks, getTaskById, createTask, updateTask, deleteTask } from '@/services/api/tasksApi'

// In component/store
const tasks = await getAllTasks()
const task = await getTaskById(taskId)
await createTask(taskData)
await updateTask(taskId, updates)
await deleteTask(taskId)
```

## Real-time Subscriptions

Firebase real-time subscriptions have been replaced with:
1. **Supabase Realtime** - For critical real-time data (configured in backend)
2. **Polling** - For non-critical updates (using setInterval in components)
3. **Event-driven updates** - Manual refresh after mutations

Example:
```javascript
// Before (Firebase)
const unsubscribe = TaskRepository.subscribeToQuery(
  query => query.orderByChild('projectId').equalTo(projectId),
  (data) => { tasks.value = data }
)
onUnmounted(unsubscribe)

// After (Polling or Supabase)
const refreshInterval = setInterval(() => {
  loadTasks()
}, 30000) // Refresh every 30 seconds

onUnmounted(() => {
  clearInterval(refreshInterval)
})
```

## Activity Logging

Activity logging has moved to the backend:

### Before (Frontend ActivityService):
```javascript
import ActivityService from '@/services/logging/ActivityService'

await ActivityService.logActivity(
  projectId,
  'task_created',
  'task',
  task.id,
  `Created task: ${task.title}`,
  { priority: task.priority }
)
```

### After (Backend handles activity logging):
```javascript
// Activity logging is now automatic in the backend
// Each API endpoint logs activities when entities are created/updated/deleted
// No frontend code needed!

// If explicit logging is needed:
import { createActivityLog } from '@/services/api/activityLogsApi'

await createActivityLog({
  projectId,
  action: 'task_created',
  entityType: 'task',
  entityId: task.id,
  description: `Created task: ${task.title}`,
  additionalData: { priority: task.priority }
})
```

## Next Steps

1. ✅ Remove all TypeScript files
2. ✅ Remove Firebase config files
3. ✅ Update documentation
4. 🔄 Update stores to use API services (Priority 1)
5. 🔄 Update form components (Priority 2)
6. 🔄 Update views (Priority 2)
7. 🔄 Update other components (Priority 3)
8. 🔄 Update composables (Priority 3)
9. ⏳ Remove Firebase dependencies from package.json
10. ⏳ Test all functionality
11. ⏳ Update environment variables documentation

## Package.json Changes Needed

Remove these dependencies:
```json
{
  "firebase": "^11.8.1",
  "firebase-admin": "^13.4.0"
}
```

Remove these devDependencies (TypeScript-related):
```json
{
  "@types/node": "^24.10.1",
  "@typescript-eslint/eslint-plugin": "^8.48.1",
  "@typescript-eslint/parser": "^8.48.1",
  "@vue/tsconfig": "^0.8.1",
  "typescript": "^5.9.3",
  "typescript-eslint": "^8.48.1",
  "vue-tsc": "^3.1.5"
}
```

Remove these scripts:
```json
{
  "emulators": "firebase emulators:start --import=./emulator-data",
  "emulators:save": "node scripts/backup-emulator-data.js",
  "emulators:clear": "if exist emulator-data rmdir /s /q emulator-data"
}
```

---

**Migration Status**: In Progress
**Last Updated**: 2025-12-19
