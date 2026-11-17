import { describe, expect, it } from "vitest";
import { SEARCH_QUERY_MAX_LENGTH, sanitizeSearch } from "./search-sanitize";

describe("sanitizeSearch", () => {
  it("neutralises PostgREST filter syntax characters", () => {
    const out = sanitizeSearch('a),user_id.neq.x,(b"c\\');

    expect(out).not.toMatch(/[,()"\\]/);
  });

  it("strips LIKE wildcards", () => {
    expect(sanitizeSearch("100%*")).toBe("100");
  });

  it("keeps dots so domains stay searchable", () => {
    expect(sanitizeSearch("stripe.com")).toBe("stripe.com");
  });

  it("caps the query length", () => {
    expect(sanitizeSearch("a".repeat(500))).toHaveLength(SEARCH_QUERY_MAX_LENGTH);
  });

  it("returns an empty string for syntax-only input", () => {
    expect(sanitizeSearch(" ,() ")).toBe("");
  });
});
