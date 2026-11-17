import { describe, expect, it } from "vitest";
import { paginationWindow } from "./pagination-window";

describe("paginationWindow", () => {
  it("lists every page when there are few", () => {
    expect(paginationWindow(1, 1)).toEqual([1]);
    expect(paginationWindow(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("returns nothing for zero pages", () => {
    expect(paginationWindow(1, 0)).toEqual([]);
  });

  it("collapses the tail near the start", () => {
    expect(paginationWindow(1, 20)).toEqual([1, 2, "ellipsis-end", 20]);
    expect(paginationWindow(3, 20)).toEqual([1, 2, 3, 4, "ellipsis-end", 20]);
  });

  it("collapses both sides in the middle", () => {
    expect(paginationWindow(10, 20)).toEqual([1, "ellipsis-start", 9, 10, 11, "ellipsis-end", 20]);
  });

  it("collapses the head near the end", () => {
    expect(paginationWindow(20, 20)).toEqual([1, "ellipsis-start", 19, 20]);
    expect(paginationWindow(18, 20)).toEqual([1, "ellipsis-start", 17, 18, 19, 20]);
  });

  it("clamps an out-of-range current page", () => {
    expect(paginationWindow(99, 20)).toEqual([1, "ellipsis-start", 19, 20]);
    expect(paginationWindow(0, 20)).toEqual([1, 2, "ellipsis-end", 20]);
  });
});
