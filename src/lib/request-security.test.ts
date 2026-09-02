import { describe, expect, it } from "vitest";
import { rejectCrossOriginMutation } from "./request-security";

describe("rejectCrossOriginMutation", () => {
  it("accepts requests from the same origin", () => {
    const request = new Request("http://192.168.1.20:3000/api/fotos", {
      method: "POST",
      headers: { origin: "http://192.168.1.20:3000" },
    });
    expect(rejectCrossOriginMutation(request)).toBeNull();
  });

  it("rejects cross-origin browser mutations", async () => {
    const request = new Request("http://192.168.1.20:3000/api/fotos", {
      method: "POST",
      headers: { origin: "https://site-malicioso.example" },
    });
    const response = rejectCrossOriginMutation(request);
    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toEqual({ error: "Origem não permitida." });
  });

  it("allows local non-browser clients without Origin", () => {
    expect(rejectCrossOriginMutation(new Request("http://localhost:3000/api/fotos", { method: "POST" }))).toBeNull();
  });
});
