'use client'

import { Toaster } from 'sonner'

export function ToastProvider() {
  return (
    <Toaster 
      position="top-center"
      dir="rtl"
      richColors
      closeButton
      toastOptions={{
        style: {
          fontFamily: 'Heebo, sans-serif',
          fontSize: '14px',
        },
        duration: 3000,
      }}
    />
  )
}
