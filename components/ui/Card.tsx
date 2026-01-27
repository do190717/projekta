import { cn } from '@/lib/cn'
import { HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  border?: boolean
  hover?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = 'lg', shadow = 'sm', border = true, hover = false, children, ...props }, ref) => {
    const baseClasses = 'bg-white rounded-2xl transition-all duration-200'
    
    const paddingClasses = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    }
    
    const shadowClasses = {
      none: '',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
    }
    
    const borderClass = border ? 'border border-gray-100' : ''
    const hoverClass = hover ? 'hover:shadow-md hover:border-indigo-200' : ''
    
    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          paddingClasses[padding],
          shadowClasses[shadow],
          borderClass,
          hoverClass,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export default Card
