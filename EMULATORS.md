# Firebase Emulators - Data Persistence (Windows)

## The Problem
Windows file locking prevents Firebase's `--export-on-exit` from working. Firebase creates timestamped `firebase-export-*` directories but can't rename them to your target directory.

## The Solution
Manual save workflow that works around the Windows bug.

---

## Workflow

### 1. Start Emulators
```bash
npm run emulators
```
- Imports data from `./emulator-data` (if it exists)
- Does NOT auto-export on exit (that's what fails on Windows)

### 2. Work Normally
Create projects, tasks, RFIs, etc. in your app.

### 3. Save Your Data (IMPORTANT!)
**Open a SECOND terminal** while emulators are running:
```bash
npm run emulators:save
```

**What this does:**
- Fetches all database data from the database emulator (port 9000)
- Fetches all auth users from the auth emulator (port 9099)
- Saves everything to `emulator-data` in the correct format for import

**When to save:**
- Before stopping emulators for the day
- Before lunch/coffee breaks
- After important data changes
- Whenever you want a checkpoint

### 4. Stop Emulators
```bash
Ctrl+C
```
No automatic export will happen (and that's OK - you already saved manually).

### 5. Next Session
```bash
npm run emulators
```
Your data is restored from `emulator-data`!

---

## Quick Commands

| Command | Description |
|---------|-------------|
| `npm run emulators` | Start emulators with data import |
| `npm run emulators:save` | Save current data (while running) |
| `npm run emulators:clear` | Delete all saved data (fresh start) |

---

## Typical Session

```bash
# Terminal 1: Start emulators
npm run emulators

# ... work on your app ...

# Terminal 2: Save your work
npm run emulators:save

# Terminal 1: Stop emulators
Ctrl+C

# Next day: Start again with your data
npm run emulators
```

---

## Pro Tips

### Create an Alias
Add this to your shell profile for quick saves:
```bash
alias emsave="npm run emulators:save"
```

### PowerShell Function
Add to your PowerShell profile:
```powershell
Set-Alias emsave "npm run emulators:save"
```

---

## Why Not Automatic?

We tried `--export-on-exit` but it fails on Windows with:
```
EPERM: operation not permitted, rename 'firebase-export-*' -> 'emulator-data'
```

Firebase's built-in export also has issues on Windows. So instead, we fetch data directly from the emulator's HTTP API - simple and reliable!

---

## Notes

- `emulator-data` directory is ignored by git
- First run starts with empty data (directory doesn't exist yet)
- Save as often as you want - it's quick (direct HTTP fetch from emulators)!
- Saves both database data AND auth users automatically
