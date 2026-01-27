import { cn } from '@/lib/cn'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'warning' | 'success' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 cursor-pointer border-none outline-none disabled:opacity-50 disabled:cursor-not-allowed font-[Heebo,sans-serif]'
    
    const variantClasses = {
      primary: 'bg-indigo-500 text-white hover:bg-indigo-600 active:bg-indigo-700',
      secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 border border-gray-200',
      warning: 'bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700',
      success: 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700',
      danger: 'bg-red-100 text-red-500 hover:bg-red-500 hover:text-white active:bg-red-600 border-2 border-red-200 hover:border-red-500',
      ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200',
    }
    
    const sizeClasses = {
      sm: 'text-sm px-4 py-2',
      md: 'text-base px-6 py-3',
      lg: 'text-lg px-8 py-4',
    }
    
    return (
      <button
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
