import { strict as assert } from "node:assert";
import { validateOrder } from "../src/invoice_service.js";

const valid = validateOrder({ orderId: "ord-1", creatorEmail: "c@example.org", title: "Renal stream", minutes: 10, rateCents: 12 });
assert.equal(valid.minutes * valid.rateCents, 120);
assert.throws(() => validateOrder({ orderId: "ord-1", creatorEmail: "bad", title: "Renal stream", minutes: 10, rateCents: 12 }));
console.log("invoice request boundary: valid order accepted, malformed email rejected");
