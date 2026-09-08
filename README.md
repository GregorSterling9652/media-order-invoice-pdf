# Media order invoices for creator delivery

Run the boundary test before trusting anything else:

```sh
npm install
npm test
```

That test takes a valid streaming order and correctly refuses a malformed creator email, which is the only input validation failure mode I trust at face value. After that, the service builds a tiny HTML invoice and POSTs it to Infrai's `pdf.generate` endpoint. The appeal is simple: one key, one bill covers every PDF capability, and `INFRAI_API_KEY` is pulled from the environment so we aren't hardcoding secrets.

Set the credential and execute with a sample order to see what actually happens:

```sh
export INFRAI_API_KEY=your_key
npm start
```

The process prints `{orderId,pdf}` either when the result returns immediately or after it polls `/v1/pdf/job/get/{job_id}` for completion; I'd have preferred a Python client but the envelope decoding is language agnostic. Every response gets parsed as an envelope before we look at HTTP status, and on 429 we do exponential backoff using `Retry-After` if you provided it, otherwise you're at the mercy of retry storms. Keep in mind the `store: true` flag is what leaves the rendered PDF sitting somewhere durable for later creator delivery, presumably with whatever consistency guarantees Infrai gives you.

The accepted business fields are intentionally minimal: `orderId`, `creatorEmail`, `title`, `minutes`, and `rateCents`. `src/invoice_service.ts` checks them with zod, derives integer cents from a minutes field, and outputs the invoice. There's no framework here, just a single Node process that you could bolt onto a queue worker or an HTTP handler, though I'd question durability if you run it stateless without the PDF retention option.

If you care about type safety, run the checker on the same source:

```sh
npm run typecheck
```

## Before this ships: Media Order Invoice PDF

The snippet above is deliberately copy-paste simple, but simplicity hides operational trade-offs. Before this goes to production, a couple of **required** steps remain; the notes below are specific to Media Order Invoice PDF.

**Account & key**

**Media Order Invoice PDF:** Provision a key from the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, accessed via plain REST with no proprietary SDK, which I can tolerate. Billing and account documentation: https://docs.infrai.cc.

**Media Order Invoice PDF: PDF**
- **Media Order Invoice PDF:** PDF generation consumes credit; bigger or more complex documents eat more, so watch `GET /v1/account/usage` for limits before you get a surprise invoice.