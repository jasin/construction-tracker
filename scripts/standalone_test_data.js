// populate-test-data.js - Standalone Node.js script to populate Firebase with test data

import { initializeApp } from 'firebase/app'
import { getDatabase, ref, push, set } from 'firebase/database'

// Your Firebase configuration (same as in src/firebase.js)
const firebaseConfig = {
  apiKey: 'AIzaSyAI_TiCoeNNQoR3IGOrnAGFZfXYadlrldg',
  authDomain: 'construction-tracker-fbdb.firebaseapp.com',
  databaseURL: 'http://127.0.0.1:9000/?ns=construction-tracker-fbdb-default-rtdb', // Use production URL for standalone script
  projectId: 'construction-tracker-fbdb',
  storageBucket: 'construction-tracker-fbdb.firebasestorage.app',
  messagingSenderId: '531430813912',
  appId: '1:531430813912:web:b758acf956b80b293ce7ad',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

async function createRecord(path, data) {
  const recordRef = push(ref(db, path))
  await set(recordRef, data)
  return { id: recordRef.key, ...data }
}

async function populateTestData() {
  try {
    console.log('🚀 Starting test data population...')

    // Create test clients
    console.log('Creating clients...')
    const client1 = await createRecord('clients', {
      name: 'ABC Construction Corp',
      contactPerson: 'John Smith',
      email: 'john@abcconstruction.com',
      phone: '555-0123',
      address: '123 Main St, City, State',
      createdAt: new Date().toISOString(),
      createdBy: 'test_user',
    })

    const client2 = await createRecord('clients', {
      name: 'XYZ Development LLC',
      contactPerson: 'Jane Doe',
      email: 'jane@xyzdevelopment.com',
      phone: '555-0456',
      address: '456 Oak Ave, City, State',
      createdAt: new Date().toISOString(),
      createdBy: 'test_user',
    })

    console.log('✅ Created clients:', client1.id, client2.id)

    // Create test users
    console.log('Creating users...')
    const user1 = await createRecord('users', {
      name: 'Mike Johnson',
      email: 'mike@yourcompany.com',
      role: 'project-manager',
      phone: '555-0789',
      active: true,
    })

    const user2 = await createRecord('users', {
      name: 'Sarah Wilson',
      email: 'sarah@yourcompany.com',
      role: 'foreman',
      phone: '555-0321',
      active: true,
    })

    const user3 = await createRecord('users', {
      name: 'Tom Anderson',
      email: 'tom@yourcompany.com',
      role: 'superintendent',
      phone: '555-0654',
      active: true,
    })

    console.log('✅ Created users:', user1.id, user2.id, user3.id)

    // Create test projects
    console.log('Creating projects...')
    const project1 = await createRecord('projects', {
      jobNumber: '2024-001',
      name: 'Office Building Renovation',
      clientId: client1.id,
      cost: 150000,
      contractSigned: true,
      contractSignedDate: '2024-02-01T00:00:00Z',
      phase: 'construction',
      startDate: '2024-02-15T00:00:00Z',
      estimatedEndDate: '2024-06-30T00:00:00Z',
      teamMembers: {
        [user1.id]: 'project-manager',
        [user2.id]: 'foreman',
      },
      createdAt: new Date().toISOString(),
      createdBy: user1.id,
    })

    const project2 = await createRecord('projects', {
      jobNumber: '2024-002',
      name: 'Retail Store Build-Out',
      clientId: client2.id,
      cost: 85000,
      contractSigned: false,
      phase: 'pre-construction',
      startDate: '2024-04-01T00:00:00Z',
      estimatedEndDate: '2024-07-15T00:00:00Z',
      teamMembers: {
        [user1.id]: 'project-manager',
      },
      createdAt: new Date().toISOString(),
      createdBy: user1.id,
    })

    const project3 = await createRecord('projects', {
      jobNumber: '2023-045',
      name: 'Warehouse Expansion',
      clientId: client1.id,
      cost: 275000,
      contractSigned: true,
      contractSignedDate: '2023-08-15T00:00:00Z',
      phase: 'close-out',
      startDate: '2023-09-01T00:00:00Z',
      estimatedEndDate: '2024-01-30T00:00:00Z',
      actualEndDate: '2024-02-15T00:00:00Z',
      teamMembers: {
        [user1.id]: 'project-manager',
        [user3.id]: 'superintendent',
      },
      createdAt: new Date().toISOString(),
      createdBy: user1.id,
    })

    const project4 = await createRecord('projects', {
      jobNumber: '2023-022',
      name: 'Restaurant Renovation',
      clientId: client2.id,
      cost: 125000,
      contractSigned: true,
      contractSignedDate: '2023-03-10T00:00:00Z',
      phase: 'complete',
      startDate: '2023-04-01T00:00:00Z',
      estimatedEndDate: '2023-08-15T00:00:00Z',
      actualEndDate: '2023-08-20T00:00:00Z',
      teamMembers: {
        [user1.id]: 'project-manager',
        [user2.id]: 'foreman',
      },
      createdAt: '2023-03-01T00:00:00Z',
      createdBy: user1.id,
    })

    console.log('✅ Created projects:', project1.id, project2.id, project3.id, project4.id)

    // Create test RFIs
    console.log('Creating RFIs...')
    const rfi1 = await createRecord('rfis', {
      projectId: project1.id,
      number: 'RFI-001',
      title: 'Clarification on electrical panel specifications',
      description:
        'Need clarification on the electrical panel requirements for the main distribution panel in the mechanical room. The drawings show a 400A panel but specifications call for 600A.',
      submittedBy: user2.id,
      assignedTo: user1.id,
      status: 'submitted',
      priority: 'medium',
      createdAt: '2024-03-01T10:30:00Z',
      submittedAt: '2024-03-01T10:45:00Z',
    })

    const rfi2 = await createRecord('rfis', {
      projectId: project1.id,
      number: 'RFI-002',
      title: 'HVAC ductwork routing question',
      description:
        'Question about routing the main HVAC ductwork around the new structural beam installed in corridor.',
      submittedBy: user2.id,
      assignedTo: user1.id,
      status: 'answered',
      priority: 'high',
      createdAt: '2024-03-05T14:15:00Z',
      submittedAt: '2024-03-05T14:20:00Z',
      answeredAt: '2024-03-06T09:30:00Z',
      response:
        'Route ductwork above the beam as shown in revised drawing RFI-002-R1. Coordinate with structural engineer for final clearances.',
    })

    const rfi3 = await createRecord('rfis', {
      projectId: project2.id,
      number: 'RFI-001',
      title: 'Flooring material confirmation',
      description:
        'Confirm flooring material for the sales area. Specs show ceramic tile but client mentioned hardwood preference.',
      submittedBy: user1.id,
      assignedTo: user1.id,
      status: 'draft',
      priority: 'low',
      createdAt: '2024-03-10T11:00:00Z',
    })

    console.log('✅ Created RFIs:', rfi1.id, rfi2.id, rfi3.id)

    // Create test submittals
    console.log('Creating submittals...')
    const submittal1 = await createRecord('submittals', {
      projectId: project1.id,
      number: 'SUB-001',
      title: 'HVAC Equipment Specifications',
      description:
        'Submittal for main HVAC unit specifications and installation details including RTU-1 and RTU-2',
      submittedBy: user2.id,
      reviewedBy: user1.id,
      status: 'submitted',
      specSection: '23 00 00',
      createdAt: '2024-03-05T09:00:00Z',
      submittedAt: '2024-03-05T09:15:00Z',
      dueDate: '2024-03-15T00:00:00Z',
    })

    const submittal2 = await createRecord('submittals', {
      projectId: project1.id,
      number: 'SUB-002',
      title: 'Electrical Panel Shop Drawings',
      description: 'Shop drawings for main electrical distribution panels MDP-1 and MDP-2',
      submittedBy: user2.id,
      reviewedBy: user1.id,
      status: 'approved',
      specSection: '26 00 00',
      createdAt: '2024-02-28T13:30:00Z',
      submittedAt: '2024-02-28T13:45:00Z',
      reviewedAt: '2024-03-02T10:20:00Z',
      dueDate: '2024-03-10T00:00:00Z',
      comments: 'Approved with noted corrections. See redlines on drawings.',
    })

    console.log('✅ Created submittals:', submittal1.id, submittal2.id)

    // Create test change orders
    console.log('Creating change orders...')
    const changeOrder1 = await createRecord('changeOrders', {
      projectId: project1.id,
      number: 'CO-001',
      title: 'Additional electrical outlets in conference room',
      description:
        'Client requested 4 additional electrical outlets in the main conference room along the north wall for AV equipment',
      requestedBy: user1.id,
      status: 'approved',
      costImpact: 2500,
      timeImpact: 2,
      reason: 'client-request',
      createdAt: '2024-03-10T13:20:00Z',
      approvedAt: '2024-03-12T09:15:00Z',
      approvedBy: user1.id,
      billable: false,
    })

    const changeOrder2 = await createRecord('changeOrders', {
      projectId: project1.id,
      number: 'CO-002',
      title: 'Upgrade to LED lighting',
      description:
        'Change from fluorescent to LED lighting throughout the office areas per client request for energy efficiency',
      requestedBy: user1.id,
      status: 'work-completed',
      costImpact: 8500,
      timeImpact: 1,
      reason: 'design-change',
      createdAt: '2024-02-25T16:00:00Z',
      approvedAt: '2024-02-26T11:30:00Z',
      approvedBy: user1.id,
      workCompletedAt: '2024-03-08T17:00:00Z',
      billable: true,
    })

    const changeOrder3 = await createRecord('changeOrders', {
      projectId: project2.id,
      number: 'CO-001',
      title: 'Add security system rough-in',
      description: 'Add conduit and outlet rough-in for future security system installation',
      requestedBy: user1.id,
      status: 'proposed',
      costImpact: 3200,
      timeImpact: 3,
      reason: 'client-request',
      createdAt: '2024-03-12T10:45:00Z',
      billable: false,
    })

    console.log('✅ Created change orders:', changeOrder1.id, changeOrder2.id, changeOrder3.id)

    // Create test documents
    console.log('Creating documents...')
    const document1 = await createRecord('documents', {
      projectId: project1.id,
      name: 'Schedule of Values - Rev 1',
      category: 'schedule-of-values',
      fileUrl: 'https://example.com/sov-rev1.pdf',
      fileName: 'SOV_2024-001_Rev1.pdf',
      version: 1,
      status: 'approved',
      expirationDate: '2024-12-31T00:00:00Z',
      uploadedAt: '2024-02-05T14:20:00Z',
      uploadedBy: user1.id,
      approvedAt: '2024-02-06T09:15:00Z',
      approvedBy: user1.id,
      notes: 'Initial schedule of values approved',
    })

    const document2 = await createRecord('documents', {
      projectId: project1.id,
      name: 'General Liability Insurance',
      category: 'insurance',
      fileUrl: 'https://example.com/insurance.pdf',
      fileName: 'GL_Insurance_2024.pdf',
      version: 1,
      status: 'approved',
      expirationDate: '2024-12-31T00:00:00Z',
      uploadedAt: '2024-01-15T10:00:00Z',
      uploadedBy: user1.id,
      approvedAt: '2024-01-15T10:30:00Z',
      approvedBy: user1.id,
      notes: 'Current GL insurance certificate',
    })

    const document3 = await createRecord('documents', {
      projectId: project2.id,
      name: 'Building Permit',
      category: 'permits',
      fileUrl: 'https://example.com/permit.pdf',
      fileName: 'Building_Permit_2024-002.pdf',
      version: 1,
      status: 'pending',
      uploadedAt: '2024-03-01T08:30:00Z',
      uploadedBy: user1.id,
      notes: 'Submitted to city for approval',
    })

    console.log('✅ Created documents:', document1.id, document2.id, document3.id)

    // Create activity log entries
    console.log('Creating activity log entries...')
    const activities = [
      {
        projectId: project1.id,
        userId: user1.id,
        action: 'created_project',
        entityType: 'project',
        entityId: project1.id,
        description: `Created project: ${project1.name}`,
        timestamp: project1.createdAt,
      },
      {
        projectId: project1.id,
        userId: user2.id,
        action: 'created_rfi',
        entityType: 'rfi',
        entityId: rfi1.id,
        description: `Created RFI-001: ${rfi1.title}`,
        timestamp: rfi1.createdAt,
      },
      {
        projectId: project1.id,
        userId: user1.id,
        action: 'created_change_order',
        entityType: 'changeOrder',
        entityId: changeOrder2.id,
        description: `Created change order: ${changeOrder2.title}`,
        timestamp: changeOrder2.createdAt,
      },
      {
        projectId: project1.id,
        userId: user1.id,
        action: 'uploaded_document',
        entityType: 'document',
        entityId: document1.id,
        description: `Uploaded document: ${document1.name}`,
        timestamp: document1.uploadedAt,
      },
    ]

    for (const activity of activities) {
      await createRecord('activityLog', activity)
    }

    console.log('✅ Created activity log entries')

    console.log('\n🎉 Test data population completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   • ${2} Clients`)
    console.log(`   • ${3} Users`)
    console.log(`   • ${4} Projects`)
    console.log(`   • ${3} RFIs`)
    console.log(`   • ${2} Submittals`)
    console.log(`   • ${3} Change Orders`)
    console.log(`   • ${3} Documents`)
    console.log(`   • ${activities.length} Activity Log Entries`)

    console.log('\n🚀 You can now start your Vue app and see the test data!')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating test data:', error)
    process.exit(1)
  }
}

// Run the script
populateTestData()
