/**
 * Crawler + JS Mining — Issue #9
 * Same-origin BFS crawl, hidden endpoint discovery, outdated library detection.
 * Feeds discovered endpoints into scanner checks + api-tester.
 */

export { BfsCrawler } from './crawler';
export { JsMiner } from './js-miner';

import { BfsCrawler, type CrawledPage, type CrawlConfig } from './crawler';
import { JsMiner, type JsAnalysisResult } from './js-miner';

export interface CrawlReport {
  startUrl: string;
  timestamp: string;
  pagesCrawled: number;
  jsFilesAnalyzed: number;
  endpointsDiscovered: number;
  outdatedLibraries: number;
  pages: CrawledPage[];
  jsAnalyses: JsAnalysisResult[];
}

export async function runFullCrawl(
  config: Partial<CrawlConfig> = {}
): Promise<CrawlReport> {
  const crawler = new BfsCrawler(config);
  const pages = await crawler.crawl();

  const miner = new JsMiner();
  const jsAnalyses: JsAnalysisResult[] = [];

  for (const page of pages) {
    for (const jsFile of page.jsFiles) {
      try {
        const analysis = await miner.analyze(jsFile);
        jsAnalyses.push(analysis);
      } catch (err) {
        console.warn(`[JsMiner] Failed to analyze ${jsFile}: ${err}`);
      }
    }
  }

  const allEndpoints = [
    ...crawler.getDiscoveredEndpoints(),
    ...jsAnalyses.flatMap(a => a.endpoints),
  ];

  const outdatedLibraries = [
    ...crawler.getLibraryDetections(),
    ...jsAnalyses.flatMap(a => a.libraries),
  ].filter(lib => lib.vulnerabilities.length > 0);

  return {
    startUrl: config.startUrl ?? 'unknown',
    timestamp: new Date().toISOString(),
    pagesCrawled: pages.length,
    jsFilesAnalyzed: jsAnalyses.length,
    endpointsDiscovered: allEndpoints.length,
    outdatedLibraries: outdatedLibraries.length,
    pages,
    jsAnalyses,
  };
}
