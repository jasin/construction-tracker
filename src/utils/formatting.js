// Date formatting utilities
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return 'N/A'

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }

  try {
    return new Date(dateString).toLocaleDateString('en-US', { ...defaultOptions, ...options })
  } catch (err) {
    console.error('Error formatting date:', err)
    return 'Invalid Date'
  }
}

// Currency formatting
export const formatCurrency = (amount, currency = 'USD') => {
  if (!amount && amount !== 0) return '$0'

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  } catch (err) {
    return `$${new Intl.NumberFormat('en-US').format(amount || 0)}`
  }
}

// File size formatting
export const formatFileSize = (bytes, decimals = 2) => {
  if (!bytes && bytes !== 0) return '0 B'
  if (bytes === 0) return '0 B'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}