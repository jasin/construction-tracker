import { createRouter, createWebHistory } from 'vue-router'
import ProjectTree from '@/components/ProjectTree.vue'
import ProjectDashboard from '@/components/ProjectDashboard.vue'

const routes = [
  {
    path: '/',
    name: 'ProjectTree',
    component: ProjectTree,
  },
  {
    path: '/project/:projectId',
    name: 'ProjectDashboard',
    component: ProjectDashboard,
    props: true,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
