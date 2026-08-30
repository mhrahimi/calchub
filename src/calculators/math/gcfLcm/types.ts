export interface GcfLcmInput {
  values: string
}

export interface GcfLcmResult {
  inputs: bigint[]
  gcf: bigint
  lcm: bigint
  euclideanSteps: Array<{ step: number; a: string; b: string; remainder: string }>
  primeFactors: Array<{ value: string; factors: string }>
}
