import type { RegressionTest, RegressionResult, ScenarioResult } from "../types.ts";
import { runScenario } from "./runner.ts";

// ── Regression Testing Engine ───────────────────────────────────────

export class RegressionEngine {
  private tests = new Map<string, RegressionTest>();

  createTest(
    name: string,
    target: RegressionTest["target"],
    config: RegressionTest["config"]
  ): RegressionTest {
    const id = `reg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Run baseline
    return {
      id,
      name,
      target,
      config,
      baselineResult: null as unknown as ScenarioResult, // Will be set by runBaseline
      createdAt: new Date().toISOString(),
    };
  }

  async runBaseline(test: RegressionTest): Promise<ScenarioResult> {
    const result = await runScenario(test.target, test.config);
    test.baselineResult = result;
    this.tests.set(test.id, test);
    return result;
  }

  async compare(testId: string): Promise<RegressionResult | undefined> {
    const test = this.tests.get(testId);
    if (!test || !test.baselineResult) return undefined;

    const currentResult = await runScenario(test.target, test.config);
    const baseline = test.baselineResult;

    const degradationPoints: string[] = [];
    const improvementPoints: string[] = [];

    // Compare recovery
    if (baseline.recovered && !currentResult.recovered) {
      degradationPoints.push("System no longer recovers from failure");
    }
    if (!baseline.recovered && currentResult.recovered) {
      improvementPoints.push("System now recovers from failure");
    }

    // Compare attempts
    if (currentResult.attempts.length > baseline.attempts.length) {
      degradationPoints.push(
        `More attempts needed: ${currentResult.attempts.length} vs baseline ${baseline.attempts.length}`
      );
    }
    if (currentResult.attempts.length < baseline.attempts.length) {
      improvementPoints.push(
        `Fewer attempts needed: ${currentResult.attempts.length} vs baseline ${baseline.attempts.length}`
      );
    }

    // Compare duration
    if (currentResult.totalDurationMs > baseline.totalDurationMs * 1.5) {
      degradationPoints.push(
        `Recovery time increased: ${currentResult.totalDurationMs}ms vs baseline ${baseline.totalDurationMs}ms`
      );
    }
    if (currentResult.totalDurationMs < baseline.totalDurationMs * 0.7) {
      improvementPoints.push(
        `Recovery time improved: ${currentResult.totalDurationMs}ms vs baseline ${baseline.totalDurationMs}ms`
      );
    }

    // Compare fallback usage
    if (!baseline.usedFallback && currentResult.usedFallback) {
      degradationPoints.push("Fallback now required (was not needed in baseline)");
    }
    if (baseline.usedFallback && !currentResult.usedFallback) {
      improvementPoints.push("Fallback no longer needed");
    }

    const isRegression = degradationPoints.length > 0;

    return {
      testId,
      baselinePassed: baseline.recovered,
      currentPassed: currentResult.recovered,
      isRegression,
      degradationPoints,
      improvementPoints,
      comparedAt: new Date().toISOString(),
    };
  }

  getTest(testId: string): RegressionTest | undefined {
    return this.tests.get(testId);
  }

  listTests(): RegressionTest[] {
    return Array.from(this.tests.values());
  }

  removeTest(testId: string): boolean {
    return this.tests.delete(testId);
  }
}
