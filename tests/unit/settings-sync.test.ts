import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { configPatch, configPayload, isRestaurantConfig, isSalonConfig } from "../../lib/sync/settings-config.ts";
import type { Settings } from "../../lib/types.ts";

const settings = (over: Partial<Settings> = {}): Settings =>
  ({
    businessType: "retail",
    shopName: "Shop",
    address: "",
    phone: "",
    ownerId: "Owner",
    momoNumber: "",
    momoNetwork: "",
    taxInclusive: true,
    taxRate: 0,
    receiptFooter: "",
    theme: "dark",
    nextOrderNo: 1,
    createdAt: 1,
    ...over,
  }) as Settings;

const RESTAURANT = { tables: true, orderTypes: ["dine-in", "takeaway"] };
const SALON = { openDays: [1, 2, 3, 4, 5, 6], openHours: { start: "09:00", end: "19:00" } };

describe("configPayload", () => {
  test("restaurant setup is pushed only for a restaurant", () => {
    assert.deepEqual(configPayload(settings({ businessType: "restaurant", restaurantConfig: RESTAURANT })), {
      restaurant_config: RESTAURANT,
      salon_config: null,
    });
  });

  test("salon setup is pushed only for a salon", () => {
    assert.deepEqual(configPayload(settings({ businessType: "salon", salonConfig: SALON })), {
      restaurant_config: null,
      salon_config: SALON,
    });
  });

  test("other business types clear stale setup", () => {
    assert.deepEqual(configPayload(settings({ restaurantConfig: RESTAURANT, salonConfig: SALON })), {
      restaurant_config: null,
      salon_config: null,
    });
  });
});

describe("config validation", () => {
  test("well-formed setup is accepted", () => {
    assert.equal(isRestaurantConfig(RESTAURANT), true);
    assert.equal(isSalonConfig(SALON), true);
  });

  test("malformed jsonb is rejected", () => {
    assert.equal(isRestaurantConfig({ tables: "yes" }), false);
    assert.equal(isRestaurantConfig(null), false);
    assert.equal(isSalonConfig({ openDays: [1, 9] }), false);
    assert.equal(isSalonConfig({ openHours: { start: "9am" } }), false);
    assert.equal(isSalonConfig("salon"), false);
  });
});

describe("configPatch", () => {
  test("a pull fills missing setup of the effective business type", () => {
    const row = { restaurant_config: RESTAURANT, salon_config: SALON };
    assert.deepEqual(configPatch(row, settings({ businessType: "restaurant" })), { restaurantConfig: RESTAURANT });
    assert.deepEqual(configPatch(row, settings({ businessType: "salon" })), { salonConfig: SALON });
  });

  test("a local setup is never overwritten by a pull", () => {
    assert.deepEqual(
      configPatch({ restaurant_config: RESTAURANT }, settings({ businessType: "restaurant", restaurantConfig: { tables: false, orderTypes: [] } })),
      {},
    );
  });

  test("a setup for another business type is ignored", () => {
    assert.deepEqual(configPatch({ salon_config: SALON }, settings({ businessType: "retail" })), {});
  });
});
