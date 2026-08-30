import { Star } from 'lucide-react'
import { getIcon } from '@/utils/icons'
import { cn } from '@/utils/cn'
import type { CalculatorMeta } from '@/calculators/types'

interface CalculatorCardProps {
  calculator: CalculatorMeta
  isFavorite?: boolean
  onFavoriteToggle?: (id: string) => void
  onClick?: () => void
}

export function CalculatorCard({
  calculator,
  isFavorite,
  onFavoriteToggle,
  onClick,
}: CalculatorCardProps) {
  const Icon = getIcon(calculator.icon)

  return (
    <div
      onClick={onClick}
      className={cn(
        'group rounded-[16px] border border-border bg-background-secondary/50 p-1',
        'transition-all duration-300 hover:border-primary hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)] cursor-pointer',
      )}
    >
      <div className="rounded-[14px] bg-white border border-white/80 p-5 h-full flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-surface-light flex items-center justify-center text-primary">
            <Icon className="w-5 h-5" />
          </div>
          {onFavoriteToggle && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onFavoriteToggle(calculator.id)
              }}
              className="p-1.5 rounded-full hover:bg-surface-lighter transition-colors"
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star
                className={cn('w-4 h-4', isFavorite ? 'fill-primary text-primary' : 'text-text-muted')}
              />
            </button>
          )}
        </div>
        <h3 className="font-semibold text-text-primary mb-1">{calculator.title}</h3>
        <p className="text-sm text-text-secondary flex-1 line-clamp-2">{calculator.description}</p>
        <p className="text-xs text-text-muted mt-3 uppercase tracking-wide">
          {calculator.categorySlug.replace('-', ' ')}
        </p>
      </div>
    </div>
  )
}
