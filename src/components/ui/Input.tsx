import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, hint, startIcon, endIcon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.replace(/\s/g, '-').toLowerCase()
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
            {label}
            {props.required && <span className="text-red-500 mr-1">*</span>}
          </label>
        )}
        <div className="relative">
          {startIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {startIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-9 border rounded-lg text-sm bg-white text-gray-900 transition-all',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              'placeholder:text-gray-400',
              'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
              startIcon ? 'pr-9 pl-3' : 'px-3',
              endIcon   ? 'pl-9'    : '',
              error
                ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
                : 'border-gray-300',
              className,
            )}
            {...props}
          />
          {endIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {endIcon}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
