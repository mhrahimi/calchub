import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { SearchBar } from '@/components/search/SearchBar'
import { CalculatorCard } from '@/components/ui/CalculatorCard'
import { CATEGORIES, getPopularCalculators, RECOMMENDED_IDS, getCalculatorById } from '@/calculators/registry'
import { useApp } from '@/app/providers'
import { getRecentlyUsed } from '@/persistence/recentlyUsed'
import type { CalculatorMeta } from '@/calculators/types'

export default function HomePage() {
  const {favorites,toggleFavorite}=useApp()
  const resolve=(ids:string[])=>ids.map(getCalculatorById).filter((c):c is CalculatorMeta=>!!c?.implemented)
  const quick=resolve(favorites.length?favorites:RECOMMENDED_IDS)
  const shown=new Set(quick.map(c=>c.id))
  const recent=resolve(getRecentlyUsed()).filter(c=>!shown.has(c.id)).slice(0,6)
  recent.forEach(c=>shown.add(c.id))
  const popular=getPopularCalculators().filter(c=>!shown.has(c.id))
  const tools=(calculators:CalculatorMeta[])=><div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-x-6">{calculators.map(calc=><CalculatorCard key={calc.id} calculator={calc} isFavorite={favorites.includes(calc.id)} onFavoriteToggle={toggleFavorite}/>)}</div>
  return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-10 space-y-9">
    <header className="max-w-2xl"><p className="text-sm text-text-secondary mb-2">Your calculation workspace</p><h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-5">What are you working out?</h1><SearchBar/></header>
    <section><div className="flex justify-between items-baseline gap-4 mb-2"><h2 className="font-semibold">{favorites.length?'Your favorites':'Start here'}</h2>{favorites.length>0&&<Link className="text-sm text-primary" to="/favorites">All favorites</Link>}</div>{tools(quick)}</section>
    {recent.length>0&&<section><h2 className="font-semibold mb-2">Recently used</h2>{tools(recent)}</section>}
    <section><h2 className="font-semibold mb-4">Browse by topic</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">{CATEGORIES.map(category=><Link key={category.slug} to={`/category/${category.slug}`} className="group flex justify-between items-center gap-3 py-3 text-sm border-b border-border/60 hover:text-primary"><span>{category.title}</span><ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-primary"/></Link>)}</div></section>
    {popular.length>0&&<section><h2 className="font-semibold mb-2">More useful tools</h2>{tools(popular)}</section>}
  </div>
}
