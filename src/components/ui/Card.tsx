import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-[16px] border border-border bg-background-secondary/50 p-1',
        hover && 'transition-all duration-300 hover:border-primary hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)] cursor-pointer',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      <div className="rounded-[14px] bg-white border border-white/80 p-5 h-full">{children}</div>
    </div>
  )
}
