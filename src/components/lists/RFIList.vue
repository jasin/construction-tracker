<template>
  <div class="rfi-list">
    <div v-if="!rfis || Object.keys(rfis).length === 0" class="no-data">
      No RFIs found for this project.
    </div>
    <ul v-else class="rfi-items">
      <li v-for="(rfi, rfiKey) in rfis" :key="rfi.rfiId" class="rfi-item">
        <div class="rfi-header">
          <strong>{{ rfi.title }}</strong> ({{ rfi.status }})
        </div>
        <div class="rfi-details">
          <p><strong>Description:</strong> {{ rfi.description }}</p>
          <p><strong>Priority:</strong> {{ rfi.priority }}</p>
          <p>
            <strong>Submitted By:</strong> {{ rfi.submittedBy }} on
            {{ formatDate(rfi.submittedDate) }}
          </p>
          <p><strong>Assigned To:</strong> {{ rfi.assignedTo }}</p>
          <p><strong>Due Date:</strong> {{ formatDate(rfi.dueDate) }}</p>
          <p v-if="rfi.response"><strong>Response:</strong> {{ rfi.response }}</p>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'RFIList',
  props: {
    rfis: {
      type: Object,
      default: () => ({}),
    },
    projectId: {
      type: String,
      required: true,
    },
  },
  methods: {
    formatDate(isoString) {
      return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    },
  },
}
</script>

<style scoped>
.rfi-list {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.no-data {
  text-align: center;
  padding: 20px;
  color: #666;
}

.rfi-items {
  list-style: none;
  padding: 0;
}

.rfi-item {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  background-color: #f9f9f9;
}

.rfi-header {
  font-size: 18px;
  margin-bottom: 10px;
}

.rfi-details p {
  margin: 5px 0;
  color: #555;
}
</style>
