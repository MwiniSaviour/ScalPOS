import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

test("web root renders the marketing landing page", () => {
  assert.match(page, /LandingScreen/);
});

test("web root does not redirect into the POS gates", () => {
  assert.doesNotMatch(page, /redirect\(["']\/dashboard["']\)/);
});
