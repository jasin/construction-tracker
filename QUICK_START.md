# Quick Start Guide

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
✅ Already complete! Your `.env` file is configured with:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://pjtltwthpeufcfmewfsx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

**Note**: `.env` and `.env.local` both work in Vite. Use `.env.local` if you want to keep secrets out of git.

### 3. Start Backend
```bash
cd ../construction-tracker-backend
source venv/bin/activate  # Windows: venv\Scripts\activate
uvicorn app.main:app --reload
```

Backend will run at: `http://localhost:8000`

### 4. Start Frontend
```bash
npm run dev
```

Frontend will run at: `http://localhost:5173`

---

## 📋 Remaining Migration Tasks

**25 files** still need Firebase imports replaced with Python API calls.

### Priority 1: Update Stores (Start Here!)
1. `src/stores/rfi.js`
2. `src/stores/submittal.js`
3. `src/stores/changeOrder.js`
4. `src/stores/document.js`
5. `src/stores/activity.js`
6. `src/stores/userSettings.js`
7. `src/stores/project.js`

### Priority 2: Update Forms & Views
- 7 form components in `src/components/forms/`
- 4 view components in `src/views/`

### Priority 3: Update Other Components
- Feature components, widgets, modals, composables

---

## 🔧 Migration Pattern

### Before (Firebase):
```javascript
import RFIRepository from '@/services/firebase/Repositories/RFIRepository'

const rfis = await RFIRepository.getAll()
const rfi = await RFIRepository.getById(id)
await RFIRepository.create(data)
await RFIRepository.update(id, updates)
await RFIRepository.delete(id)
```

### After (Python API):
```javascript
import { getAllRFIs, getRFIById, createRFI, updateRFI, deleteRFI } from '@/services/api/rfisApi'

const rfis = await getAllRFIs()
const rfi = await getRFIById(id)
await createRFI(data)
await updateRFI(id, updates)
await deleteRFI(id)
```

---

## 📚 Documentation

- **`README.md`** - Project overview
- **`DEVELOPMENT.md`** - Full development guide
- **`MIGRATION_NOTES.md`** - Detailed migration patterns
- **`CLEANUP_SUMMARY.md`** - Progress tracker
- **`CLEANUP_COMPLETE.md`** - What we've accomplished

---

## ✅ What's Already Done

- ✅ All TypeScript files removed
- ✅ Firebase dependencies removed
- ✅ Auth system using Python backend
- ✅ Projects and Tasks already migrated
- ✅ API client with JWT tokens working
- ✅ Documentation updated

---

## 🎯 Your Next Action

Update `src/stores/rfi.js`:
1. Replace `import RFIRepository` with `import { getAllRFIs, ... } from '@/services/api/rfisApi'`
2. Replace all `RFIRepository.method()` calls with the API function equivalents
3. Test by creating/viewing/editing an RFI
4. Move to next store

**You've got this!** 💪
