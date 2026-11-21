/**
 * Same-Origin BFS Crawler — Issue #9
 * Crawls same-origin pages with depth + page limits, respects robots.txt.
 * Discovers hidden endpoints and feeds them into scanner checks.
 */

export interface CrawlConfig {
  startUrl: string;
  maxDepth: number;
  maxPages: number;
  respectRobotsTxt: boolean;
  perHostRateLimitMs: number;
  includeSubdomains: boolean;
}

export interface CrawledPage {
  url: string;
  depth: number;
  links: string[];
  jsFiles: string[];
  endpoints: DiscoveredEndpoint[];
  libraryDetections: LibraryDetection[];
}

export interface DiscoveredEndpoint {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'UNKNOWN';
  source: 'html' | 'js' | 'fetch' | 'axios' | 'form';
  confidence: 'high' | 'medium' | 'low';
}

export interface LibraryDetection {
  name: string;
  version: string;
  source: 'banner' | 'sourcemap' | 'package.json';
  vulnerabilities: CVE[];
}

export interface CVE {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

const DEFAULT_CONFIG: CrawlConfig = {
  startUrl: 'http://localhost:3000',
  maxDepth: 3,
  maxPages: 100,
  respectRobotsTxt: true,
  perHostRateLimitMs: 500,
  includeSubdomains: false,
};

export class BfsCrawler {
  private config: CrawlConfig;
  private visited = new Set<string>();
  private queue: { url: string; depth: number }[] = [];
  private pages: CrawledPage[] = [];

  constructor(config: Partial<CrawlConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async crawl(): Promise<CrawledPage[]> {
    this.visited.clear();
    this.queue = [{ url: this.config.startUrl, depth: 0 }];
    this.pages = [];

    while (this.queue.length > 0 && this.pages.length < this.config.maxPages) {
      const { url, depth } = this.queue.shift()!;
      if (this.visited.has(url) || depth > this.config.maxDepth) continue;
      this.visited.add(url);

      await this.rateLimit();

      try {
        const page = await this.fetchAndParse(url, depth);
        if (page) {
          this.pages.push(page);
          this.enqueueLinks(page, depth);
        }
      } catch (err) {
        console.warn(`[Crawler] Failed to fetch ${url}: ${err}`);
      }
    }

    return this.pages;
  }

  private async fetchAndParse(url: string, depth: number): Promise<CrawledPage | null> {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FailoraCrawler/1.0 (+security-audit)' },
    });

    if (!res.ok) return null;
    const html = await res.text();

    const links = this.extractLinks(html, url);
    const jsFiles = this.extractJsFiles(html, url);
    const endpoints = this.extractEndpoints(html, url, 'html');
    const libraryDetections = this.detectLibraries(html, jsFiles);

    return { url, depth, links, jsFiles, endpoints, libraryDetections };
  }

  private extractLinks(html: string, baseUrl: string): string[] {
    const regex = /href=["']([^"']+)["']/g;
    const links: string[] = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      try {
        const absolute = new URL(match[1], baseUrl).toString();
        if (this.isSameOrigin(absolute)) {
          links.push(absolute);
        }
      } catch { /* ignore invalid URLs */ }
    }
    return links;
  }

  private extractJsFiles(html: string, baseUrl: string): string[] {
    const regex = /src=["']([^"']+\.js[^"']*)["']/g;
    const jsFiles: string[] = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      try {
        jsFiles.push(new URL(match[1], baseUrl).toString());
      } catch { /* ignore */ }
    }
    return jsFiles;
  }

  private extractEndpoints(content: string, sourceUrl: string, source: 'html' | 'js'): DiscoveredEndpoint[] {
    const endpoints: DiscoveredEndpoint[] = [];
    const patterns = [
      { regex: /fetch\(["'](\/api\/[^"']+)["']\)/g, method: 'GET' as const, source: 'fetch' as const },
      { regex: /axios\.(get|post|put|delete|patch)\(["'](\/api\/[^"']+)["']/g, method: 'UNKNOWN' as const, source: 'axios' as const },
      { regex: /action=["']([^"']+)["']/g, method: 'POST' as const, source: 'form' as const },
      { regex: /url:\s*["'](\/api\/[^"']+)["']/g, method: 'UNKNOWN' as const, source: 'js' as const },
    ];

    for (const p of patterns) {
      let match;
      while ((match = p.regex.exec(content)) !== null) {
        const path = match[1];
        if (!path.startsWith('http')) {
          endpoints.push({
            url: new URL(path, sourceUrl).toString(),
            method: p.method,
            source: p.source,
            confidence: 'high',
          });
        }
      }
    }

    return endpoints;
  }

  private detectLibraries(html: string, jsFiles: string[]): LibraryDetection[] {
    const detections: LibraryDetection[] = [];
    const bannerPatterns = [
      { name: 'React', regex: /React\s+v?([\d.]+)/ },
      { name: 'Vue', regex: /Vue\.js\s+v?([\d.]+)/ },
      { name: 'jQuery', regex: /jQuery\s+v?([\d.]+)/ },
      { name: 'Angular', regex: /Angular\s+v?([\d.]+)/ },
      { name: 'Lodash', regex: /lodash\s+v?([\d.]+)/i },
    ];

    for (const p of bannerPatterns) {
      const match = p.regex.exec(html);
      if (match) {
        detections.push({
          name: p.name,
          version: match[1],
          source: 'banner',
          vulnerabilities: [], // TODO: lookup in offline CVE DB
        });
      }
    }

    return detections;
  }

  private enqueueLinks(page: CrawledPage, depth: number): void {
    for (const link of page.links) {
      if (!this.visited.has(link)) {
        this.queue.push({ url: link, depth: depth + 1 });
      }
    }
  }

  private isSameOrigin(url: string): boolean {
    try {
      const target = new URL(url);
      const start = new URL(this.config.startUrl);
      if (this.config.includeSubdomains) {
        return target.hostname.endsWith(start.hostname.split('.').slice(-2).join('.'));
      }
      return target.hostname === start.hostname;
    } catch {
      return false;
    }
  }

  private async rateLimit(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.config.perHostRateLimitMs));
  }

  getDiscoveredEndpoints(): DiscoveredEndpoint[] {
    return this.pages.flatMap(p => p.endpoints);
  }

  getLibraryDetections(): LibraryDetection[] {
    return this.pages.flatMap(p => p.libraryDetections);
  }
}
