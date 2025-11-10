<template>
  <button
    class="dashboard-section-btn"
    :class="{ active: isActive }"
    @click="$emit('click')"
  >
    <div class="icon-wrapper">
      <i :class="icon" class="text-2xl"></i>
      <Badge v-if="badge" :value="badge" severity="danger" class="absolute -top-1 -right-1" />
    </div>
    <span class="label">{{ label }}</span>
  </button>
</template>

<script setup>
import Badge from 'primevue/badge';

defineProps({
  icon: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  badge: {
    type: [Number, String],
    default: null
  },
  isActive: {
    type: Boolean,
    default: false
  }
});

defineEmits(['click']);
</script>

<style scoped>
.dashboard-section-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 0.75rem;
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 100px;
  position: relative;
}

.dashboard-section-btn:hover {
  background: var(--p-primary-50);
  border-color: var(--p-primary-300);
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.dashboard-section-btn.active {
  background: var(--p-primary-500);
  border-color: var(--p-primary-600);
  color: white;
}

.icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.label {
  font-size: 0.875rem;
  font-weight: 600;
  text-align: center;
  line-height: 1.2;
}

@media (prefers-color-scheme: dark) {
  .dashboard-section-btn {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
  }

  .dashboard-section-btn:hover {
    background: var(--p-surface-700);
    border-color: var(--p-primary-400);
  }

  .dashboard-section-btn.active {
    background: var(--p-primary-600);
    border-color: var(--p-primary-500);
  }
}
</style>
