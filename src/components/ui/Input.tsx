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
  applyDraftSign,
  caretPositionForTokens,
  caretTokenCount,
  draftIsNegative,
  formatDecimalDisplay,
  formatGroupedInput,
  parseDecimalDraft,
  parseMoney,
  sanitizeDecimalDraft,
} from '@/utils/currency'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  suffix?: string
  prefix?: string
  grouped?: boolean
  /** Show a +/- control; allowSignedTyping additionally enables typed signs. */
  signed?: boolean
  /** Preserve typed/pasted minus signs; callers validate the permitted range. */
  allowSignedTyping?: boolean
  /** Keep required numeric fields empty instead of silently replacing them with zero. */
  emptyAsNaN?: boolean
  onValueChange?: (value: number) => void
}

function numericFrom(value: InputHTMLAttributes<HTMLInputElement>['value']): number {
  if (typeof value === 'number') return value
  return parseMoney(String(value ?? ''))
}

function initialDisplay(
  value: InputHTMLAttributes<HTMLInputElement>['value'],
  grouped: boolean,
  emptyAsNaN = false,
): string {
  if (emptyAsNaN && (value === '' || value === undefined || (typeof value === 'number' && Number.isNaN(value)))) return ''
  const n = numericFrom(value)
  return grouped ? formatGroupedInput(n) : formatDecimalDisplay(n)
}

function notifyChange(
  el: HTMLInputElement,
  numericValue: number,
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void,
) {
  if (!onChange) return
  el.value = String(numericValue)
  onChange({
    target: el,
    currentTarget: el,
  } as ChangeEvent<HTMLInputElement>)
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
      signed = false,
      allowSignedTyping = false,
      emptyAsNaN = false,
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
    const isNumberType = type === 'number'
    const useDraft = grouped || isNumberType
    const [display, setDisplay] = useState(() => initialDisplay(value, grouped, emptyAsNaN))

    useEffect(() => {
      if (!useDraft || focusedRef.current) return
      setDisplay(initialDisplay(value, grouped, emptyAsNaN))
    }, [grouped, useDraft, value, emptyAsNaN])

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
      let raw = allowSignedTyping ? e.target.value.replace(/−/g, '-') : e.target.value
      if (!allowSignedTyping) {
        // Magnitude-only fields (and toggle-managed signs) should not keep a typed minus.
        const stripped = raw.replace(/-/g, '')
        raw = signed ? applyDraftSign(stripped, draftIsNegative(display)) : stripped
      }
      pendingTokens.current = caretTokenCount(raw, e.target.selectionStart ?? raw.length)
      const next = formatGroupedInput(raw)
      setDisplay(next)
      onValueChange?.(raw === '' || raw === '-' ? (emptyAsNaN ? NaN : 0) : parseMoney(next))
      onChange?.(e)
    }

    const handleDecimalChange = (e: ChangeEvent<HTMLInputElement>) => {
      let raw = allowSignedTyping ? e.target.value.replace(/−/g, '-') : e.target.value
      if (allowSignedTyping) {
        raw = sanitizeDecimalDraft(raw, { allowSign: true })
      } else if (signed) {
        raw = applyDraftSign(
          sanitizeDecimalDraft(raw, { allowSign: false }),
          draftIsNegative(display),
        )
      } else {
        raw = sanitizeDecimalDraft(raw, { allowSign: false })
      }
      setDisplay(raw)
      const empty = raw === '' || raw === '-' || raw === '.' || raw === '-.'
      onValueChange?.(empty ? (emptyAsNaN ? NaN : 0) : emptyAsNaN ? Number(raw) : parseDecimalDraft(raw))
      if (onChange) {
        const valueForParent = empty ? '' : raw
        onChange({
          target: { value: valueForParent },
          currentTarget: { value: valueForParent },
        } as ChangeEvent<HTMLInputElement>)
      }
    }

    const toggleSign = () => {
      const current = grouped ? parseMoney(display) : parseDecimalDraft(display)
      const currentlyNeg = draftIsNegative(display) || current < 0
      const nextNeg = !currentlyNeg
      const magnitude = Math.abs(current)
      const nextValue = nextNeg ? -magnitude : magnitude

      if (grouped) {
        const nextDisplay =
          nextValue === 0 && nextNeg ? '-0' : formatGroupedInput(nextValue)
        setDisplay(nextDisplay)
        onValueChange?.(nextValue)
        if (innerRef.current) notifyChange(innerRef.current, nextValue, onChange)
        return
      }

      const body = sanitizeDecimalDraft(display.replace(/^-/, ''), { allowSign: false })
      let nextDisplay: string
      if (body === '' || body === '0') {
        nextDisplay = nextNeg ? '-0' : '0'
      } else if (body === '0.') {
        nextDisplay = nextNeg ? '-0.' : '0.'
      } else {
        nextDisplay = applyDraftSign(body, nextNeg)
      }
      setDisplay(nextDisplay)
      onValueChange?.(nextValue)
      if (innerRef.current) notifyChange(innerRef.current, nextValue, onChange)
    }

    const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
      focusedRef.current = true
      onFocus?.(e)
    }

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
      focusedRef.current = false
      if (useDraft) setDisplay(initialDisplay(value, grouped, emptyAsNaN))
      onBlur?.(e)
    }

    const negative = draftIsNegative(display) || (typeof value === 'number' && value < 0)

    const resolvedInputMode =
      inputMode ?? (grouped || isNumberType || suffix === '%' ? 'decimal' : undefined)

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text-primary">
            {label}
          </label>
        )}
        <div className={cn('flex items-center gap-2', signed && 'min-w-0')}>
          {signed && (
            <button
              type="button"
              className={cn(
                'h-11 w-11 shrink-0 rounded-xl border border-border bg-white text-base font-medium tabular-nums',
                'text-text-primary hover:bg-surface-lighter',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary',
              )}
              aria-label={negative ? 'Negative value' : 'Positive value'}
              aria-pressed={negative}
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleSign}
            >
              {negative ? '−' : '+'}
            </button>
          )}
          <div className="relative min-w-0 flex-1">
            {prefix && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
                {prefix}
              </span>
            )}
            <input
              ref={assignRef}
              id={inputId}
              aria-invalid={!!error}
              aria-describedby={[hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(' ') || undefined}
              className={cn(
                'w-full h-11 rounded-xl border border-border bg-white px-3 text-text-primary text-base',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary',
                'tabular-nums placeholder:text-text-muted',
                prefix && 'pl-8',
                suffix && 'pr-10',
                error && 'border-red-400 focus:border-red-400 focus:ring-red-200',
                className,
              )}
              {...props}
              type={useDraft ? 'text' : type}
              inputMode={resolvedInputMode}
              autoComplete={useDraft ? 'off' : autoComplete}
              value={useDraft ? display : value}
              onChange={
                grouped
                  ? handleGroupedChange
                  : isNumberType
                    ? handleDecimalChange
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
        </div>
        {hint && <p id={`${inputId}-hint`} className="text-sm text-text-muted">{hint}</p>}
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'
