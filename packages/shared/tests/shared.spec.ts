import { describe, it, expect } from "vitest";
import { TILE_SIZE, MAP, SHOP_ITEMS, NPC_MERCHANT } from "../src/index";

describe("shared config", () => {
  it("has sensible map and tile sizes", () => {
    expect(TILE_SIZE).toBe(32);
    expect(MAP.width).toBeGreaterThan(0);
    expect(MAP.height).toBeGreaterThan(0);
  });

  it("defines at least one shop item", () => {
    expect(SHOP_ITEMS.length).toBeGreaterThan(0);
  });

  it("merchant is within map bounds", () => {
    expect(NPC_MERCHANT.x).toBeGreaterThanOrEqual(0);
    expect(NPC_MERCHANT.y).toBeGreaterThanOrEqual(0);
    expect(NPC_MERCHANT.x).toBeLessThan(MAP.width);
    expect(NPC_MERCHANT.y).toBeLessThan(MAP.height);
  });
});
