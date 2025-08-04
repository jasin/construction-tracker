// testData.js - Run this in your browser console or create a Vue component to populate test data

import firebaseService from '../src/firebaseService'

export async function populateTestData() {
  try {
    console.log('Creating test data...')

    // Create test clients
    const client1 = await firebaseService.createClient({
      name: 'ABC Construction Corp',
      contactPerson: 'John Smith',
      email: 'john@abcconstruction.com',
      phone: '555-0123',
      address: '123 Main St, City, State',
    })

    const client2 = await firebaseService.createClient({
      name: 'XYZ Development LLC',
      contactPerson: 'Jane Doe',
      email: 'jane@xyzdevelopment.com',
      phone: '555-0456',
      address: '456 Oak Ave, City, State',
    })

    console.log('Created clients:', client1, client2)

    // Create test users
    const user1 = await firebaseService.createUser({
      name: 'Mike Johnson',
      email: 'mike@yourcompany.com',
      role: 'project-manager',
      phone: '555-0789',
      active: true,
    })

    const user2 = await firebaseService.createUser({
      name: 'Sarah Wilson',
      email: 'sarah@yourcompany.com',
      role: 'foreman',
      phone: '555-0321',
      active: true,
    })

    console.log('Created users:', user1, user2)

    // Create test projects
    const project1 = await firebaseService.createProject({
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
    })

    const project2 = await firebaseService.createProject({
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
    })

    const project3 = await firebaseService.createProject({
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
        [user2.id]: 'superintendent',
      },
    })

    console.log('Created projects:', project1, project2, project3)

    // Create test RFIs for project1
    const rfi1 = await firebaseService.createRFI({
      projectId: project1.id,
      number: 'RFI-001',
      title: 'Clarification on electrical panel specifications',
      description:
        'Need clarification on the electrical panel requirements for the main distribution panel in the mechanical room.',
      submittedBy: user2.id,
      assignedTo: user1.id,
      priority: 'medium',
    })

    await firebaseService.submitRFI(rfi1.id)

    const rfi2 = await firebaseService.createRFI({
      projectId: project1.id,
      number: 'RFI-002',
      title: 'HVAC ductwork routing question',
      description: 'Question about routing the main HVAC ductwork around the new structural beam.',
      submittedBy: user2.id,
      assignedTo: user1.id,
      priority: 'high',
    })

    console.log('Created RFIs:', rfi1, rfi2)

    // Create test submittals
    const submittal1 = await firebaseService.createSubmittal({
      projectId: project1.id,
      number: 'SUB-001',
      title: 'HVAC Equipment Specifications',
      description: 'Submittal for main HVAC unit specifications and installation details',
      submittedBy: user2.id,
      reviewedBy: user1.id,
      specSection: '23 00 00',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })

    await firebaseService.submitSubmittal(submittal1.id)

    console.log('Created submittal:', submittal1)

    // Create test change orders
    const changeOrder1 = await firebaseService.createChangeOrder({
      projectId: project1.id,
      number: 'CO-001',
      title: 'Additional electrical outlets in conference room',
      description: 'Client requested 4 additional electrical outlets in the main conference room',
      requestedBy: user1.id,
      costImpact: 2500,
      timeImpact: 2,
      reason: 'client-request',
    })

    await firebaseService.approveChangeOrder(changeOrder1.id)

    const changeOrder2 = await firebaseService.createChangeOrder({
      projectId: project1.id,
      number: 'CO-002',
      title: 'Upgrade to LED lighting',
      description: 'Change from fluorescent to LED lighting throughout the office areas',
      requestedBy: user1.id,
      costImpact: 8500,
      timeImpact: 1,
      reason: 'design-change',
    })

    console.log('Created change orders:', changeOrder1, changeOrder2)

    // Create test documents
    const document1 = await firebaseService.createDocument({
      projectId: project1.id,
      name: 'Schedule of Values - Rev 1',
      category: 'schedule-of-values',
      fileUrl: 'https://example.com/sov-rev1.pdf',
      fileName: 'SOV_2024-001_Rev1.pdf',
      version: 1,
      status: 'approved',
      expirationDate: '2024-12-31T00:00:00Z',
      notes: 'Initial schedule of values approved',
    })

    const document2 = await firebaseService.createDocument({
      projectId: project1.id,
      name: 'General Liability Insurance',
      category: 'insurance',
      fileUrl: 'https://example.com/insurance.pdf',
      fileName: 'GL_Insurance_2024.pdf',
      version: 1,
      status: 'approved',
      expirationDate: '2024-12-31T00:00:00Z',
      notes: 'Current GL insurance certificate',
    })

    console.log('Created documents:', document1, document2)

    console.log('✅ Test data creation completed successfully!')

    return {
      clients: [client1, client2],
      users: [user1, user2],
      projects: [project1, project2, project3],
      rfis: [rfi1, rfi2],
      submittals: [submittal1],
      changeOrders: [changeOrder1, changeOrder2],
      documents: [document1, document2],
    }
  } catch (error) {
    console.error('❌ Error creating test data:', error)
    throw error
  }
}

// Usage: Call this function from a Vue component or browser console
// populateTestData().then(data => console.log('All test data:', data))
