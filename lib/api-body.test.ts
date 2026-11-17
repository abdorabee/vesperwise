import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseJsonBody } from "./api-body";

const schema = z.object({ name: z.string().max(5), tags: z.array(z.string()).max(2).optional() });

function jsonRequest(body: string): Request {
  return new Request("http://localhost/x", { method: "POST", body });
}

describe("parseJsonBody", () => {
  it("returns parsed data for a valid body", async () => {
    const result = await parseJsonBody(jsonRequest('{"name":"abc"}'), schema);

    expect(result).toEqual({ ok: true, data: { name: "abc" } });
  });

  it("returns 400 Invalid JSON for malformed JSON", async () => {
    const result = await parseJsonBody(jsonRequest("{nope"), schema);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(400);
    await expect(result.response.json()).resolves.toEqual({ error: "Invalid JSON" });
  });

  it("returns 400 Invalid JSON for an empty body", async () => {
    const result = await parseJsonBody(jsonRequest(""), schema);

    expect(result.ok).toBe(false);
  });

  it("returns 400 Invalid request listing field paths only", async () => {
    const result = await parseJsonBody(
      jsonRequest('{"name":"toolongvalue","tags":["a","b","c"]}'),
      schema,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(400);
    const body = await result.response.json();
    expect(body.error).toBe("Invalid request");
    expect(body.fields).toEqual(expect.arrayContaining(["name", "tags"]));
    expect(JSON.stringify(body)).not.toContain("toolongvalue");
  });

  it("rejects a non-object body", async () => {
    const result = await parseJsonBody(jsonRequest("[1,2]"), schema);

    expect(result.ok).toBe(false);
  });
});
