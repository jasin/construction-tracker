// router/authGuard.js
import authService from '@/services/auth/authService'

export const requireAuth = (to, from, next) => {
  if (authService.isAuthenticated()) {
    next()
  } else {
    next('/login')
  }
}

export const requireRole = (roles) => {
  return (to, from, next) => {
    if (!authService.isAuthenticated()) {
      next('/login')
      return
    }

    const userRole = authService.userProfile?.role
    if (roles.includes(userRole)) {
      next()
    } else {
      next('/unauthorized')
    }
  }
}

export const requirePermission = (permission) => {
  return (to, from, next) => {
    if (!authService.isAuthenticated()) {
      next('/login')
      return
    }

    const permissions = authService.getPermissions()
    if (permissions[permission]) {
      next()
    } else {
      next('/unauthorized')
    }
  }
}

export const redirectIfAuthenticated = (to, from, next) => {
  if (authService.isAuthenticated()) {
    next('/')
  } else {
    next()
  }
}
