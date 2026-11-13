// ── PDF Exporter (dependency-free minimal PDF) ──────────────────────
// Generates a valid single/multi-page PDF 1.4 with Helvetica text —
// no external deps (per repo convention). Good enough for findings
// summaries; for pixel-perfect output swap in pdfmake/puppeteer later.

import type { Report } from "./types.ts";

/** Escape parens/backslashes for PDF string literals. */
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Wrap text to a max character width (rough Helvetica approximation). */
function wrap(text: string, width = 92): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > width) {
      if (cur) lines.push(cur.trim());
      cur = w;
    } else {
      cur += " " + w;
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines.length ? lines : [""];
}

/** Minimal PDF builder: pages of text lines → PDF 1.4 bytes. */
function buildPdf(pages: string[][]): Uint8Array {
  const objects: string[] = [];
  const pageIds: number[] = [];
  let nextId = 1;

  const catalogId = nextId++;
  const pagesId = nextId++;
  const fontId = nextId++;

  for (const lines of pages) {
    const contentParts: string[] = [];
    contentParts.push("BT /F1 11 Tf 50 780 Td 16 TL");
    for (const line of lines) {
      contentParts.push(`(${esc(line)}) Tj T*`);
    }
    contentParts.push("ET");
    const stream = contentParts.join("\n");

    const contentId = nextId++;
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = nextId++;
    objects.push(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  }

  const header = "%PDF-1.4\n%âãÏÓ\n";
  let body = "";
  let offset = header.length;
  const offsets: number[] = [];

  // objects[] index 0 = first object id 3 (after catalog/pages/font placeholders)
  const realObjects: Array<{ id: number; body: string }> = [
    { id: catalogId, body: `<< /Type /Catalog /Pages ${pagesId} 0 R >>` },
    { id: pagesId, body: `<< /Type /Pages /Kids [${pageIds.map((p) => `${p} 0 R`).join(" ")}] /Count ${pageIds.length} >>` },
    { id: fontId, body: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>` },
  ];
  // insert content/page objects (they were appended in order)
  let id = fontId + 1;
  const contentPagePairs: Array<{ id: number; body: string }> = [];
  for (let i = 0; i < objects.length; i += 2) {
    contentPagePairs.push({ id: id++, body: objects[i] });
    contentPagePairs.push({ id: id++, body: objects[i + 1] });
  }
  for (const o of [...realObjects, ...contentPagePairs]) {
    offsets[o.id - 1] = offset;
    const chunk = `${o.id} 0 obj\n${o.body}\nendobj\n`;
    body += chunk;
    offset += chunk.length;
  }

  const xrefStart = offset;
  const count = Math.max(...[catalogId, pagesId, fontId, ...pageIds]) + 2;
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let i = 1; i < count; i++) {
    xref += `${String(offsets[i] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${count} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const full = header + body + xref + trailer;
  return new TextEncoder().encode(full);
}

/** Export a Report as PDF bytes (Uint8Array). */
export function exportAsPDF(report: Report): Uint8Array {
  const lines: string[] = [];

  lines.push(`${report.title}`);
  lines.push(`Generated: ${report.generatedAt}   Target: ${report.target}   Type: ${report.type}`);
  if (report.score !== undefined) lines.push(`Score: ${report.score}/100`);
  lines.push("");

  lines.push("Summary:");
  for (const l of wrap(report.summary)) lines.push(`  ${l}`);
  lines.push("");

  lines.push(
    `Findings: critical=${report.findings.critical} high=${report.findings.high} medium=${report.findings.medium} low=${report.findings.low} info=${report.findings.info}`
  );
  lines.push("");

  for (const section of report.sections) {
    lines.push(`--- ${section.title} [${section.severity ?? "info"}] ---`);
    for (const l of wrap(section.content)) lines.push(l);
    lines.push("");
  }

  if (report.recommendations.length > 0) {
    lines.push("Recommendations:");
    for (const rec of report.recommendations) {
      for (const l of wrap(`- ${rec}`, 88)) lines.push(l);
    }
  }

  // Paginate: ~48 lines/page (11pt, 16pt leading, 842pt A4)
  const perPage = 48;
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += perPage) {
    pages.push(lines.slice(i, i + perPage));
  }
  if (pages.length === 0) pages.push([report.title]);

  return buildPdf(pages);
}
