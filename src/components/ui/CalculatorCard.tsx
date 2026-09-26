import { Link } from 'react-router-dom'
import { Star, ArrowUpRight } from 'lucide-react'
import { getIcon } from '@/utils/icons'
import { cn } from '@/utils/cn'
import type { CalculatorMeta } from '@/calculators/types'

interface CalculatorCardProps {
  calculator: CalculatorMeta
  isFavorite?: boolean
  onFavoriteToggle?: (id: string) => void
  onClick?: () => void
}
export function CalculatorCard({calculator,isFavorite,onFavoriteToggle,onClick}:CalculatorCardProps) {
  const Icon=getIcon(calculator.icon)
  return <div className="group relative flex items-start gap-3 py-4 px-3 rounded-xl hover:bg-surface-lighter transition-colors border-b border-border/60">
    <Icon aria-hidden="true" className="w-5 h-5 text-primary shrink-0 mt-1"/>
    <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-text-primary"><Link to={calculator.route} onClick={onClick} className="after:absolute after:inset-0 after:rounded-xl">{calculator.title}</Link></h3><p className="text-sm text-text-secondary mt-1 line-clamp-2">{calculator.description}</p></div>
    {onFavoriteToggle?<button onClick={()=>onFavoriteToggle(calculator.id)} className="relative z-10 h-11 w-11 -my-2 -mr-2 shrink-0 inline-flex items-center justify-center rounded-lg hover:bg-white transition-colors" aria-label={`${isFavorite?'Remove from favorites':'Add to favorites'}: ${calculator.title}`} aria-pressed={!!isFavorite}><Star className={cn('w-4 h-4',isFavorite?'fill-primary text-primary':'text-text-muted')}/></button>:<ArrowUpRight className="w-4 h-4 text-text-muted shrink-0 mt-1"/>}
  </div>
}
