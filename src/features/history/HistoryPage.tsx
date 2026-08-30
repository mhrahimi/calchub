import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { CalculationRecordList } from '@/components/calculator/CalculationRecordList'
import {
  getHistoryRecords,
  renameHistoryRecord,
  deleteHistoryRecord,
  duplicateHistoryRecord,
} from '@/persistence/history'
import { saveCalculation } from '@/persistence/saved'
import type { HistoryRecord } from '@/calculators/types'

export default function HistoryPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getHistoryRecords(100)
    setRecords(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleRename = async (id: string, label: string) => {
    await renameHistoryRecord(id, label)
  }

  const handleSaveToSaved = async (record: HistoryRecord, name: string) => {
    await saveCalculation(record, name)
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 lg:py-12">
        <p className="text-text-muted text-sm animate-pulse">Loading history…</p>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <EmptyState
        icon={<History className="w-6 h-6" />}
        title="Nothing here yet"
        description="Calculations show up after you run one with history enabled (Settings)."
        action={<Button onClick={() => navigate('/')}>Pick a calculator</Button>}
      />
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 lg:py-12 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">History</h1>
        <p className="text-text-secondary mt-1 text-sm">
          Recent calculations stored locally in this browser.
        </p>
      </div>
      <CalculationRecordList
        variant="history"
        records={records}
        onRefresh={load}
        onRename={handleRename}
        onDelete={deleteHistoryRecord}
        onDuplicate={duplicateHistoryRecord}
        onSaveToSaved={handleSaveToSaved}
      />
    </div>
  )
}
