// ── Broken Link Checker ─────────────────────────────────────────────

export interface BrokenLink {
  url: string;
  sourcePage: string;
  statusCode: number;
  error?: string;
  isBroken: boolean;
}

export interface BrokenLinkResult {
  pageUrl: string;
  totalLinks: number;
  brokenLinks: BrokenLink[];
  checkedAt: string;
}

function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const patterns = [
    /href=["']([^"'#]+)["']/gi,
    /src=["']([^"'#]+)["']/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      try {
        const url = new URL(match[1], baseUrl).href;
        // Only check http/https links
        if (url.startsWith("http://") || url.startsWith("https://")) {
          links.push(url);
        }
      } catch {
        // Invalid URL, skip
      }
    }
  }

  return [...new Set(links)]; // dedupe
}

async function checkLink(url: string, sourcePage: string, timeoutMs = 10000): Promise<BrokenLink> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "FailoraLinkChecker/1.0" },
    });
    clearTimeout(timer);

    const isBroken = res.status >= 400;
    return { url, sourcePage, statusCode: res.status, isBroken };
  } catch (err) {
    clearTimeout(timer);
    return {
      url,
      sourcePage,
      statusCode: 0,
      error: err instanceof Error ? err.message : String(err),
      isBroken: true,
    };
  }
}

export async function checkBrokenLinks(
  pageUrl: string,
  maxLinks = 50
): Promise<BrokenLinkResult> {
  // Fetch the page
  const res = await fetch(pageUrl, {
    headers: { "User-Agent": "FailoraLinkChecker/1.0" },
  });
  const html = await res.text();

  const allLinks = extractLinks(html, pageUrl);
  const linksToCheck = allLinks.slice(0, maxLinks);

  // Check links in parallel (batches of 10)
  const brokenLinks: BrokenLink[] = [];
  const batchSize = 10;
  for (let i = 0; i < linksToCheck.length; i += batchSize) {
    const batch = linksToCheck.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((url) => checkLink(url, pageUrl)));
    brokenLinks.push(...results.filter((r) => r.isBroken));
  }

  return {
    pageUrl,
    totalLinks: allLinks.length,
    brokenLinks,
    checkedAt: new Date().toISOString(),
  };
}
