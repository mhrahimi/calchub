export type UnitDimension =
  | 'length'
  | 'area'
  | 'volume'
  | 'mass'
  | 'temperature'
  | 'speed'
  | 'time'
  | 'pressure'
  | 'energy'
  | 'power'
  | 'dataStorage'
  | 'dataTransfer'
  | 'angle'
  | 'density'

export interface MultiplicativeUnit {
  id: string
  label: string
  symbol: string
  dimension: UnitDimension
  factor: number
  kind: 'multiplicative'
}

export interface AffineUnit {
  id: string
  label: string
  symbol: string
  dimension: 'temperature'
  toBase: (value: number) => number
  fromBase: (value: number) => number
  kind: 'affine'
}

export type Unit = MultiplicativeUnit | AffineUnit

export interface UnitCategory {
  dimension: UnitDimension
  label: string
  baseUnitId: string
}

export const UNIT_CATEGORIES: UnitCategory[] = [
  { dimension: 'length', label: 'Length', baseUnitId: 'm' },
  { dimension: 'area', label: 'Area', baseUnitId: 'm2' },
  { dimension: 'volume', label: 'Volume', baseUnitId: 'm3' },
  { dimension: 'mass', label: 'Mass', baseUnitId: 'kg' },
  { dimension: 'temperature', label: 'Temperature', baseUnitId: 'c' },
  { dimension: 'speed', label: 'Speed', baseUnitId: 'mps' },
  { dimension: 'time', label: 'Time', baseUnitId: 's' },
  { dimension: 'pressure', label: 'Pressure', baseUnitId: 'pa' },
  { dimension: 'energy', label: 'Energy', baseUnitId: 'j' },
  { dimension: 'power', label: 'Power', baseUnitId: 'w' },
  { dimension: 'dataStorage', label: 'Data Storage', baseUnitId: 'byte' },
  { dimension: 'dataTransfer', label: 'Data Transfer', baseUnitId: 'bps' },
  { dimension: 'angle', label: 'Angle', baseUnitId: 'deg' },
  { dimension: 'density', label: 'Density', baseUnitId: 'kgm3' },
]

export const UNITS: Unit[] = [
  // Length (base: meter)
  { id: 'm', label: 'Meter', symbol: 'm', dimension: 'length', factor: 1, kind: 'multiplicative' },
  { id: 'km', label: 'Kilometer', symbol: 'km', dimension: 'length', factor: 1000, kind: 'multiplicative' },
  { id: 'cm', label: 'Centimeter', symbol: 'cm', dimension: 'length', factor: 0.01, kind: 'multiplicative' },
  { id: 'mm', label: 'Millimeter', symbol: 'mm', dimension: 'length', factor: 0.001, kind: 'multiplicative' },
  { id: 'in', label: 'Inch', symbol: 'in', dimension: 'length', factor: 0.0254, kind: 'multiplicative' },
  { id: 'ft', label: 'Foot', symbol: 'ft', dimension: 'length', factor: 0.3048, kind: 'multiplicative' },
  { id: 'yd', label: 'Yard', symbol: 'yd', dimension: 'length', factor: 0.9144, kind: 'multiplicative' },
  { id: 'mi', label: 'Mile', symbol: 'mi', dimension: 'length', factor: 1609.344, kind: 'multiplicative' },

  // Area (base: m²)
  { id: 'm2', label: 'Square meter', symbol: 'm²', dimension: 'area', factor: 1, kind: 'multiplicative' },
  { id: 'km2', label: 'Square kilometer', symbol: 'km²', dimension: 'area', factor: 1e6, kind: 'multiplicative' },
  { id: 'cm2', label: 'Square centimeter', symbol: 'cm²', dimension: 'area', factor: 1e-4, kind: 'multiplicative' },
  { id: 'ft2', label: 'Square foot', symbol: 'ft²', dimension: 'area', factor: 0.09290304, kind: 'multiplicative' },
  { id: 'in2', label: 'Square inch', symbol: 'in²', dimension: 'area', factor: 0.00064516, kind: 'multiplicative' },
  { id: 'acre', label: 'Acre', symbol: 'ac', dimension: 'area', factor: 4046.8564224, kind: 'multiplicative' },
  { id: 'ha', label: 'Hectare', symbol: 'ha', dimension: 'area', factor: 10000, kind: 'multiplicative' },

  // Volume (base: m³)
  { id: 'm3', label: 'Cubic meter', symbol: 'm³', dimension: 'volume', factor: 1, kind: 'multiplicative' },
  { id: 'l', label: 'Liter', symbol: 'L', dimension: 'volume', factor: 0.001, kind: 'multiplicative' },
  { id: 'ml', label: 'Milliliter', symbol: 'mL', dimension: 'volume', factor: 1e-6, kind: 'multiplicative' },
  { id: 'gal', label: 'US gallon', symbol: 'gal', dimension: 'volume', factor: 0.003785411784, kind: 'multiplicative' },
  { id: 'ft3', label: 'Cubic foot', symbol: 'ft³', dimension: 'volume', factor: 0.028316846592, kind: 'multiplicative' },
  { id: 'in3', label: 'Cubic inch', symbol: 'in³', dimension: 'volume', factor: 1.6387064e-5, kind: 'multiplicative' },

  // Mass (base: kg)
  { id: 'kg', label: 'Kilogram', symbol: 'kg', dimension: 'mass', factor: 1, kind: 'multiplicative' },
  { id: 'g', label: 'Gram', symbol: 'g', dimension: 'mass', factor: 0.001, kind: 'multiplicative' },
  { id: 'lb', label: 'Pound', symbol: 'lb', dimension: 'mass', factor: 0.45359237, kind: 'multiplicative' },
  { id: 'oz', label: 'Ounce', symbol: 'oz', dimension: 'mass', factor: 0.028349523125, kind: 'multiplicative' },
  { id: 't', label: 'Metric ton', symbol: 't', dimension: 'mass', factor: 1000, kind: 'multiplicative' },

  // Temperature (base: Celsius)
  {
    id: 'c',
    label: 'Celsius',
    symbol: '°C',
    dimension: 'temperature',
    kind: 'affine',
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  {
    id: 'f',
    label: 'Fahrenheit',
    symbol: '°F',
    dimension: 'temperature',
    kind: 'affine',
    toBase: (v) => ((v - 32) * 5) / 9,
    fromBase: (v) => (v * 9) / 5 + 32,
  },
  {
    id: 'k',
    label: 'Kelvin',
    symbol: 'K',
    dimension: 'temperature',
    kind: 'affine',
    toBase: (v) => v - 273.15,
    fromBase: (v) => v + 273.15,
  },

  // Speed (base: m/s)
  { id: 'mps', label: 'Meters per second', symbol: 'm/s', dimension: 'speed', factor: 1, kind: 'multiplicative' },
  { id: 'kph', label: 'Kilometers per hour', symbol: 'km/h', dimension: 'speed', factor: 1000 / 3600, kind: 'multiplicative' },
  { id: 'mph', label: 'Miles per hour', symbol: 'mph', dimension: 'speed', factor: 1609.344 / 3600, kind: 'multiplicative' },
  { id: 'fps', label: 'Feet per second', symbol: 'ft/s', dimension: 'speed', factor: 0.3048, kind: 'multiplicative' },

  // Time (base: second)
  { id: 's', label: 'Second', symbol: 's', dimension: 'time', factor: 1, kind: 'multiplicative' },
  { id: 'min', label: 'Minute', symbol: 'min', dimension: 'time', factor: 60, kind: 'multiplicative' },
  { id: 'h', label: 'Hour', symbol: 'h', dimension: 'time', factor: 3600, kind: 'multiplicative' },
  { id: 'day', label: 'Day', symbol: 'd', dimension: 'time', factor: 86400, kind: 'multiplicative' },
  { id: 'week', label: 'Week', symbol: 'wk', dimension: 'time', factor: 604800, kind: 'multiplicative' },
  { id: 'year', label: 'Year (365 d)', symbol: 'yr', dimension: 'time', factor: 31536000, kind: 'multiplicative' },

  // Pressure (base: Pa)
  { id: 'pa', label: 'Pascal', symbol: 'Pa', dimension: 'pressure', factor: 1, kind: 'multiplicative' },
  { id: 'kpa', label: 'Kilopascal', symbol: 'kPa', dimension: 'pressure', factor: 1000, kind: 'multiplicative' },
  { id: 'bar', label: 'Bar', symbol: 'bar', dimension: 'pressure', factor: 100000, kind: 'multiplicative' },
  { id: 'psi', label: 'PSI', symbol: 'psi', dimension: 'pressure', factor: 6894.757293168, kind: 'multiplicative' },
  { id: 'atm', label: 'Atmosphere', symbol: 'atm', dimension: 'pressure', factor: 101325, kind: 'multiplicative' },

  // Energy (base: J)
  { id: 'j', label: 'Joule', symbol: 'J', dimension: 'energy', factor: 1, kind: 'multiplicative' },
  { id: 'kj', label: 'Kilojoule', symbol: 'kJ', dimension: 'energy', factor: 1000, kind: 'multiplicative' },
  { id: 'cal', label: 'Calorie', symbol: 'cal', dimension: 'energy', factor: 4.184, kind: 'multiplicative' },
  { id: 'kcal', label: 'Kilocalorie', symbol: 'kcal', dimension: 'energy', factor: 4184, kind: 'multiplicative' },
  { id: 'wh', label: 'Watt-hour', symbol: 'Wh', dimension: 'energy', factor: 3600, kind: 'multiplicative' },
  { id: 'kwh', label: 'Kilowatt-hour', symbol: 'kWh', dimension: 'energy', factor: 3.6e6, kind: 'multiplicative' },
  { id: 'btu', label: 'BTU', symbol: 'BTU', dimension: 'energy', factor: 1055.05585262, kind: 'multiplicative' },

  // Power (base: W)
  { id: 'w', label: 'Watt', symbol: 'W', dimension: 'power', factor: 1, kind: 'multiplicative' },
  { id: 'kw', label: 'Kilowatt', symbol: 'kW', dimension: 'power', factor: 1000, kind: 'multiplicative' },
  { id: 'hp', label: 'Horsepower', symbol: 'hp', dimension: 'power', factor: 745.69987158227, kind: 'multiplicative' },

  // Data storage (base: byte, binary)
  { id: 'byte', label: 'Byte', symbol: 'B', dimension: 'dataStorage', factor: 1, kind: 'multiplicative' },
  { id: 'kb', label: 'Kilobyte', symbol: 'KB', dimension: 'dataStorage', factor: 1024, kind: 'multiplicative' },
  { id: 'mb', label: 'Megabyte', symbol: 'MB', dimension: 'dataStorage', factor: 1024 ** 2, kind: 'multiplicative' },
  { id: 'gb', label: 'Gigabyte', symbol: 'GB', dimension: 'dataStorage', factor: 1024 ** 3, kind: 'multiplicative' },
  { id: 'tb', label: 'Terabyte', symbol: 'TB', dimension: 'dataStorage', factor: 1024 ** 4, kind: 'multiplicative' },

  // Data transfer (base: bps)
  { id: 'bps', label: 'Bits per second', symbol: 'bps', dimension: 'dataTransfer', factor: 1, kind: 'multiplicative' },
  { id: 'kbps', label: 'Kilobits per second', symbol: 'Kbps', dimension: 'dataTransfer', factor: 1000, kind: 'multiplicative' },
  { id: 'mbps', label: 'Megabits per second', symbol: 'Mbps', dimension: 'dataTransfer', factor: 1e6, kind: 'multiplicative' },
  { id: 'gbps', label: 'Gigabits per second', symbol: 'Gbps', dimension: 'dataTransfer', factor: 1e9, kind: 'multiplicative' },

  // Angle (base: degree)
  { id: 'deg', label: 'Degree', symbol: '°', dimension: 'angle', factor: 1, kind: 'multiplicative' },
  { id: 'rad', label: 'Radian', symbol: 'rad', dimension: 'angle', factor: 180 / Math.PI, kind: 'multiplicative' },
  { id: 'grad', label: 'Gradian', symbol: 'grad', dimension: 'angle', factor: 0.9, kind: 'multiplicative' },

  // Density (base: kg/m³)
  { id: 'kgm3', label: 'Kilogram per cubic meter', symbol: 'kg/m³', dimension: 'density', factor: 1, kind: 'multiplicative' },
  { id: 'gcm3', label: 'Gram per cubic centimeter', symbol: 'g/cm³', dimension: 'density', factor: 1000, kind: 'multiplicative' },
  { id: 'lbft3', label: 'Pound per cubic foot', symbol: 'lb/ft³', dimension: 'density', factor: 16.01846337396, kind: 'multiplicative' },
]

const unitMap = new Map(UNITS.map((u) => [u.id, u]))

export function getUnit(id: string): Unit | undefined {
  return unitMap.get(id)
}

export function getUnitsByDimension(dimension: UnitDimension): Unit[] {
  return UNITS.filter((u) => u.dimension === dimension)
}

export function searchUnits(query: string): Unit[] {
  const q = query.trim().toLowerCase()
  if (!q) return UNITS
  return UNITS.filter(
    (u) =>
      u.id.toLowerCase().includes(q) ||
      u.label.toLowerCase().includes(q) ||
      u.symbol.toLowerCase().includes(q),
  )
}
