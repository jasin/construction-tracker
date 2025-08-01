const admin = require('firebase-admin')

admin.initializeApp({
  projectId: 'construction-tracker-fbdb',
  databaseURL: 'http://localhost:9000?ns=construction-tracker-fbdb',
})

const db = admin.database()

async function seedRealtimeDatabase() {
  try {
    await db.ref('projects/project_123').set({
      projectId: 'project_123',
      name: 'Downtown Office Tower',
      location: '123 Main St, Cityville',
      status: 'Active',
      startDate: '2025-01-15T00:00:00Z',
      endDate: '2026-12-31T23:59:59Z',
      manager: 'Alice Johnson',
      createdAt: '2025-01-01T09:00:00Z',
      updatedAt: '2025-06-01T09:00:00Z',
    })

    await db.ref('rfis/rfi_001').set({
      rfiId: 'RFI-001',
      projectId: 'project_123',
      title: 'Clarification on Foundation Specifications',
      description: 'Need clarification on the concrete mix ratio for the foundation slab.',
      status: 'Open',
      priority: 'High',
      submittedBy: 'John Doe',
      submittedDate: '2025-06-01T09:00:00Z',
      assignedTo: 'Jane Smith',
      dueDate: '2025-06-08T17:00:00Z',
      response: null,
      createdAt: '2025-06-01T09:00:00Z',
      updatedAt: '2025-06-01T09:00:00Z',
    })

    await db.ref('submittals/submittal_001').set({
      submittalId: 'SUB-001',
      projectId: 'project_123',
      title: 'Concrete Mix Design Submission',
      status: 'Pending',
      submittedBy: 'John Doe',
      submittedDate: '2025-06-02T10:00:00Z',
      reviewer: 'Bob Wilson',
      dueDate: '2025-06-10T17:00:00Z',
      createdAt: '2025-06-02T10:00:00Z',
      updatedAt: '2025-06-02T10:00:00Z',
    })

    console.log('Project, RFI, and Submittal data seeded successfully!')
  } catch (error) {
    console.error('Error seeding Realtime Database:', error)
  } finally {
    process.exit(0)
  }
}

seedRealtimeDatabase()
