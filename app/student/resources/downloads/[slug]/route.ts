import { getPrintable, getResource } from "@/lib/api/resources";
import { articlePdf, printablePdf } from "@/lib/pdf/resource-pdf";

// A real PDF for every printable and every library article, generated from
// the same content the app shows (behind the /student auth check in proxy.ts).
// Only slugs from our own library resolve; anything else is a 404.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const printable = getPrintable(slug);
  const article = printable ? null : (await getResource(slug)).data;
  if (!printable && !article) return new Response("Not found", { status: 404 });

  const bytes = printable ? printablePdf(printable) : articlePdf(article!);
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="elitecadet-${slug}.pdf"`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
