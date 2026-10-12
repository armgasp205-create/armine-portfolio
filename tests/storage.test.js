import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
const { normalizeCart, storage } = createRequire(import.meta.url)("../frontend-utils.js");
const products = [{ id: 1, name: "Headphones", price: 89 }];
describe("Saved data recovery", () => {
  it("recovers from malformed JSON", () => { storage.setItem("broken", "{"); expect(storage.json("broken", [])).toEqual([]); });
  it("rejects invalid carts and quantities", () => { expect(normalizeCart({}, products)).toEqual([]); expect(normalizeCart([{id:1,quantity:-3},{id:2,quantity:1}], products)).toEqual([]); });
  it("restores trusted product data and bounds quantity", () => { expect(normalizeCart([{id:1,quantity:300,name:"<script>",price:0},{id:1,quantity:2}], products)).toEqual([{...products[0],quantity:99}]); });
});
