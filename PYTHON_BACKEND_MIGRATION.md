# Python Backend Migration Guide

## Overview

This document outlines the complete migration from Firebase + JavaScript repositories to a Python backend with Supabase PostgreSQL, while maintaining real-time updates and supporting multiple frontend platforms.

---

## Architecture Comparison

### **Current Architecture** (Firebase + JavaScript)
```
┌─────────────┐         ┌─────────────┐         ┌──────────────┐
│   Vue App   │────────▶│ Firebase SDK│────────▶│   Firebase   │
│  (Browser)  │         │ Repositories│         │   Database   │
└─────────────┘         └─────────────┘         └──────────────┘
     ↑
     └─ Repositories run IN the browser
     └─ Direct database access from client
```

### **New Architecture** (Python + Supabase)
```
┌─────────────────────────────────────────────────────────┐
│                    Python Backend                       │
│              (FastAPI + Supabase PostgreSQL)            │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Repositories │  │   REST API   │  │  WebSockets  │ │
│  │  (Python)    │  │  /api/tasks  │  │ /ws/tasks    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         ↓                                     ↓         │
│  ┌─────────────────────────────────────────────────┐   │
│  │        Supabase PostgreSQL Database             │   │
│  │           (Built-in Real-Time)                  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↑
                          │ HTTP + WebSocket
          ┌───────────────┼───────────────┐
          ↓               ↓               ↓
    ┌──────────┐    ┌──────────┐   ┌──────────┐
    │ Vue Web  │    │ iOS App  │   │ Electron │
    │ (Admin)  │    │ (Swift)  │   │ Desktop  │
    └──────────┘    └──────────┘   └──────────┘
```

---

## Project Structure

```
construction-tracker-backend/
├── app/
│   ├── main.py                      # FastAPI application entry point
│   ├── config.py                    # Configuration (Supabase credentials, etc.)
│   ├── database.py                  # Database connection setup
│   │
│   ├── models/                      # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── base.py                  # Base model with common fields
│   │   ├── project.py
│   │   ├── task.py
│   │   ├── rfi.py
│   │   ├── submittal.py
│   │   ├── change_order.py
│   │   ├── document.py
│   │   ├── activity_log.py
│   │   └── user.py
│   │
│   ├── schemas/                     # Pydantic schemas (request/response validation)
│   │   ├── __init__.py
│   │   ├── project.py               # ProjectCreate, ProjectUpdate, ProjectResponse
│   │   ├── task.py
│   │   ├── rfi.py
│   │   ├── submittal.py
│   │   ├── change_order.py
│   │   ├── document.py
│   │   ├── activity_log.py
│   │   └── user.py
│   │
│   ├── repositories/                # Data access layer (like current Firebase repos)
│   │   ├── __init__.py
│   │   ├── base_repository.py       # BaseRepository with CRUD + Real-time
│   │   ├── project_repository.py
│   │   ├── task_repository.py
│   │   ├── rfi_repository.py
│   │   ├── submittal_repository.py
│   │   ├── change_order_repository.py
│   │   ├── document_repository.py
│   │   ├── activity_log_repository.py
│   │   └── user_repository.py
│   │
│   ├── routers/                     # API route handlers
│   │   ├── __init__.py
│   │   ├── projects.py              # /api/projects endpoints
│   │   ├── tasks.py                 # /api/tasks endpoints
│   │   ├── rfis.py
│   │   ├── submittals.py
│   │   ├── change_orders.py
│   │   ├── documents.py
│   │   ├── activity_logs.py
│   │   ├── users.py
│   │   └── websockets.py            # WebSocket endpoints for real-time
│   │
│   ├── services/                    # Business logic services
│   │   ├── __init__.py
│   │   ├── activity_service.py      # Activity logging (like current ActivityService)
│   │   ├── auth_service.py          # Authentication/authorization
│   │   └── notification_service.py  # Real-time notification broadcasting
│   │
│   ├── middleware/                  # Custom middleware
│   │   ├── __init__.py
│   │   ├── auth.py                  # JWT authentication middleware
│   │   └── error_handler.py         # Global error handling
│   │
│   ├── utils/                       # Utility functions
│   │   ├── __init__.py
│   │   ├── error_handler.py         # Error handling utilities
│   │   └── logger.py                # Logging configuration
│   │
│   └── constants/                   # Constants (like current JS constants)
│       ├── __init__.py
│       ├── enums.py                 # USER_ROLES, PROJECT_PHASES, TASK_STATUSES, etc.
│       └── document_categories.py
│
├── migrations/                      # Alembic database migrations
│   └── versions/
│
├── tests/                           # Unit and integration tests
│   ├── test_repositories/
│   ├── test_routers/
│   └── test_services/
│
├── scripts/                         # Utility scripts
│   ├── migrate_firebase_to_postgres.py  # Data migration script
│   └── seed_database.py             # Seed test data
│
├── requirements.txt                 # Python dependencies
├── .env.example                     # Environment variables template
├── .env                             # Actual environment variables (gitignored)
├── alembic.ini                      # Alembic configuration
└── README.md                        # Project documentation
```

---

## Key Files Breakdown

### **1. main.py** - FastAPI Application Entry Point
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import projects, tasks, rfis, submittals, change_orders, documents, users, websockets
from app.database import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Construction Tracker API", version="1.0.0")

# CORS middleware (allow Vue/iOS/Electron to connect)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080"],  # Vue dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(rfis.router, prefix="/api/rfis", tags=["rfis"])
app.include_router(submittals.router, prefix="/api/submittals", tags=["submittals"])
app.include_router(change_orders.router, prefix="/api/change-orders", tags=["change-orders"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(websockets.router, prefix="/ws", tags=["websockets"])

@app.get("/")
async def root():
    return {"message": "Construction Tracker API", "version": "1.0.0"}
```

### **2. config.py** - Configuration Management
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_key: str
    supabase_service_key: str  # For admin operations
    
    # Database (Supabase provides PostgreSQL connection string)
    database_url: str
    
    # JWT
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60 * 24 * 7  # 7 days
    
    # App
    environment: str = "development"
    debug: bool = True
    
    class Config:
        env_file = ".env"

settings = Settings()
```

### **3. database.py** - Database Connection
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Create SQLAlchemy engine
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,  # Verify connections before using
    echo=settings.debug   # Log SQL queries in debug mode
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency for route handlers
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### **4. models/base.py** - Base Model with Common Fields
```python
from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.database import Base
import uuid

class BaseModel(Base):
    __abstract__ = True
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }
```

### **5. models/task.py** - Task Model Example
```python
from sqlalchemy import Column, String, Integer, JSON
from app.models.base import BaseModel

class Task(BaseModel):
    __tablename__ = "tasks"
    
    title = Column(String, nullable=False)
    description = Column(String)
    priority = Column(String, nullable=False)  # 'critical', 'high', 'medium', 'low'
    status = Column(String, nullable=False)     # 'todo', 'in-progress', 'review', 'complete'
    due_date = Column(String)
    project_id = Column(String, nullable=False, index=True)
    assigned_to = Column(String, index=True)
    assigned_to_name = Column(String)
    category = Column(String)
    estimated_hours = Column(Integer)
    dependencies = Column(JSON)  # Array of task IDs
```

### **6. schemas/task.py** - Task Schemas (Request/Response Validation)
```python
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    priority: str = Field(..., pattern="^(critical|high|medium|low)$")
    status: str = Field(..., pattern="^(todo|in-progress|review|complete|on-hold)$")
    due_date: Optional[str] = None
    project_id: str
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    category: Optional[str] = None
    estimated_hours: Optional[int] = None
    dependencies: Optional[List[str]] = []

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    priority: Optional[str] = Field(None, pattern="^(critical|high|medium|low)$")
    status: Optional[str] = None
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    category: Optional[str] = None
    estimated_hours: Optional[int] = None
    dependencies: Optional[List[str]] = None

class TaskResponse(TaskBase):
    id: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    
    class Config:
        from_attributes = True  # Allow ORM models to be converted to Pydantic
```

### **7. repositories/base_repository.py** - Base Repository Pattern
```python
from typing import Generic, TypeVar, Type, List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.database import Base
from datetime import datetime

ModelType = TypeVar("ModelType", bound=Base)

class BaseRepository(Generic[ModelType]):
    def __init__(self, db: Session, model: Type[ModelType]):
        self.db = db
        self.model = model
    
    def get_all(self) -> List[ModelType]:
        """Get all records"""
        return self.db.query(self.model).all()
    
    def get_by_id(self, id: str) -> Optional[ModelType]:
        """Get single record by ID"""
        return self.db.query(self.model).filter(self.model.id == id).first()
    
    def create(self, data: Dict[str, Any], created_by: Optional[str] = None) -> ModelType:
        """Create new record with metadata"""
        # Add metadata
        data['created_by'] = created_by
        data['updated_by'] = created_by
        
        instance = self.model(**data)
        self.db.add(instance)
        self.db.commit()
        self.db.refresh(instance)
        return instance
    
    def update(self, id: str, data: Dict[str, Any], updated_by: Optional[str] = None) -> Optional[ModelType]:
        """Update existing record"""
        instance = self.get_by_id(id)
        if not instance:
            return None
        
        # Update fields
        for key, value in data.items():
            if value is not None:  # Only update non-None values
                setattr(instance, key, value)
        
        # Update metadata
        instance.updated_by = updated_by
        instance.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(instance)
        return instance
    
    def delete(self, id: str) -> bool:
        """Delete record (or soft delete)"""
        instance = self.get_by_id(id)
        if not instance:
            return False
        
        self.db.delete(instance)
        self.db.commit()
        return True
    
    def get_by_field(self, field: str, value: Any) -> List[ModelType]:
        """Get records by any field"""
        return self.db.query(self.model).filter(
            getattr(self.model, field) == value
        ).all()
```

### **8. repositories/task_repository.py** - Task Repository
```python
from typing import List
from sqlalchemy.orm import Session
from app.models.task import Task
from app.repositories.base_repository import BaseRepository

class TaskRepository(BaseRepository[Task]):
    def __init__(self, db: Session):
        super().__init__(db, Task)
    
    def get_by_project_id(self, project_id: str) -> List[Task]:
        """Get all tasks for a project"""
        return self.get_by_field('project_id', project_id)
    
    def get_by_status(self, status: str) -> List[Task]:
        """Get tasks by status"""
        return self.get_by_field('status', status)
    
    def get_by_assigned_to(self, user_id: str) -> List[Task]:
        """Get tasks assigned to a user"""
        return self.get_by_field('assigned_to', user_id)
    
    def get_by_priority(self, priority: str) -> List[Task]:
        """Get tasks by priority"""
        return self.get_by_field('priority', priority)
```

### **9. routers/tasks.py** - Task API Routes
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.repositories.task_repository import TaskRepository
from app.services.activity_service import ActivityService
from app.services.notification_service import NotificationService

router = APIRouter()

def get_task_repo(db: Session = Depends(get_db)) -> TaskRepository:
    return TaskRepository(db)

@router.get("/", response_model=List[TaskResponse])
async def get_tasks(
    project_id: str = None,
    status: str = None,
    repo: TaskRepository = Depends(get_task_repo)
):
    """Get all tasks with optional filters"""
    if project_id:
        return repo.get_by_project_id(project_id)
    elif status:
        return repo.get_by_status(status)
    else:
        return repo.get_all()

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, repo: TaskRepository = Depends(get_task_repo)):
    """Get single task by ID"""
    task = repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    repo: TaskRepository = Depends(get_task_repo),
    db: Session = Depends(get_db)
):
    """Create new task"""
    # Create task
    task = repo.create(task_data.model_dump())
    
    # Log activity
    activity_service = ActivityService(db)
    await activity_service.log_activity(
        project_id=task.project_id,
        user_id=task.created_by,
        action="task_created",
        entity_type="task",
        entity_id=task.id,
        description=f"Created task: {task.title}"
    )
    
    # Broadcast real-time update
    notification_service = NotificationService()
    await notification_service.broadcast_to_project(
        project_id=task.project_id,
        message={
            "type": "task_created",
            "data": TaskResponse.from_orm(task).model_dump()
        }
    )
    
    return task

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task_data: TaskUpdate,
    repo: TaskRepository = Depends(get_task_repo),
    db: Session = Depends(get_db)
):
    """Update task"""
    task = repo.update(task_id, task_data.model_dump(exclude_unset=True))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Log activity
    activity_service = ActivityService(db)
    await activity_service.log_activity(
        project_id=task.project_id,
        user_id=task.updated_by,
        action="task_updated",
        entity_type="task",
        entity_id=task.id,
        description=f"Updated task: {task.title}"
    )
    
    # Broadcast update
    notification_service = NotificationService()
    await notification_service.broadcast_to_project(
        project_id=task.project_id,
        message={
            "type": "task_updated",
            "data": TaskResponse.from_orm(task).model_dump()
        }
    )
    
    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    repo: TaskRepository = Depends(get_task_repo),
    db: Session = Depends(get_db)
):
    """Delete task"""
    task = repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    project_id = task.project_id
    title = task.title
    
    success = repo.delete(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Log activity
    activity_service = ActivityService(db)
    await activity_service.log_activity(
        project_id=project_id,
        user_id=None,  # Get from auth context
        action="task_deleted",
        entity_type="task",
        entity_id=task_id,
        description=f"Deleted task: {title}"
    )
    
    # Broadcast deletion
    notification_service = NotificationService()
    await notification_service.broadcast_to_project(
        project_id=project_id,
        message={
            "type": "task_deleted",
            "data": {"id": task_id}
        }
    )
```

### **10. routers/websockets.py** - WebSocket Real-Time Support
```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Store connections by project ID
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, project_id: str):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)
        print(f"Client connected to project {project_id}. Total: {len(self.active_connections[project_id])}")
    
    def disconnect(self, websocket: WebSocket, project_id: str):
        if project_id in self.active_connections:
            self.active_connections[project_id].remove(websocket)
            print(f"Client disconnected from project {project_id}")
    
    async def broadcast_to_project(self, project_id: str, message: dict):
        """Send message to all clients watching this project"""
        if project_id not in self.active_connections:
            return
        
        dead_connections = []
        for connection in self.active_connections[project_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error sending message: {e}")
                dead_connections.append(connection)
        
        # Remove dead connections
        for conn in dead_connections:
            self.active_connections[project_id].remove(conn)

# Global connection manager
manager = ConnectionManager()

@router.websocket("/projects/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    """WebSocket endpoint for real-time project updates"""
    await manager.connect(websocket, project_id)
    
    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "project_id": project_id,
            "message": "Connected to real-time updates"
        })
        
        # Keep connection alive and listen for client messages
        while True:
            # Receive messages from client (e.g., ping/pong)
            data = await websocket.receive_text()
            
            # Echo back or handle specific client requests
            if data == "ping":
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, project_id)
        print(f"Client disconnected from project {project_id}")
```

### **11. services/notification_service.py** - Real-Time Notification Service
```python
from typing import Dict, Any
from app.routers.websockets import manager

class NotificationService:
    """Service for broadcasting real-time updates to connected clients"""
    
    async def broadcast_to_project(self, project_id: str, message: Dict[str, Any]):
        """Broadcast message to all clients watching a project"""
        await manager.broadcast_to_project(project_id, message)
    
    async def notify_task_created(self, project_id: str, task_data: Dict[str, Any]):
        """Notify clients about new task"""
        await self.broadcast_to_project(project_id, {
            "type": "task_created",
            "data": task_data
        })
    
    async def notify_task_updated(self, project_id: str, task_data: Dict[str, Any]):
        """Notify clients about task update"""
        await self.broadcast_to_project(project_id, {
            "type": "task_updated",
            "data": task_data
        })
    
    async def notify_task_deleted(self, project_id: str, task_id: str):
        """Notify clients about task deletion"""
        await self.broadcast_to_project(project_id, {
            "type": "task_deleted",
            "data": {"id": task_id}
        })
```

### **12. services/activity_service.py** - Activity Logging Service
```python
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLog
from app.repositories.activity_log_repository import ActivityLogRepository

class ActivityService:
    def __init__(self, db: Session):
        self.repo = ActivityLogRepository(db)
    
    async def log_activity(
        self,
        project_id: str,
        user_id: Optional[str],
        action: str,
        entity_type: str,
        entity_id: str,
        description: str,
        additional_data: Optional[Dict[str, Any]] = None
    ):
        """Log an activity (similar to current ActivityService.logActivity)"""
        activity_data = {
            "project_id": project_id,
            "user_id": user_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "description": description,
            "additional_data": additional_data or {}
        }
        
        return self.repo.create(activity_data, created_by=user_id)
```

### **13. constants/enums.py** - Constants (Python Enums)
```python
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    PROJECT_MANAGER = "project-manager"
    SUPERINTENDENT = "superintendent"
    FOREMAN = "foreman"
    USER = "user"

class ProjectPhase(str, Enum):
    PRE_CONSTRUCTION = "pre-construction"
    CONSTRUCTION = "construction"
    CLOSE_OUT = "close-out"
    COMPLETE = "complete"

class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in-progress"
    REVIEW = "review"
    COMPLETE = "complete"
    ON_HOLD = "on-hold"

class TaskPriority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class RFIStatus(str, Enum):
    OPEN = "open"
    PENDING = "pending"
    ANSWERED = "answered"
    CLOSED = "closed"

class SubmittalStatus(str, Enum):
    PENDING = "pending"
    REVIEWED = "reviewed"
    APPROVED = "approved"
    REJECTED = "rejected"

class ChangeOrderStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    IMPLEMENTED = "implemented"
```

---

## Frontend Changes

### **Vue Store (Simplified - No Business Logic)**

```javascript
// stores/task.js (NEW - Python backend version)
import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref([])
  const loading = ref(false)
  let ws = null
  
  // Connect to WebSocket for real-time updates
  function connectRealtime(projectId) {
    ws = new WebSocket(`ws://localhost:8000/ws/projects/${projectId}`)
    
    ws.onopen = () => {
      console.log('Connected to real-time updates')
    }
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      
      switch (message.type) {
        case 'task_created':
          tasks.value.push(message.data)
          break
        case 'task_updated':
          const idx = tasks.value.findIndex(t => t.id === message.data.id)
          if (idx !== -1) tasks.value[idx] = message.data
          break
        case 'task_deleted':
          tasks.value = tasks.value.filter(t => t.id !== message.data.id)
          break
      }
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
    
    ws.onclose = () => {
      console.log('Disconnected from real-time updates')
      // Reconnect after 5 seconds
      setTimeout(() => connectRealtime(projectId), 5000)
    }
  }
  
  function disconnect() {
    if (ws) {
      ws.close()
      ws = null
    }
  }
  
  // Load initial tasks
  async function loadTasks(projectId) {
    loading.value = true
    try {
      const response = await fetch(`http://localhost:8000/api/tasks?project_id=${projectId}`)
      tasks.value = await response.json()
    } catch (error) {
      console.error('Failed to load tasks:', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  // Create task (WebSocket will notify everyone)
  async function createTask(taskData) {
    const response = await fetch('http://localhost:8000/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    })
    
    if (!response.ok) {
      throw new Error('Failed to create task')
    }
    
    return await response.json()
  }
  
  // Update task
  async function updateTask(taskId, taskData) {
    const response = await fetch(`http://localhost:8000/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    })
    
    if (!response.ok) {
      throw new Error('Failed to update task')
    }
    
    return await response.json()
  }
  
  // Delete task
  async function deleteTask(taskId) {
    const response = await fetch(`http://localhost:8000/api/tasks/${taskId}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) {
      throw new Error('Failed to delete task')
    }
  }
  
  return {
    tasks,
    loading,
    connectRealtime,
    disconnect,
    loadTasks,
    createTask,
    updateTask,
    deleteTask
  }
})
```

### **Vue Component Usage**
```vue
<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useTaskStore } from '@/stores/task'
import { useProjectStore } from '@/stores/project'
import { storeToRefs } from 'pinia'

const taskStore = useTaskStore()
const projectStore = useProjectStore()
const { tasks, loading } = storeToRefs(taskStore)
const { activeProjectId } = storeToRefs(projectStore)

onMounted(async () => {
  if (activeProjectId.value) {
    // Load initial data
    await taskStore.loadTasks(activeProjectId.value)
    
    // Connect to real-time updates
    taskStore.connectRealtime(activeProjectId.value)
  }
})

onUnmounted(() => {
  taskStore.disconnect()
})

async function handleCreateTask(taskData) {
  try {
    await taskStore.createTask(taskData)
    // WebSocket will automatically update the UI
  } catch (error) {
    console.error('Failed to create task:', error)
  }
}
</script>
```

---

## Dependencies (requirements.txt)

```txt
# Web framework
fastapi==0.109.0
uvicorn[standard]==0.27.0

# Database
sqlalchemy==2.0.25
alembic==1.13.1
psycopg2-binary==2.9.9  # PostgreSQL driver

# Supabase
supabase==2.3.4

# Validation
pydantic==2.5.3
pydantic-settings==2.1.0

# Authentication
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6

# Utilities
python-dotenv==1.0.0
```

---

## Environment Variables (.env.example)

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Database (Supabase PostgreSQL connection string)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# JWT
JWT_SECRET_KEY=your-super-secret-key-change-this-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=10080

# App
ENVIRONMENT=development
DEBUG=True
```

---

## Migration Strategy

### **Phase 1: Setup (Week 1)**
1. Create new Python project directory
2. Install dependencies (`pip install -r requirements.txt`)
3. Set up Supabase account and create project
4. Configure environment variables
5. Create database models (SQLAlchemy)
6. Set up Alembic migrations

### **Phase 2: Build Backend (Week 2-3)**
1. Implement base repository pattern
2. Create all repositories (Task, Project, RFI, etc.)
3. Build API routes (REST endpoints)
4. Add WebSocket support
5. Implement activity logging service
6. Add authentication/authorization

### **Phase 3: Data Migration (Week 3)**
1. Export Firebase data to JSON
2. Create migration script (Firebase → PostgreSQL)
3. Test data integrity
4. Keep Firebase running during testing

### **Phase 4: Frontend Migration (Week 4)**
1. Update Vue stores to use HTTP + WebSocket
2. Remove Firebase SDK dependencies
3. Test real-time updates
4. Verify all CRUD operations work

### **Phase 5: Deploy & Monitor (Week 5)**
1. Deploy Python backend (Railway, Render, or DigitalOcean)
2. Switch frontend to production backend URL
3. Monitor for errors
4. Keep Firebase as backup for 30 days

### **Phase 6: Cleanup (Week 6+)**
1. Remove Firebase dependencies from frontend
2. Delete Firebase project (after successful migration)
3. Archive old JavaScript repositories
4. Update documentation

---

## Running the Backend

### **Development**
```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### **Production**
```bash
# Use Gunicorn with Uvicorn workers
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

---

## API Documentation

FastAPI auto-generates interactive API documentation:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=app tests/
```

---

## Key Advantages

1. ✅ **All business logic in Python** (no more JavaScript repositories)
2. ✅ **Real-time updates** via WebSockets (as good as Firebase)
3. ✅ **Minimal frontend code** (just HTTP + WebSocket connections)
4. ✅ **Multiple frontends** can use the same backend (Vue, iOS, Electron)
5. ✅ **Type safety** with Pydantic schemas
6. ✅ **Auto-generated API docs** (Swagger/ReDoc)
7. ✅ **Easy to test** (Python testing ecosystem)
8. ✅ **Free tier** (Supabase 500 MB + real-time built-in)

---

## Next Steps

1. **Create new project directory**: `construction-tracker-backend/`
2. **Set up virtual environment**: `python -m venv venv`
3. **Install FastAPI + dependencies**: `pip install -r requirements.txt`
4. **Create Supabase project**: Get connection string and API keys
5. **Build models and repositories**: Start with Task, Project, User
6. **Test API endpoints**: Use FastAPI docs at `/docs`
7. **Add WebSocket support**: Test real-time updates
8. **Update Vue frontend**: Switch from Firebase to Python API

Ready to start building? Let me know which part you'd like to tackle first!
