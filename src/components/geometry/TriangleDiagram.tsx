interface Point {
  x: number
  y: number
}

function scalePoints(points: Point[], width: number, height: number, padding = 24): Point[] {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1
  const scale = Math.min((width - padding * 2) / rangeX, (height - padding * 2) / rangeY)
  return points.map((p) => ({
    x: padding + (p.x - minX) * scale,
    y: height - padding - (p.y - minY) * scale,
  }))
}

interface TriangleDiagramProps {
  vertices: Point[]
  labels?: { a?: string; b?: string; c?: string }
  width?: number
  height?: number
  title?: string
}

export function TriangleDiagram({
  vertices,
  labels,
  width = 280,
  height = 200,
  title,
}: TriangleDiagramProps) {
  const [A, B, C] = scalePoints(vertices, width, height)
  const path = `M ${A.x} ${A.y} L ${B.x} ${B.y} L ${C.x} ${C.y} Z`
  const mid = (p1: Point, p2: Point) => ({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 })

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-xs mx-auto"
      role="img"
      aria-label={title ?? 'Triangle diagram'}
    >
      {title ? <title>{title}</title> : null}
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
      <circle cx={A.x} cy={A.y} r="3" className="fill-primary" />
      <circle cx={B.x} cy={B.y} r="3" className="fill-primary" />
      <circle cx={C.x} cy={C.y} r="3" className="fill-primary" />
      {labels?.a ? (
        <text x={mid(B, C).x} y={mid(B, C).y - 6} textAnchor="middle" className="fill-text-secondary text-xs">
          {labels.a}
        </text>
      ) : null}
      {labels?.b ? (
        <text x={mid(A, C).x - 8} y={mid(A, C).y} textAnchor="end" className="fill-text-secondary text-xs">
          {labels.b}
        </text>
      ) : null}
      {labels?.c ? (
        <text x={mid(A, B).x} y={mid(A, B).y + 14} textAnchor="middle" className="fill-text-secondary text-xs">
          {labels.c}
        </text>
      ) : null}
    </svg>
  )
}

interface RightTriangleDiagramProps {
  opposite: number
  adjacent: number
  width?: number
  height?: number
}

export function RightTriangleDiagram({ opposite, adjacent, width = 280, height = 200 }: RightTriangleDiagramProps) {
  return (
    <TriangleDiagram
      vertices={[
        { x: 0, y: 0 },
        { x: adjacent, y: 0 },
        { x: adjacent, y: opposite },
      ]}
      labels={{ a: `opp ${opposite.toFixed(2)}`, b: `adj ${adjacent.toFixed(2)}`, c: `hyp ${Math.hypot(opposite, adjacent).toFixed(2)}` }}
      width={width}
      height={height}
      title="Right triangle"
    />
  )
}
