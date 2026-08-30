import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { CalculationRecordList } from '@/components/calculator/CalculationRecordList'
import {
  getSavedCalculations,
  searchSaved,
  renameSaved,
  deleteSaved,
  duplicateSaved,
} from '@/persistence/saved'
import type { SavedCalculation } from '@/calculators/types'

export default function SavedPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<SavedCalculation[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const data = query.trim() ? await searchSaved(query) : await getSavedCalculations()
    setRecords(data)
    setLoading(false)
  }, [query])

  useEffect(() => {
    const timer = setTimeout(load, query ? 200 : 0)
    return () => clearTimeout(timer)
  }, [load, query])

  const handleRename = async (id: string, name: string) => {
    await renameSaved(id, name)
  }

  if (loading && records.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 lg:py-12">
        <p className="text-text-muted text-sm animate-pulse">Loading saved calculations…</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 lg:py-12 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Saved calculations</h1>
        <p className="text-text-secondary mt-1 text-sm">
          Named calculations you saved for quick access.
        </p>
      </div>

      <Input
        label="Search"
        placeholder="Search by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {records.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="w-6 h-6" />}
          title={query ? `No results for “${query}”` : 'Nothing saved'}
          description={
            query
              ? 'Try a different name.'
              : 'Use Save on a result to keep a named copy.'
          }
          action={
            !query ? <Button onClick={() => navigate('/')}>Pick a calculator</Button> : undefined
          }
        />
      ) : (
        <CalculationRecordList
          variant="saved"
          records={records}
          onRefresh={load}
          onRename={handleRename}
          onDelete={deleteSaved}
          onDuplicate={duplicateSaved}
        />
      )}
    </div>
  )
}
