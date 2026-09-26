import type { TableData } from '@/calculators/types'
import { periodsPerYear } from '@/utils/annuity'

/** Aggregate cash flows, retain closing stocks, and always preserve the final period. */
export function summarizeSchedule(table:TableData,id:string,inputs:Record<string,unknown>):TableData {
  if(table.rows.length<=20)return table
  const loans=['mortgage','loan','amortization','interest-rate'].includes(id)
  const growth=['investment','savings-goal','compound-interest'].includes(id)
  if(!loans&&!growth) {
    // Non-schedule tables (statistics, bond cash flows, etc.) remain complete.
    return table
  }
  const ppy=id==='mortgage'?12:periodsPerYear(String(inputs.paymentFrequency??'monthly'))
  const groups=new Map<number,Record<string,string|number>>()
  const flows=new Set(['payment','principal','extraPrincipal',...(loans?['interest']:[])])
  for(const row of table.rows) {
    const year=Math.max(1,Math.ceil(Number(row.period)/(loans?ppy:1)-1e-10))
    let group=groups.get(year)
    if(!group){group={};groups.set(year,group)}
    for(const col of table.columns) {
      const value=row[col.key]
      group[col.key]=flows.has(col.key)&&typeof value==='number'?Number(group[col.key]??0)+value:value
    }
    group.period=year
  }
  return {...table,title:`Annual summary — ${table.rows.length} underlying rows; closing balances and cumulative values at year end`,columns:table.columns.map(c=>c.key==='period'?{...c,label:'Year'}:c),rows:[...groups.values()]}
}
