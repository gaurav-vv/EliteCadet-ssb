// Resources → PDF blocks: the printable worksheets/checklists and every
// library article, rendered from the same content the app shows.

import { renderPdf, type PdfBlock } from "@/lib/pdf/simple-pdf";
import { formatDay } from "@/lib/utils/format-date";
import type { PrintableDoc, ResourceDetail } from "@/types/resources";

const FOOTER = "EliteCadet SSB - preparation guidance, not an assessment or a prediction of any SSB outcome.";

export function printablePdf(doc: PrintableDoc): Uint8Array {
  const blocks: PdfBlock[] = [
    { type: "title", text: doc.title },
    { type: "subtitle", text: `${doc.kind} · ${doc.category} · ${doc.description}` },
  ];
  for (const b of doc.blocks) {
    blocks.push({ type: "heading", text: b.heading });
    for (const line of b.lines) {
      if (b.style === "check") blocks.push({ type: "check", text: line });
      else if (b.style === "write") blocks.push({ type: "write", text: line, lines: 3 });
      else blocks.push({ type: "bullet", text: line });
    }
  }
  return renderPdf({ title: doc.title, footer: FOOTER, blocks });
}

export function articlePdf(r: ResourceDetail): Uint8Array {
  const blocks: PdfBlock[] = [
    { type: "title", text: r.title },
    { type: "subtitle", text: `${r.category} · ${r.readingMinutes} min read · Updated ${formatDay(r.updatedOn)} · ${r.description}` },
    { type: "heading", text: "What you will learn" },
    ...r.objectives.map((text): PdfBlock => ({ type: "bullet", text })),
  ];
  for (const s of r.sections) {
    blocks.push({ type: "heading", text: s.heading });
    for (const p of s.paragraphs) blocks.push({ type: "paragraph", text: p });
    for (const b of s.bullets ?? []) blocks.push({ type: "bullet", text: b });
    if (s.example) {
      blocks.push({ type: "note", text: s.example.label.toUpperCase() });
      blocks.push({ type: "paragraph", text: s.example.text });
    }
  }
  if (r.exercises.length > 0) {
    blocks.push({ type: "heading", text: "Practice exercises" });
    r.exercises.forEach((e, i) => blocks.push({ type: "write", text: `${i + 1}. ${e.title}: ${e.instructions}`, lines: 2 }));
  }
  blocks.push({ type: "heading", text: "Key takeaways" });
  for (const t of r.takeaways) blocks.push({ type: "check", text: t });
  if (r.officialLinks?.length) {
    blocks.push({ type: "heading", text: "Official sources" });
    for (const l of r.officialLinks) blocks.push({ type: "bullet", text: `${l.label}: ${l.url}` });
  }
  return renderPdf({ title: r.title, footer: FOOTER, blocks });
}
