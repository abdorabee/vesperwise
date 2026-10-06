import { describe, expect, it } from "vitest";
import { parseCsvRecords, parseCsvRows } from "./csv-parse";

describe("parseCsvRecords", () => {
  it("keeps quoted values that contain commas in one column", () => {
    const records = parseCsvRecords('company,domain\n"Acme, Inc.",acme.com\nGlobex,globex.com');

    expect(records).toEqual([
      { company: "Acme, Inc.", domain: "acme.com" },
      { company: "Globex", domain: "globex.com" },
    ]);
  });

  it("handles escaped quotes, CRLF, a BOM, blank rows and padded headers", () => {
    const records = parseCsvRecords('﻿ Company , Domain \r\n"The ""Best"" Co",best.io\r\n\r\n');

    expect(records).toEqual([{ company: 'The "Best" Co', domain: "best.io" }]);
  });

  it("keeps newlines inside quoted fields", () => {
    expect(parseCsvRows('a,b\n"line 1\nline 2",x')).toEqual([["a", "b"], ["line 1\nline 2", "x"]]);
  });

  it("returns no records for a header-only file", () => {
    expect(parseCsvRecords("company,domain\n")).toEqual([]);
  });
});
