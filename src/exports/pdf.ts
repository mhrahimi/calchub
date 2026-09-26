import type { ExportPayload, PdfExportOptions } from './types'
import type { TableData } from '@/calculators/types'
import { drawChart, PDF_CHART_BLOCK_HEIGHT } from './drawChart'
import { summarizeSchedule } from './summarizeSchedule'
import { snapshotCurrency } from './provenance'
import { humanizeKey } from './reportFields'
import { displayNumber, displayMetric } from '@/utils/numberFormat'

export async function exportToPdf(payload:ExportPayload, options:PdfExportOptions={tableMode:'summary'}):Promise<Blob> {
  const [{jsPDF},{default:autoTable},{default:regularFont},{default:boldFont}]=await Promise.all([import('jspdf'),import('jspdf-autotable'),import('./fonts/LiberationSans-Regular.base64?raw'),import('./fonts/LiberationSans-Bold.base64?raw')])
  const doc=new jsPDF({unit:'pt',format:'letter',putOnlyUsedFonts:true})
  doc.addFileToVFS('LiberationSans-Regular.ttf',regularFont)
  doc.addFileToVFS('LiberationSans-Bold.ttf',boldFont)
  doc.addFont('LiberationSans-Regular.ttf','Report','normal')
  doc.addFont('LiberationSans-Bold.ttf','Report','bold')
  const margin=44, width=524, bottom=728
  let y=60
  const font=(size=10,bold=false)=>{doc.setFont('Report',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(17,24,39)}
  const ensure=(height:number)=>{if(y+height>bottom){doc.addPage();y=60}}
  const text=(value:string,size=10,bold=false)=>{
    font(size,bold)
    const lines=doc.splitTextToSize(value.replace(/[\u2011\u2013\u2014]/g,'-'),width) as string[]
    for(const line of lines){ensure(size*1.4);doc.text(line,margin,y);y+=size*1.4}
    y+=5
  }
  const heading=(value:string)=>{ensure(100);y+=7;text(value,12,true)}
  const table=(headers:string[],body:string[][],wide=false,rightColumns:number[]=[])=>{
    ensure(45)
    autoTable(doc,{startY:y,head:[headers],body,margin:{top:60,bottom:64,left:margin,right:margin},styles:{font:'Report',fontSize:wide?7:9,cellPadding:4,overflow:'linebreak'},headStyles:{font:'Report',fontStyle:'bold',fillColor:[22,59,140]},columnStyles:Object.fromEntries(headers.map((_,index)=>[index,{...(headers.length===2?{cellWidth:width*(index===0?.44:.56)}:{}),halign:rightColumns.includes(index)?'right':'left'}])),rowPageBreak:'avoid',horizontalPageBreak:wide,horizontalPageBreakRepeat:wide?0:undefined,showHead:'everyPage'})
    y=(doc as unknown as {lastAutoTable:{finalY:number}}).lastAutoTable.finalY+14
  }
  const displayTime=(iso:string|undefined)=>iso?new Date(iso).toLocaleString(payload.provenance?.locale??'en-US'):'Not recorded'
  text(payload.label??payload.title,19,true)
  if(payload.label)text(payload.title,11)
  text(`Calculated: ${displayTime(payload.date)} · Exported: ${displayTime(payload.exportedAt??new Date().toISOString())}`,8)
  text(`Currency: ${payload.provenance?.currency??'not recorded'} · Model: ${payload.metadata?.modelVersion??'not recorded'} · ${options.tableMode==='full'?'Full report':'Decision brief'}`,8)
  if(!payload.provenance?.currency)text('Legacy record: original currency was not captured. Values have not been converted or assigned the current currency.',9)
  heading('Results')
  for(const item of payload.resultsSummary.filter(r=>r.primary)) {text(item.label,10);text(item.value,17,true)}
  const secondary=payload.resultsSummary.filter(r=>!r.primary)
  if(secondary.length)table(['Metric','Value'],secondary.map(r=>[r.label,r.value]),false,[1])
  for(const warning of payload.metadata?.warnings??[])text(`Notice: ${warning}`,9)
  const charts=options.tableMode==='full'?payload.charts:payload.charts?.slice(0,1)
  for(const chart of charts??[]){ensure(PDF_CHART_BLOCK_HEIGHT+8);y+=drawChart(doc,chart,margin,y,width,payload.provenance);y+=10}
  heading('Inputs and conventions')
  table(['Input','Value'],payload.inputFields?.map(f=>[f.label,f.display])??Object.entries(payload.inputs).map(([k,v])=>[k,String(v)]),false,[1])
  for(const t of [payload.table,...(payload.extraTables??[])].filter(Boolean) as TableData[]) {
    const schedule=options.tableMode==='full'?t:summarizeSchedule(t,payload.calculatorId,payload.inputs)
    heading(schedule.title??'Schedule')
    if(options.tableMode==='summary'&&schedule!==t)text('Cash-flow columns are annual totals; balance and cumulative columns are year-end values. The final period is included. Choose Full report for each underlying row.',8)
    table(schedule.columns.map(c=>c.label+(c.format==='currency'?` (${payload.provenance?.currency??'currency not recorded'})`:'')),schedule.rows.map(row=>schedule.columns.map(c=>{
      const value=row[c.key]
      if(value===undefined||value===null)return 'Not applicable'
      if(typeof value==='number') {
        if(!Number.isFinite(value))return value===Infinity?'No upper limit':'Not defined'
        if(c.format==='currency')return snapshotCurrency(value,{...payload.provenance!,currency:null}).replace('Currency not recorded ','')
        if(c.format==='percent')return `${displayNumber(value*100,payload.provenance?.locale??'en-US',c.precision??2,true)}%`
        return displayNumber(value,payload.provenance?.locale??'en-US',c.precision??(Number.isInteger(value)?0:4))
      }
      return c.format==='text'||c.format==='date'?String(value):displayMetric(String(value),payload.provenance?.locale??'en-US')
    })),schedule.columns.length>6,schedule.columns.flatMap((c,index)=>c.align==='right'||(!c.align&&schedule.rows.some(row=>typeof row[c.key]==='number'))?[index]:[]))
  }
  heading('Method and assumptions')
  for(const step of payload.explanation?.steps??[]){text(step.label,10,true);if(step.expression)text(step.expression,9);if(step.result)text(step.result,9)}
  for(const assumption of payload.explanation?.assumptions??[])text(assumption,9)
  const p=payload.provenance
  ensure(285 + Object.keys(p?.units??{}).length * 20)
  heading('Provenance')
  table(['Record detail','Value'],[['Model version',payload.metadata?.modelVersion??'Not recorded'],['Calculation status',payload.metadata?.status??'Not recorded'],['Currency',p?.currency??'Not recorded'],['Number locale',p?.locale??'Not recorded'],['Measurement system',p?.measurementSystem??'Not recorded'],['Tax configuration',p?.taxConfigVersion??'Not applicable / not recorded'],['Data revision',p?.dataRevision??'Not applicable / not recorded'],['Precision',p?.precision??'Not recorded'],...Object.entries(p?.units??{}).map(([key,value])=>[humanizeKey(key),value])])
  for(const source of payload.metadata?.sources??[])text(source,8)
  text(payload.disclaimer,8)
  const total=doc.getNumberOfPages()
  for(let page=1;page<=total;page++){
    doc.setPage(page);font(8);doc.setTextColor(91,100,117)
    doc.text('CalcHub · '+payload.title,margin,28)
    doc.text(`${page} / ${total}`,568,764,{align:'right'})
    doc.text(payload.provenance?.currency??'Currency not recorded',margin,764)
  }
  return doc.output('blob')
}

export async function downloadPdf(payload:ExportPayload,filename:string,options?:PdfExportOptions):Promise<void>{
  const blob=await exportToPdf(payload,options)
  const url=URL.createObjectURL(blob),link=document.createElement('a')
  link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url)
}
