import type { TrigonometryInput } from './types'

export function validateTrigonometry(input: TrigonometryInput) {
  const errors: Record<string, string> = {}
  const provided = [input.opposite, input.adjacent, input.hypotenuse, input.angle].filter(v => v !== undefined)
  if (provided.length < 2) errors.opposite = 'Provide two sides, or an angle and one side'
  if (!['degrees','radians'].includes(input.angleUnit)) errors.angle = 'Choose degrees or radians'
  for (const key of ['opposite','adjacent','hypotenuse'] as const) {
    const value = input[key]
    if (value !== undefined && (!Number.isFinite(value) || value <= 0 || value > 1e100)) errors[key] = 'Enter a finite positive side no greater than 1e100'
  }
  const angle = input.angle === undefined ? undefined : input.angleUnit === 'degrees' ? input.angle * Math.PI / 180 : input.angle
  if (angle !== undefined && (!Number.isFinite(angle) || angle <= 0 || angle >= Math.PI / 2)) errors.angle = 'An acute angle must be strictly between 0 and 90 degrees (π/2 radians)'
  const {opposite:a, adjacent:b, hypotenuse:c} = input
  if (c !== undefined && ((a !== undefined && a >= c) || (b !== undefined && b >= c))) errors.hypotenuse = 'Hypotenuse must exceed each leg'
  if (!Object.keys(errors).length) {
    const close = (x:number,y:number) => Math.abs(x-y) <= 1e-8 * Math.max(Math.abs(x),Math.abs(y),Number.MIN_VALUE)
    if (a !== undefined && b !== undefined && c !== undefined && !close(Math.hypot(a,b),c)) errors.hypotenuse = 'The three sides must satisfy the Pythagorean theorem'
    if (angle !== undefined) {
      const derived = a !== undefined && b !== undefined ? Math.atan2(a,b) : a !== undefined && c !== undefined ? Math.asin(a/c) : b !== undefined && c !== undefined ? Math.acos(b/c) : undefined
      if (derived !== undefined && !close(derived,angle)) errors.angle = 'The supplied angle conflicts with the supplied sides'
    }
  }
  return Object.keys(errors).length ? {valid:false as const, errors} : {valid:true as const, data:input}
}
