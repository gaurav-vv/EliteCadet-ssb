// Minimal, dependency-free PDF writer for printable study material
// (/student/resources/downloads/*). Text only, with the standard Helvetica
// fonts (no embedding), A4 pages, word wrap, pagination, tick boxes and ruled
// answer lines. Text is encoded as WinAnsi; characters outside it become "?".

export type PdfBlock =
  | { type: "title"; text: string }
  | { type: "subtitle"; text: string }
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string }
  | { type: "check"; text: string }
  | { type: "write"; text: string; lines?: number }
  | { type: "note"; text: string };

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM = MARGIN + 24;

// Helvetica / Helvetica-Bold advance widths (1/1000 em) for ASCII 32–126 (Adobe AFM).
const REGULAR = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722,
  722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556,
  556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
const BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722,
  722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611,
  611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

// Unicode → WinAnsi (cp1252) for the punctuation real text uses.
const WIN_ANSI: Record<string, number> = { "–": 0x96, "—": 0x97, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "…": 0x85, "₹": 0x3f };
const SPECIAL_WIDTH: Record<number, number> = { 0x96: 556, 0x97: 1000, 0x91: 222, 0x92: 222, 0x93: 333, 0x94: 333, 0x95: 350, 0x85: 1000 };

function toWinAnsi(text: string): number[] {
  const out: number[] = [];
  for (const ch of text.normalize("NFC")) {
    const code = ch.codePointAt(0)!;
    if (WIN_ANSI[ch] !== undefined) out.push(WIN_ANSI[ch]);
    else if (code >= 32 && code <= 126) out.push(code);
    else if (code >= 0xa0 && code <= 0xff) out.push(code);
    else if (ch === "\t") out.push(32);
    else out.push(0x3f);
  }
  return out;
}

function widthOf(text: string, size: number, bold: boolean): number {
  const table = bold ? BOLD : REGULAR;
  let units = 0;
  for (const b of toWinAnsi(text)) units += b >= 32 && b <= 126 ? table[b - 32] : (SPECIAL_WIDTH[b] ?? 556);
  return (units * size) / 1000;
}

export function wrapText(text: string, size: number, bold: boolean, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split(/\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (widthOf(candidate, size, bold) <= maxWidth || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

// PDF string literal: escape \ ( ) and write bytes as octal when non-ASCII.
function pdfString(text: string): string {
  let s = "";
  for (const b of toWinAnsi(text)) {
    if (b === 0x28 || b === 0x29 || b === 0x5c) s += `\\${String.fromCharCode(b)}`;
    else if (b < 32 || b > 126) s += `\\${b.toString(8).padStart(3, "0")}`;
    else s += String.fromCharCode(b);
  }
  return `(${s})`;
}

interface Page {
  ops: string[];
}

export function renderPdf(doc: { title: string; footer: string; blocks: PdfBlock[] }): Uint8Array {
  const pages: Page[] = [];
  let page: Page = { ops: [] };
  let y = PAGE_H - MARGIN;
  pages.push(page);

  const newPage = () => {
    page = { ops: [] };
    pages.push(page);
    y = PAGE_H - MARGIN;
  };
  const ensure = (h: number) => {
    if (y - h < BOTTOM) newPage();
  };
  const text = (x: number, s: string, size: number, bold: boolean, gray = 0.11) => {
    page.ops.push(`BT ${gray} g /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td ${pdfString(s)} Tj ET`);
  };
  const flow = (s: string, size: number, bold: boolean, opts: { indent?: number; leading?: number; gray?: number; before?: number; after?: number; marker?: "bullet" | "check" } = {}) => {
    const indent = opts.indent ?? 0;
    const leading = opts.leading ?? size * 1.4;
    const lines = wrapText(s, size, bold, CONTENT_W - indent);
    y -= opts.before ?? 0;
    lines.forEach((line, i) => {
      ensure(leading);
      y -= leading;
      if (i === 0 && opts.marker === "bullet") text(MARGIN + indent - 12, "•", size, false, opts.gray);
      if (i === 0 && opts.marker === "check") page.ops.push(`0.45 G 0.8 w ${(MARGIN + 2).toFixed(2)} ${(y - 2).toFixed(2)} 10 10 re S`);
      text(MARGIN + indent, line, size, bold, opts.gray);
    });
    y -= opts.after ?? 0;
  };

  for (const block of doc.blocks) {
    switch (block.type) {
      case "title":
        flow(block.text, 22, true, { leading: 28, after: 4 });
        break;
      case "subtitle":
        flow(block.text, 11, false, { gray: 0.42, after: 10 });
        page.ops.push(`0.85 G 0.8 w ${MARGIN} ${y.toFixed(2)} m ${PAGE_W - MARGIN} ${y.toFixed(2)} l S`);
        y -= 6;
        break;
      case "heading":
        ensure(48);
        flow(block.text, 14, true, { before: 12, after: 2, leading: 19 });
        break;
      case "paragraph":
        flow(block.text, 10.5, false, { after: 5 });
        break;
      case "note":
        flow(block.text, 9.5, false, { gray: 0.42, after: 5 });
        break;
      case "bullet":
        flow(block.text, 10.5, false, { indent: 14, after: 2, marker: "bullet" });
        break;
      case "check":
        flow(block.text, 10.5, false, { indent: 20, after: 3, marker: "check" });
        break;
      case "write": {
        const ruled = block.lines ?? 3;
        ensure(16 + ruled * 20);
        flow(block.text, 10.5, false, { after: 2 });
        for (let i = 0; i < ruled; i++) {
          ensure(20);
          y -= 20;
          page.ops.push(`0.78 G 0.6 w ${MARGIN} ${y.toFixed(2)} m ${PAGE_W - MARGIN} ${y.toFixed(2)} l S`);
        }
        y -= 8;
        break;
      }
    }
  }

  // Footer on every page (needs the final page count).
  pages.forEach((p, i) => {
    p.ops.push(`BT 0.55 g /F1 8.5 Tf ${MARGIN} ${MARGIN - 20} Td ${pdfString(doc.footer)} Tj ET`);
    const label = `Page ${i + 1} of ${pages.length}`;
    p.ops.push(`BT 0.55 g /F1 8.5 Tf ${(PAGE_W - MARGIN - widthOf(label, 8.5, false)).toFixed(2)} ${MARGIN - 20} Td ${pdfString(label)} Tj ET`);
  });

  // Objects: 1 catalog, 2 pages, 3 F1, 4 F2, 5 info, then (page, content) pairs.
  const objects: string[] = [];
  const pageIds = pages.map((_, i) => 6 + i * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  objects[5] = `<< /Title ${pdfString(doc.title)} /Producer (EliteCadet SSB) >>`;
  pages.forEach((p, i) => {
    const content = p.ops.join("\n");
    objects[pageIds[i]] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageIds[i] + 1} 0 R >>`;
    objects[pageIds[i] + 1] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });

  // Every character here maps to exactly one byte (text uses octal escapes),
  // so string offsets are byte offsets.
  let out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = out.length;
    out += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) out += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Uint8Array.from(out, (c) => c.charCodeAt(0) & 0xff);
}
