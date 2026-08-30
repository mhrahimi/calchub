import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ChartData } from '@/calculators/types'
import { formatCurrency } from '@/utils/currency'

const COLORS = ['#163B8C', '#4A7FD4', '#8A94A6', '#102A66', '#6B8F71', '#C07850', '#7A6B9A', '#3D6B8A']

interface ChartPanelProps {
  data: ChartData
}

function formatValue(value: number, format?: ChartData['valueFormat']): string {
  if (format === 'currency') return formatCurrency(value)
  if (format === 'percent') return `${value.toFixed(2)}%`
  if (format === 'number') return value.toLocaleString(undefined, { maximumFractionDigits: 4 })
  return String(value)
}

function formatTick(value: number, format?: ChartData['valueFormat']): string {
  if (format === 'currency') {
    const abs = Math.abs(value)
    if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (abs >= 10_000) return `$${(value / 1000).toFixed(0)}k`
    return formatCurrency(value)
  }
  return formatValue(value, format)
}

function axisLabel(value: string | undefined, axis: 'x' | 'y') {
  if (!value) return undefined
  return axis === 'x'
    ? { value, position: 'insideBottom' as const, offset: -2, fontSize: 11, fill: '#5B6475' }
    : { value, angle: -90, position: 'insideLeft' as const, fontSize: 11, fill: '#5B6475' }
}

function ChartTooltip({
  active,
  payload,
  label,
  valueFormat,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  valueFormat?: ChartData['valueFormat']
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-text-primary mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="tabular-nums">
          {entry.name}: {formatValue(entry.value, valueFormat)}
        </p>
      ))}
    </div>
  )
}

export function ChartPanel({ data }: ChartPanelProps) {
  const chartData = mergeSeries(data)
  const showDots = data.series.every((s) => s.data.length <= 8)
  const margin = {
    top: 8,
    right: 12,
    bottom: data.xLabel ? 18 : 0,
    left: data.yLabel ? 10 : 0,
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      {data.title && (
        <h3 className="text-sm font-medium text-text-primary mb-4">{data.title}</h3>
      )}
      <div className="min-h-48 sm:h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {data.type === 'line' ? (
            <LineChart data={chartData} margin={margin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E8F0" />
              <XAxis dataKey="x" tick={{ fontSize: 12, fill: '#5B6475' }} label={axisLabel(data.xLabel, 'x')} />
              <YAxis tick={{ fontSize: 12, fill: '#5B6475' }} tickFormatter={(v) => formatTick(v, data.valueFormat)} label={axisLabel(data.yLabel, 'y')} />
              <Tooltip content={<ChartTooltip valueFormat={data.valueFormat} />} />
              <Legend />
              {data.series.map((s, i) => (
                <Line
                  key={s.name}
                  type="monotone"
                  dataKey={s.name}
                  stroke={s.color ?? COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={showDots}
                />
              ))}
            </LineChart>
          ) : data.type === 'area' ? (
            <AreaChart data={chartData} margin={margin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E8F0" />
              <XAxis dataKey="x" tick={{ fontSize: 12, fill: '#5B6475' }} label={axisLabel(data.xLabel, 'x')} />
              <YAxis tick={{ fontSize: 12, fill: '#5B6475' }} tickFormatter={(v) => formatTick(v, data.valueFormat)} label={axisLabel(data.yLabel, 'y')} />
              <Tooltip content={<ChartTooltip valueFormat={data.valueFormat} />} />
              <Legend />
              {data.series.map((s, i) => (
                <Area
                  key={s.name}
                  type="monotone"
                  dataKey={s.name}
                  stackId={data.stacked ? 'stack' : undefined}
                  stroke={s.color ?? COLORS[i % COLORS.length]}
                  fill={s.color ?? COLORS[i % COLORS.length]}
                  fillOpacity={data.stacked ? 0.6 : 0.35}
                />
              ))}
            </AreaChart>
          ) : data.type === 'bar' ? (
            <BarChart data={chartData} margin={margin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E8F0" />
              <XAxis dataKey="x" tick={{ fontSize: 12, fill: '#5B6475' }} label={axisLabel(data.xLabel, 'x')} />
              <YAxis tick={{ fontSize: 12, fill: '#5B6475' }} tickFormatter={(v) => formatTick(v, data.valueFormat)} label={axisLabel(data.yLabel, 'y')} />
              <Tooltip content={<ChartTooltip valueFormat={data.valueFormat} />} />
              <Legend />
              {data.series.map((s, i) => (
                <Bar
                  key={s.name}
                  dataKey={s.name}
                  stackId={data.stacked ? 'stack' : undefined}
                  fill={s.color ?? COLORS[i % COLORS.length]}
                />
              ))}
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                data={data.series[0]?.data.map((d) => ({ name: String(d.x), value: d.y })) ?? []}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {(data.series[0]?.data ?? []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatValue(value, data.valueFormat)} />
              <Legend />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{data.title ?? 'Chart data'}</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            {data.series.map((s) => (
              <th key={s.name} scope="col">
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chartData.map((row, i) => (
            <tr key={i}>
              <th scope="row">{String(row.x)}</th>
              {data.series.map((s) => (
                <td key={s.name}>{String(row[s.name] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function mergeSeries(data: ChartData): Record<string, unknown>[] {
  const map = new Map<string | number, Record<string, unknown>>()
  for (const series of data.series) {
    for (const point of series.data) {
      const key = point.x
      if (!map.has(key)) map.set(key, { x: key })
      map.get(key)![series.name] = point.y
    }
  }
  const rows = Array.from(map.values())
  const numeric = rows.every((row) => typeof row.x === 'number')
  if (numeric) rows.sort((a, b) => (a.x as number) - (b.x as number))
  return rows
}
