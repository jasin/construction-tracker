# Customizable Dashboard - Future Enhancement

## Overview
Enable users to customize their dashboard layout by adding, removing, resizing, and rearranging widgets according to their preferences and role requirements. This will transform the current static dashboard into a dynamic, user-configurable workspace.

## Current State
- Fixed dashboard layout with predefined sections
- Limited customization (column width settings for TaskList and Recent Projects)
- All users see the same layout structure
- No ability to hide/show sections or rearrange components

## Goals
1. **User Empowerment**: Allow users to create personalized dashboards that match their workflow
2. **Role Optimization**: Provide different default layouts for different roles (Project Manager, Superintendent, Foreman)
3. **Progressive Enhancement**: Implement in phases to provide value incrementally
4. **Mobile-Friendly**: Ensure customization works across all devices

---

## Proposed Solutions

### Option 1: Grid-Based Widget System ⭐ (Most Powerful)

**Description**: Full drag-and-drop grid layout system where users can freely position widgets anywhere on a grid.

**Key Features**:
- Drag-and-drop widgets to any position
- Resize widgets by dragging corners
- Widget gallery for adding new components
- Per-widget settings and configuration
- Save/load multiple layout presets

**Implementation**:
- Use `vue-grid-layout` library for grid management
- Create widget registry system (`src/config/widgetRegistry.js`)
- Store layouts in Firebase per user
- Implement `WidgetContainer` wrapper component
- Create individual widget components (MyTasksWidget, RecentProjectsWidget, etc.)

**Available Widgets**:
- My Tasks
- Recent Project Activity
- Activity Feed
- Project Statistics
- Upcoming RFIs
- Submittal Status
- Document Uploads
- Weather/Site Conditions
- Calendar/Schedule
- Quick Actions
- Team Availability

**Pros**:
- Maximum flexibility
- Industry-standard UX pattern
- Visual and intuitive
- Can create unlimited custom layouts

**Cons**:
- Most complex to implement
- Requires external dependency (`vue-grid-layout`)
- Mobile layout needs separate handling
- Higher learning curve for users

---

### Option 2: Section-Based Customization (Simpler)

**Description**: Users can show/hide sections and reorder them vertically (no free-form grid).

**Key Features**:
- Toggle section visibility
- Drag sections to reorder vertically
- Per-section settings (columns, filters, limits)
- Simpler mobile experience

**Implementation**:
- Use `vuedraggable` for vertical reordering
- Store section order and visibility in user settings
- Keep existing section components
- Add section configuration dialog

**Pros**:
- Easier to implement
- Works seamlessly on mobile
- Maintains consistent design
- Lower complexity

**Cons**:
- Less flexible (no side-by-side layout)
- Limited to vertical stacking
- Can't have multiple instances of same widget

---

### Option 3: Preset Layouts with Customization

**Description**: Provide predefined layout templates users can choose from, then customize within constraints.

**Key Features**:
- Pre-designed layouts (Default, Task-Focused, Project Manager, Field Worker)
- Role-based defaults
- Customization within preset constraints
- Quick switching between presets

**Implementation**:
- Define layout presets in configuration file
- Allow users to select preset and modify
- Store selected preset + modifications
- Provide preview images for each preset

**Example Presets**:
- **Default**: Balanced view with tasks and projects
- **Task-Focused**: Large task list with sidebar widgets
- **Project Manager**: Project overview with metrics
- **Field Worker**: Mobile-optimized for on-site use
- **Document Manager**: Document-centric layout

**Pros**:
- Quick setup for users
- Professional-looking layouts guaranteed
- Easier to design and maintain
- Role-based optimization

**Cons**:
- Less flexible than free-form grid
- Users may want layouts not in presets
- Requires designing multiple presets

---

### Option 4: Hybrid Approach ⭐ RECOMMENDED

**Description**: Phased implementation combining the best of all approaches.

#### **Phase 1: Section-Based (Quick Win)**
*Timeline: 1-2 days*

**Features**:
- Show/hide toggles for existing sections
- Vertical drag-and-drop reordering
- Per-section settings (existing column settings)
- Save preferences to Firebase

**Implementation**:
```javascript
// Store structure
sections: [
  { id: 'my-tasks', enabled: true, order: 0, settings: { columns: 1 } },
  { id: 'recent-projects', enabled: true, order: 1, settings: { columns: 4 } },
  { id: 'activity-feed', enabled: false, order: 2 },
]
```

**User Experience**:
1. Click "Customize Dashboard" button
2. Enter edit mode with drag handles
3. Toggle sections on/off
4. Drag sections to reorder
5. Click section settings icon for configuration
6. Save changes

---

#### **Phase 2: Widget System**
*Timeline: 1-2 weeks*

**Features**:
- Break sections into reusable widget components
- Widget gallery for browsing available widgets
- Add multiple instances of same widget type
- Basic grid layout (still vertical, but can span columns)

**Implementation**:
- Create widget registry with metadata
- Build `WidgetContainer` wrapper component
- Implement widget gallery dialog
- Add widget-specific settings dialogs
- Migrate existing sections to widget components

**New Capabilities**:
- Multiple task lists (personal, team, high-priority)
- Project widgets filtered by phase/status
- Custom activity feeds (documents only, RFIs only, etc.)
- Quick stat widgets (task count, overdue count, etc.)

---

#### **Phase 3: Advanced Features**
*Timeline: Future - as needed*

**Features**:
- Full 2D grid layout with `vue-grid-layout`
- Layout presets (including Phase 3 templates)
- Import/export layout configurations
- Share layouts with team members
- Admin-defined organization defaults
- Analytics on widget usage

**Advanced Widgets**:
- Charts and graphs (project progress, budget tracking)
- Embedded reports
- Real-time notifications panel
- Integration with external tools (weather API, maps)
- Custom HTML/markdown widgets

---

## Architecture Design

### Widget Registry Pattern

```javascript
// src/config/widgetRegistry.js
export const WIDGET_TYPES = {
  MY_TASKS: 'my-tasks',
  RECENT_PROJECTS: 'recent-projects',
  ACTIVITY_FEED: 'activity-feed',
  PROJECT_STATS: 'project-stats',
  // ... more widgets
}

export const widgetRegistry = {
  [WIDGET_TYPES.MY_TASKS]: {
    component: () => import('@/components/widgets/MyTasksWidget.vue'),
    title: 'My Tasks',
    icon: 'pi pi-list-check',
    defaultSize: { cols: 2, rows: 2 },
    minSize: { cols: 1, rows: 1 },
    maxSize: { cols: 4, rows: 4 },
    description: 'View and manage your assigned tasks',
    category: 'tasks',
    settings: {
      columns: { type: 'number', default: 1, min: 1, max: 4 },
      showCompleted: { type: 'boolean', default: false },
      filterByProject: { type: 'select', default: null },
      sortBy: { type: 'select', default: 'priority', options: ['priority', 'dueDate', 'status'] }
    }
  },
  // ... more widget definitions
}
```

### Dashboard Layout Store

```javascript
// src/stores/dashboardLayout.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { widgetRegistry } from '@/config/widgetRegistry'
import UserSettingsRepository from '@/services/firebase/Repositories/UserSettingsRepository'

export const useDashboardLayoutStore = defineStore('dashboardLayout', () => {
  const layouts = ref({
    desktop: [],
    mobile: []
  })
  
  const availableWidgets = computed(() => {
    return Object.entries(widgetRegistry).map(([id, config]) => ({
      id,
      ...config,
    }))
  })
  
  const visibleWidgets = computed(() => {
    return layouts.value.desktop.filter(w => w.enabled !== false)
  })
  
  async function loadUserLayout() {
    const userSettings = await UserSettingsRepository.getByUserId(currentUser.uid)
    layouts.value = userSettings.dashboardLayout || getDefaultLayout()
  }
  
  async function saveLayout(layout) {
    layouts.value.desktop = layout
    await UserSettingsRepository.update(currentUser.uid, {
      'dashboardLayout.desktop': layout
    })
  }
  
  function addWidget(widgetType, position = null) {
    const widget = widgetRegistry[widgetType]
    const newWidget = {
      i: `${widgetType}-${Date.now()}`,
      x: position?.x || 0,
      y: position?.y || Infinity,
      w: widget.defaultSize.cols,
      h: widget.defaultSize.rows,
      type: widgetType,
      settings: getDefaultWidgetSettings(widgetType),
      enabled: true
    }
    layouts.value.desktop.push(newWidget)
    saveLayout(layouts.value.desktop)
  }
  
  function removeWidget(widgetId) {
    layouts.value.desktop = layouts.value.desktop.filter(w => w.i !== widgetId)
    saveLayout(layouts.value.desktop)
  }
  
  function updateWidgetSettings(widgetId, settings) {
    const widget = layouts.value.desktop.find(w => w.i === widgetId)
    if (widget) {
      widget.settings = { ...widget.settings, ...settings }
      saveLayout(layouts.value.desktop)
    }
  }
  
  function getDefaultLayout() {
    // Return layout based on user role
    return {
      desktop: [
        { i: 'my-tasks-default', type: 'my-tasks', x: 0, y: 0, w: 2, h: 2, settings: {} },
        { i: 'recent-projects-default', type: 'recent-projects', x: 2, y: 0, w: 2, h: 2, settings: {} },
      ],
      mobile: [
        { id: 'my-tasks', enabled: true, order: 0 },
        { id: 'recent-projects', enabled: true, order: 1 },
      ]
    }
  }
  
  return {
    layouts,
    availableWidgets,
    visibleWidgets,
    loadUserLayout,
    saveLayout,
    addWidget,
    removeWidget,
    updateWidgetSettings,
  }
})
```

### Widget Container Component

```vue
<!-- src/components/dashboard/WidgetContainer.vue -->
<template>
  <Card class="widget-container" :class="{ 'edit-mode': editMode }">
    <template #header>
      <div class="widget-header">
        <div class="widget-title">
          <i :class="widgetConfig.icon"></i>
          <span>{{ widgetConfig.title }}</span>
        </div>
        <div v-if="editMode" class="widget-controls">
          <Button icon="pi pi-cog" text rounded size="small" @click="$emit('configure')" />
          <Button icon="pi pi-times" text rounded size="small" severity="danger" @click="$emit('remove')" />
        </div>
      </div>
    </template>
    
    <template #content>
      <slot /> <!-- Widget component goes here -->
    </template>
  </Card>
</template>

<script setup>
import { computed } from 'vue'
import { widgetRegistry } from '@/config/widgetRegistry'
import Card from 'primevue/card'
import Button from 'primevue/button'

const props = defineProps({
  widgetId: String,
  widgetType: String,
  settings: Object,
  editMode: Boolean
})

defineEmits(['remove', 'configure'])

const widgetConfig = computed(() => widgetRegistry[props.widgetType] || {})
</script>
```

### Database Schema

```javascript
// Firebase Realtime Database structure
/users
  /{userId}
    /settings
      /dashboardLayout
        /desktop
          /widgets: [
            {
              i: 'my-tasks-1234567890',
              type: 'my-tasks',
              x: 0,
              y: 0,
              w: 2,
              h: 2,
              enabled: true,
              settings: {
                columns: 1,
                showCompleted: false,
                filterByProject: null,
                sortBy: 'priority'
              }
            },
            {
              i: 'recent-projects-1234567891',
              type: 'recent-projects',
              x: 2,
              y: 0,
              w: 2,
              h: 2,
              enabled: true,
              settings: {
                columns: 4,
                limit: 8,
                showDocuments: true
              }
            }
          ]
          /preset: 'custom' | 'default' | 'task-focused' | 'project-manager'
        /mobile
          /sections: [
            { id: 'my-tasks', enabled: true, order: 0 },
            { id: 'recent-projects', enabled: true, order: 1 },
            { id: 'activity-feed', enabled: false, order: 2 }
          ]
```

---

## Required Libraries

### For Grid Layout (Phase 2/3):
- **`vue-grid-layout`** - Drag-and-drop grid layout
  - NPM: `npm install vue-grid-layout@next`
  - Size: ~50KB minified
  - License: MIT

### For Section Reordering (Phase 1):
- **`vuedraggable`** - Vue 3 wrapper for Sortable.js
  - NPM: `npm install vuedraggable@next`
  - Size: ~15KB minified
  - License: MIT

### Additional Dependencies:
- All existing project dependencies (PrimeVue, Pinia, Firebase)
- No additional UI libraries needed

---

## User Experience Flow

### Phase 1 UX: Section Customization

1. **View Mode** (Default):
   - Dashboard displays enabled sections in saved order
   - "Customize Dashboard" button in header

2. **Edit Mode**:
   - Click "Customize Dashboard"
   - Drag handles appear on each section
   - Eye icon to show/hide sections
   - Gear icon for section settings
   - "Done" button to exit edit mode

3. **Section Settings**:
   - Click gear icon on section
   - Dialog opens with section-specific settings
   - Example: TaskList columns, project limit, etc.
   - Save applies changes immediately

### Phase 2/3 UX: Widget System

1. **View Mode**:
   - Grid layout with positioned widgets
   - "Customize Dashboard" and "Add Widget" buttons

2. **Edit Mode**:
   - Drag widgets to reposition
   - Resize by dragging corners
   - Widget controls visible (settings, remove)
   - Grid snapping for alignment

3. **Widget Gallery**:
   - Click "Add Widget"
   - Browse categorized widgets
   - Search/filter widgets
   - Preview and add to dashboard

4. **Widget Settings**:
   - Click gear icon on widget
   - Dialog with widget-specific settings
   - Live preview if possible
   - Save or cancel changes

---

## Implementation Checklist

### Phase 1: Section-Based (Quick Win)
- [ ] Create `useDashboardSectionsStore`
- [ ] Add section visibility toggles
- [ ] Implement `vuedraggable` for reordering
- [ ] Add "Customize Dashboard" button
- [ ] Create section settings dialogs
- [ ] Save/load from Firebase
- [ ] Add loading states
- [ ] Handle errors gracefully
- [ ] Update CLAUDE.md with new patterns
- [ ] Test on mobile devices

### Phase 2: Widget System
- [ ] Create widget registry (`src/config/widgetRegistry.js`)
- [ ] Build `WidgetContainer` component
- [ ] Migrate existing sections to widgets:
  - [ ] MyTasksWidget
  - [ ] RecentProjectsWidget
  - [ ] ActivityFeedWidget
- [ ] Create `WidgetGalleryDialog`
- [ ] Create `WidgetSettingsDialog`
- [ ] Implement `useDashboardLayoutStore`
- [ ] Add "Add Widget" functionality
- [ ] Allow multiple widget instances
- [ ] Update database schema
- [ ] Migration script for existing users

### Phase 3: Advanced Features
- [ ] Integrate `vue-grid-layout`
- [ ] Implement full drag-and-drop
- [ ] Create layout presets
- [ ] Add preset selector UI
- [ ] Implement import/export
- [ ] Add layout sharing (team/org)
- [ ] Create admin layout defaults
- [ ] Add widget usage analytics
- [ ] Performance optimization
- [ ] Advanced widgets (charts, graphs)

---

## Technical Considerations

### Performance
- Lazy load widget components (`() => import()`)
- Implement virtual scrolling for large grids
- Debounce layout save operations
- Cache widget data appropriately
- Optimize Firebase reads (use subscriptions wisely)

### Mobile Strategy
- Separate mobile layout (vertical stacking)
- Responsive breakpoints for widget sizing
- Touch-friendly drag interactions
- Simplified mobile widget gallery
- Auto-convert desktop layout to mobile

### Accessibility
- Keyboard navigation for widget management
- ARIA labels for drag handles and controls
- Focus management in dialogs
- Screen reader announcements for layout changes
- High contrast mode support

### Error Handling
- Graceful degradation if widget fails to load
- Fallback to default layout on load error
- Validation of widget settings
- Confirmation dialogs for destructive actions
- Toast notifications for save success/failure

### Security
- Validate widget configurations
- Sanitize custom HTML widgets (if implemented)
- User-specific layouts (no cross-user access)
- Role-based widget availability
- Admin controls for widget enablement

---

## Success Metrics

### User Adoption
- % of users who customize their dashboard
- Number of widgets per user (average)
- Most popular widgets
- Layout save frequency

### Engagement
- Time spent on dashboard (before/after)
- Widget interaction rates
- Click-through rates from widgets
- Task completion rates from dashboard

### Performance
- Dashboard load time
- Layout save response time
- Widget render performance
- Mobile performance metrics

---

## Future Enhancements

### Advanced Features
- Collaborative layouts (share with team)
- AI-suggested layouts based on role/usage
- Widget marketplace (if organization grows)
- Real-time collaborative editing
- Version history for layouts
- A/B testing of layouts

### Integration Opportunities
- Weather widget (construction site conditions)
- Map widget (project locations)
- Budget tracking widgets
- Safety incident widgets
- Equipment tracking widgets
- Subcontractor status widgets

### Personalization
- Theme customization per widget
- Custom color schemes
- Widget backgrounds/images
- Custom icons
- Branded layouts

---

## Related Documentation
- `CLAUDE.md` - Main project guidelines
- `src/stores/ui.js` - Current UI state management
- `src/views/dashboard/DashboardView.vue` - Current dashboard implementation
- `src/components/forms/UserSettingsDialog.vue` - User settings pattern

---

## Notes
- Start with Phase 1 for quick value
- Gather user feedback before Phase 2
- Consider role-based defaults early
- Mobile experience is critical (construction field workers)
- Performance matters (slow connections on job sites)
- Keep accessibility in mind from the start

---

**Document Version**: 1.0  
**Created**: 2025-11-11  
**Last Updated**: 2025-11-11  
**Status**: Proposed  
**Priority**: Medium (Phase 1), Low (Phase 2/3)
