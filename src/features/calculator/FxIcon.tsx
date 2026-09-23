export function FxIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 28"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <text
        x="20"
        y="20"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        fontSize="18"
        fontWeight="500"
      >
        f(x)
      </text>
    </svg>
  )
}
