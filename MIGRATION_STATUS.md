# Migration Status: Firebase → Python Backend + Supabase

## Overview
This document tracks the progress of migrating the Construction Tracker application from Firebase to a Python/FastAPI backend with PostgreSQL (Supabase) database.

## Architecture
- **Backend**: Python FastAPI with SQLAlchemy 2.0 ORM
- **Database**: PostgreSQL (Supabase)
- **Real-time**: Supabase WebSocket subscriptions (postgres_changes)
- **Authentication**: JWT tokens (replacing Firebase Auth)
- **Frontend**: Vue 3 with Pinia stores (unchanged)

## Migration Pattern
Each entity follows this hybrid approach:
1. **API calls** for CRUD operations (GET, POST, PUT, DELETE)
2. **Supabase real-time subscriptions** for live updates via WebSockets
3. **Initial data load** from API on subscription initialization
4. **Real-time events** update local state (INSERT, UPDATE, DELETE)

## Completed Migrations ✅

### 1. Authentication
- **Status**: ✅ Complete
- **Files Modified**:
  - `src/services/api/authApi.js` - API wrapper for login/logout
  - `src/services/auth/tokenService.js` - JWT token management
  - `src/composables/useAuth.js` - Auth composable (NEW implementation)
  - `src/views/auth/LoginView.vue` - Updated to use new auth
- **Backend**: 
  - `/auth/login` endpoint with bcrypt password hashing
  - JWT token generation with user payload
- **Real-time**: Not applicable (auth is session-based)

### 2. Projects
- **Status**: ✅ Complete
- **Files Modified**:
  - `src/services/api/projectsApi.js` - API wrapper
  - `src/stores/project.js` - Updated to use API + Supabase
- **Backend Endpoints**:
  - `GET /projects` - List all projects
  - `GET /projects/{id}` - Get single project
  - `POST /projects` - Create project
  - `PUT /projects/{id}` - Update project
  - `DELETE /projects/{id}` - Delete project
- **Real-time**: ✅ Enabled via Supabase
  - Table: `projects`
  - Events: INSERT, UPDATE, DELETE

### 3. Users
- **Status**: ✅ Complete
- **Files Modified**:
  - `src/services/api/usersApi.js` - API wrapper
  - Multiple components updated to use `getAllUsers()` and `getActiveUsers()`
    - `TaskDialog.vue`
    - `TaskListView.vue`
    - `ProjectDialog.vue`
    - `RFIDialog.vue`
    - `SubmittalDialog.vue`
    - `ConstructionManagementSection.vue`
- **Backend Endpoints**:
  - `GET /users` - List all users
  - `GET /users/{id}` - Get single user
  - `POST /users` - Create user
  - `PUT /users/{id}` - Update user
  - `DELETE /users/{id}` - Delete user
- **Real-time**: ✅ Enabled via Supabase
  - Table: `users`
  - Events: INSERT, UPDATE, DELETE

### 4. Tasks
- **Status**: ✅ Complete
- **Files Modified**:
  - `src/services/api/tasksApi.js` - API wrapper
  - `src/stores/task.js` - Fully migrated to API + Supabase
    - `initializeUserTasksSubscription()` - User's assigned tasks
    - `initializeProjectTasksSubscription()` - Project's tasks
    - `createTask()`, `updateTask()`, `deleteTask()` - CRUD operations
- **Backend Endpoints**:
  - `GET /tasks` - List all tasks (with filters)
  - `GET /tasks/{id}` - Get single task
  - `POST /tasks` - Create task
  - `PUT /tasks/{id}` - Update task
  - `DELETE /tasks/{id}` - Delete task
  - Query params: `projectId`, `assignedTo`, `status`, `priority`
- **Real-time**: ⚠️ Needs to be enabled in Supabase
  - Table: `tasks`
  - Events: INSERT, UPDATE, DELETE
  - Filters: `assigned_to=eq.{userId}` and `project_id=eq.{projectId}`

### 5. RFIs (Request for Information)
- **Status**: ✅ Complete (API wrapper created, store migrated)
- **Files Modified**:
  - `src/services/api/rfisApi.js` - API wrapper
  - `src/stores/construction.js` - Migrated to API + Supabase
- **Backend Endpoints**:
  - `GET /rfis` - List all RFIs
  - `GET /rfis/{id}` - Get single RFI
  - `POST /rfis` - Create RFI
  - `PUT /rfis/{id}` - Update RFI
  - `DELETE /rfis/{id}` - Delete RFI
- **Real-time**: ⚠️ Needs to be enabled in Supabase
  - Table: `rfis`
  - Events: INSERT, UPDATE, DELETE
  - Filter: `project_id=eq.{projectId}`

### 6. Submittals
- **Status**: ✅ Complete (API wrapper created, store migrated)
- **Files Modified**:
  - `src/services/api/submittalsApi.js` - API wrapper
  - `src/stores/construction.js` - Migrated to API + Supabase
- **Backend Endpoints**:
  - `GET /submittals` - List all submittals
  - `GET /submittals/{id}` - Get single submittal
  - `POST /submittals` - Create submittal
  - `PUT /submittals/{id}` - Update submittal
  - `DELETE /submittals/{id}` - Delete submittal
- **Real-time**: ⚠️ Needs to be enabled in Supabase
  - Table: `submittals`
  - Events: INSERT, UPDATE, DELETE
  - Filter: `project_id=eq.{projectId}`

### 7. Change Orders
- **Status**: ✅ Complete (API wrapper created, store migrated)
- **Files Modified**:
  - `src/services/api/changeOrdersApi.js` - API wrapper
  - `src/stores/construction.js` - Migrated to API + Supabase
- **Backend Endpoints**:
  - `GET /change-orders` - List all change orders
  - `GET /change-orders/{id}` - Get single change order
  - `POST /change-orders` - Create change order
  - `PUT /change-orders/{id}` - Update change order
  - `DELETE /change-orders/{id}` - Delete change order
- **Real-time**: ⚠️ Needs to be enabled in Supabase
  - Table: `change_orders`
  - Events: INSERT, UPDATE, DELETE
  - Filter: `project_id=eq.{projectId}`

### 8. Documents
- **Status**: ✅ API wrapper created, ⚠️ Store needs migration
- **Files Modified**:
  - `src/services/api/documentsApi.js` - API wrapper
  - `src/stores/construction.js` - Migrated to API + Supabase (documents included)
- **Backend Endpoints**:
  - `GET /documents` - List all documents
  - `GET /documents/{id}` - Get single document
  - `POST /documents` - Upload document
  - `PUT /documents/{id}` - Update document metadata
  - `DELETE /documents/{id}` - Delete document
  - `GET /documents/{id}/download` - Download document file
- **Real-time**: ⚠️ Needs to be enabled in Supabase
  - Table: `documents`
  - Events: INSERT, UPDATE, DELETE
  - Filter: `project_id=eq.{projectId}`

### 9. Activity Logs
- **Status**: ⚠️ Partially stubbed
- **Files Modified**:
  - `src/services/api/activityLogsApi.js` - API wrapper created
  - `src/services/logging/ActivityService.ts` - `subscribeToActivitiesByCategory()` stubbed out
- **Backend**: ✅ Backend should handle activity logging automatically
- **Real-time**: ✅ Enabled via Supabase
  - Table: `activity_logs`
  - Events: INSERT (primarily)

## Pending Tasks ⚠️

### 1. Enable Supabase Real-time for Remaining Tables
**Priority**: HIGH  
**File**: `enable-realtime-tables.sql` (created)

Run this SQL in Supabase SQL Editor:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE rfis;
ALTER PUBLICATION supabase_realtime ADD TABLE submittals;
ALTER PUBLICATION supabase_realtime ADD TABLE change_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE documents;
```

### 2. Test End-to-End Functionality
**Priority**: HIGH

Test each entity's CRUD operations through the UI:
- [ ] Create a new project
- [ ] Update project details
- [ ] Create tasks and assign to users
- [ ] Create RFIs, Submittals, Change Orders
- [ ] Upload documents
- [ ] Verify real-time updates (open in two browser tabs)
- [ ] Test user assignment dropdowns
- [ ] Test activity logging

### 3. Remove Firebase Dependencies
**Priority**: MEDIUM

Once testing is complete and everything works:
- [ ] Remove Firebase SDK from `package.json`
- [ ] Delete `src/services/firebase/` directory
- [ ] Remove Firebase config from environment files
- [ ] Clean up any remaining Firebase imports

### 4. Backend Enhancements (Future)
**Priority**: LOW

Consider adding:
- [ ] Activity logging endpoints (if not auto-logged)
- [ ] Bulk operations endpoints
- [ ] Advanced filtering and search
- [ ] File upload to cloud storage (S3, Google Cloud Storage)
- [ ] WebSocket alternative for non-Supabase deployments

## Database Schema Notes

### Column Name Mapping
Firebase used camelCase, PostgreSQL uses snake_case. The backend handles this mapping via SQLAlchemy:

| Firebase Field | PostgreSQL Column | Notes |
|---------------|-------------------|-------|
| `projectId` | `project_id` | Foreign key |
| `assignedTo` | `assigned_to` | User ID |
| `createdAt` | `created_at` | Timestamp |
| `updatedAt` | `updated_at` | Auto-updated |
| `createdBy` | `created_by` | User ID |
| `updatedBy` | `updated_by` | User ID |

### Required Supabase Tables
All tables should exist in PostgreSQL with proper schema. Backend models are in:
- `construction-tracker-backend/app/models/`

## Environment Variables

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000/api
VITE_SUPABASE_URL=https://pjtltwthpeufcfmewfsx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Backend (.env)
```env
DATABASE_URL=postgresql://postgres:[password]@db.pjtltwthpeufcfmewfsx.supabase.co:5432/postgres
SECRET_KEY=[your-secret-key]
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Running the Application

### Start Backend
```bash
cd construction-tracker-backend
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Mac/Linux
uvicorn app.main:app --reload --port 8000
```

### Start Frontend
```bash
npm run dev
```

## Known Issues

### 1. Column Name Mismatches
**Issue**: PostgreSQL uses `assigned_to`, but API might return `assignedTo`  
**Solution**: Backend should handle snake_case ↔ camelCase conversion

### 2. Virtual Environment
**Issue**: Backend crashes if not running in virtual environment  
**Solution**: Always activate `.venv` before running uvicorn

### 3. ActivityService Stub
**Issue**: `subscribeToActivitiesByCategory()` is stubbed and returns empty array  
**Solution**: Either migrate to API or remove if backend auto-logs activities

## Success Metrics

- ✅ User can log in with JWT token
- ✅ Projects load from PostgreSQL
- ✅ Real-time updates work via Supabase WebSocket
- ⚠️ All CRUD operations work through UI (needs testing)
- ⚠️ No Firebase errors in console (needs testing)
- ⚠️ Activity logging works (needs verification)

## Next Steps

1. **Run SQL script** to enable real-time for remaining tables
2. **Test the application** end-to-end with real data
3. **Fix any bugs** discovered during testing
4. **Remove Firebase** dependencies once stable
5. **Deploy to production** when ready

---

**Last Updated**: 2025 (Migration in progress)
