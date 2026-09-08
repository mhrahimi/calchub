import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
} from 'react'
import { cn } from '@/utils/cn'
import {
  caretPositionForTokens,
  caretTokenCount,
  formatGroupedInput,
  parseMoney,
} from '@/utils/currency'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  suffix?: string
  prefix?: string
  grouped?: boolean
  onValueChange?: (value: number) => void
}

function numericFrom(value: InputHTMLAttributes<HTMLInputElement>['value']): number {
  if (typeof value === 'number') return value
  return parseMoney(String(value ?? ''))
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      hint,
      suffix,
      prefix,
      id,
      grouped = false,
      onValueChange,
      onChange,
      onBlur,
      onFocus,
      value,
      type,
      inputMode,
      autoComplete,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    const innerRef = useRef<HTMLInputElement>(null)
    const focusedRef = useRef(false)
    const pendingTokens = useRef<number | null>(null)
    const [display, setDisplay] = useState(() => formatGroupedInput(numericFrom(value)))

    useEffect(() => {
      if (!grouped || focusedRef.current) return
      setDisplay(formatGroupedInput(numericFrom(value)))
    }, [grouped, value])

    useLayoutEffect(() => {
      if (!grouped || pendingTokens.current === null) return
      const node = innerRef.current
      if (!node) return
      const pos = caretPositionForTokens(display, pendingTokens.current)
      node.setSelectionRange(pos, pos)
      pendingTokens.current = null
    }, [display, grouped])

    const assignRef = (node: HTMLInputElement | null) => {
      innerRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    }

    const handleGroupedChange = (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      pendingTokens.current = caretTokenCount(raw, e.target.selectionStart ?? raw.length)
      const next = formatGroupedInput(raw)
      setDisplay(next)
      onValueChange?.(raw === '' || raw === '-' ? 0 : parseMoney(next))
      onChange?.(e)
    }

    const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
      focusedRef.current = true
      onFocus?.(e)
    }

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
      focusedRef.current = false
      if (grouped) setDisplay(formatGroupedInput(numericFrom(value)))
      onBlur?.(e)
    }

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text-primary">
            {label}
          </label>
        )}
        <div className="relative">
          {prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
              {prefix}
            </span>
          )}
          <input
            ref={assignRef}
            id={inputId}
            className={cn(
              'w-full h-11 rounded-xl border border-border bg-white px-3 text-text-primary text-sm',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary',
              'tabular-nums placeholder:text-text-muted',
              prefix && 'pl-7',
              suffix && 'pr-10',
              error && 'border-red-400 focus:border-red-400 focus:ring-red-200',
              className,
            )}
            {...props}
            type={grouped ? 'text' : type}
            inputMode={grouped ? 'decimal' : inputMode}
            autoComplete={grouped ? 'off' : autoComplete}
            value={grouped ? display : value}
            onChange={
              grouped
                ? handleGroupedChange
                : (e) => {
                    onChange?.(e)
                    if (onValueChange) onValueChange(e.target.value === '' ? 0 : +e.target.value)
                  }
            }
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
              {suffix}
            </span>
          )}
        </div>
        {hint && (
          <p className="text-sm text-text-muted">{hint}</p>
        )}
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'
