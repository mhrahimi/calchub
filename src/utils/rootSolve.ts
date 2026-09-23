export type SolveStatus = 'success' | 'no_solution' | 'unreachable' | 'invalid_domain' | 'negative_amortization' | 'max_iterations'
export type SolveResult = { status: 'success'; value: number; iterations: number } | { status: Exclude<SolveStatus,'success'>; value: null; message: string; range?: [number,number] }
export class CalculationError extends Error {
  constructor(public status: Exclude<SolveStatus,'success'>, message: string) { super(message) }
}
export function requireSolution(r: SolveResult): number {
  if(r.status!=='success') throw new CalculationError(r.status,r.message)
  return r.value
}
/** Bracketed bisection; no unconverged estimates are returned as success. */
export function solveRoot(f:(x:number)=>number,a:number,b:number,tolerance=1e-10,maxIter=200):SolveResult {
  const fail=(status:Exclude<SolveStatus,'success'>,message:string):SolveResult=>({status,value:null,message,range:[a,b]})
  if(![a,b,tolerance].every(Number.isFinite)||a>=b||tolerance<=0||maxIter<1) return fail('invalid_domain','Invalid solver bounds')
  let fa=f(a); const fb=f(b)
  if(!Number.isFinite(fa)||!Number.isFinite(fb)) return fail('invalid_domain','Non-finite objective at endpoints')
  if(fa===0) return {status:'success',value:a,iterations:0}
  if(fb===0) return {status:'success',value:b,iterations:0}
  if(Math.sign(fa)===Math.sign(fb)) return fail('no_solution','No sign-changing root in bracket')
  for(let i=1;i<=maxIter;i++) {
    const mid=a+(b-a)/2, fm=f(mid)
    if(!Number.isFinite(fm)) return fail('invalid_domain','Non-finite objective in bracket')
    if(fm===0||Math.abs(b-a)<=tolerance*Math.max(1,Math.abs(mid))) return {status:'success',value:mid,iterations:i}
    if(Math.sign(fa)!==Math.sign(fm)) b=mid; else {a=mid;fa=fm}
  }
  return fail('max_iterations','Root solver did not converge')
}
export function findRateResult(f:(r:number)=>number,guess=0.05):SolveResult {
  if(f(0)===0) return {status:'success',value:0,iterations:0}
  const points=[...new Set([-0.999999,-0.99,-0.9,-0.5,-0.1,-0.01,0,0.01,guess,0.1,0.5,1,2,5,10,100])].filter(x=>Number.isFinite(x)&&x>-1).sort((a,b)=>a-b)
  let prev:{x:number;y:number}|undefined
  for(const x of points) {
    const y=f(x)
    if(!Number.isFinite(y)) {prev=undefined;continue}
    if(y===0) return {status:'success',value:x,iterations:0}
    if(prev&&Math.sign(y)!==Math.sign(prev.y)) return solveRoot(f,prev.x,x)
    prev={x,y}
  }
  return {status:prev?'no_solution':'invalid_domain',value:null,message:'No root found in searched periodic-rate range; roots outside it or multiple roots may exist.',range:[points[0],points[points.length-1]]}
}
export function solveLoanRateResult(p:number,payment:number,n:number,balloon=0):SolveResult {
  if(![p,payment,n,balloon].every(Number.isFinite)||p<=0||payment<0||n<=0||balloon<0) return {status:'invalid_domain',value:null,message:'Invalid loan inputs'}
  return findRateResult(r=>r===0?p-payment*n-balloon:p-payment*(-Math.expm1(-n*Math.log1p(r)))/r-balloon*Math.exp(-n*Math.log1p(r)))
}
/** Legacy adapters preserve null-on-failure contracts. */
export function brentSolve(f:(x:number)=>number,a:number,b:number,t=1e-10,n=200):number|null{return solveRoot(f,a,b,t,n).value}
export function findRate(f:(r:number)=>number,g=0.05):number|null{return findRateResult(f,g).value}
export function solveLoanRate(p:number,pmt:number,n:number,b=0):number|null{return solveLoanRateResult(p,pmt,n,b).value}
