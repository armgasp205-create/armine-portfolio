import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTasks, importTask, fetchExampleTasks } from "./task-data.js";

test("existing saved tasks migrate without losing completion state", () => {
  assert.deepEqual(normalizeTasks([{ id: "old", text: "Learn React", done: true }]), [{ id: "old", text: "Learn React", done: true, priority: "medium", due: "" }]);
});
test("corrupt entries and duplicate IDs are excluded", () => {
  const result = normalizeTasks([null, { id: "a", text: "Task", done: false, priority: "unknown" }, { id: "a", text: "Duplicate", done: true }, { id: "b", text: " ", done: false }]);
  assert.equal(result.length, 1); assert.equal(result[0].priority, "medium");
});
test("API imports prevent duplicates and respect the task limit", () => {
  const example = { id: 1, todo: "Example task", completed: false };
  const first = importTask([], example, "local");
  assert.equal(importTask(first, example, "another"), first);
  const full = Array.from({ length: 100 }, (_, i) => ({ id: String(i) }));
  assert.equal(importTask(full, example, "extra"), full);
});
test("API responses are validated and the cancellation signal is forwarded", async () => {
  const signal = new AbortController().signal;
  const result = await fetchExampleTasks(signal, async (url, options) => {
    assert.equal(options.signal, signal);
    assert.equal(url, "https://dummyjson.com/todos?limit=6");
    return { ok: true, json: async () => ({ todos: [{ id: 1, todo: "Read", completed: false }, { id: 2, todo: 8 }] }) };
  });
  assert.equal(result.length, 1);
  await assert.rejects(fetchExampleTasks(signal, async () => ({ ok: false })), /Ծառայությունը/);
  await assert.rejects(fetchExampleTasks(signal, async () => ({ ok: true, json: async () => ({}) })), /ձևաչափը/);
});
