import { Decimal } from './annuity'
import { calendarDate, dateText, eventDate, periodCoordinate } from './cashFlowDates'
export interface AmortizationRow {
  period: number; date?: string; payment: number; principal: number; interest: number; extraPrincipal: number; balance: number
  event?: 'payment' | 'extra' | 'rate_change' | 'balloon'
}
export interface AmortizationOptions {
  principal: number; ratePerPeriod: number; periods: number; payment?: number; extraPayment?: number
  extraFrequency?: 'every' | 'monthly' | 'yearly' | 'once'; startDate?: Date; balloon?: number
  paymentFrequency?: string
  extraPayments?: Array<{date: string; amount: number}>
  rateChanges?: Array<{date: string; ratePerPeriod: number}>
}
const round2 = (n:number) => new Decimal(n).toDecimalPlaces(2).toNumber()
export function buildAmortizationSchedule(o:AmortizationOptions) {
  const {principal,ratePerPeriod,periods,balloon=0,extraPayment=0,extraFrequency='every'}=o
  if(![principal,ratePerPeriod,periods,balloon,extraPayment,o.payment??0].every(Number.isFinite)||principal<0||ratePerPeriod<=-1||!Number.isInteger(periods)||periods<=0||periods>100000||balloon<0||balloon>principal||extraPayment<0||(o.payment??0)<0) throw new Error('Invalid amortization inputs')
  const frequency=o.paymentFrequency??'monthly'
  // startDate retains its historical meaning: first scheduled payment date.
  const first=calendarDate(o.startDate??'2026-01-01')
  const origin=eventDate(first,-1,frequency)
  const maturity=eventDate(first,periods-1,frequency)
  const discount=Math.exp(-periods*Math.log1p(ratePerPeriod))
  const payment=round2(o.payment??(ratePerPeriod===0?(principal-balloon)/periods:(principal-balloon*discount)*ratePerPeriod/(-Math.expm1(-periods*Math.log1p(ratePerPeriod)))))
  if(payment<0||!Number.isFinite(payment)) throw new Error('Invalid payment for rate and balloon')
  type Event={date:Date;kind:'payment'|'extra'|'rate_change'|'balloon';amount:number;period:number}
  const events:Event[]=[]
  for(let p=1;p<=periods;p++) {
    const date=eventDate(first,p-1,frequency)
    events.push({date,kind:'payment',amount:payment,period:p})
    if(extraPayment>0&&(extraFrequency==='every'||extraFrequency==='once'&&p===1)) events.push({date,kind:'extra',amount:extraPayment,period:p})
  }
  if(extraPayment>0&&(extraFrequency==='monthly'||extraFrequency==='yearly')) {
    const ef=extraFrequency==='yearly'?'annual':'monthly'
    for(let i=1;;i++) {
      const date=eventDate(origin,i,ef)
      if(date>maturity) break
      events.push({date,kind:'extra',amount:extraPayment,period:Math.max(1,Math.ceil(periodCoordinate(date,origin,frequency)))})
    }
  }
  for(const e of o.extraPayments??[]) events.push({date:calendarDate(e.date),kind:'extra',amount:e.amount,period:Math.max(1,Math.ceil(periodCoordinate(calendarDate(e.date),origin,frequency)))})
  for(const e of o.rateChanges??[]) events.push({date:calendarDate(e.date),kind:'rate_change',amount:e.ratePerPeriod,period:Math.max(1,Math.ceil(periodCoordinate(calendarDate(e.date),origin,frequency)))})
  for(const e of events) if(e.date<origin||e.date>maturity||!Number.isFinite(e.amount)||(e.kind==='rate_change'?e.amount<=-1:e.amount<0)) throw new Error('Cash-flow event outside term or invalid amount')
  if(balloon>0) events.push({date:maturity,kind:'balloon',amount:0,period:periods})
  const order={rate_change:0,payment:1,extra:2,balloon:3}
  events.sort((a,b)=>a.date.getTime()-b.date.getTime()||order[a.kind]-order[b.kind])
  let balance=round2(principal), accrued=0, rate=ratePerPeriod, previous=origin, totalInterest=0,totalPayments=0,balloonPaid=0,negative=false,payoffPeriod=0
  const coordinate=(d:Date)=>d<=first?(d.getTime()-origin.getTime())/(first.getTime()-origin.getTime()):1+periodCoordinate(d,first,frequency)
  const schedule:AmortizationRow[]=[]
  for(const e of events) {
    if(balance<=0&&accrued<=0) break
    const dt=coordinate(e.date)-coordinate(previous)
    accrued+=balance*Math.expm1(Math.log1p(rate)*dt)
    previous=e.date
    if(e.kind==='rate_change') {rate=e.amount;schedule.push({period:e.period,date:dateText(e.date),event:e.kind,payment:0,principal:0,interest:0,extraPrincipal:0,balance});continue}
    const interest=round2(accrued); accrued=0
    const due=round2(balance+interest)
    let paid=e.kind==='balloon'?due:Math.min(e.amount,due)
    // For an automatically calculated fixed-rate loan, settle the contractual balance
    // on the last installment. Rounding residue compounds and can exceed n/2 cents.
    // Explicit payments and rate changes retain their genuine balance-due status.
    if(e.kind==='payment'&&e.period===periods&&balloon===0&&o.payment===undefined&&!(o.rateChanges?.length)) paid=due
    paid=round2(paid)
    const reduction=round2(paid-interest)
    if(reduction<0) negative=true
    balance=round2(balance-reduction)
    totalInterest=round2(totalInterest+interest);totalPayments=round2(totalPayments+paid)
    if(e.kind==='balloon') balloonPaid=paid
    payoffPeriod=e.period
    schedule.push({period:e.period,date:dateText(e.date),event:e.kind,payment:paid,principal:e.kind==='extra'?0:reduction,interest,extraPrincipal:e.kind==='extra'?reduction:0,balance})
  }
  const status=negative?'negative_amortization':balance>0?'balance_due':'success'
  return {schedule,payment,totalInterest,totalPayments,payoffPeriod,balloonPaid,remainingBalance:balance,status,
    warnings:status==='success'?[]:[negative?'Payments do not cover accrued interest; unpaid interest is capitalized.':'Unpaid balance is due at maturity.'],
    assumptions:['Start date is the first payment date. Missing dates use 2026-01-01.','Periodic effective accrual interpolates calendar periods between dated events.','Interest and payments rounded to cents at cash-flow events.']}
}
export function compareSchedules(b:ReturnType<typeof buildAmortizationSchedule>,a:ReturnType<typeof buildAmortizationSchedule>) {
  return {interestSaved:round2(b.totalInterest-a.totalInterest),periodsSaved:b.payoffPeriod-a.payoffPeriod}
}
