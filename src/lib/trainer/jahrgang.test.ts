import { describe, expect, it } from "vitest";
import { formatJahrgang, parseJahrgang } from "./jahrgang";

describe("parseJahrgang", () => {
  it("akzeptiert 2012 und 12", () => {
    expect(parseJahrgang("2012")).toBe(2012);
    expect(parseJahrgang(2012)).toBe(2012);
    expect(parseJahrgang("12")).toBe(2012);
  });

  it("repariert 0.2012-Tippfehler", () => {
    expect(parseJahrgang("0.2012")).toBe(2012);
    expect(parseJahrgang(0.2012)).toBe(2012);
    expect(parseJahrgang(".2012")).toBe(2012);
  });

  it("lehnt Unsinn ab", () => {
    expect(parseJahrgang("")).toBeUndefined();
    expect(parseJahrgang("abc")).toBeUndefined();
    expect(parseJahrgang(99.5)).toBeUndefined();
  });

  it("formatJahrgang", () => {
    expect(formatJahrgang(2012)).toBe("2012");
    expect(formatJahrgang(0.2012)).toBe("2012");
    expect(formatJahrgang(undefined)).toBe("-");
  });
});
