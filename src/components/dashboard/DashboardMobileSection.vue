<template>
  <div class="mobile-section-view">
    <div class="mobile-section-header">
      <Button
        icon="pi pi-arrow-left"
        text
        rounded
        @click="$emit('back')"
        class="back-button"
      />
      <h2 class="section-title">{{ title }}</h2>
      <div class="spacer"></div>
    </div>
    <div class="mobile-section-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import Button from 'primevue/button';

defineProps({
  title: {
    type: String,
    required: true
  }
});

defineEmits(['back']);
</script>

<style scoped>
.mobile-section-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.mobile-section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--p-surface-0);
  border-bottom: 1px solid var(--p-surface-200);
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-button {
  flex-shrink: 0;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  flex-grow: 1;
  text-align: center;
}

.spacer {
  width: 2.5rem;
  flex-shrink: 0;
}

.mobile-section-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
}

@media (prefers-color-scheme: dark) {
  .mobile-section-header {
    background: var(--p-surface-900);
    border-bottom-color: var(--p-surface-700);
  }
}
</style>
