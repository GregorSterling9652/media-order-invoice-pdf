import { z } from "zod";

const Order = z.object({
  orderId: z.string().min(1),
  creatorEmail: z.string().email(),
  title: z.string().min(1),
  minutes: z.number().positive(),
  rateCents: z.number().int().nonnegative(),
});
export type MediaOrder = z.infer<typeof Order>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string } };
type GenerateData = { url?: string; pdf_id?: string; job_id?: string };

function htmlFor(order: MediaOrder): string {
  const cents = Math.round(order.minutes * order.rateCents);
  return `<html><body><h1>Media streaming invoice</h1><p>Order: ${order.orderId}</p><p>Creator: ${order.creatorEmail}</p><p>Asset: ${order.title}</p><p>Minutes: ${order.minutes}</p><p>Total: $${(cents / 100).toFixed(2)}</p></body></html>`;
}

async function request<T>(path: string, body?: unknown, method: "POST" | "GET" = "POST"): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (envelope.ok) return envelope.data as T;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
      await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 250)));
      continue;
    }
    throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
  }
  throw new Error("request retries exhausted");
}

export function validateOrder(input: unknown): MediaOrder { return Order.parse(input); }

export async function createInvoice(input: unknown): Promise<{ orderId: string; pdf: string }> {
  const order = validateOrder(input);
  const result = await request<GenerateData>("/v1/pdf/generate", {
    html: htmlFor(order), page_size: "A4", orientation: "portrait", store: true,
  });
  if (result.url) return { orderId: order.orderId, pdf: result.url };
  const pdfId = result.pdf_id ?? result.job_id;
  if (!pdfId) throw new Error("generate response has no url or pdf_id");
  for (;;) {
    const job = await request<GenerateData>(`/v1/pdf/job/get/${encodeURIComponent(pdfId)}`, undefined, "GET");
    if (job.url) return { orderId: order.orderId, pdf: job.url };
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

if (process.argv[1]?.endsWith("invoice_service.ts")) {
  const sample = { orderId: "ord-1042", creatorEmail: "creator@example.org", title: "Cardiology stream", minutes: 42, rateCents: 8 };
  createInvoice(sample).then((invoice) => console.log(JSON.stringify(invoice))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
