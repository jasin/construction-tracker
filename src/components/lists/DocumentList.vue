<template>
  <div class="document-list">
    <div class="document-list-header">
      <h3 class="text-base font-semibold text-surface-900">{{ title }}</h3>
    </div>

    <div class="document-list-content">
      <div v-if="loading" class="flex justify-center py-8">
        <ProgressSpinner style="width: 50px; height: 50px" />
      </div>

      <div v-else-if="documents.length === 0" class="text-center py-8 text-surface-500">
        <i class="pi pi-inbox text-4xl mb-3"></i>
        <p>No documents yet</p>
        <p class="text-sm">Click + to upload your first document</p>
      </div>

      <div v-else class="task-accordion">
        <div
          v-for="document in documents"
          :key="document.id"
          class="task-accordion-panel"
          :class="[
            { 'is-expanded': expandedDocumentId === document.id },
            getStatusClass(document.status),
          ]"
          @click="toggleExpanded(document.id)"
        >
          <div class="task-accordion-header">
            <div class="task-row">
              <div class="task-title-area">
                <i :class="getFileIcon(document)" class="text-sm mr-2 flex-shrink-0"></i>
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <span class="task-title truncate">
                    {{ getProjectInfo(document.projectId) }}
                  </span>
                  <span class="text-xs text-surface-600 flex-shrink-0">•</span>
                  <Tag
                    v-if="document.category"
                    :value="formatCategory(document.category)"
                    size="small"
                    severity="info"
                    class="text-[10px] font-normal flex-shrink-0"
                  />
                  <span v-if="document.notes" class="text-xs text-surface-500 truncate">
                    - {{ document.notes }}
                  </span>
                </div>
              </div>

              <div class="task-actions" @click.stop>
                <Button
                  icon="pi pi-eye"
                  severity="secondary"
                  text
                  rounded
                  size="small"
                  @click="$emit('view-document', document)"
                  v-tooltip.top="'View Document'"
                />
                <Button
                  icon="pi pi-pencil"
                  severity="secondary"
                  text
                  rounded
                  size="small"
                  @click="$emit('edit-document', document)"
                  v-tooltip.top="'Edit Document'"
                />
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  rounded
                  size="small"
                  @click="$emit('delete-document', document)"
                  v-tooltip.top="'Delete Document'"
                />
              </div>
            </div>
          </div>

          <div
            v-if="expandedDocumentId === document.id"
            class="task-accordion-content"
            @click.stop="$emit('document-click', document)"
          >
            <div class="document-expanded-title">
              <i :class="getFileIcon(document)" class="text-sm mr-2"></i>
              {{ document.name }}
            </div>

            <div class="task-tags-row" @click.stop>
              <Tag
                :severity="getStatusSeverity(document.status)"
                :value="formatStatus(document.status)"
                size="small"
                class="text-[10px] font-normal"
              />
              <Tag
                v-if="document.category"
                :value="formatCategory(document.category)"
                size="small"
                severity="secondary"
                class="text-[10px] font-normal"
              />
            </div>

            <div v-if="document.fileSize" class="task-due-date">
              <i class="pi pi-file text-xs"></i>
              <span class="text-xs text-surface-700">
                Size: {{ formatFileSize(document.fileSize) }}
              </span>
            </div>

            <div v-if="document.uploadedByName" class="task-due-date">
              <i class="pi pi-user text-xs"></i>
              <span class="text-xs text-surface-700">
                Uploaded by: {{ document.uploadedByName }}
              </span>
            </div>

            <div v-if="document.uploadedAt" class="task-due-date">
              <i class="pi pi-calendar text-xs"></i>
              <span class="text-xs text-surface-700">
                Uploaded: {{ formatDate(document.uploadedAt) }}
              </span>
            </div>

            <div v-if="document.version" class="task-due-date">
              <i class="pi pi-bookmark text-xs"></i>
              <span class="text-xs text-surface-700"> Version: {{ document.version }} </span>
            </div>

            <div v-if="document.notes" class="task-description">
              <div class="text-xs font-semibold text-surface-700 mb-1">Notes:</div>
              {{ document.notes }}
            </div>

            <div class="task-expanded-actions">
              <Button
                icon="pi pi-eye"
                severity="secondary"
                text
                rounded
                size="small"
                @click.stop="$emit('view-document', document)"
                v-tooltip.top="'View Document'"
              />
              <Button
                icon="pi pi-pencil"
                severity="secondary"
                text
                rounded
                size="small"
                @click.stop="$emit('edit-document', document)"
                v-tooltip.top="'Edit Document'"
              />
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                size="small"
                @click.stop="$emit('delete-document', document)"
                v-tooltip.top="'Delete Document'"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';

const props = defineProps({
  documents: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Documents',
  },
  projects: {
    type: Array,
    default: () => [],
  },
});

defineEmits([
  'create-document',
  'document-click',
  'view-document',
  'edit-document',
  'delete-document',
]);

const expandedDocumentId = ref(null);

const toggleExpanded = (id) => {
  expandedDocumentId.value = expandedDocumentId.value === id ? null : id;
};

const getStatusSeverity = (status) => {
  const severityMap = {
    pending: 'warn',
    approved: 'success',
    rejected: 'danger',
    archived: 'secondary',
  };
  return severityMap[status] || 'secondary';
};

const formatStatus = (status) => {
  if (!status) return '';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const formatCategory = (category) => {
  if (!category) return '';
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';

  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const getFileIcon = (document) => {
  const fileName = document.name || '';
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  const iconMap = {
    pdf: 'pi pi-file-pdf',
    doc: 'pi pi-file-word',
    docx: 'pi pi-file-word',
    xls: 'pi pi-file-excel',
    xlsx: 'pi pi-file-excel',
    ppt: 'pi pi-file',
    pptx: 'pi pi-file',
    jpg: 'pi pi-image',
    jpeg: 'pi pi-image',
    png: 'pi pi-image',
    gif: 'pi pi-image',
    zip: 'pi pi-folder',
    rar: 'pi pi-folder',
    txt: 'pi pi-file-edit',
    csv: 'pi pi-file',
  };

  return iconMap[extension] || 'pi pi-file';
};

const getStatusClass = (status) => {
  const classMap = {
    pending: 'doc-pending',
    approved: 'doc-approved',
    rejected: 'doc-rejected',
    archived: 'doc-archived',
  };
  return classMap[status] || '';
};

const getProjectInfo = (projectId) => {
  const project = props.projects.find((p) => p.id === projectId);
  if (!project) return 'Unknown Project';

  return `${project.jobNumber} - ${project.name}`;
};
</script>

<style scoped>
@import '@/styles/list-styles.css';

/* Component-specific styles only */
.document-list {
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.5rem;
  padding: 1rem;
  height: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.document-list-content {
  overflow-y: scroll;
  overflow-x: hidden;
  flex: 1 1 auto;
  min-height: 0;
}

/* Subtle scrollbar styling */
.document-list-content::-webkit-scrollbar {
  width: 6px;
}

.document-list-content::-webkit-scrollbar-track {
  background: transparent;
}

.document-list-content::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.document-list-content::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.2);
}

/* Firefox */
.document-list-content {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
}

/* Expanded title styling */
.document-expanded-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--p-surface-900);
  margin-bottom: 0.75rem;
  display: none; /* Hidden by default on desktop */
}

.document-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.375rem;
}

/* Status-based left border colors */
.task-accordion-panel.doc-pending {
  border-left: 3px solid #f59e0b; /* Orange */
}

.task-accordion-panel.doc-approved {
  border-left: 3px solid #22c55e; /* Green */
}

.task-accordion-panel.doc-rejected {
  border-left: 3px solid #ef4444; /* Red */
}

.task-accordion-panel.doc-archived {
  border-left: 3px solid #6b7280; /* Gray */
  opacity: 0.7;
}

/* Mobile: Hide header, show expanded title, hide panel header when expanded */
@media (max-width: 767px) {
  .document-expanded-title {
    display: block;
  }

  .task-accordion-panel.is-expanded .task-accordion-header {
    display: none;
  }

  .task-accordion-panel.is-expanded .task-accordion-content {
    padding-left: 0.5rem;
  }
}

@media (prefers-color-scheme: dark) {
  .document-list {
    border-color: var(--p-surface-700);
  }

  .document-list-content::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .document-list-content::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }

  .document-list-content {
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }

  .document-expanded-title {
    color: var(--p-surface-0);
  }
}
</style>
