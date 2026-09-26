import 'fake-indexeddb/auto'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { calculateGcfLcm, buildGcfLcmTable, explainGcfLcm } from '@/calculators/math/gcfLcm/calculate'
import { buildLiveExportPayload, buildExportPayloadFromRecord } from '@/exports/buildPayload'
import { payloadToCsv } from '@/exports/recordCsv'
import { exportToPdf } from '@/exports/pdf'
import { exportBackup, serializeBackup, parseBackupText, importBackup } from './backup'
import { saveCalculation, getSavedCalculation, clearSaved } from './saved'
import { saveHistoryRecord, getHistoryRecord, clearHistory } from './history'
import { setPendingRestore, consumePendingRestore } from './restore'

beforeEach(async () => {
  for (const name of ['localStorage','sessionStorage']) {
    const values = new Map<string,string>()
    vi.stubGlobal(name,{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)})
  }
  await clearHistory()
  await clearSaved()
})
afterEach(() => vi.unstubAllGlobals())

describe('GCF/LCM persistence and export', () => {
  it.each(['12,18','9007199254740993,18014398509481986'])('round-trips %s through saved/history/restore/backup/CSV/PDF', async (values) => {
    const inputs = {values}
    const results = calculateGcfLcm(inputs)
    const base = {calculatorId:'gcf-lcm',inputs,results,settingsVersion:1}
    const saved = await saveCalculation(base,'Exact integers')
    const history = (await saveHistoryRecord(base))!
    expect(history).not.toBeNull()
    for (const mode of ['reopen','edit','recalculate'] as const) {
      setPendingRestore({mode,record:saved})
      const restored = consumePendingRestore('gcf-lcm')!
      expect(restored.record.results).toEqual(results)
      expect(calculateGcfLcm(restored.record.inputs as typeof inputs)).toEqual(results)
    }
    const backup = parseBackupText(serializeBackup(await exportBackup())).backup
    await clearHistory()
    await clearSaved()
    await importBackup(backup)
    expect((await getSavedCalculation(saved.id))?.results).toEqual(results)
    expect((await getHistoryRecord(history.id))?.results).toEqual(results)
    const live = buildLiveExportPayload({calculatorId:'gcf-lcm',inputs,results,explain:explainGcfLcm,buildTable:buildGcfLcmTable})
    const reopened = await buildExportPayloadFromRecord(saved)
    for (const payload of [live,reopened]) {
      expect(payloadToCsv(payload)).toContain(results.gcf.toString())
      expect(payload.resultsSummary.find(row => row.label === 'Greatest common factor')?.value).toBe(new Intl.NumberFormat('en-US').format(results.gcf))
      const pdf = await exportToPdf(payload)
      expect(pdf.type).toBe("application/pdf")
      expect(pdf.size).toBeGreaterThan(1000)
    }
  })
  it('continues to accept the prior plain-JSON backup format', () => {
    const raw = {format:'calchub-backup',version:1,history:[],saved:[]}
    expect(parseBackupText(JSON.stringify(raw)).backup.history).toEqual([])
  })
})
