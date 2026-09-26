import { useState, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { searchCalculators } from '@/calculators/registry'
import { cn } from '@/utils/cn'
interface SearchBarProps { placeholder?:string; className?:string; autoFocus?:boolean }
export function SearchBar({placeholder='Search calculators...',className,autoFocus}:SearchBarProps) {
  const [query,setQuery]=useState('')
  const [open,setOpen]=useState(false)
  const [active,setActive]=useState(-1)
  const id=useId()
  const navigate=useNavigate()
  const results=query.trim()?searchCalculators(query).slice(0,8):[]
  const select=(route:string)=>{navigate(route);setOpen(false);setQuery('');setActive(-1)}
  return <div className={cn('relative',className)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false)}}>
    <Search aria-hidden="true" className="absolute left-4 top-3.5 w-5 h-5 text-text-muted" />
    <label className="sr-only" htmlFor={id}>Search calculators</label>
    <input id={id} type="search" role="combobox" aria-autocomplete="list" aria-expanded={open && results.length>0} aria-controls={`${id}-results`} aria-activedescendant={open && active>=0?`${id}-option-${active}`:undefined}
      value={query} onChange={e=>{setQuery(e.target.value);setOpen(true);setActive(-1)}} onFocus={()=>setOpen(true)} autoFocus={autoFocus} placeholder={placeholder}
      onKeyDown={e=>{
        if(e.key==='Escape'){setOpen(false);setActive(-1)}
        if((e.key==='ArrowDown'||e.key==='ArrowUp')&&results.length){e.preventDefault();setOpen(true);setActive(i=>e.key==='ArrowDown'?(i+1)%results.length:(i-1+results.length)%results.length)}
        if(e.key==='Enter'&&open&&results.length){e.preventDefault();select(results[Math.max(0,active)].route)}
      }} className="w-full h-12 pl-12 pr-4 rounded-full border border-border bg-white text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary/20" />
    {open&&results.length>0&&<ul id={`${id}-results`} role="listbox" aria-label="Matching calculators" className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-2xl shadow-lg overflow-hidden z-50">
      {results.map((calc,i)=><li key={calc.id} id={`${id}-option-${i}`} role="option" aria-selected={active===i} onMouseDown={e=>e.preventDefault()} onClick={()=>select(calc.route)} className={cn('px-4 py-3 cursor-pointer border-b border-border last:border-0',active===i?'bg-surface-light':'hover:bg-surface-lighter')}>
        <p className="font-medium text-sm">{calc.title}</p><p className="text-xs text-text-secondary">{calc.description}</p>
      </li>)}
    </ul>}
    {open&&query.trim()&&!results.length&&<p role="status" className="absolute top-full mt-2 w-full bg-white border border-border rounded-xl p-4 z-50">No calculators found for “{query}”.</p>}
  </div>
}
