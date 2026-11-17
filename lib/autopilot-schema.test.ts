import { describe, expect, it } from "vitest";
import { actionSchema, createWorkflowSchema, updateWorkflowSchema } from "./autopilot-schema";

const validWorkflow = {
  name: "  Hot leads  ",
  conditions: [{ type: "score_above", params: { threshold: 75 } }],
  actions: [
    { type: "webhook", params: { url: "https://example.com/hook" } },
    { type: "slack", params: { webhook_url: "https://hooks.slack.com/services/T/B/x" } },
    { type: "pipeline_stage", params: { stage: "hot" } },
    { type: "email_draft", params: { tone: "formal" } },
    { type: "notification", params: {} },
  ],
};

describe("autopilot schema", () => {
  it("accepts a valid workflow and trims the name", () => {
    const parsed = createWorkflowSchema.safeParse(validWorkflow);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.name).toBe("Hot leads");
  });

  it.each([
    "http://example.com/hook",
    "http://169.254.169.254/latest",
    "ftp://example.com/x",
    "not a url",
    "https://user:pw@example.com/x",
  ])("rejects webhook url %s", (url) => {
    expect(actionSchema.safeParse({ type: "webhook", params: { url } }).success).toBe(
      false,
    );
  });

  it("rejects overlong urls", () => {
    const url = `https://example.com/${"a".repeat(2100)}`;
    expect(actionSchema.safeParse({ type: "webhook", params: { url } }).success).toBe(false);
  });

  it("leaves internal-host checks to the executor (schema is https-only)", () => {
    expect(actionSchema.safeParse({ type: "webhook", params: { url: "https://localhost/x" } }).success).toBe(true);
  });

  it("rejects non-Slack hosts for slack actions", () => {
    const bad = { type: "slack", params: { webhook_url: "https://example.com/services/x" } };
    expect(actionSchema.safeParse(bad).success).toBe(false);
    const evil = { type: "slack", params: { webhook_url: "https://hooks.slack.com.evil.test/x" } };
    expect(actionSchema.safeParse(evil).success).toBe(false);
  });

  it("rejects user supplied headers", () => {
    const action = { type: "webhook", params: { url: "https://example.com/h", headers: { Authorization: "x" } } };
    expect(actionSchema.safeParse(action).success).toBe(false);
  });

  it("rejects oversized action arrays and unknown action types", () => {
    const many = Array.from({ length: 21 }, () => ({ type: "notification", params: {} }));
    expect(createWorkflowSchema.safeParse({ ...validWorkflow, actions: many }).success).toBe(false);
    const unknown = { ...validWorkflow, actions: [{ type: "shell", params: {} }] };
    expect(createWorkflowSchema.safeParse(unknown).success).toBe(false);
  });

  it("rejects unknown top-level fields and empty arrays", () => {
    expect(createWorkflowSchema.safeParse({ ...validWorkflow, user_id: "x" }).success).toBe(false);
    expect(createWorkflowSchema.safeParse({ ...validWorkflow, conditions: [] }).success).toBe(false);
  });

  it("validates only the provided fields on update", () => {
    expect(updateWorkflowSchema.safeParse({ is_enabled: false }).success).toBe(true);
    expect(updateWorkflowSchema.safeParse({ schedule: "hourly" }).success).toBe(false);
    expect(updateWorkflowSchema.safeParse({ actions: [{ type: "webhook", params: { url: "http://x.test" } }] }).success).toBe(false);
  });
});
