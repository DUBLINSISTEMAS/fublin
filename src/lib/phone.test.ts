import { describe, expect, it } from "vitest";
import { formatPhone, telUrl, whatsappUrl } from "./phone";

describe("phone helpers", () => {
  it("formats mobile and landline", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
    expect(formatPhone("1134567890")).toBe("(11) 3456-7890");
    expect(formatPhone("123")).toBe("123");
  });
  it("builds wa.me and tel links with country code", () => {
    expect(whatsappUrl("(11) 98765-4321")).toBe("https://wa.me/5511987654321");
    expect(whatsappUrl("5511987654321")).toBe("https://wa.me/5511987654321");
    expect(telUrl("11987654321")).toBe("tel:+5511987654321");
  });
});
