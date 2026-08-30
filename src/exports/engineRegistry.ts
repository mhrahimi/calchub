import type { CalculationExplanation, ChartData, TableData } from '@/calculators/types'
import {
  explainAmortization,
  buildAmortizationCharts,
  buildAmortizationTable,
} from '@/calculators/finance/amortization/calculate'
import {
  explainMortgage,
  buildMortgageCharts,
  buildMortgageTable,
} from '@/calculators/finance/mortgage/calculate'
import {
  explainInvestment,
  buildInvestmentCharts,
  buildInvestmentTable,
} from '@/calculators/finance/investment/calculate'
import {
  explainCompoundInterest,
  buildCompoundInterestCharts,
  buildCompoundInterestTable,
} from '@/calculators/finance/compoundInterest/calculate'
import { explainLoan, buildLoanCharts, buildLoanTable } from '@/calculators/finance/loan/calculate'
import {
  explainRetirement,
  buildRetirementCharts,
  buildRetirementTable,
} from '@/calculators/finance/retirement/calculate'
import {
  explainInterestRate,
  buildInterestRateCharts,
  buildInterestRateTable,
} from '@/calculators/finance/interestRate/calculate'
import {
  explainInflation,
  buildInflationCharts,
  buildInflationTable,
} from '@/calculators/finance/inflation/calculate'
import { explainDti, buildDtiCharts, buildDtiTable } from '@/calculators/finance/dti/calculate'
import {
  explainSavingsGoal,
  buildSavingsGoalCharts,
  buildSavingsGoalTable,
} from '@/calculators/finance/savingsGoal/calculate'
import { explainSalary, buildSalaryCharts, buildSalaryTable } from '@/calculators/finance/salary/calculate'
import {
  explainIncomeTax,
  buildIncomeTaxCharts,
  buildIncomeTaxTable,
} from '@/calculators/tax/incomeTax/calculate'
import {
  explainBlackScholes,
  buildBlackScholesCharts,
  buildBlackScholesTable,
} from '@/calculators/finance/blackScholes/calculate'
import { explainBonds, buildBondsCharts, buildBondsTable } from '@/calculators/finance/bonds/calculate'
import {
  explainCapTable,
  buildCapTableCharts,
  buildCapTableTable,
} from '@/calculators/finance/capTable/calculate'
import {
  explainCreWaterfall,
  buildCreWaterfallCharts,
  buildCreWaterfallTable,
} from '@/calculators/finance/creWaterfall/calculate'
import { explainDcf, buildDcfCharts, buildDcfTable } from '@/calculators/finance/dcf/calculate'
import { explainLbo, buildLboCharts, buildLboTable } from '@/calculators/finance/lbo/calculate'
import { explainNumberBase, buildNumberBaseTable } from '@/calculators/math/numberBase/calculate'
import {
  explainFractionsPercentage,
  buildFractionsPercentageTable,
} from '@/calculators/math/fractionsPercentage/calculate'
import {
  explainStandardDeviation,
  buildStandardDeviationCharts,
  buildStandardDeviationTable,
} from '@/calculators/math/standardDeviation/calculate'
import {
  explainRandomNumber,
  buildRandomNumberCharts,
  buildRandomNumberTable,
} from '@/calculators/math/randomNumber/calculate'
import { explainTriangle, buildTriangleTable } from '@/calculators/math/triangle/calculate'
import { explainTrigonometry, buildTrigonometryTable } from '@/calculators/math/trigonometry/calculate'
import { explainPValue, buildPValueCharts, buildPValueTable } from '@/calculators/math/pValue/calculate'
import { explainGcfLcm, buildGcfLcmTable } from '@/calculators/math/gcfLcm/calculate'
import { explainDate, buildDateTable } from '@/calculators/general/date/calculate'
import { explainConversion, buildConversionTable } from '@/calculators/general/conversion/calculate'

export interface EngineExportFns {
  explain: (input: unknown, result: unknown) => CalculationExplanation
  buildTable?: (result: unknown) => TableData
  buildCharts?: (result: unknown) => ChartData[]
}

const REGISTRY: Record<string, EngineExportFns> = {
  amortization: {
    explain: explainAmortization as EngineExportFns['explain'],
    buildTable: buildAmortizationTable as EngineExportFns['buildTable'],
    buildCharts: buildAmortizationCharts as EngineExportFns['buildCharts'],
  },
  mortgage: {
    explain: explainMortgage as EngineExportFns['explain'],
    buildTable: buildMortgageTable as EngineExportFns['buildTable'],
    buildCharts: buildMortgageCharts as EngineExportFns['buildCharts'],
  },
  investment: {
    explain: explainInvestment as EngineExportFns['explain'],
    buildTable: buildInvestmentTable as EngineExportFns['buildTable'],
    buildCharts: buildInvestmentCharts as EngineExportFns['buildCharts'],
  },
  'compound-interest': {
    explain: explainCompoundInterest as EngineExportFns['explain'],
    buildTable: buildCompoundInterestTable as EngineExportFns['buildTable'],
    buildCharts: buildCompoundInterestCharts as EngineExportFns['buildCharts'],
  },
  loan: {
    explain: explainLoan as EngineExportFns['explain'],
    buildTable: buildLoanTable as EngineExportFns['buildTable'],
    buildCharts: buildLoanCharts as EngineExportFns['buildCharts'],
  },
  retirement: {
    explain: explainRetirement as EngineExportFns['explain'],
    buildTable: buildRetirementTable as EngineExportFns['buildTable'],
    buildCharts: buildRetirementCharts as EngineExportFns['buildCharts'],
  },
  'interest-rate': {
    explain: explainInterestRate as EngineExportFns['explain'],
    buildTable: buildInterestRateTable as EngineExportFns['buildTable'],
    buildCharts: buildInterestRateCharts as EngineExportFns['buildCharts'],
  },
  inflation: {
    explain: explainInflation as EngineExportFns['explain'],
    buildTable: buildInflationTable as EngineExportFns['buildTable'],
    buildCharts: buildInflationCharts as EngineExportFns['buildCharts'],
  },
  dti: {
    explain: explainDti as EngineExportFns['explain'],
    buildTable: buildDtiTable as EngineExportFns['buildTable'],
    buildCharts: buildDtiCharts as EngineExportFns['buildCharts'],
  },
  'savings-goal': {
    explain: explainSavingsGoal as EngineExportFns['explain'],
    buildTable: buildSavingsGoalTable as EngineExportFns['buildTable'],
    buildCharts: buildSavingsGoalCharts as EngineExportFns['buildCharts'],
  },
  salary: {
    explain: explainSalary as EngineExportFns['explain'],
    buildTable: buildSalaryTable as EngineExportFns['buildTable'],
    buildCharts: buildSalaryCharts as EngineExportFns['buildCharts'],
  },
  'income-tax': {
    explain: explainIncomeTax as EngineExportFns['explain'],
    buildTable: buildIncomeTaxTable as EngineExportFns['buildTable'],
    buildCharts: buildIncomeTaxCharts as EngineExportFns['buildCharts'],
  },
  'black-scholes': {
    explain: explainBlackScholes as EngineExportFns['explain'],
    buildTable: buildBlackScholesTable as EngineExportFns['buildTable'],
    buildCharts: buildBlackScholesCharts as EngineExportFns['buildCharts'],
  },
  bonds: {
    explain: explainBonds as EngineExportFns['explain'],
    buildTable: buildBondsTable as EngineExportFns['buildTable'],
    buildCharts: buildBondsCharts as EngineExportFns['buildCharts'],
  },
  'cap-table': {
    explain: explainCapTable as EngineExportFns['explain'],
    buildTable: buildCapTableTable as EngineExportFns['buildTable'],
    buildCharts: buildCapTableCharts as EngineExportFns['buildCharts'],
  },
  'cre-waterfall': {
    explain: explainCreWaterfall as EngineExportFns['explain'],
    buildTable: buildCreWaterfallTable as EngineExportFns['buildTable'],
    buildCharts: buildCreWaterfallCharts as EngineExportFns['buildCharts'],
  },
  'dcf-lbo': {
    explain: (input, result) => {
      const inp = input as { forecast?: Array<{ ebitda?: number; revenue?: number }> }
      const isLbo = inp.forecast?.[0]?.ebitda !== undefined
      return isLbo
        ? explainLbo(input as never, result as never)
        : explainDcf(input as never, result as never)
    },
    buildTable: (result) => {
      const r = result as { moic?: number; enterpriseValue?: number }
      if (r.moic !== undefined) return buildLboTable(result as never)
      return buildDcfTable(result as never)
    },
    buildCharts: (result) => {
      const r = result as { moic?: number; enterpriseValue?: number }
      if (r.moic !== undefined) return buildLboCharts(result as never)
      return buildDcfCharts(result as never)
    },
  },
  'number-base': {
    explain: explainNumberBase as EngineExportFns['explain'],
    buildTable: buildNumberBaseTable as EngineExportFns['buildTable'],
  },
  'fractions-percentage': {
    explain: explainFractionsPercentage as EngineExportFns['explain'],
    buildTable: buildFractionsPercentageTable as EngineExportFns['buildTable'],
  },
  'standard-deviation': {
    explain: explainStandardDeviation as EngineExportFns['explain'],
    buildTable: buildStandardDeviationTable as EngineExportFns['buildTable'],
    buildCharts: buildStandardDeviationCharts as EngineExportFns['buildCharts'],
  },
  'random-number': {
    explain: explainRandomNumber as EngineExportFns['explain'],
    buildTable: buildRandomNumberTable as EngineExportFns['buildTable'],
    buildCharts: buildRandomNumberCharts as EngineExportFns['buildCharts'],
  },
  triangle: {
    explain: explainTriangle as EngineExportFns['explain'],
    buildTable: buildTriangleTable as EngineExportFns['buildTable'],
  },
  trigonometry: {
    explain: explainTrigonometry as EngineExportFns['explain'],
    buildTable: buildTrigonometryTable as EngineExportFns['buildTable'],
  },
  'p-value': {
    explain: explainPValue as EngineExportFns['explain'],
    buildTable: buildPValueTable as EngineExportFns['buildTable'],
    buildCharts: buildPValueCharts as EngineExportFns['buildCharts'],
  },
  'gcf-lcm': {
    explain: explainGcfLcm as EngineExportFns['explain'],
    buildTable: buildGcfLcmTable as EngineExportFns['buildTable'],
  },
  date: {
    explain: explainDate as EngineExportFns['explain'],
    buildTable: buildDateTable as EngineExportFns['buildTable'],
  },
  conversion: {
    explain: explainConversion as EngineExportFns['explain'],
    buildTable: buildConversionTable as EngineExportFns['buildTable'],
  },
}

export function getEngineExportFns(calculatorId: string): EngineExportFns | undefined {
  return REGISTRY[calculatorId]
}
