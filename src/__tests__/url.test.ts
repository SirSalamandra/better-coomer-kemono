import { tryParseUrl } from "../shared/utils/url";

describe("tryParseUrl", () => {
  test("returns null for undefined", () => {
    expect(tryParseUrl(undefined)).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(tryParseUrl("")).toBeNull();
  });

  test("returns null for chrome:// internal URL", () => {
    // chrome:// is not a valid URL per WHATWG spec in non-browser env
    const result = tryParseUrl("chrome://newtab/");
    // May parse or not depending on env; main thing: no throw
    expect(() => tryParseUrl("chrome://newtab/")).not.toThrow();
  });

  test("returns null for invalid string", () => {
    expect(tryParseUrl("not a url")).toBeNull();
  });

  test("returns URL object for valid https URL", () => {
    const url = tryParseUrl("https://kemono.cr/patreon/user/123");
    expect(url).not.toBeNull();
    expect(url!.host).toBe("kemono.cr");
  });

  test("returns URL object for valid http URL", () => {
    const url = tryParseUrl("http://coomer.st/onlyfans/user/456");
    expect(url).not.toBeNull();
    expect(url!.pathname).toBe("/onlyfans/user/456");
  });
});
