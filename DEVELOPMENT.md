# Construction Tracker - Development Guide

## Project Overview
A modern construction project tracking application built with Vue 3 and a Python backend (FastAPI + Supabase).

## Tech Stack

### Frontend
- **Framework**: Vue 3 with Composition API (`<script setup>`)
- **UI Library**: PrimeVue v4.3.6 with Aura theme
- **Styling**: Tailwind CSS v4.1.11 with `tailwindcss-primeui` preset
- **State Management**: Pinia v3.0.3
- **Routing**: Vue Router v4.5.1
- **Build Tool**: Vite v6.2.4

### Backend
- **API**: Python FastAPI (construction-tracker-backend)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT-based auth via Supabase

---

## Project Structure

```
src/
├── views/              # Page-level components (routable)
├── components/         # Reusable UI components
│   ├── ui/            # Primitive UI components
│   ├── layout/        # Layout components (AppSidebar, etc.)
│   ├── forms/         # Dialog/SlideOver forms
│   ├── lists/         # List components
│   ├── widgets/       # Complex widgets
│   ├── features/      # Feature-specific components
│   ├── modals/        # Modal dialogs
│   └── sections/      # Page sections
├── composables/        # Vue 3 composables (business logic)
├── stores/             # Pinia stores (global state)
├── services/           # External service integrations
│   ├── api/           # Backend API clients
│   └── auth/          # Authentication services
├── utils/              # Utility functions
├── constants/          # Application constants
├── router/             # Routing configuration
└── assets/             # Static assets (CSS, images)
```

---

## Architecture Principles

### 1. API Service Pattern
**ALL backend operations use the API service layer.**

- **Location**: `src/services/api/`
- **Base Client**: `apiClient.js` (handles JWT injection, error handling)
- **API Modules**: `projectsApi.js`, `tasksApi.js`, `rfisApi.js`, `submittalsApi.js`, `changeOrdersApi.js`, `documentsApi.js`, `usersApi.js`, `authApi.js`, `activityLogsApi.js`

**Key Rules**:
- Never make direct fetch() calls in components or stores
- All API calls go through the apiClient wrapper
- JWT tokens are automatically injected into requests
- API services handle response parsing and error throwing

**Example Usage**:
```javascript
// Good ✅
import { getAllProjects, createProject } from '@/services/api/projectsApi'
const projects = await getAllProjects()
const newProject = await createProject(projectData)

// Bad ❌
const response = await fetch('/api/projects')
const projects = await response.json()
```

### 2. State Management Pattern
**Use Pinia stores with Composition API for global state.**

- **Location**: `src/stores/`
- **Preferred Pattern**: Composition API (`defineStore('name', () => { ... })`)

**Key Rules**:
- Stores call API services for data operations
- Use `storeToRefs()` to destructure reactive state in components
- All stores use Composition API (consistent pattern)

**Example Usage**:
```javascript
// Store
export const useProjectStore = defineStore('project', () => {
  const projects = ref([])
  const loading = ref(false)
  
  async function loadProjects() {
    loading.value = true
    try {
      projects.value = await getAllProjects()
    } finally {
      loading.value = false
    }
  }
  
  return { projects, loading, loadProjects }
})

// Component
import { useProjectStore } from '@/stores'
import { storeToRefs } from 'pinia'

const projectStore = useProjectStore()
const { projects, loading } = storeToRefs(projectStore)

onMounted(() => {
  projectStore.loadProjects()
})
```

### 3. Component Organization

#### Component Types:
1. **Views** (`src/views/`) - Full page components
   - Examples: `DashboardView.vue`, `ProjectDetailView.vue`, `TaskListView.vue`
   - Naming: `{Name}View.vue`

2. **Forms** (`src/components/forms/`) - Dialog/SlideOver forms
   - Examples: `TaskSlideOver.vue`, `ProjectSlideOver.vue`, `RFIDialog.vue`
   - Pattern: PrimeVue `Dialog` or custom SlideOver with `v-model:visible`

3. **Lists** (`src/components/lists/`) - List components
   - Examples: `RFIList.vue`, `SubmittalList.vue`, `ChangeOrderList.vue`
   - Pattern: Props for data, emits for events (`@item-click`, `@create`)

4. **Widgets** (`src/components/widgets/`) - Complex reusable components
   - Examples: `ActivityLog.vue`, `DocumentGrid.vue`, `EntityAttachments.vue`

5. **Features** (`src/components/features/{domain}/`) - Feature-specific
   - Examples: `features/projects/ProjectTree.vue`, `features/documents/DocumentUploader.vue`

**Always use Composition API with `<script setup>`**

### 4. Routing & Navigation

- **Router**: `src/router/index.js`
- **Guards**: `src/router/guards.js` (requireAuth, requireRole, redirectIfAuthenticated)

**Authentication Guards**:
- All protected routes use `requireAuth` guard
- Admin routes use `requireRole(['admin'])` guard
- Login page uses `redirectIfAuthenticated` to prevent logged-in access

### 5. Error Handling

- **Location**: `src/utils/errorHandler.js`
- **Pattern**: Try/catch with user-friendly error messages
- **UI**: PrimeVue Toast for error notifications

**Example**:
```javascript
try {
  await createProject(projectData)
  toast.add({ severity: 'success', summary: 'Success', detail: 'Project created' })
} catch (error) {
  toast.add({ severity: 'error', summary: 'Error', detail: error.message })
}
```

---

## Backend API Integration

### Base URL Configuration
Set in `.env`:
```
VITE_API_BASE_URL=http://localhost:8000
```

### API Client Features
- **Automatic JWT injection** from `tokenService`
- **Token expiration handling** - redirects to login if expired
- **401 error handling** - clears auth and redirects
- **JSON content-type** - automatically set for requests

### Available API Services

#### Projects API (`projectsApi.js`)
```javascript
getAllProjects(params)
getActiveProjects()
searchProjects(query)
getProjectById(projectId)
getProjectByJobNumber(jobNumber)
createProject(projectData)
updateProject(projectId, projectData)
deleteProject(projectId)
```

#### Tasks API (`tasksApi.js`)
```javascript
getAllTasks(params)
getTaskById(taskId)
createTask(taskData)
updateTask(taskId, taskData)
deleteTask(taskId)
```

#### RFIs API (`rfisApi.js`)
```javascript
getAllRFIs(params)
getRFIById(rfiId)
createRFI(rfiData)
updateRFI(rfiId, rfiData)
deleteRFI(rfiId)
```

Similar patterns for:
- `submittalsApi.js`
- `changeOrdersApi.js`
- `documentsApi.js`
- `usersApi.js`
- `activityLogsApi.js`

---

## Coding Standards

### Vue 3 Best Practices
1. **Always use Composition API** with `<script setup>` syntax
2. **Use reactive primitives correctly**:
   - `ref()` for primitives and objects
   - `computed()` for derived state
   - `reactive()` sparingly for deeply nested objects
3. **Destructure stores reactively**: Use `storeToRefs()` to preserve reactivity
4. **Lifecycle hooks**: Use `onMounted`, `onUnmounted`, `watch`, `watchEffect`
5. **Props and emits**: Always define with `defineProps()` and `defineEmits()`

### Dialog/Form Patterns

#### SlideOver Pattern (Preferred for forms):
```vue
<template>
  <Drawer v-model:visible="isOpen" position="right" class="w-full md:w-1/2">
    <template #header>
      <h2 class="text-xl font-bold">{{ title }}</h2>
    </template>
    
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Form fields -->
    </form>
    
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" @click="isOpen = false" />
        <Button label="Save" type="submit" :loading="loading" />
      </div>
    </template>
  </Drawer>
</template>
```

#### Dialog Pattern (For simple confirmations):
```vue
<Dialog v-model:visible="isOpen" modal :header="title">
  <p>{{ message }}</p>
  <template #footer>
    <Button label="Cancel" severity="secondary" @click="isOpen = false" />
    <Button label="Confirm" @click="handleConfirm" />
  </template>
</Dialog>
```

### Styling Guidelines
1. **Use Tailwind CSS utility classes** for layout and spacing
2. **Use PrimeVue theme tokens** for colors
3. **Scoped styles**: Use `<style scoped>` for component-specific styles
4. **Consistent spacing**: Use Tailwind spacing scale (`gap-2`, `p-4`, `space-y-4`)

### JavaScript Standards
1. **Use const/let**, never `var`
2. **Prefer arrow functions** for callbacks
3. **Use async/await** over Promise chains
4. **Use optional chaining** (`?.`) and nullish coalescing (`??`)
5. **Avoid mutation**: Use spread operators for immutability

---

## Common Patterns

### Store + API Pattern
```javascript
// Store
export const useTaskStore = defineStore('task', () => {
  const tasks = ref([])
  const loading = ref(false)
  const error = ref(null)
  
  async function loadTasks(projectId) {
    loading.value = true
    error.value = null
    try {
      tasks.value = await getAllTasks({ project_id: projectId })
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  async function createTask(taskData) {
    const newTask = await createTask(taskData)
    tasks.value.push(newTask)
    return newTask
  }
  
  return { tasks, loading, error, loadTasks, createTask }
})
```

### Form Validation Pattern
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

async function handleSubmit() {
  if (!validateForm()) return
  
  try {
    loading.value = true
    await createProject(form.value)
    toast.add({ severity: 'success', summary: 'Success' })
    emit('created')
    isOpen.value = false
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: error.message })
  } finally {
    loading.value = false
  }
}
```

---

## Constants & Enums

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

**Always import constants** instead of using magic strings:
```javascript
import { TASK_STATUSES } from '@/constants'

if (task.status === TASK_STATUSES.COMPLETE) { ... }
```

---

## Testing Checklist

### Before Committing Code
1. ✅ All backend calls use API services (no direct fetch)
2. ✅ All components use `<script setup>` Composition API
3. ✅ Constants are imported from `@/constants`
4. ✅ Tailwind classes are used for styling
5. ✅ PrimeVue components are used for UI
6. ✅ Loading and error states are handled
7. ✅ Forms have validation
8. ✅ Success/error Toast notifications added

### Manual Testing
1. Test with authenticated and unauthenticated states
2. Test with different user roles
3. Test error scenarios (network errors, invalid data)
4. Check browser console for errors
5. Test on mobile viewport

---

## Development Workflow

### Getting Started
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Environment Variables
Create `.env.local`:
```
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Migration from Firebase

✅ **Completed**:
- Removed all Firebase TypeScript repositories
- Removed Firebase configuration files
- Created Python FastAPI backend with Supabase
- Implemented JWT-based authentication
- Created API service layer for all backend operations

⚠️ **In Progress**:
- Updating remaining components to use new API services
- Removing Firebase imports from stores and components

---

## Resources

### Documentation
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Pinia Docs](https://pinia.vuejs.org/)
- [PrimeVue Docs](https://primevue.org/)
- [Tailwind CSS Docs](https://tailwindcss.com/)

### Backend
- See `construction-tracker-backend/README.md` for API documentation

---

**Last Updated**: 2025-12-19
