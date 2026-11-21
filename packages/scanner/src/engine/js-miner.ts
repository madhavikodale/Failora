/**
 * JS Miner — Issue #9
 * Fetches and parses JavaScript files for endpoint extraction,
 * sourcemap hints, and library version detection.
 */

import type { DiscoveredEndpoint, LibraryDetection } from './crawler';

export interface JsAnalysisResult {
  fileUrl: string;
  endpoints: DiscoveredEndpoint[];
  sourcemapUrl: string | null;
  libraries: LibraryDetection[];
  sizeBytes: number;
}

export class JsMiner {
  async analyze(jsFileUrl: string): Promise<JsAnalysisResult> {
    const res = await fetch(jsFileUrl, {
      headers: { 'User-Agent': 'FailoraJsMiner/1.0' },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch ${jsFileUrl}: ${res.status}`);
    }

    const content = await res.text();
    const sizeBytes = new TextEncoder().encode(content).length;

    const endpoints = this.extractEndpointsFromJs(content, jsFileUrl);
    const sourcemapUrl = this.findSourcemap(content, jsFileUrl);
    const libraries = this.detectLibrariesFromJs(content);

    return {
      fileUrl: jsFileUrl,
      endpoints,
      sourcemapUrl,
      libraries,
      sizeBytes,
    };
  }

  private extractEndpointsFromJs(content: string, sourceUrl: string): DiscoveredEndpoint[] {
    const endpoints: DiscoveredEndpoint[] = [];

    const patterns = [
      // fetch('/api/users')
      { regex: /fetch\(\s*["'`]([^"'`]*\/api\/[^"'`]+)["'`]/g, source: 'fetch' as const },
      // axios.get('/api/data')
      { regex: /axios\.(?:get|post|put|delete|patch)\(\s*["'`]([^"'`]*\/api\/[^"'`]+)["'`]/g, source: 'axios' as const },
      // url: '/api/endpoint'
      { regex: /url\s*:\s*["'`]([^"'`]*\/api\/[^"'`]+)["'`]/g, source: 'js' as const },
      // new URL('/api/...', base)
      { regex: /new URL\(\s*["'`]([^"'`]*\/api\/[^"'`]+)["'`]/g, source: 'js' as const },
      // router.get('/api/...')
      { regex: /router\.(?:get|post|put|delete|patch)\(\s*["'`]([^"'`]+)["'`]/g, source: 'js' as const },
    ];

    for (const p of patterns) {
      let match;
      while ((match = p.regex.exec(content)) !== null) {
        const path = match[1];
        try {
          const absolute = new URL(path, sourceUrl).toString();
          endpoints.push({
            url: absolute,
            method: 'UNKNOWN',
            source: p.source,
            confidence: 'medium',
          });
        } catch { /* skip invalid */ }
      }
    }

    return this.dedupeEndpoints(endpoints);
  }

  private findSourcemap(content: string, sourceUrl: string): string | null {
    const match = /\/\/# sourceMappingURL=(.+)\s*$/.exec(content);
    if (!match) return null;
    try {
      return new URL(match[1].trim(), sourceUrl).toString();
    } catch {
      return null;
    }
  }

  private detectLibrariesFromJs(content: string): LibraryDetection[] {
    const detections: LibraryDetection[] = [];

    // Check webpack module comments
    const webpackMatch = /\/\*!.+?\*\/\s*\/\*!.+?webpack.+?\*\//s.exec(content);
    if (webpackMatch) {
      detections.push({
        name: 'Webpack',
        version: 'unknown',
        source: 'banner',
        vulnerabilities: [],
      });
    }

    // Check for specific library signatures
    const signatures = [
      { name: 'React', pattern: /react\.development|react\.production/ },
      { name: 'Vue', pattern: /Vue\.version\s*=\s*["']([^"']+)["']/ },
      { name: 'jQuery', pattern: /jQuery\.fn\.jquery\s*=\s*["']([^"']+)["']/ },
      { name: 'D3', pattern: /d3\.version\s*=\s*["']([^"']+)["']/ },
      { name: 'Three.js', pattern: /REVISION\s*=\s*["']([^"']+)["']/ },
    ];

    for (const sig of signatures) {
      const match = sig.pattern.exec(content);
      if (match) {
        detections.push({
          name: sig.name,
          version: match[1] || 'unknown',
          source: 'banner',
          vulnerabilities: [],
        });
      }
    }

    return detections;
  }

  private dedupeEndpoints(endpoints: DiscoveredEndpoint[]): DiscoveredEndpoint[] {
    const seen = new Set<string>();
    return endpoints.filter(e => {
      const key = `${e.method}:${e.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
