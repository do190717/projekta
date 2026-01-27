import { cn } from '@/lib/cn'
import { HTMLAttributes, forwardRef } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary'
  size?: 'sm' | 'md' | 'lg'
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', size = 'md', children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center gap-1 rounded-md font-semibold'
    
    const variantClasses = {
      success: 'bg-green-50 text-green-600',
      warning: 'bg-amber-50 text-amber-700',
      error: 'bg-red-50 text-red-600',
      info: 'bg-blue-50 text-blue-600',
      neutral: 'bg-gray-100 text-gray-600',
      primary: 'bg-indigo-50 text-indigo-600',
    }
    
    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-1.5 text-base',
    }
    
    return (
      <span
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export default Badge
