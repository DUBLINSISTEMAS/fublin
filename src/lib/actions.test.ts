import { afterEach, describe, expect, it, vi } from "vitest";
import { errorMessage, GENERIC_ERROR } from "./actions";
import { DomainError } from "./result";

describe("errorMessage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("passes domain errors through untouched", () => {
    expect(errorMessage(new DomainError("Cliente não encontrado."))).toBe("Cliente não encontrado.");
  });

  it("hides unexpected errors behind a generic message and logs them", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(errorMessage(new Error("disk on fire"))).toBe(GENERIC_ERROR);
    expect(spy).toHaveBeenCalledOnce();
  });
});
