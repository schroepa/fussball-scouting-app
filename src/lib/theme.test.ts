import { describe, expect, it } from "vitest";
import { themeColorFor } from "./theme";

describe("theme", () => {
  it("exposes distinct theme-colors for light and dark", () => {
    expect(themeColorFor("light")).not.toBe(themeColorFor("dark"));
    expect(themeColorFor("light").startsWith("#")).toBe(true);
    expect(themeColorFor("dark").startsWith("#")).toBe(true);
  });
});
