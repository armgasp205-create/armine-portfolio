import test from "node:test";
import assert from "node:assert/strict";
import { dataKeys, readSnapshot, restoreSnapshot } from "./cloud-data.ts";

const sample = () => ({ tasks: [{ id: "t1", text: "Learn", done: true, priority: "high", due: "" }], expenses: [{ id: "e1", title: "Coffee", amount: 2550, category: "Սնունդ", date: "2026-10-07" }], budgets: { "2026-10": 100000 } });
function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
test("cloud snapshots round-trip tasks, decimal expenses and monthly budgets", () => {
  const storage = memoryStorage(); restoreSnapshot(sample(), storage);
  assert.deepEqual(readSnapshot(storage), sample());
});
test("invalid cloud data is rejected before replacing local data", () => {
  const storage = memoryStorage(); restoreSnapshot(sample(), storage);
  for (const invalid of [null, { ...sample(), expenses: [{ ...sample().expenses[0], amount: -1 }] }, { ...sample(), budgets: { "2026-13": 100 } }, { ...sample(), tasks: [...sample().tasks, ...sample().tasks] }]) {
    assert.throws(() => restoreSnapshot(invalid, storage));
    assert.deepEqual(readSnapshot(storage), sample());
  }
});
test("a failed write restores the previous local snapshot", () => {
  const storage = memoryStorage(); restoreSnapshot(sample(), storage);
  let failed = false;
  const unreliable = { ...storage, setItem(key, value) {
    if (key === dataKeys[1] && !failed) { failed = true; throw new Error("quota"); }
    storage.setItem(key, value);
  } };
  assert.throws(() => restoreSnapshot({ tasks: [], expenses: [], budgets: {} }, unreliable));
  assert.deepEqual(readSnapshot(storage), sample());
});
test("a new browser starts with an empty snapshot", () => {
  assert.deepEqual(readSnapshot(memoryStorage()), { tasks: [], expenses: [], budgets: {} });
});
