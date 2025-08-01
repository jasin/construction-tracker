<template>
  <div class="submittal-list">
    <div v-if="!submittals || Object.keys(submittals).length === 0" class="no-data">
      No submittals found for this project.
    </div>
    <ul v-else class="submittal-items">
      <li
        v-for="(submittal, submittalKey) in submittals"
        :key="submittal.submittalId"
        class="submittal-item"
      >
        <div class="submittal-header">
          <strong>{{ submittal.title }}</strong> ({{ submittal.status }})
        </div>
        <div class="submittal-details">
          <p>
            <strong>Submitted By:</strong> {{ submittal.submittedBy }} on
            {{ formatDate(submittal.submittedDate) }}
          </p>
          <p><strong>Reviewer:</strong> {{ submittal.reviewer }}</p>
          <p><strong>Due Date:</strong> {{ formatDate(submittal.dueDate) }}</p>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'SubmittalList',
  props: {
    submittals: {
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
.submittal-list {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.no-data {
  text-align: center;
  padding: 20px;
  color: #666;
}

.submittal-items {
  list-style: none;
  padding: 0;
}

.submittal-item {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  background-color: #f9f9f9;
}

.submittal-header {
  font-size: 18px;
  margin-bottom: 10px;
}

.submittal-details p {
  margin: 5px 0;
  color: #555;
}
</style>
