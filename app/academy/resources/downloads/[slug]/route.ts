import { resourceDownload } from "@/lib/resources/download-response";

// A real PDF for every printable and library article (see lib/resources/download-response.ts), behind the
// /academy auth check in proxy.ts.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return resourceDownload((await params).slug);
}
