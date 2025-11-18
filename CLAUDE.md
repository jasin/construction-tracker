# Construction Tracker - Development Guidelines

## Project Overview
A construction project tracking application built with Vue 3, PrimeVue, Firebase Realtime Database, and Pinia state management. The app supports project management, task tracking, RFIs, submittals, change orders, document management, and activity logging.

## Tech Stack
- **Frontend**: Vue 3 (Composition API with `<script setup>`)
- **UI Framework**: PrimeVue v4.3.6 (with Aura theme + Tailwind CSS v4.1.11)
- **State Management**: Pinia v3.0.3
- **Backend**: Firebase v11.8.1 (Realtime Database + Authentication)
- **Build Tool**: Vite v6.2.4
- **Styling**: Tailwind CSS with `tailwindcss-primeui` preset
- **Routing**: Vue Router v4.5.1

---

## Architecture Principles

### 1. Repository Pattern for Data Access
**ALL database operations MUST go through Repository classes.**

- **Location**: `src/services/firebase/Repositories/`
- **Base Class**: `BaseRepository` (extends `CrudMixin` + `RealtimeMixin`)
- **Example Repositories**: `ProjectRepository`, `TaskRepository`, `ClientRepository`, `RFIRepository`, `SubmittalRepository`, `DocumentRepository`

**Key Rules**:
- Never import Firebase directly in components or stores
- Always use repositories for CRUD operations
- Repositories handle metadata (createdAt, updatedAt, createdBy, updatedBy)
- Repositories provide real-time subscriptions via `subscribeToAll()`, `subscribeToOne()`, `subscribeToQuery()`

**Example Usage**:
```javascript
// Good ✅
import TaskRepository from '@/services/firebase/Repositories/TaskRepository'
const task = await TaskRepository.getById(taskId)

// Bad ❌
import { ref, get } from 'firebase/database'
const task = await get(ref(db, `tasks/${taskId}`))
```

### 2. State Management Pattern
**Use Pinia stores as the single source of truth for application state.**

- **Location**: `src/stores/`
- **Store Types**: auth, project, task, construction, activity, ui
- **Preferred Pattern**: Composition API (`defineStore('name', () => { ... })`)

**Key Rules**:
- Stores manage subscriptions and cleanup
- Stores call repositories for data operations
- Use `storeToRefs()` to destructure reactive state in components
- Avoid Options API pattern for new stores (see auth.js:186 - needs migration)

**Store Consistency Issue** (IMPORTANT):
- `auth.js` uses Options API (state/getters/actions) - **inconsistent with other stores**
- All other stores use Composition API - **this is the preferred pattern**
- **Action Required**: When modifying auth.js, consider migrating to Composition API

**Example Usage**:
```javascript
// Good ✅ - Composition API (preferred)
export const useTaskStore = defineStore('task', () => {
  const tasks = ref([])
  const loading = ref(false)
  
  async function loadTasks() {
    tasks.value = await TaskRepository.getAll()
  }
  
  return { tasks, loading, loadTasks }
})

// Inconsistent ⚠️ - Options API (legacy, only in auth.js)
export const useAuthStore = defineStore('auth', {
  state: () => ({ user: null }),
  getters: { isAuthenticated: (state) => !!state.user },
  actions: { async signIn() { ... } }
})
```

### 3. Component Organization
**Follow a strict component hierarchy and naming convention.**

#### Component Types:
1. **Views** (`src/views/`) - Full page components
   - Examples: `DashboardView.vue`, `ProjectDetailView.vue`, `TaskListView.vue`
   - Naming: `{Name}View.vue`

2. **Forms** (`src/components/forms/`) - Dialog/modal forms for CRUD operations
   - Examples: `TaskDialog.vue`, `ProjectDialog.vue`, `RFIDialog.vue`
   - Naming: `{Entity}Dialog.vue`
   - Pattern: PrimeVue `Dialog` component with `v-model:visible`, `@hide` event

3. **Lists** (`src/components/lists/`) - Reusable list components
   - Examples: `TaskList.vue`, `RFIList.vue`, `SubmittalList.vue`
   - Naming: `{Entity}List.vue`
   - Pattern: Props for data, emits for events (`@item-click`, `@create-item`)

4. **Widgets** (`src/components/widgets/`) - Feature-specific components
   - Examples: `ActivityLog.vue`, `DocumentGrid.vue`, `EntityAttachments.vue`

5. **Features** (`src/components/features/{domain}/`) - Domain-organized components
   - Examples: `features/projects/ProjectSelect.vue`, `features/documents/DocumentUploader.vue`

6. **Layout** (`src/components/layout/`) - Global layout components
   - Examples: `AppSidebar.vue`

7. **UI** (`src/components/ui/`) - Primitive reusable components
   - Examples: `BaseButton.vue`, `AlertMessage.vue`

**Composition Pattern Consistency Issue**:
- `TaskDialog.vue` (src/components/forms/TaskDialog.vue:1) uses `<script setup>` - **Good ✅**
- `RFIList.vue` (src/components/lists/RFIList.vue:1) uses Options API - **Inconsistent ⚠️**
- **Action Required**: When creating/modifying components, always use `<script setup>` Composition API

### 4. Routing & Navigation
**Centralize route management and enforce authentication guards.**

- **Router**: `src/router/index.js`
- **Guards**: `src/router/guards.js` (requireAuth, requireRole, redirectIfAuthenticated)

**Key Rules**:
- All protected routes use `requireAuth` guard
- Admin routes use `requireRole(['admin'])` guard
- Router `afterEach` hook syncs URL project ID with store state
- Avoid route manipulation outside of stores (selectProject, resetActiveProject are centralized)

**Store-Router Synchronization**:
- `projectStore.selectProject()` updates URL (src/stores/project.js:206)
- `router.afterEach()` syncs URL changes to store (src/router/index.js)
- Flags (`isSetting`, `isResetting`, `justReset`) prevent infinite loops

### 5. Error Handling Strategy
**Use centralized error handling utilities.**

- **Location**: `src/utils/errorHandler.js`
- **Custom Error**: `AppError` class (src/utils/AppError.js)
- **Logger**: `src/services/logging/Logger.js`

**Three Error Handling Patterns** (IMPORTANT):
1. **Legacy** - `handleAsync(asyncFn, options)` - Returns `{ success, data, error }`
2. **Legacy** - `extractData(result, defaultValue)` - Extracts data from handleAsync result
3. **New** - `createSafeFetcher(asyncFn, options)` - Returns wrapper with retries, returns data directly or throws AppError

**Inconsistency**: Multiple error handling patterns exist - **migration in progress**
- Some repositories use `handleAsync` + `extractData`
- Some use `createSafeFetcher`
- Some use raw try/catch

**Action Required**: When writing new code, prefer `createSafeFetcher` for consistency

**Example**:
```javascript
// Preferred ✅
const fetcher = createSafeFetcher(
  () => TaskRepository.getById(id),
  { retries: 2, context: 'Get task' }
)
const task = await fetcher() // Returns data or throws AppError

// Legacy (still supported)
const result = await handleAsync(
  () => TaskRepository.getById(id),
  { context: 'Get task' }
)
const task = extractData(result, null)
```

### 6. Subscription Management
**Always clean up Firebase subscriptions to prevent memory leaks.**

**Patterns**:
- Repositories return unsubscribe functions from `subscribeToAll()`, `subscribeToOne()`
- Stores track subscriptions and clean up on reset/destroy

**Inconsistency** (IMPORTANT):
- `taskStore` uses `let unsubscribe = null` (single subscription)
- `projectStore` uses `subscriptions.value = []` (array of subscriptions)

**Recommended Pattern**:
```javascript
// Store level
const subscriptions = ref([])

function subscribe(callback) {
  const unsub = Repository.subscribeToAll(callback)
  subscriptions.value.push(unsub)
}

function cleanup() {
  subscriptions.value.forEach(unsub => unsub())
  subscriptions.value = []
}
```

---

## Database Design & Rules

### Current Database Structure
**Firebase Realtime Database with the following collections:**

```
/projects
  /{projectId}
    name, jobNumber, clientId, phase, status, cost, startDate, endDate
    projectManager, superintendent, architect
    createdAt, updatedAt, createdBy, updatedBy

/tasks
  /{taskId}
    title, description, priority, status, dueDate
    projectId, assignedTo, assignedToName, category
    estimatedHours, dependencies[]
    createdAt, updatedAt, createdBy, updatedBy

/rfis (Request for Information)
  /{rfiId}
    title, description, priority, status, projectId
    submittedBy, submittedDate, assignedTo, dueDate, response
    createdAt, updatedAt

/submittals
  /{submittalId}
    title, description, status, projectId
    submittedBy, submittedDate, reviewedBy, reviewedDate
    createdAt, updatedAt

/changeOrders
  /{changeOrderId}
    title, description, status, projectId, cost
    requestedBy, requestedDate, approvedBy, approvedDate
    createdAt, updatedAt

/documents
  /{documentId}
    name, type, category, url, projectId, linkedEntityId
    uploadedBy, uploadedDate, size
    createdAt, updatedAt

/activityLog
  /{activityId}
    projectId, userId, userName, action, entityType, entityId
    description, timestamp, additionalData

/users
  /{userId}
    email, name, photo, role, active
    createdAt, updatedAt
```

### Database Rules
**Location**: `database.rules.json`

**Current Rules** (⚠️ SECURITY ISSUE):
```json
{
  ".read": true,
  ".write": true
}
```

**CRITICAL**: Database is completely open for development
- **Action Required**: Implement proper security rules before production
- Rules should enforce authentication and role-based access
- Use `.indexOn` for query optimization (already configured for projectId, assignedTo, timestamp)

### Database Improvements

#### 1. Add Security Rules (CRITICAL)
```json
{
  "rules": {
    "projects": {
      ".read": "auth != null",
      ".write": "auth != null && (
        root.child('users/' + auth.uid + '/role').val() == 'admin' ||
        root.child('users/' + auth.uid + '/role').val() == 'project-manager'
      )",
      "$projectId": {
        ".indexOn": ["clientId", "phase", "status"]
      }
    },
    "tasks": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$taskId": {
        ".indexOn": ["projectId", "assignedTo", "status", "priority"]
      }
    },
    "users": {
      ".read": "auth != null",
      ".write": "auth != null && (
        auth.uid == $userId || 
        root.child('users/' + auth.uid + '/role').val() == 'admin'
      )",
      "$userId": {
        ".indexOn": ["email", "role"]
      }
    }
  }
}
```

#### 2. Add Missing Indexes
Currently indexed: `projectId`, `assignedTo`, `timestamp`

**Recommended Additional Indexes**:
- `/tasks` - Add indexes for `status`, `priority`, `dueDate`
- `/projects` - Add index for `status`
- `/activityLog` - Add indexes for `userId`, `action`, `entityType`
- `/documents` - Add indexes for `category`, `type`, `uploadedBy`

#### 3. Data Validation in Rules
Add validation rules for required fields and data types:
```json
"tasks": {
  "$taskId": {
    ".validate": "
      newData.hasChildren(['title', 'status', 'priority']) &&
      newData.child('title').isString() &&
      newData.child('status').isString() &&
      newData.child('priority').isString()
    "
  }
}
```

#### 4. Consider Compound Indexes
For complex queries, create compound indexes:
```json
".indexOn": [["projectId", "status"], ["projectId", "priority"]]
```

#### 5. Implement Soft Deletes
Instead of deleting entities, add a `deleted` flag:
```javascript
// In repositories
async softDelete(id) {
  return this.update(id, { 
    deleted: true, 
    deletedAt: new Date().toISOString() 
  })
}
```

#### 6. Add Timestamp Triggers
Use Firebase Cloud Functions to automatically update timestamps:
```javascript
// Example Cloud Function
exports.updateTimestamp = functions.database
  .ref('/{collection}/{id}')
  .onUpdate((change, context) => {
    return change.after.ref.update({ 
      updatedAt: admin.database.ServerValue.TIMESTAMP 
    })
  })
```

---

## Coding Standards

### Vue 3 Best Practices
1. **Always use Composition API** with `<script setup>` syntax
2. **Use reactive primitives correctly**:
   - `ref()` for primitives and objects
   - `computed()` for derived state
   - `reactive()` for deeply nested objects (use sparingly)
3. **Destructure stores reactively**: Use `storeToRefs()` to preserve reactivity
4. **Lifecycle hooks**: Use `onMounted`, `onUnmounted`, `watch`, `watchEffect`
5. **Props and emits**: Always define with `defineProps()` and `defineEmits()`

### Component Patterns
1. **Dialog Components**:
   ```vue
   <Dialog 
     v-model:visible="isOpen" 
     modal 
     :header="title"
     :style="dialogStyle"
     :position="dialogPosition"
     :draggable="false"
     @hide="closeModal"
   >
     <form @submit.prevent="handleSubmit" class="space-y-3">
       <!-- Form fields with space-y-2 for internal spacing -->
       <div class="space-y-2">
         <label for="field-id" class="block text-sm font-semibold text-surface-900">
           Field Label <span class="text-red-500">*</span>
         </label>
         <InputText
           id="field-id"
           v-model="form.field"
           placeholder="Enter value"
           :class="{ 'border-red-500': errors.field }"
           class="w-full"
         />
         <small v-if="errors.field" class="text-red-500">{{ errors.field }}</small>
       </div>
     </form>
     <template #footer>
       <div class="flex justify-end gap-2">
         <Button label="Cancel" severity="secondary" @click="closeModal" :disabled="loading" />
         <Button label="Save" @click="handleSubmit" :loading="loading" :disabled="loading" />
       </div>
     </template>
   </Dialog>
   ```

   **Dialog Responsive Pattern**:
   ```javascript
   const windowWidth = ref(window.innerWidth)
   
   const dialogStyle = computed(() => {
     if (windowWidth.value < 768) {
       return {
         width: '95vw',
         height: 'auto',
         margin: '1rem',
         maxHeight: '90vh',
       }
     } else {
       return {
         width: '600px',
         maxWidth: '90vw',
       }
     }
   })
   
   const dialogPosition = computed(() => windowWidth.value < 768 ? 'bottom' : 'center')
   
   function handleResize() {
     windowWidth.value = window.innerWidth
   }
   
   onMounted(() => {
     window.addEventListener('resize', handleResize)
   })
   
   onUnmounted(() => {
     window.removeEventListener('resize', handleResize)
   })
   ```

   **Dialog Styling (Scoped CSS)**:
   ```css
   :deep(.p-dialog) {
     border-radius: 8px;
   }
   
   :deep(.p-dialog-header) {
     padding: 1.25rem;
     border-bottom: 1px solid var(--surface-border);
   }
   
   /* IMPORTANT: Only set font-size and padding - let PrimeVue theme handle borders/backgrounds */
   :deep(.p-inputtext),
   :deep(.p-select),
   :deep(.p-select-label),
   :deep(.p-inputnumber-input),
   :deep(.p-textarea),
   :deep(.p-datepicker-input) {
     font-size: 0.813rem;
     padding: 0.5rem;
   }
   
   /* Dropdown options font size */
   :deep(.p-select-overlay),
   :deep(.p-select-option),
   :deep(.p-select-option-label) {
     font-size: 0.813rem;
   }
   
   /* Label spacing */
   label {
     margin-bottom: 0.25rem;
   }
   
   /* Form spacing utilities */
   .space-y-3 > * + * {
     margin-top: 0.75rem;
   }
   
   .space-y-2 > * + * {
     margin-top: 0.5rem;
   }
   ```

   **Key Dialog Principles**:
   - Use `space-y-3` on the form element for spacing between form fields
   - Use `space-y-2` on individual field containers for label-to-input spacing
   - Labels must use `class="block text-sm font-semibold text-surface-900"`
   - **DO NOT** add `width`, `background`, or `border` styles to inputs - let PrimeVue theme handle these
   - **ONLY** set `font-size: 0.813rem` and `padding: 0.5rem` on inputs
   - Use responsive pattern (bottom position on mobile, center on desktop)
   - Always include loading states and disable buttons during submission

2. **List Components**:
   ```vue
   <template>
     <ul class="items">
       <li v-for="item in items" :key="item.id" @click="$emit('item-click', item)">
         {{ item.title }}
       </li>
     </ul>
   </template>
   
   <script setup>
   defineProps({ items: Array })
   defineEmits(['item-click', 'create-item'])
   </script>
   ```

3. **Loading States**: Always show loading indicators for async operations
4. **Error Handling**: Display user-friendly error messages using PrimeVue Toast

### Styling Guidelines
1. **Use Tailwind CSS utility classes** for layout and spacing
2. **Use PrimeVue theme tokens** for colors:
   - Surface colors: `surface-0`, `surface-50`, `surface-100`, `surface-900`
   - Primary: `primary-color`, `primary-50`, `primary-500`
   - Semantic: `text-red-500`, `text-green-500`
3. **Scoped styles**: Use `<style scoped>` for component-specific styles
4. **Avoid inline styles**: Use classes instead of `style` attribute
5. **Consistent spacing**: Use Tailwind spacing scale (`gap-2`, `p-4`, `mb-3`)

### JavaScript/TypeScript Standards
1. **Use const/let**, never `var`
2. **Prefer arrow functions** for callbacks and inline functions
3. **Use async/await** over Promise chains
4. **Add JSDoc comments** for complex functions
5. **Use optional chaining** (`?.`) and nullish coalescing (`??`)
6. **Avoid mutation**: Use spread operators for objects/arrays

---

## Common Patterns & Anti-Patterns

### ✅ Do This (Good Patterns)

#### 1. Store + Composable Pattern
```javascript
// Store
export const useTaskStore = defineStore('task', () => {
  const tasks = ref([])
  
  async function loadTasks(projectId) {
    const unsub = TaskRepository.subscribeToQuery(
      query => query.orderByChild('projectId').equalTo(projectId),
      (data) => { tasks.value = data }
    )
    return unsub
  }
  
  return { tasks, loadTasks }
})

// Component
import { useTaskStore } from '@/stores'
import { storeToRefs } from 'pinia'

const taskStore = useTaskStore()
const { tasks } = storeToRefs(taskStore) // Reactive

onMounted(async () => {
  const unsub = await taskStore.loadTasks(projectId)
  onUnmounted(unsub)
})
```

#### 2. Activity Logging Pattern
```javascript
// In store after successful operation
await ActivityService.logActivity(
  projectId,           // projectId
  'task_created',      // action
  'task',              // entityType
  task.id,             // entityId
  `Created task: ${task.title}`, // description
  { priority: task.priority }     // additionalData
)
```

#### 3. Form Validation Pattern
```javascript
const errors = ref({})

function validateForm() {
  errors.value = {}
  
  if (!form.value.title?.trim()) {
    errors.value.title = 'Title is required'
  }
  
  if (!form.value.projectId) {
    errors.value.projectId = 'Project is required'
  }
  
  return Object.keys(errors.value).length === 0
}
```

### ❌ Don't Do This (Anti-Patterns)

#### 1. Direct Firebase Access
```javascript
// Bad ❌
import { ref, get } from 'firebase/database'
const snapshot = await get(ref(db, 'tasks'))

// Good ✅
import TaskRepository from '@/services/firebase/Repositories/TaskRepository'
const tasks = await TaskRepository.getAll()
```

#### 2. Mutating Props
```javascript
// Bad ❌
defineProps({ task: Object })
task.title = 'New title' // Never mutate props

// Good ✅
const emit = defineEmits(['update:task'])
emit('update:task', { ...task, title: 'New title' })
```

#### 3. Inconsistent Component Syntax
```javascript
// Bad ❌ - Options API in new components
export default {
  data() { return { count: 0 } },
  methods: { increment() { this.count++ } }
}

// Good ✅ - Composition API
<script setup>
import { ref } from 'vue'
const count = ref(0)
function increment() { count.value++ }
</script>
```

#### 4. Forgetting Subscription Cleanup
```javascript
// Bad ❌
onMounted(async () => {
  TaskRepository.subscribeToAll((data) => { tasks.value = data })
  // Memory leak - no cleanup
})

// Good ✅
onMounted(async () => {
  const unsub = TaskRepository.subscribeToAll((data) => { tasks.value = data })
  onUnmounted(unsub)
})
```

#### 5. Inline Constants
```javascript
// Bad ❌
if (priority === 'critical') { ... }
const statuses = ['todo', 'in-progress', 'complete']

// Good ✅
import { TASK_PRIORITIES, TASK_STATUSES } from '@/constants'
if (priority === TASK_PRIORITIES.CRITICAL) { ... }
```

---

## Constants & Enums

### Current Constants
**Location**: `src/constants/index.js`

```javascript
export const USER_ROLES = {
  ADMIN: 'admin',
  PROJECT_MANAGER: 'project-manager',
  SUPERINTENDENT: 'superintendent',
  FOREMAN: 'foreman',
  USER: 'user'
}

export const PROJECT_PHASES = {
  PRE_CONSTRUCTION: 'pre-construction',
  CONSTRUCTION: 'construction',
  CLOSE_OUT: 'close-out',
  COMPLETE: 'complete'
}

export const TASK_STATUSES = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  REVIEW: 'review',
  COMPLETE: 'complete',
  ON_HOLD: 'on-hold'
}

export const TASK_PRIORITIES = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
}
```

### Missing Constants (Action Required)
Create additional constant files for:
- RFI statuses and priorities
- Submittal statuses
- Change order statuses
- Document categories (already exists in `src/constants/documentCategories.js`)
- Activity action types
- Project statuses

---

## Testing & Validation

### Before Committing Code
1. ✅ All Firebase operations go through repositories
2. ✅ All new components use `<script setup>` Composition API
3. ✅ All stores use Composition API pattern (not Options API)
4. ✅ All subscriptions have cleanup handlers
5. ✅ Error handling uses `createSafeFetcher` or proper try/catch
6. ✅ Constants are imported from `@/constants`, not inline strings
7. ✅ Activity logging is added for important operations
8. ✅ Tailwind classes are used for styling
9. ✅ PrimeVue components are used for UI elements
10. ✅ Loading and error states are handled in UI

### Manual Testing Checklist
1. Test in both authenticated and unauthenticated states
2. Test with different user roles (admin, project-manager, user)
3. Test real-time updates (open in multiple browser tabs)
4. Test error scenarios (network errors, invalid data)
5. Check browser console for errors or warnings
6. Verify activity logging appears in activity feed

---

## Migration Tasks (Technical Debt)

### High Priority
1. **Migrate auth.js store from Options API to Composition API** (src/stores/auth.js:186)
2. **Migrate RFIList.vue from Options API to Composition API** (src/components/lists/RFIList.vue:1)
3. **Standardize subscription cleanup pattern** across all stores
4. **Implement database security rules** (database.rules.json:2-3)
5. **Consolidate error handling** to use `createSafeFetcher` exclusively

### Medium Priority
6. **Create missing constant files** (RFI statuses, submittal statuses, project statuses)
7. **Add database indexes** for status, priority, dueDate fields
8. **Implement soft delete** pattern for all entities
9. **Add JSDoc comments** to all repository methods
10. **Create composable for subscription management** (`useSubscriptions()`)

### Low Priority
11. **Consider TypeScript migration** (start with stores and repositories)
12. **Add unit tests** for utility functions and repositories
13. **Add component tests** for critical components (dialogs, lists)
14. **Implement data validation rules** in database.rules.json
15. **Add Cloud Functions** for timestamp triggers and data validation

---

## File References
When referencing code, use the pattern `file_path:line_number` for easy navigation.

**Examples**:
- auth.js store pattern: `src/stores/auth.js:186`
- TaskDialog component: `src/components/forms/TaskDialog.vue:1`
- Database rules: `database.rules.json:2-3`
- Project store selectProject: `src/stores/project.js:206`

---

## Custom Instructions

### For Claude (AI Assistant)
1. **Always check existing patterns** before suggesting new code
2. **Point out inconsistencies** when you see them (e.g., Options API vs Composition API)
3. **Reference specific files and line numbers** when discussing code
4. **Suggest refactoring** when you notice anti-patterns
5. **Prioritize consistency** with existing codebase over "best practices" that don't match the project
6. **Use constants** from `@/constants` instead of magic strings
7. **Always add activity logging** for create/update/delete operations
8. **Always use repositories** for database access - never direct Firebase calls
9. **Always use Composition API** with `<script setup>` for new components
10. **Always clean up subscriptions** in `onUnmounted` hooks

### Code Generation Preferences
- Use PrimeVue components (not Vuetify - despite the original project description)
- Use Tailwind CSS utility classes for styling
- Use arrow functions for methods
- Use async/await (not Promise chains)
- Use optional chaining and nullish coalescing
- Add loading and error states to all async operations
- Add form validation with user-friendly error messages
- Use Toast notifications for success/error feedback

### When Asking Questions
- If you need clarification on business logic, ask about the construction industry context
- If you see security issues (e.g., open database rules), point them out
- If you see performance issues (e.g., missing indexes), suggest improvements
- If you see inconsistencies (e.g., mixed API patterns), highlight them

---

## Resources

### Documentation Links
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Pinia Docs](https://pinia.vuejs.org/)
- [PrimeVue Docs](https://primevue.org/)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [Firebase Realtime Database Docs](https://firebase.google.com/docs/database)

### Internal Documentation
- Constants: `src/constants/index.js`
- Document Categories: `src/constants/documentCategories.js`
- Base Repository: `src/services/firebase/core/BaseRepository.js`
- Error Handler: `src/utils/errorHandler.js`
- Logger: `src/services/logging/Logger.js`

---

**Last Updated**: Generated from codebase analysis on 2025-10-29
