/**
 * AI Security Testing — Issue #8
 * Strategic differentiator: security + reliability for AI apps.
 * Combines prompt injection, canary leakage, and output contract validation.
 */

export { testPromptInjection, plantCanaryInPrompt, detectCanaryLeakage } from './prompt-injection';
export { validateAgainstContract, fuzzContractValidation } from './contract-validation';

export interface AISecurityReport {
  targetEndpoint: string;
  timestamp: string;
  injectionResults: import('./prompt-injection').InjectionTestResult[];
  contractResults: import('./contract-validation').ContractTestResult[];
  summary: {
    totalPayloads: number;
    bypassDetected: number;
    canariesLeaked: number;
    contractViolations: number;
    overallRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  };
}

export async function generateAISecurityReport(
  endpoint: string,
  apiKey: string,
  contracts: import('./contract-validation').OutputContract[]
): Promise<AISecurityReport> {
  const injection = await import('./prompt-injection');
  const contract = await import('./contract-validation');

  const injectionResults = await injection.testPromptInjection(endpoint, apiKey);
  const contractResults: import('./contract-validation').ContractTestResult[] = [];

  for (const c of contracts) {
    const fuzzResults = await contract.fuzzContractValidation(c, endpoint, apiKey);
    contractResults.push(...fuzzResults);
  }

  const bypassDetected = injectionResults.filter(r => r.status === 'bypass-detected').length;
  const canariesLeaked = injectionResults.filter(r => r.leakedCanary).length;
  const contractViolations = contractResults.reduce(
    (sum, r) => sum + r.violations.length, 0
  );

  const overallRisk: AISecurityReport['summary']['overallRisk'] =
    bypassDetected > 0 || canariesLeaked > 0 ? 'HIGH'
    : contractViolations > 2 ? 'MEDIUM'
    : 'LOW';

  return {
    targetEndpoint: endpoint,
    timestamp: new Date().toISOString(),
    injectionResults,
    contractResults,
    summary: {
      totalPayloads: injectionResults.length,
      bypassDetected,
      canariesLeaked,
      contractViolations,
      overallRisk,
    },
  };
}
