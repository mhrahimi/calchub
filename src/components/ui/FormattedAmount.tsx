/** Keeps the exact formatted value while allowing cents to have less visual weight. */
export function FormattedAmount({ value }: { value: string }) {
  const fraction = /[.,]\d{2}(?=\D*$)/.exec(value)
  if (!fraction) return <span className="formatted-amount">{value}</span>

  return <span className="formatted-amount">{value.slice(0, fraction.index)}<span className="amount-decimals">{fraction[0]}</span>{value.slice(fraction.index + fraction[0].length)}</span>
}
