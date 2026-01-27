import { toast } from 'sonner'

/**
 * Success toast - הצלחה
 */
export function showSuccess(message: string) {
  toast.success(message, {
    duration: 3000,
    style: {
      fontFamily: 'Heebo, sans-serif',
      direction: 'rtl',
    }
  })
}

/**
 * Error toast - שגיאה
 */
export function showError(message: string) {
  toast.error(message, {
    duration: 4000,
    style: {
      fontFamily: 'Heebo, sans-serif',
      direction: 'rtl',
    }
  })
}

/**
 * Info toast - מידע
 */
export function showInfo(message: string) {
  toast.info(message, {
    duration: 3000,
    style: {
      fontFamily: 'Heebo, sans-serif',
      direction: 'rtl',
    }
  })
}

/**
 * Warning toast - אזהרה
 */
export function showWarning(message: string) {
  toast.warning(message, {
    duration: 3500,
    style: {
      fontFamily: 'Heebo, sans-serif',
      direction: 'rtl',
    }
  })
}

/**
 * Loading toast - טעינה
 */
export function showLoading(message: string) {
  return toast.loading(message, {
    style: {
      fontFamily: 'Heebo, sans-serif',
      direction: 'rtl',
    }
  })
}

/**
 * Promise toast - עם promise
 */
export async function showPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string
    error: string
  }
) {
  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
    style: {
      fontFamily: 'Heebo, sans-serif',
      direction: 'rtl',
    }
  })
}
