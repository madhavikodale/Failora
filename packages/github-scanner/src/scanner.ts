import type { RepoConfig, RepoFile, RepoScanResult, RepoScanFinding, ScanCheck } from "./types.ts";
import { CODE_PATTERNS, LANGUAGE_MAP } from "./patterns.ts";

// ── GitHub API Client (no external deps, uses fetch) ────────────────

const GITHUB_API = "https://api.github.com";

function getHeaders(config: RepoConfig): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "FailoraGitHubScanner/1.0",
  };
  if (config.token) {
    headers["Authorization"] = `Bearer ${config.token}`;
  }
  return headers;
}

async function fetchDefaultBranch(config: RepoConfig): Promise<string> {
  const url = `${GITHUB_API}/repos/${config.owner}/${config.repo}`;
  const res = await fetch(url, { headers: getHeaders(config) });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json() as { default_branch?: string };
  return data.default_branch ?? "main";
}

async function fetchRepoTree(config: RepoConfig, branch: string): Promise<RepoFile[]> {
  const url = `${GITHUB_API}/repos/${config.owner}/${config.repo}/git/trees/${branch}?recursive=1`;

  const res = await fetch(url, { headers: getHeaders(config) });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as { tree: Array<{ path: string; type: string; size?: number }> };
  return data.tree
    .filter((item) => item.type === "blob") // files only
    .map((item) => ({
      path: item.path,
      name: item.path.split("/").pop() ?? item.path,
      size: item.size ?? 0,
      type: "file" as const,
    }));
}

async function fetchFileContent(config: RepoConfig, path: string, branch: string): Promise<string> {
  const url = `${GITHUB_API}/repos/${config.owner}/${config.repo}/contents/${path}?ref=${branch}`;

  const res = await fetch(url, { headers: getHeaders(config) });
  if (!res.ok) return "";

  const data = await res.json() as { content?: string; encoding?: string };
  if (data.content && data.encoding === "base64") {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
  return "";
}

function getLanguageFromPath(path: string): string {
  const ext = "." + path.split(".").pop()?.toLowerCase();
  return LANGUAGE_MAP[ext] ?? "Unknown";
}

// ── Repo Scanner ────────────────────────────────────────────────────

export async function scanRepo(config: RepoConfig): Promise<RepoScanResult> {
  const scanStartTime = Date.now();
  const startedAt = new Date().toISOString();

  // Fetch default branch if not specified
  const branch = config.branch ?? await fetchDefaultBranch(config);

  // Fetch repo tree
  const files = await fetchRepoTree(config, branch);

  // Language distribution
  const byLanguage: Record<string, number> = {};
  for (const file of files) {
    const lang = getLanguageFromPath(file.path);
    byLanguage[lang] = (byLanguage[lang] ?? 0) + 1;
  }

  // Scan files for patterns (limit to reasonable files)
  const MAX_FILE_SIZE = 100 * 1024; // 100KB
  const MAX_FILES_TO_SCAN = 200;

  let filesAnalyzed = 0;
  let filesSkippedEmpty = 0;
  let filesSkippedTooLarge = 0;
  let filesSkippedOverLimit = 0;

  const findings: RepoScanFinding[] = [];

  // Per-pattern tracking
  const patternStats = new Map<string, { filesScanned: number; matchesFound: number }>();
  for (const p of CODE_PATTERNS) {
    patternStats.set(p.name, { filesScanned: 0, matchesFound: 0 });
  }

  // Filter files with reasons
  const eligibleFiles = files.filter((f) => {
    if (f.size === 0) {
      filesSkippedEmpty++;
      return false;
    }
    if (f.size >= MAX_FILE_SIZE) {
      filesSkippedTooLarge++;
      return false;
    }
    return true;
  });

  const filesToScan = eligibleFiles.slice(0, MAX_FILES_TO_SCAN);
  filesSkippedOverLimit = Math.max(0, eligibleFiles.length - MAX_FILES_TO_SCAN);
  filesAnalyzed = filesToScan.length;

  for (const file of filesToScan) {
    const content = await fetchFileContent(config, file.path, branch);
    if (!content) continue;

    const ext = "." + file.path.split(".").pop()?.toLowerCase();
    const lines = content.split("\n");

    for (const pattern of CODE_PATTERNS) {
      if (!pattern.languages.includes(ext)) continue;

      const stats = patternStats.get(pattern.name)!;
      stats.filesScanned++;

      for (let i = 0; i < lines.length; i++) {
        if (pattern.pattern.test(lines[i])) {
          stats.matchesFound++;
          findings.push({
            id: `${pattern.name}-${file.path}-${i + 1}`,
            category: pattern.name,
            severity: pattern.severity,
            title: pattern.description,
            description: `Found in ${file.path}:${i + 1}`,
            file: file.path,
            line: i + 1,
            evidence: lines[i].trim().slice(0, 200),
            impact: getImpactForSeverity(pattern.severity),
            recommendation: pattern.recommendation,
          });
        }
      }
    }
  }

  // Build checks array
  const checks: ScanCheck[] = CODE_PATTERNS.map((pattern) => {
    const stats = patternStats.get(pattern.name)!;
    return {
      name: pattern.name,
      description: pattern.description,
      severity: pattern.severity,
      filesScanned: stats.filesScanned,
      matchesFound: stats.matchesFound,
      status: stats.filesScanned === 0 ? "skipped" : stats.matchesFound > 0 ? "failed" : "passed",
      languages: pattern.languages,
    };
  });

  // Calculate score
  const severityWeights = { critical: 25, high: 10, medium: 5, low: 1 };
  let deduction = 0;
  const summary = { critical: 0, high: 0, medium: 0, low: 0 };

  for (const f of findings) {
    summary[f.severity]++;
    deduction += severityWeights[f.severity];
  }

  const score = Math.max(0, 100 - deduction);
  const completedAt = new Date().toISOString();
  const durationMs = Date.now() - scanStartTime;
  const totalFiles = files.length;
  const coverage = totalFiles > 0 ? Math.round((filesAnalyzed / totalFiles) * 100) : 0;

  return {
    repo: config.repo,
    owner: config.owner,
    branch,
    scannedAt: completedAt,
    files: {
      total: totalFiles,
      analyzed: filesAnalyzed,
      skipped: filesSkippedEmpty + filesSkippedTooLarge + filesSkippedOverLimit,
      byLanguage,
      skippedReasons: {
        tooLarge: filesSkippedTooLarge,
        empty: filesSkippedEmpty,
        overLimit: filesSkippedOverLimit,
      },
    },
    scan: {
      durationMs,
      startedAt,
      completedAt,
      maxFilesLimit: MAX_FILES_TO_SCAN,
      maxFileSizeBytes: MAX_FILE_SIZE,
      limitReached: filesSkippedOverLimit > 0,
      coverage,
    },
    checks,
    findings,
    score,
    summary,
  };
}

function getImpactForSeverity(severity: string): string {
  switch (severity) {
    case "critical":
      return "Potential security breach, data loss, or system compromise";
    case "high":
      return "Security vulnerability or significant reliability risk";
    case "medium":
      return "Code quality issue that may lead to bugs or maintenance burden";
    case "low":
      return "Minor code quality improvement opportunity";
    default:
      return "Unknown impact";
  }
}
