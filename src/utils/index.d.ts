// Type declarations for utils/index.js

export interface SanitizeOptions {
  removeEmpty?: boolean
  removeNull?: boolean
  removeUndefined?: boolean
  trimStrings?: boolean
  convertDates?: boolean
  preserveArrays?: boolean
  excludeKeys?: string[]
}

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
  cleanData: Record<string, any>
}

// Sanitization functions
export function sanitizeData(data: any, options?: SanitizeOptions): any
export function sanitizeForFirebase(data: any): any
export function sanitizeForAPI(data: any): any
export function toPlainObject(data: any): any
export function deepClean(data: any): any
export function validateAndCleanForm(data: Record<string, any>, requiredFields?: string[]): ValidationResult
export function sanitizeWithSchema(data: Record<string, any>, schema: Record<string, string>): any

// Lookup functions
export function createLookupMap(items: any[], idField?: string, nameField?: string): Map<string, string>
export function getClientName(clientId: string, clients: any[]): string
export function getUserName(userId: string, users: any[]): string
export function getProjectName(projectId: string, projects: any[]): string

// Formatting functions
export function formatDate(dateString: string | Date, options?: Intl.DateTimeFormatOptions): string
export function formatTimeAgo(timestamp: string | Date): string
export function formatCurrency(amount: number, currency?: string): string
export function formatNumber(num: number): string
export function formatTaskStatus(status: string): string
export function formatPhase(phase: string): string
export function formatRole(role: string): string
export function formatCategory(category: string): string
export function formatFileSize(bytes: number): string
export function formatFileSizeDetailed(bytes: number): string
export function getFileSizeCategory(bytes: number): string

// Utility functions
export function isOverdue(dueDate: string | Date): boolean
export function getInitials(name: string): string
export function getPriorityClasses(priority: string): string
export function getStatusClasses(status: string): string
export function getRoleClasses(role: string): string
export function getActivityIconClass(action: string): string
export function getActivityIcon(action: string): string
export function ensureArray<T>(value: T | T[] | null | undefined): T[]
export function groupBy<T>(array: T[], key: string): Record<string, T[]>
export function sortByPriorityAndDate(a: any, b: any): number

// Validation functions
export function isValidEmail(email: string): boolean
export function isNotEmpty(value: any): boolean
export function validateRequired(data: Record<string, any>, requiredFields: string[]): ValidationResult

// Storage functions
export function getStorageItem<T = any>(key: string): T | null
export function setStorageItem(key: string, value: any): void
export function removeStorageItem(key: string): void
