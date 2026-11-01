import test from "node:test";
import assert from "node:assert/strict";

import { hasSameRequestOrigin } from "../app/lib/http/request-origin.ts";

test("accepts requests from the URL origin", () => {
  const request = new Request("https://dominium.example/api/sale-shortlists", {
    headers: { origin: "https://dominium.example" },
  });

  assert.equal(hasSameRequestOrigin(request), true);
});

test("accepts the forwarded browser host used by local development", () => {
  const request = new Request("http://localhost:3000/api/sale-shortlists", {
    headers: {
      host: "192.168.1.180:3000",
      origin: "http://192.168.1.180:3000",
    },
  });

  assert.equal(hasSameRequestOrigin(request), true);
});

test("rejects cross-origin and missing-origin requests", () => {
  const crossOriginRequest = new Request("https://dominium.example/api/sale-shortlists", {
    headers: { origin: "https://attacker.example" },
  });
  const missingOriginRequest = new Request("https://dominium.example/api/sale-shortlists");

  assert.equal(hasSameRequestOrigin(crossOriginRequest), false);
  assert.equal(hasSameRequestOrigin(missingOriginRequest), false);
});
