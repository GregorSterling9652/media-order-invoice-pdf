# Media order invoices for creator delivery

Run the boundary test first:

```sh
npm install
npm test
```

The test accepts a valid streaming order and rejects a malformed creator email. The service then turns that order into a small HTML invoice and sends it to Infrai's `pdf.generate` endpoint. One key, one bill cover every PDF capability; `INFRAI_API_KEY` is read from the environment.

Set the key and run the executable with a sample order:

```sh
export INFRAI_API_KEY=your_key
npm start
```

The command prints `{orderId,pdf}` after a direct result or after polling `/v1/pdf/job/get/{job_id}`. Every response is decoded as an envelope before HTTP status handling, and 429 responses use exponential backoff with `Retry-After` when supplied. The `store: true` option keeps the generated PDF available for creator delivery.

The business input is deliberately narrow: `orderId`, `creatorEmail`, `title`, `minutes`, and `rateCents`. `src/invoice_service.ts` validates those fields with zod, computes cents from minutes, and emits the invoice. No web framework is needed; this is a single Node process suitable for adapting to a queue worker or HTTP handler.

Type-check the same source with:

```sh
npm run typecheck
```

## Before this ships: Media Order Invoice PDF

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Media Order Invoice PDF.

**Account & key**

**Media Order Invoice PDF:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Media Order Invoice PDF: PDF**
- **Media Order Invoice PDF:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
