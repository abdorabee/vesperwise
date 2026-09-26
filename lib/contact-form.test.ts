import { describe, expect, it } from "vitest";
import { validateContactForm } from "./contact-form";

describe("validateContactForm", () => {
  it("accepts a complete submission", () => {
    expect(validateContactForm({ name: "Jane", email: "jane@acme.com", message: "Need a demo please" })).toEqual({});
  });

  it("flags every missing required field", () => {
    const errors = validateContactForm({ name: " ", email: "", message: "" });
    expect(Object.keys(errors).sort()).toEqual(["email", "message", "name"]);
  });

  it("rejects malformed email and too-short message", () => {
    const errors = validateContactForm({ name: "Jane", email: "jane@acme", message: "hi" });
    expect(errors.email).toMatch(/valid email/);
    expect(errors.message).toMatch(/at least 10/);
  });
});
