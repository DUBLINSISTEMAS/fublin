import { describe, expect, it } from "vitest";
import { pickParam } from "./search-params";

describe("pickParam", () => {
  it("returns the value, the first of repeated keys, or undefined", () => {
    expect(pickParam({ d: "2026-08-27" }, "d")).toBe("2026-08-27");
    expect(pickParam({ d: ["a", "b"] }, "d")).toBe("a");
    expect(pickParam({}, "d")).toBeUndefined();
    expect(pickParam({ d: [] }, "d")).toBeUndefined();
  });
});
