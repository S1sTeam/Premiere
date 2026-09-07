import { describe, expect, it } from "vitest";
import { escapeHtml } from "../string";

describe("escapeHtml", () => {
  it("returns empty string for falsy input", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("escapes special HTML characters (&, <, >, \", ')", () => {
    expect(escapeHtml("<div>a&b</div>")).toBe("&lt;div&gt;a&amp;b&lt;/div&gt;");
    expect(escapeHtml('<a href="test" onclick=\'alert(1)\'>')).toBe(
      "&lt;a href=&quot;test&quot; onclick=&#39;alert(1)&#39;&gt;",
    );
  });

  it("passes through plain text", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });
});
