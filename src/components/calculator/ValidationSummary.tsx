export function ValidationSummary({ errors }: { errors: Record<string, string> }) {
  const count = Object.keys(errors).filter(key => key !== 'calculation').length
  return count ? <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
    Check {count === 1 ? 'the highlighted field' : `the ${count} highlighted fields`} before calculating.
  </p> : null
}
