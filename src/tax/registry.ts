import type {
  TaxCountry,
  TaxJurisdictionConfig,
  FilingStatus,
  JurisdictionOption,
} from './types'
import { usFederal2026 } from './us/2026/federal'
import { california2026 } from './us/2026/california'
import { newYork2026 } from './us/2026/newYork'
import { newJersey2026 } from './us/2026/newJersey'
import { illinois2026 } from './us/2026/illinois'
import { pennsylvania2026 } from './us/2026/pennsylvania'
import { massachusetts2026 } from './us/2026/massachusetts'
import { texas2026 } from './us/2026/texas'
import { florida2026 } from './us/2026/florida'
import { washington2026 } from './us/2026/washington'
import { canadaFederal2026 } from './canada/2026/federal'
import { ontario2026 } from './canada/2026/ontario'
import { britishColumbia2026 } from './canada/2026/britishColumbia'
import { alberta2026 } from './canada/2026/alberta'
import { quebec2026 } from './canada/2026/quebec'
import { manitoba2026 } from './canada/2026/manitoba'
import { saskatchewan2026 } from './canada/2026/saskatchewan'

export const TAX_CONFIG_VERSION = '2026'

const US_STATES: TaxJurisdictionConfig[] = [
  california2026,
  newYork2026,
  newJersey2026,
  illinois2026,
  pennsylvania2026,
  massachusetts2026,
  texas2026,
  florida2026,
  washington2026,
]

const CA_PROVINCES: TaxJurisdictionConfig[] = [
  ontario2026,
  britishColumbia2026,
  alberta2026,
  quebec2026,
  manitoba2026,
  saskatchewan2026,
]

const byId = new Map<string, TaxJurisdictionConfig>()
for (const j of [usFederal2026, canadaFederal2026, ...US_STATES, ...CA_PROVINCES]) {
  byId.set(j.id, j)
}

export function getFederalConfig(country: TaxCountry, year = 2026): TaxJurisdictionConfig {
  if (year !== 2026) {
    throw new Error(`Tax year ${year} is not supported. Only 2026 is available.`)
  }
  return country === 'US' ? usFederal2026 : canadaFederal2026
}

export function getRegionalConfig(
  country: TaxCountry,
  jurisdictionId: string,
  year = 2026,
): TaxJurisdictionConfig {
  if (year !== 2026) {
    throw new Error(`Tax year ${year} is not supported. Only 2026 is available.`)
  }
  const config = byId.get(jurisdictionId)
  if (!config || config.country !== country) {
    throw new Error(`Unsupported jurisdiction: ${jurisdictionId}`)
  }
  if (config.id === 'us-federal' || config.id === 'ca-federal') {
    throw new Error(`Use getFederalConfig for federal tax; ${jurisdictionId} is federal.`)
  }
  return config
}

export function getTaxConfig(
  country: TaxCountry,
  jurisdictionId: string,
  year = 2026,
  _filingStatus?: FilingStatus,
): { federal: TaxJurisdictionConfig; regional: TaxJurisdictionConfig } {
  return {
    federal: getFederalConfig(country, year),
    regional: getRegionalConfig(country, jurisdictionId, year),
  }
}

export function listJurisdictions(country: TaxCountry): JurisdictionOption[] {
  const list = country === 'US' ? US_STATES : CA_PROVINCES
  return list.map((j) => ({ id: j.id, name: j.name, country: j.country }))
}

export function getJurisdictionById(id: string): TaxJurisdictionConfig | undefined {
  return byId.get(id)
}

export { usFederal2026, canadaFederal2026 }
