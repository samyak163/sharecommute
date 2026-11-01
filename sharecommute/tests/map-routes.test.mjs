import test from "node:test";
import assert from "node:assert/strict";
import {
  createRouteCache,
  directionsUrl,
  MAP_LOCATIONS,
} from "../lib/map-routes.ts";
import { PLACES } from "../lib/commute.ts";

test("concurrent previews share a request and reversed journeys stay distinct", async () => {
  const cache = createRouteCache();
  let calls = 0;
  let finish;
  const request = () => {
    calls++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  };
  const first = cache.get("campus:station", request);
  const second = cache.get("campus:station", request);
  await Promise.resolve();
  assert.equal(calls, 1);
  finish({ distance: 8000 });
  assert.deepEqual(await first, await second);
  assert.deepEqual(await cache.get("campus:station", request), {
    distance: 8000,
  });
  assert.equal(calls, 1);
  assert.equal(
    await cache.get("station:campus", async () => {
      calls++;
      return "reverse";
    }),
    "reverse",
  );
  assert.equal(calls, 2);
});

test("failed route requests can be retried instead of caching a permanent outage", async () => {
  const cache = createRouteCache();
  await assert.rejects(
    cache.get("route", async () => {
      throw new Error("offline");
    }),
    /offline/,
  );
  assert.equal(await cache.get("route", async () => "restored"), "restored");
});

test("expired results refresh and a late old failure cannot evict their replacement", async () => {
  let now = 0;
  let failOld;
  const cache = createRouteCache(100, () => now);
  const old = cache.get(
    "route",
    () =>
      new Promise((_, reject) => {
        failOld = reject;
      }),
  );
  await Promise.resolve();
  now = 101;
  assert.equal(await cache.get("route", async () => "fresh"), "fresh");
  failOld(new Error("old timeout"));
  await assert.rejects(old);
  assert.equal(await cache.get("route", async () => "unexpected"), "fresh");
});

test("route cache stays bounded when many journeys are explored", async () => {
  const cache = createRouteCache(1000, () => 0, 2);
  await cache.get("one", async () => 1);
  await cache.get("two", async () => 2);
  await cache.get("three", async () => 3);
  assert.equal(await cache.get("one", async () => 4), 4);
});

test("every supported landmark has a Pune-specific lookup and key-free directions", () => {
  for (const origin of PLACES) {
    assert.match(MAP_LOCATIONS[origin.id], /Pune, Maharashtra, India$/);
    const destination = origin.id === "station" ? "campus" : "station";
    const url = new URL(directionsUrl(origin.id, destination));
    assert.equal(url.origin, "https://www.google.com");
    assert.equal(url.searchParams.get("origin"), MAP_LOCATIONS[origin.id]);
    assert.equal(
      url.searchParams.get("destination"),
      MAP_LOCATIONS[destination],
    );
    assert.equal(url.searchParams.get("api"), "1");
    assert.equal(url.searchParams.has("key"), false);
  }
});
