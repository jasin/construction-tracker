// src/composables/useSupabaseRealtime.js
import { ref, onUnmounted } from 'vue'
import { supabase } from '@/configs/supabase'

/**
 * Composable for Supabase real-time subscriptions
 * Provides easy subscription to database table changes
 */
export function useSupabaseRealtime() {
  const subscriptions = ref([])
  const error = ref(null)

  /**
   * Subscribe to all changes on a table
   * @param {string} table - Table name (e.g., 'projects', 'tasks')
   * @param {Function} callback - Callback function (payload) => void
   * @param {Object} options - Subscription options
   * @param {string} options.event - Event type: 'INSERT', 'UPDATE', 'DELETE', or '*' for all
   * @param {Function} options.filter - Filter function (optional)
   * @returns {Function} Unsubscribe function
   */
  function subscribeToTable(table, callback, options = {}) {
    const { event = '*', filter } = options

    try {
      const channel = supabase
        .channel(`${table}-changes`)
        .on('postgres_changes',
          {
            event,
            schema: 'public',
            table
          },
          (payload) => {
            console.log(`📡 Supabase ${event} on ${table}:`, payload)

            // Apply optional filter
            if (filter && !filter(payload)) {
              return
            }

            callback(payload)
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Subscribed to ${table} changes`)
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Error subscribing to ${table}`)
            error.value = `Failed to subscribe to ${table}`
          }
        })

      // Store subscription for cleanup
      subscriptions.value.push(channel)

      // Return unsubscribe function
      return () => {
        supabase.removeChannel(channel)
        subscriptions.value = subscriptions.value.filter(sub => sub !== channel)
      }
    } catch (err) {
      console.error(`Error subscribing to ${table}:`, err)
      error.value = err.message
      return () => {} // Return no-op function
    }
  }

  /**
   * Subscribe to changes for a specific row (by primary key)
   * @param {string} table - Table name
   * @param {number} id - Row ID
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  function subscribeToRow(table, id, callback) {
    return subscribeToTable(table, callback, {
      filter: (payload) => payload.new?.id === id || payload.old?.id === id
    })
  }

  /**
   * Subscribe to changes filtered by a column value
   * @param {string} table - Table name
   * @param {string} column - Column name to filter by
   * @param {any} value - Value to match
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  function subscribeToFilter(table, column, value, callback) {
    return subscribeToTable(table, callback, {
      filter: (payload) => {
        const record = payload.new || payload.old
        return record && record[column] === value
      }
    })
  }

  /**
   * Cleanup all subscriptions
   */
  function cleanup() {
    subscriptions.value.forEach(channel => {
      supabase.removeChannel(channel)
    })
    subscriptions.value = []
    error.value = null
  }

  // Auto-cleanup on unmount
  onUnmounted(() => {
    cleanup()
  })

  return {
    subscribeToTable,
    subscribeToRow,
    subscribeToFilter,
    cleanup,
    error,
  }
}
