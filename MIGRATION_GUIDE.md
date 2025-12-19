# Migration Guide: Firebase Auth → Python Backend + JWT

This guide walks you through migrating your Vue app from Firebase Authentication to the Python backend with JWT tokens.

## Overview

**Current Setup:**
- Firebase Authentication (Google OAuth)
- User data stored in Firebase Realtime Database
- `onAuthStateChanged` listener for auth state

**New Setup:**
- Python FastAPI backend for authentication
- JWT tokens for session management
- Email/password registration + login
- Optional: Supabase OAuth for Google sign-in
- Token stored in localStorage

---

## Step-by-Step Migration

### Step 1: Add Environment Variable

Add to your `.env` file:

```env
VITE_API_URL=http://localhost:8000/api
```

This points your frontend to the Python backend.

### Step 2: Replace Auth Store

**Backup the old file:**
```bash
mv src/stores/auth.js src/stores/auth-firebase-backup.js
```

**Rename the new file:**
```bash
mv src/stores/auth-new.js src/stores/auth.js
```

This replaces Firebase auth with the new JWT-based auth store.

### Step 3: Replace LoginView

**Backup the old file:**
```bash
mv src/views/auth/LoginView.vue src/views/auth/LoginView-firebase-backup.vue
```

**Rename the new file:**
```bash
mv src/views/auth/LoginView-new.vue src/views/auth/LoginView.vue
```

This gives you the new login/registration form.

### Step 4: Update useAuth Composable

**Backup the old file:**
```bash
mv src/composables/useAuth.js src/composables/useAuth-firebase-backup.js
```

**Rename the new file:**
```bash
mv src/composables/useAuth-new.js src/composables/useAuth.js
```

### Step 5: Update All Repository/Service Files to Use API Client

You'll need to update all your repository files (TaskRepository, ProjectRepository, etc.) to use the new `apiClient` instead of Firebase.

**Example migration for TaskRepository:**

**Before (Firebase):**
```javascript
// src/services/firebase/Repositories/TaskRepository.js
import { ref, get, query, orderByChild, equalTo } from 'firebase/database'
import { database } from '@/services/firebase'

export default {
  async getAll() {
    const snapshot = await get(ref(database, 'tasks'))
    return snapshot.val()
  }
}
```

**After (Python Backend):**
```javascript
// src/services/api/taskApi.js
import { apiGet, apiPost, apiPatch, apiDelete } from './apiClient'

export async function getAllTasks(params = {}) {
  const queryString = new URLSearchParams(params).toString()
  return await apiGet(`/tasks${queryString ? '?' + queryString : ''}`)
}

export async function getTask(taskId) {
  return await apiGet(`/tasks/${taskId}`)
}

export async function createTask(taskData) {
  return await apiPost('/tasks', taskData)
}

export async function updateTask(taskId, updates) {
  return await apiPatch(`/tasks/${taskId}`, updates)
}

export async function deleteTask(taskId) {
  return await apiDelete(`/tasks/${taskId}`)
}
```

### Step 6: Remove Firebase Dependencies

Update `package.json` - remove Firebase packages (optional, can keep if using other Firebase features):

```json
{
  "dependencies": {
    // Remove or comment out:
    // "firebase": "^x.x.x"
  }
}
```

Run:
```bash
npm install
```

### Step 7: Update App.vue

The auth initialization in `App.vue` should work with the new store without changes, but verify the `onBeforeMount` section:

```javascript
onBeforeMount(async () => {
  console.log('App: Starting auth init')
  await authStore.initAuth()  // This now checks localStorage instead of Firebase
  console.log('App: Auth initialized, isAuth:', authStore.isAuthenticated)
})
```

---

## New Features Available

### 1. User Registration

Users can now create accounts without admin intervention:

```javascript
// In LoginView.vue
await authStore.signUp({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'securepassword123',
  role: 'user'  // Default role
})
```

### 2. JWT Token Management

Tokens are automatically:
- Stored in localStorage
- Added to all API requests
- Validated for expiration
- Refreshed (if you implement refresh tokens)

### 3. Role-Based Permissions

Same as before, but roles are now managed in the Python backend:

```javascript
const permissions = computed(() => authStore.getPermissions)

// permissions.canManageProject
// permissions.canViewSubmittals
// permissions.canManageChangeOrders
```

---

## API Client Usage Examples

### Making Authenticated Requests

All API calls automatically include the JWT token:

```javascript
import { apiGet, apiPost, apiPatch, apiDelete } from '@/services/api/apiClient'

// GET request
const tasks = await apiGet('/tasks?project_id=123')

// POST request
const newTask = await apiPost('/tasks', {
  title: 'Install drywall',
  project_id: '123',
  status: 'todo'
})

// PATCH request
const updated = await apiPatch('/tasks/456', {
  status: 'complete'
})

// DELETE request
await apiDelete('/tasks/456')
```

### Handling Errors

The API client automatically:
- Redirects to login if token is expired (401)
- Clears auth data on unauthorized requests
- Throws errors with meaningful messages

```javascript
try {
  const data = await apiGet('/tasks')
} catch (error) {
  console.error('API error:', error.message)
  // Error is already handled, just show to user
  toast.add({ severity: 'error', detail: error.message })
}
```

---

## Migration Checklist

- [ ] Add `VITE_API_URL` to `.env`
- [ ] Replace `src/stores/auth.js` with new version
- [ ] Replace `src/views/auth/LoginView.vue` with new version
- [ ] Replace `src/composables/useAuth.js` with new version
- [ ] Create API service files for each entity (tasks, projects, etc.)
- [ ] Update all components to use new API services
- [ ] Test registration flow
- [ ] Test login flow
- [ ] Test logout flow
- [ ] Test token expiration handling
- [ ] Remove Firebase auth initialization code
- [ ] (Optional) Remove Firebase dependencies

---

## Testing the Migration

### 1. Start the Backend

```bash
cd construction-tracker-backend
source venv/bin/activate  # or .\venv\Scripts\activate on Windows
uvicorn app.main:app --reload
```

Backend runs at: `http://localhost:8000`

### 2. Start the Frontend

```bash
cd construction-tracker
npm run dev
```

Frontend runs at: `http://localhost:5173`

### 3. Test Registration

1. Go to `http://localhost:5173`
2. Click "Don't have an account? Sign up"
3. Enter name, email, password
4. Submit form
5. Should auto-login and redirect to dashboard

### 4. Test Login

1. Logout
2. Go to `http://localhost:5173`
3. Enter email and password
4. Submit form
5. Should redirect to dashboard

### 5. Test Token Persistence

1. Login
2. Refresh the page
3. Should remain logged in (token from localStorage)

### 6. Test Logout

1. Click user menu → Logout
2. Should redirect to login page
3. Token should be cleared

---

## Troubleshooting

### Issue: "Token expired" immediately after login

**Solution:** Check that your backend JWT expiration is set correctly in `.env`:
```env
JWT_EXPIRATION_MINUTES=10080  # 7 days
```

### Issue: API requests return 401 Unauthorized

**Solution:** 
1. Check token is in localStorage: `localStorage.getItem('auth_token')`
2. Verify backend is running: `http://localhost:8000/docs`
3. Check CORS settings in backend `app/main.py`

### Issue: Can't login after migration

**Solution:**
1. Check backend logs for errors
2. Verify user exists in database (or register a new one)
3. Check network tab in browser dev tools

### Issue: User data not loading after login

**Solution:**
1. Verify backend `/auth/me` endpoint works
2. Check token is valid with: `http://localhost:8000/api/auth/me` (with Bearer token)
3. Check user exists in database

---

## Optional: Add Supabase OAuth for Google Sign-In

If you want to keep Google sign-in, you can use Supabase OAuth:

### 1. Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### 2. Create Supabase Client

```javascript
// src/services/supabase/client.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### 3. Add to .env

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Update LoginView Google Sign-In Handler

```javascript
import { supabase } from '@/services/supabase/client'

const handleGoogleSignIn = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    
    if (error) throw error
    
    // After OAuth, Supabase will redirect back
    // You'll need to exchange the Supabase session for a backend JWT
    
  } catch (error) {
    console.error('Google sign-in error:', error)
  }
}
```

### 5. Exchange Supabase Session for Backend JWT

You'll need to create a backend endpoint that:
1. Accepts Supabase OAuth token
2. Verifies it with Supabase
3. Creates/finds user in your database
4. Returns your backend JWT token

This is more complex and may not be necessary if you're okay with just email/password.

---

## Summary

After migration, you'll have:
- ✅ Email/password authentication
- ✅ User registration
- ✅ JWT token-based sessions
- ✅ Automatic token handling in API calls
- ✅ Token expiration handling
- ✅ Same permission system
- ✅ LocalStorage persistence
- ✅ No Firebase dependency for auth

The user experience remains similar, but the backend is now your Python API instead of Firebase!
