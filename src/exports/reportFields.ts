import { displayNumber } from '@/utils/numberFormat'
import type { CalculationProvenance } from './provenance'
import { snapshotCurrency } from './provenance'

export type FieldKind = 'currency' | 'number' | 'fraction' | 'percent' | 'text' | 'boolean' | 'date' | 'integer'
export interface ReportField { key:string; label:string; raw:string | number | boolean | null; kind:FieldKind; unit:string; precision:number; display:string; primary?:boolean }
type Definition = [key:string,label:string,kind?:FieldKind,unit?:string,precision?:number]
const money = (key:string,label:string):Definition=>[key,label,'currency']
const number = (key:string,label:string,unit='',precision=4):Definition=>[key,label,'number',unit,precision]
const fraction = (key:string,label:string):Definition=>[key,label,'fraction']
const percent = (key:string,label:string):Definition=>[key,label,'percent']
const text = (key:string,label:string):Definition=>[key,label,'text']
const loanFields:Definition[]=[money('payment','Payment per period'),money('totalInterest','Total interest'),money('remainingBalance','Remaining principal'),money('balloonPaid','Balloon payment')]
export const REPORT_FIELDS:Record<string,Definition[]> = {
  amortization:[...loanFields,money('totalPayments','Total paid'),money('totalPrincipal','Original principal'),number('payoffPeriod','Final payment period','periods',0),money('interestSaved','Interest saved'),number('periodsSaved','Periods saved','periods',0)],
  mortgage:[money('principalAndInterest','Principal and interest per month'),money('totalMonthlyHousing','Monthly housing cost'),money('loanAmount','Original mortgage principal'),money('downPaymentAmount','Down payment'),money('totalInterest','Total interest'),money('totalPrincipalPaid','Principal repaid'),money('remainingBalance','Remaining principal'),money('totalPayments','Total mortgage payments'),money('finalPayment',"Final month's loan payments"),money('totalLifetimeCost','Housing costs during loan horizon'),['payoffDate','Payoff date','date'],fraction('monthlyRate','Effective monthly interest rate'),money('interestSaved','Interest saved'),number('periodsSaved','Months saved','months',0)],
  loan:[...loanFields,money('financedAmount','Financed amount'),money('totalCost','Total cost')],
  'interest-rate':[fraction('annualRate','Nominal annual rate'),fraction('effectiveAnnualRate','Effective annual rate'),fraction('periodicRate','Rate per payment period'),money('totalInterest','Total interest'),money('remainingBalance','Remaining principal')],
  'compound-interest':[money('finalBalance','Final balance'),money('totalContributions','Total contributions'),money('interestEarned','Interest earned'),money('realValue','Inflation-adjusted balance')],
  investment:[money('solvedValue','Solved amount'),money('endingBalance','Ending balance'),money('startingPrincipal','Starting investment'),money('totalContributions','Total contributions'),money('investmentEarnings','Investment earnings')],
  'savings-goal':[money('requiredContribution','Contribution per period'),number('periodsToGoal','Whole contribution periods','periods',0),number('timeToGoal','Time horizon','years',6),money('projectedBalance','Projected balance'),money('goalAmount','Goal amount'),money('totalContributions','Total contributions')],
  retirement:[money('projectedBalance','Projected retirement balance'),money('requiredBalance','Required retirement balance'),money('shortfallOrSurplus','Surplus / shortfall'),money('requiredAnnualContribution','Required first-year contribution'),number('depletionAge','Age at depletion','years',0),money('totalUnmetSpending','Total unmet retirement spending'),number('yearsToRetirement','Years until retirement','years',0)],
  dti:[percent('backEndDti','Total debt-to-income ratio'),percent('frontEndDti','Housing debt-to-income ratio'),money('housingCost','Monthly housing cost'),money('totalDebt','Total monthly debt'),['withinGuideline','Within selected guideline','boolean']],
  salary:[money('estimatedNetAnnual','Estimated annual take-home'),money('convertedAmount','Amount per selected pay frequency'),money('annualGross','Annual gross pay'),money('federalTax','Federal income tax'),money('regionalTax','Regional income tax'),money('payrollTotal','Employee payroll contributions'),money('pretaxDeductions','Eligible deductions'),money('equivalents.hourly','Hourly equivalent'),money('equivalents.monthly','Monthly equivalent'),money('equivalents.annual','Annual equivalent')],
  'income-tax':[money('totalTax','Total income tax'),money('afterTaxIncome','After-tax income'),fraction('effectiveRate','Effective income-tax rate'),fraction('marginalRate','Marginal income-tax rate'),money('taxableIncome','Federal taxable income'),money('regionalTaxableIncome','Regional taxable income'),money('federalTax','Federal income tax'),money('regionalTax','Regional income tax'),money('standardDeduction','Federal standard deduction'),money('regionalStandardDeduction','Regional standard deduction'),money('federalSurtax','Federal surtax'),money('regionalSurtax','Regional surtax')],
  inflation:[money('primaryAmount','Equivalent amount'),percent('percentChange','Price-level change'),percent('purchasingPowerReduction','Purchasing-power reduction'),money('realValue','Real purchasing power'),money('futurePrice','Future price'),number('baseCpi','Base CPI','index'),number('targetCpi','Target CPI','index')],
  bonds:[['ytmPercent','Nominal annual yield to maturity','percent','%',4],money('couponPayment','Coupon per period'),percent('currentYield','Current yield'),number('macaulayDuration','Macaulay duration','years'),number('modifiedDuration','Modified duration','years'),number('convexity','Convexity','years²')],
  'black-scholes':[money('callPrice','European call value'),money('putPrice','European put value'),number('greeks.deltaCall','Call delta','per unit of spot'),number('greeks.deltaPut','Put delta','per unit of spot'),number('greeks.gamma','Gamma','per unit of spot²',6),number('greeks.vega','Vega','per 1 percentage-point volatility'),number('greeks.thetaCall','Call theta','per day'),number('greeks.thetaPut','Put theta','per day'),number('greeks.rhoCall','Call rho','per 1 percentage-point rate'),number('greeks.rhoPut','Put rho','per 1 percentage-point rate')],
  'cap-table':[money('pricePerShare','Price per share'),money('postMoneyValuation','Post-money valuation'),number('preMoneyFds','Pre-money fully diluted shares','shares'),number('postMoneyFds','Post-money fully diluted shares','shares'),number('newInvestorShares','New investor shares','shares'),number('optionPoolShares','Option pool shares','shares'),percent('availablePoolPercent','Available option pool'),percent('ownershipTotal','Total ownership')],
  'cre-waterfall':[money('lpTotal','Limited partner distribution'),money('gpTotal','General partner distribution'),fraction('lpIrr','Limited partner IRR'),fraction('gpIrr','General partner IRR'),number('lpMoic','Limited partner multiple','x'),number('gpMoic','General partner multiple','x')],
  dcf:[money('enterpriseValue','Enterprise value'),money('equityValue','Equity value'),money('terminalValue','Terminal value'),money('pvTerminalValue','Present value of terminal value'),money('pvFcf','Present value of forecast cash flow'),text('terminalMethod','Terminal method')],
  lbo:[number('moic','Equity multiple','x'),fraction('irr','Equity IRR'),money('exitEv','Exit enterprise value'),money('exitEquity','Exit equity proceeds'),money('exitCash','Retained cash at exit'),money('sourcesTotal','Total funding sources'),money('usesTotal','Total funding uses')],
  'number-base':[text('targetValue','Converted value'),number('targetBase','Target base','',0),text('sourceValue','Original value'),number('sourceBase','Original base','',0)],
  'fractions-percentage':[text('primary','Result'),text('improper','Improper fraction'),text('mixed','Mixed fraction'),number('decimal','Decimal value','',8)],
  'standard-deviation':[number('populationSd','Population standard deviation','',6),number('sampleSd','Sample standard deviation','',6),number('count','Observations','',0),number('sum','Sum'),number('mean','Mean'),number('min','Minimum'),number('max','Maximum'),number('range','Range'),number('populationVariance','Population variance','',6),number('sampleVariance','Sample variance','',6)],
  'random-number':[text('values','Generated values'),number('count','Count','',0),number('min','Minimum bound'),number('max','Maximum bound'),['unique','Unique integers','boolean']],
  triangle:[['ambiguous','Multiple valid solutions','boolean']],
  trigonometry:[number('hypotenuse','Hypotenuse','length units'),number('opposite','Opposite leg','length units'),number('adjacent','Adjacent leg','length units'),number('angleA','Angle A'),number('angleB','Angle B'),number('sinA','Sine of A','',6),number('cosA','Cosine of A','',6),number('tanA','Tangent of A','',6)],
  'p-value':[number('pValue','P-value','probability',8),number('testStatistic','Test statistic','',6),number('standardError','Standard error','',6),number('degreesOfFreedom','Degrees of freedom','',0),number('ciLower','Confidence interval lower bound','',6),number('ciUpper','Confidence interval upper bound','',6),number('marginOfError','Margin of error','',6),percent('confidenceLevel','Confidence level'),number('estimate','Estimate','',6),text('caveat','Interpretation')],
  'gcf-lcm':[['gcf','Greatest common factor','integer'],['lcm','Least common multiple','integer']],
  date:[['resultDate','Result date','date'],number('totalDays','Total days','days',0),number('totalWeeks','Total weeks','weeks',4),number('years','Calendar years','years',0),number('months','Calendar months','months',0),number('days','Remaining days','days',0)],
  conversion:[number('outputValue','Converted value','',8),number('inputValue','Original value','',8)],
}

export function humanizeKey(key:string):string {
  return key.replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/[_-]/g,' ').toLowerCase().replace(/^./,v=>v.toUpperCase()).replace(/\b(cpi|ebitda|ebit|wacc|nwc|hoa|pmi|dti|irr|moic|lp|gp)\b/gi,v=>v.toUpperCase())
}
export function makeField(def:Definition, value:unknown, p:CalculationProvenance):ReportField {
  const [key,label,kind='number',specifiedUnit='',precision=kind==='currency'||kind==='percent'||kind==='fraction'?2:4]=def
  const unit = kind==='currency' ? p.currency ?? 'currency not recorded' : kind==='percent'||kind==='fraction'?'%':specifiedUnit
  const raw = typeof value==='bigint'?value.toString():Array.isArray(value)?value.join(', '):value === undefined ? null : value as ReportField['raw']
  let display:string
  if(raw===null||typeof raw==='number'&&!Number.isFinite(raw)) display='Not defined / not applicable'
  else if(kind==='currency'&&typeof raw==='number') display=snapshotCurrency(raw,p)
  else if((kind==='percent'||kind==='fraction')&&typeof raw==='number') display=`${displayNumber(kind==='fraction'?raw*100:raw,p.locale??'en-US',precision,true)}%`
  else if(kind==='boolean') display=raw?'Yes':'No'
  else if(kind==='integer') display=new Intl.NumberFormat(p.locale??'en-US').format(BigInt(String(raw))).replace(/^-/, '−')
  else if(typeof raw==='number') display=displayNumber(raw,p.locale??'en-US',precision)+(unit?` ${unit}`:'')
  else display=String(raw)
  return {key,label,kind,unit,precision,raw,display}
}
function atPath(value:unknown,path:string):unknown { return path.split('.').reduce<unknown>((v,k)=>v && typeof v==='object'?(v as Record<string,unknown>)[k]:undefined,value) }
export function resultFields(id:string,inputs:unknown,results:unknown,p:CalculationProvenance,primary:string|null):ReportField[] {
  const r=results as Record<string,unknown>, i=inputs as Record<string,unknown>
  const model=id==='dcf-lbo'?('moic'in r?'lbo':'dcf'):id
  const defs=(REPORT_FIELDS[model]??[]).map(d=>[...d] as Definition)
  if(model==='investment') {defs[0]=['solvedValue',String(r.solvedLabel),i.solveFor==='rate'?'percent':i.solveFor==='periods'?'number':'currency',i.solveFor==='periods'?'years':'']}
  if(model==='savings-goal') primary=i.solveFor==='contribution'?'requiredContribution':i.solveFor==='time'?'periodsToGoal':'projectedBalance'
  if(model==='p-value'&&!('pValue'in r)) primary='estimate'
  const fields=defs.filter(d=>atPath(r,d[0])!==undefined).map(d=>{
    if(model==='trigonometry'&&['angleA','angleB'].includes(d[0]))d[3]=String(r.angleUnit)
    if(model==='conversion')d[3]=String(d[0]==='outputValue'?r.toSymbol:r.fromSymbol)
    const field=makeField(d,atPath(r,d[0]),p)
    if (field.raw === null && model === 'retirement' && d[0] === 'depletionAge') field.display = 'Not depleted within projection'
    if (model === 'standard-deviation' && ['sampleSd','sampleVariance'].includes(d[0]) && (field.raw === null || typeof field.raw === 'number' && !Number.isFinite(field.raw))) field.display = 'Not defined for one observation'
    if (model === 'random-number' && d[0] === 'values' && Array.isArray(r.values) && r.values.length > 20) field.display = `${r.values.slice(0,20).join(', ')} … (${r.values.length} values; see complete table)`
    if (d[0] === 'terminalMethod') field.display = field.raw === 'gordon' ? 'Perpetual growth' : 'Exit multiple'
    field.primary=d[0]===primary
    return field
  })
  if(model==='triangle') for(const [index,solution] of (r.solutions as Record<string,number>[]).entries()) for(const [key,label,unit] of [['sideA','Side a','length units'],['sideB','Side b','length units'],['sideC','Side c','length units'],['angleA','Angle A','degrees'],['angleB','Angle B','degrees'],['angleC','Angle C','degrees'],['area','Area','square units'],['perimeter','Perimeter','length units']]) {
    if(solution[key]!==undefined) fields.push(makeField([`solutions.${index}.${key}`,`Solution ${index+1}: ${label}`,'number',unit],solution[key],p))
  }
  if(model==='triangle') { const area=fields.find(f=>f.key==='solutions.0.area');if(area){fields.forEach(f=>f.primary=f===area)} }
  if(model==='salary') for(const [index,item] of ((r.payrollLabels??[]) as {label:string;amount:number}[]).entries()) fields.push(makeField([`payroll.${index}`,item.label,'currency'],item.amount,p))
  if(!fields.some(f=>f.primary)&&fields.length)fields[0].primary=true
  return fields.filter((field,index)=>fields.findIndex(other=>other.label===field.label&&other.kind===field.kind&&other.raw===field.raw)===index)
}

const currencyInputs=new Set('principal loanAmount homePrice downPayment propertyTax homeInsurance hoa pmi otherCosts extraPayment monthlyExtraPayment yearlyExtraPayment amount startingInvestment periodicContribution targetValue contribution currentSavings goalAmount annualContribution retirementSpending otherRetirementIncome grossMonthlyIncome housingCost debtPayments grossIncome pretaxDeductions faceValue bondPrice spot strike preMoneyValuation newInvestment investmentAmount purchaseEv sponsorEquity initialDebt transactionFees minimumCash cash grossDebt baseNwc lpContribution gpContribution totalDistribution fees vehiclePrice cashDown tradeIn rebates taxableFees payment netDebt initialEquity exitCash capex nwcChange ebitda depreciation revenue balance fee balloon'.split(' '))
const enumLabels:Record<string,Record<string,string>> = {
  solveFor:{fv:'Ending balance',pv:'Starting investment',pmt:'Contribution',rate:'Required return',periods:'Time horizon',time:'Time to goal',contribution:'Required contribution',balance:'Projected balance'},
  terminalMethod:{gordon:'Perpetual growth',exitMultiple:'Exit multiple'},
  country:{US:'United States',CA:'Canada'},
  contributionTiming:{begin:'Beginning of period',end:'End of period'},
}
const percentInputs=new Set('interestRate returnRate expectedReturn contributionGrowth inflationRate inflation couponRate riskFreeRate volatility dividendYield salesTaxRate wacc terminalGrowth taxRate effectiveTaxRate revenueGrowth ebitdaMargin exitFeePercent guideline confidenceLevel downPaymentPercent'.split(' '))
export function inputFields(inputs:unknown,p:CalculationProvenance):ReportField[] {
  const out:ReportField[]=[]
  const root=inputs as Record<string,unknown>
  const visit=(value:unknown,path:string,label:string,key:string)=>{
    if(value===undefined)return
    if(value&&typeof value==='object') { for(const [k,v] of Object.entries(value))visit(v,path?`${path}.${k}`:k,`${label}${label?' / ':''}${/^\d+$/.test(k)?Number(k)+1:humanizeKey(k)}`,k); return }
    let kind:FieldKind=typeof value==='boolean'?'boolean':typeof value==='number'?'number':'text'
    if(typeof value==='number'&&currencyInputs.has(key))kind='currency'
    if(typeof value==='number'&&(percentInputs.has(key)||key==='downPayment'&&root.downPaymentIsPercent))kind='percent'
    if(typeof value==='number'&&key.endsWith('Percent'))kind='percent'
    if(typeof value==='number'&&['taxYear','startYear','year'].includes(key))kind='integer'
    const unit=key==='exitMultiple'?'x':key.endsWith('Years')||key==='retirementDuration'?'years':key.endsWith('Months')?'months':key==='shares'?'shares':''
    const field=makeField([path,label,kind,unit],value,p)
    if(typeof value==='number'&&['taxYear','startYear','year'].includes(key))field.display=String(value)
    if(typeof value==='string'&&enumLabels[key]?.[value])field.display=enumLabels[key][value]
    out.push(field)
  }
  visit(inputs,'','','')
  return out
}
