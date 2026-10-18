import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type KeypadCell = { id: string; content: ReactNode; span?: number }

/** One Tab stop per keypad; arrows move spatially among its buttons. */
export function KeypadGrid({ rows, label, columns = 4, className }: {
  rows: KeypadCell[][]; label: string; columns?: 3 | 4; className?: string
}) {
  const root = useRef<HTMLDivElement>(null)
  const activeId = useRef<string | null>(null)
  const activate = (button: HTMLButtonElement) => {
    activeId.current = button.closest<HTMLElement>('[data-key-id]')?.dataset.keyId ?? null
    root.current?.querySelectorAll('button').forEach((item) => { item.tabIndex = item === button ? 0 : -1 })
  }
  useLayoutEffect(() => {
    const buttons = Array.from(root.current?.querySelectorAll('button') ?? [])
    const active = buttons.find((button) => button.closest<HTMLElement>('[data-key-id]')?.dataset.keyId === activeId.current) ?? buttons[0]
    if (active) activate(active)
  }, [rows])
  return (
    <div ref={root} role="grid" aria-label={label} aria-colcount={columns} aria-rowcount={rows.length} className={cn('space-y-2', className)}
      onFocusCapture={(event) => { if (event.target instanceof HTMLButtonElement) activate(event.target) }}
      onKeyDown={(event) => {
        if (event.altKey || event.metaKey || event.shiftKey) return
        const button = event.target instanceof HTMLButtonElement ? event.target : null
        const cell = button?.closest<HTMLElement>('[role="gridcell"]')
        if (!cell || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
        const cells = Array.from(root.current!.querySelectorAll<HTMLElement>('[role="gridcell"]'))
        const row = Number(cell.dataset.row), column = Number(cell.dataset.column)
        let next: HTMLElement | undefined
        if (event.key === 'Home' || event.key === 'End') {
          const candidates = event.ctrlKey ? cells : cells.filter((item) => Number(item.dataset.row) === row)
          next = event.key === 'Home' ? candidates[0] : candidates.at(-1)
        } else if (!event.ctrlKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
          next = cells.find((item) => Number(item.dataset.row) === row && Number(item.dataset.column) === column + (event.key === 'ArrowLeft' ? -1 : Number(cell.dataset.span)))
          if (!next && event.key === 'ArrowLeft') next = cells.find((item) => Number(item.dataset.row) === row && Number(item.dataset.column) + Number(item.dataset.span) === column)
        } else if (!event.ctrlKey) {
          const nextRow = row + (event.key === 'ArrowUp' ? -1 : 1)
          next = cells.find((item) => Number(item.dataset.row) === nextRow && Number(item.dataset.column) <= column && Number(item.dataset.column) + Number(item.dataset.span) > column)
        }
        event.preventDefault()
        next?.querySelector('button')?.focus()
      }}
    >
      {rows.map((cells, row) => {
        let column = 0
        return <div key={row} role="row" className={cn('grid gap-2', columns === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
          {cells.map((cell) => {
            const start = column
            column += cell.span ?? 1
            return <div key={cell.id} role="gridcell" data-key-id={cell.id} data-row={row} data-column={start} data-span={cell.span ?? 1}
              aria-colindex={start + 1} aria-colspan={cell.span ?? 1} className={cn('min-w-0 [&>button]:w-full', cell.span === 2 && 'col-span-2')}>{cell.content}</div>
          })}
        </div>
      })}
    </div>
  )
}
