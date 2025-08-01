<template>
  <div>
    <h2>Project: {{ project.name || 'Loading...' }}</h2>
    <div v-if="error" class="error">{{ error }}</div>
    <h3>RFIs</h3>
    <RFIList :rfis="rfis" :projectId="projectId" />
    <h3>Submittals</h3>
    <SubmittalList :submittals="submittals" :projectId="projectId" />
  </div>
</template>

<script>
import { getDatabase, ref, onValue, off } from 'firebase/database'
import RFIList from './RFIList.vue'
import SubmittalList from './SubmittalList.vue'

export default {
  props: {
    projectId: {
      type: String,
      required: true,
    },
  },
  components: { RFIList, SubmittalList },
  data() {
    return {
      project: { name: '' },
      rfis: {},
      submittals: {},
      error: null,
    }
  },
  mounted() {
    const db = getDatabase()
    // Fetch project
    const projectRef = ref(db, `projects/${this.projectId}`)
    onValue(
      projectRef,
      (snapshot) => {
        this.project = snapshot.val() || { name: '' }
        if (!snapshot.val()) {
          this.error = 'Project not found'
        }
      },
      (error) => {
        this.error = error.message
      },
    )

    // Fetch RFIs
    const rfisRef = ref(db, 'rfis')
    onValue(
      rfisRef,
      (snapshot) => {
        const data = snapshot.val()
        this.rfis = data
          ? Object.fromEntries(
              Object.entries(data).filter(([_, rfi]) => rfi.projectId === this.projectId),
            )
          : {}
      },
      (error) => {
        this.error = error.message
      },
    )

    // Fetch Submittals
    const submittalsRef = ref(db, 'submittals')
    onValue(
      submittalsRef,
      (snapshot) => {
        const data = snapshot.val()
        this.submittals = data
          ? Object.fromEntries(
              Object.entries(data).filter(
                ([_, submittal]) => submittal.projectId === this.projectId,
              ),
            )
          : {}
      },
      (error) => {
        this.error = error.message
      },
    )
  },
  beforeUnmount() {
    const db = getDatabase()
    off(ref(db, `projects/${this.projectId}`))
    off(ref(db, 'rfis'))
    off(ref(db, 'submittals'))
  },
}
</script>
