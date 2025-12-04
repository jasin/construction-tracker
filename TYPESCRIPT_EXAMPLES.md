# TypeScript Usage Examples

TypeScript has been set up in this project. Here's how to use it:

## What's Been Added

1. **TypeScript Configuration**: `tsconfig.json` and `tsconfig.node.json`
2. **Type Definitions**: `src/types/models.ts` - All your data models
3. **Typed Constants**: `src/constants/index.ts` - Constants with type exports

## How to Use TypeScript

### Option 1: Convert Existing JavaScript Files

Rename `.js` to `.ts`:
```bash
# Example: Convert a utility file
mv src/utils/myUtil.js src/utils/myUtil.ts
```

### Option 2: Use TypeScript in Vue Components

Add `lang="ts"` to your script tag:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { Task } from '@/types/models'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/constants'

// Type-safe refs
const tasks = ref<Task[]>([])
const loading = ref<boolean>(false)

// Type-safe function parameters
async function createTask(title: string, priority: TaskPriority): Promise<void> {
  loading.value = true
  try {
    const newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> = {
      title,
      priority,
      status: TASK_STATUSES.TODO,
      progress: 0,
      actualHours: 0,
      tags: []
    }
    // ... create task logic
  } finally {
    loading.value = false
  }
}
</script>
```

### Option 3: Type-Safe Store (Pinia)

Convert a store to TypeScript:

```typescript
// src/stores/example.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Task, TaskFilters } from '@/types/models'
import TaskRepository from '@/services/firebase/Repositories/TaskRepository'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([])
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  const completedTasks = computed<Task[]>(() => 
    tasks.value.filter(t => t.status === 'complete')
  )

  async function loadTasks(projectId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      tasks.value = await TaskRepository.getTasksByProject(projectId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { tasks, loading, error, completedTasks, loadTasks }
})
```

### Option 4: Type-Safe Repository

Convert a repository to TypeScript:

```typescript
// src/services/firebase/Repositories/ExampleRepository.ts
import type { Task } from '@/types/models'
import { BaseRepository } from '@/services/firebase/core/BaseRepository'

class TaskRepositoryClass extends BaseRepository<Task> {
  constructor() {
    super('tasks')
  }

  async getByProject(projectId: string): Promise<Task[]> {
    return this.getByField('projectId', projectId)
  }

  async getOverdue(): Promise<Task[]> {
    const tasks = await this.getAll()
    const now = new Date()
    
    return tasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) < now && 
      task.status !== 'complete'
    )
  }
}

export default new TaskRepositoryClass()
```

## Benefits You'll See Immediately

### 1. Autocomplete in VS Code
When you type `task.`, VS Code will show all available properties.

### 2. Catch Typos at Build Time
```typescript
// This will show an error immediately
task.asignedTo = 'user123'  // ❌ Error: Did you mean 'assignedTo'?
task.assignedTo = 'user123' // ✅ Correct
```

### 3. Enforce Data Shapes
```typescript
// This will error if required fields are missing
const newTask: Task = {
  title: 'My Task',
  priority: 'high'
  // ❌ Error: Missing required fields: status, createdAt, etc.
}
```

### 4. Safe Refactoring
If you rename a field in `models.ts`, TypeScript will show errors everywhere that needs updating.

## Gradual Migration Strategy

You don't have to convert everything at once:

1. ✅ **Already done**: Constants converted to TypeScript
2. ✅ **Already done**: Type definitions created
3. **Next**: Convert 1-2 repositories to `.ts`
4. **Next**: Convert 1 store to `.ts`
5. **Next**: Add `lang="ts"` to new components as you create them
6. **Later**: Gradually convert existing components as you modify them

## Important Notes

- **JavaScript still works**: You can keep all existing `.js` files
- **No breaking changes**: TypeScript is additive, not replacing
- **Strict mode is OFF**: We started with lenient settings (`strict: false`)
- **Gradual adoption**: Convert files as you work on them

## Available Types

See `src/types/models.ts` for all available types:
- `User`, `Client`, `Project`
- `Task`, `TaskComment`, `TaskFilters`, `TaskStatistics`
- `RFI`, `Submittal`, `ChangeOrder`
- `Document`, `ActivityLog`
- `ValidationResult`, `DependencyValidation`, `BulkOperationResult`

See `src/constants/index.ts` for type-safe constants:
- `UserRole`, `ProjectPhase`, `TaskStatus`, `TaskPriority`

## Questions?

TypeScript is now available but completely optional. Use it when you want better autocomplete and type safety!
