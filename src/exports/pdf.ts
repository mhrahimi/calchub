import type { ExportPayload, PdfExportOptions } from './types'
import type { TableData } from '@/calculators/types'
import { drawChart, PDF_CHART_BLOCK_HEIGHT } from './drawChart'

const SUMMARY_ROW_LIMIT = 20
const PRIMARY_CARD_H = 58

function truncateTable(table: TableData, limit: number): TableData {
  if (table.rows.length <= limit) return table
  return {
    ...table,
    title: table.title ? `${table.title} (first ${limit} rows)` : `Summary (first ${limit} rows)`,
    rows: table.rows.slice(0, limit),
  }
}

export async function exportToPdf(
  payload: ExportPayload,
  options: PdfExportOptions = { tableMode: 'summary', summaryRowLimit: SUMMARY_ROW_LIMIT },
): Promise<Blob> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const autoTable = autoTableModule.default

  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const margin = 48
  let y = margin
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - margin * 2

  const addPageIfNeeded = (needed: number) => {
    const pageHeight = doc.internal.pageSize.getHeight()
    if (y + needed > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(22, 59, 140)
  doc.text('CalcHub', margin, y)
  y += 28

  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text(payload.title, margin, y)
  y += 18

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(91, 100, 117)
  doc.text(new Date(payload.date).toLocaleString(), margin, y)
  y += payload.label ? 14 : 22

  if (payload.label) {
    doc.text(`Label: ${payload.label}`, margin, y)
    y += 22
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text('Inputs', margin, y)
  y += 14

  const inputRows = Object.entries(payload.inputs).map(([k, v]) => [k, String(v)])
  autoTable(doc, {
    startY: y,
    head: [['Field', 'Value']],
    body: inputRows.length ? inputRows : [['—', '—']],
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [22, 59, 140] },
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16

  addPageIfNeeded(60)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text('Results', margin, y)
  y += 14

  const primary = payload.resultsSummary.filter((r) => r.primary)
  const secondary = payload.resultsSummary.filter((r) => !r.primary)
  for (const item of primary) {
    addPageIfNeeded(PRIMARY_CARD_H + 12)
    doc.setFillColor(238, 244, 255)
    doc.setDrawColor(22, 59, 140)
    doc.setLineWidth(0.6)
    doc.roundedRect(margin, y, contentWidth, PRIMARY_CARD_H, 8, 8, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(91, 100, 117)
    doc.text(item.label, margin + 14, y + 18)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(22, 59, 140)
    doc.text(item.value, margin + 14, y + 42)
    y += PRIMARY_CARD_H + 10
  }

  if (secondary.length) {
    addPageIfNeeded(50)
    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Value']],
      body: secondary.map((r) => [r.label, r.value]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [22, 59, 140] },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16
  } else if (!primary.length) {
    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Value']],
      body: [['—', '—']],
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [22, 59, 140] },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16
  } else {
    y += 6
  }

  if (payload.explanation) {
    addPageIfNeeded(80)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(payload.explanation.title || 'How this was calculated', margin, y)
    y += 16
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    for (const step of payload.explanation.steps) {
      addPageIfNeeded(40)
      doc.setFont('helvetica', 'bold')
      doc.text(step.label, margin, y)
      y += 12
      doc.setFont('helvetica', 'normal')
      if (step.expression) {
        const lines = doc.splitTextToSize(step.expression, contentWidth)
        doc.text(lines, margin, y)
        y += lines.length * 11
      }
      if (step.result) {
        doc.setTextColor(22, 59, 140)
        doc.text(step.result, margin, y)
        doc.setTextColor(0, 0, 0)
        y += 14
      }
      y += 6
    }
    if (payload.explanation.assumptions?.length) {
      addPageIfNeeded(30)
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(91, 100, 117)
      for (const a of payload.explanation.assumptions) {
        const lines = doc.splitTextToSize(a, contentWidth)
        doc.text(lines, margin, y)
        y += lines.length * 10 + 4
      }
      doc.setTextColor(0, 0, 0)
      y += 8
    }
  }

  if (payload.table && payload.table.rows.length > 0) {
    addPageIfNeeded(60)
    const table =
      options.tableMode === 'full'
        ? payload.table
        : truncateTable(payload.table, options.summaryRowLimit ?? SUMMARY_ROW_LIMIT)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    if (table.title) {
      doc.text(table.title, margin, y)
      y += 14
    }
    autoTable(doc, {
      startY: y,
      head: [table.columns.map((c) => c.label)],
      body: table.rows.map((row) => table.columns.map((c) => String(row[c.key] ?? ''))),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [22, 59, 140] },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16
  }

  if (payload.charts?.length) {
    for (const chart of payload.charts) {
      addPageIfNeeded(PDF_CHART_BLOCK_HEIGHT + 8)
      y += drawChart(doc, chart, margin, y, contentWidth)
      y += 8
    }
  }

  addPageIfNeeded(40)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(91, 100, 117)
  const disclaimerLines = doc.splitTextToSize(payload.disclaimer, contentWidth)
  doc.text(disclaimerLines, margin, doc.internal.pageSize.getHeight() - margin - disclaimerLines.length * 10)

  return doc.output('blob')
}

export async function downloadPdf(payload: ExportPayload, filename: string, options?: PdfExportOptions): Promise<void> {
  const blob = await exportToPdf(payload, options)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
