import { HostResolver, hostForArtist } from "../core/hosts/HostResolver";
import { Artist } from "../shared/types/Artist";

describe("HostResolver.isSupportedHost", () => {
  test.each([
    ["kemono.cr", true],
    ["coomer.st", true],
    ["KEMONO.CR", true],
    ["Coomer.St", true],
    ["kemono.cr:8080", true],
    ["coomer.st:443", true],
    ["kemono.st", false],
    ["coomer.cr", false],
    ["kemono", false],
    ["example.com", false],
    ["", false],
  ])("isSupportedHost(%p) -> %p", (host, expected) => {
    expect(HostResolver.isSupportedHost(host)).toBe(expected);
  });
});

describe("HostResolver.resolveArtistHost", () => {
  test("keeps exact supported artist host", () => {
    const artist: Artist = { id: "a1", content_origin: "patreon", hostname: "kemono.cr" };
    expect(HostResolver.resolveArtistHost(artist)).toBe("kemono.cr");
  });

  test("canonicalizes legacy coomer hostname to supported host", () => {
    const artist: Artist = { id: "a1", content_origin: "onlyfans", hostname: "coomer.su" };
    expect(HostResolver.resolveArtistHost(artist)).toBe("coomer.st");
  });

  test("canonicalizes legacy kemono hostname to supported host", () => {
    const artist: Artist = { id: "a1", content_origin: "patreon", hostname: "kemono.party" };
    expect(HostResolver.resolveArtistHost(artist)).toBe("kemono.cr");
  });

  test("falls back to coomer host for coomer-backed services", () => {
    const artist: Artist = { id: "a1", content_origin: "OnlyFans" };
    expect(HostResolver.resolveArtistHost(artist)).toBe("coomer.st");
  });

  test("falls back to kemono host for other services", () => {
    const artist: Artist = { id: "a1", content_origin: "fanbox" };
    expect(HostResolver.resolveArtistHost(artist)).toBe("kemono.cr");
  });
});

describe("hostForArtist", () => {
  test("delegates to HostResolver", () => {
    const artist: Artist = { id: "a1", content_origin: "fansly" };
    expect(hostForArtist(artist)).toBe("coomer.st");
  });
});
