import { type ReactNode } from 'react'
import { FormattedAmount } from '@/components/ui/FormattedAmount'
import { useSnapshotCurrency } from '@/components/calculator/SnapshotFormat'
import { seriesColor } from '@/utils/chartPresentation'
import { cn } from '@/utils/cn'

export const ESTIMATE_TITLE_ID = 'estimate-title'

export function focusEstimate(id = ESTIMATE_TITLE_ID) {
  const heading = document.getElementById(id)
  heading?.focus({ preventScroll: true })
  heading?.scrollIntoView({
    block: 'start',
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  })
}

export function CalcSection({ index, title, children }: { index: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="calc-fieldset">
      <legend><span>{String(index).padStart(2, '0')}</span>{title}</legend>
      {children}
    </fieldset>
  )
}

export function HeroResult({
  eyebrow,
  eyebrowRight,
  title,
  titleId = ESTIMATE_TITLE_ID,
  amount,
  unit,
  caption,
  children,
}: {
  eyebrow: string
  eyebrowRight?: string
  title: string
  titleId?: string
  amount: ReactNode
  unit?: string
  caption?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="calc-hero" aria-labelledby={titleId}>
      <div className="calc-eyebrow">
        <span>{eyebrow}</span>
        {eyebrowRight && <span>{eyebrowRight}</span>}
      </div>
      <h2 id={titleId} tabIndex={-1}>{title}</h2>
      <p className="calc-hero-amount">{amount}{unit && <span className="calc-hero-unit">{unit}</span>}</p>
      {caption}
      {children}
    </section>
  )
}

export function KeyMetrics({ items }: {
  items: { icon?: ReactNode; label: string; value: ReactNode; note?: ReactNode }[]
}) {
  return (
    <dl className="calc-key-metrics">
      {items.map(item => (
        <div key={item.label}>
          <dt>{item.icon}{item.label}</dt>
          <dd>{item.value}</dd>
          {item.note && <span>{item.note}</span>}
        </div>
      ))}
    </dl>
  )
}

export function ResultViews<T extends string>({
  views,
  value,
  onChange,
  label,
  children,
}: {
  views: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
  children: ReactNode
}) {
  return (
    <>
      <nav className="calc-view-nav" aria-label={label}>
        {views.map(view => (
          <button
            key={view.value}
            type="button"
            aria-pressed={value === view.value}
            aria-controls="calc-result-view"
            onClick={() => onChange(view.value)}
          >
            {view.label}
          </button>
        ))}
      </nav>
      <div id="calc-result-view">{children}</div>
    </>
  )
}

export function Panel({ title, aside, className, children }: {
  title?: string
  aside?: ReactNode
  className?: string
  children?: ReactNode
}) {
  return (
    <section className={cn('calc-panel', className)}>
      {(title || aside) && <SectionHeading title={title} aside={aside} />}
      {children}
    </section>
  )
}

export function SectionHeading({ title, aside }: { title?: string; aside?: ReactNode }) {
  return (
    <div className="calc-section-heading">
      {title && <h3>{title}</h3>}
      {aside && <span>{aside}</span>}
    </div>
  )
}

export function CostBreakdown({ slices, title, note, showTotal, colorFor }: {
  slices: { label: string; amount: number; percent: number }[]
  title: string
  note?: string
  showTotal?: boolean
  colorFor?: (label: string) => string
}) {
  const money = useSnapshotCurrency()
  const color = colorFor ?? ((label: string) => seriesColor(label))
  return (
    <Panel title={title} aside={showTotal ? <>Total <FormattedAmount value={money(slices.reduce((sum, slice) => sum + slice.amount, 0))} /></> : undefined}>
      <div className="calc-cost-bar" aria-hidden="true">
        {slices.map(slice => <span key={slice.label} style={{ width: `${slice.percent}%`, background: color(slice.label) }} />)}
      </div>
      <dl className="calc-cost-list">
        {slices.map(slice => (
          <div key={slice.label}>
            <dt><span className="calc-dot" style={{ background: color(slice.label) }} />{slice.label}</dt>
            <dd>
              <span className="calc-cost-share">{slice.percent.toFixed(1)}%</span>
              <strong><FormattedAmount value={money(slice.amount)} /></strong>
            </dd>
          </div>
        ))}
      </dl>
      {note && <p className="calc-note">{note}</p>}
    </Panel>
  )
}

export function UnitSwitch<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  label: string
}) {
  return (
    <div className="calc-unit-switch" role="group" aria-label={label}>
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function PresetRow<T extends string | number>({
  options,
  isActive,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  isActive: (value: T) => boolean
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className="calc-presets" role="group" aria-label={label}>
      {options.map(option => (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={isActive(option.value)}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}) {
  return (
    <label className="calc-toggle">
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
      <span>{label}{description && <small>{description}</small>}</span>
    </label>
  )
}

export function Assumptions({
  title = 'What this estimate includes',
  items,
  source,
}: {
  title?: string
  items: ReactNode[]
  source?: { href: string; label: string }
}) {
  return (
    <details className="calc-details calc-assumptions">
      <summary>{title}</summary>
      <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul>
      {source && (
        <a href={source.href} target="_blank" rel="noreferrer">
          {source.label} <span aria-hidden="true">↗</span>
        </a>
      )}
    </details>
  )
}

export function JumpToResult({ visible, label = 'View your estimate' }: { visible: boolean; label?: string }) {
  if (!visible) return null
  return (
    <button type="button" className="calc-jump" onClick={() => focusEstimate()}>
      {label} <span aria-hidden="true">↓</span>
    </button>
  )
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="calc-note">{children}</p>
}
