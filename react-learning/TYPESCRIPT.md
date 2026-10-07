# TypeScript examples in this project

Start with `src/types.ts`, then `src/task-data.ts` and `src/components/TaskItem.tsx`.

| Topic | Working example |
| --- | --- |
| string | `Task.text`, `Task.id` |
| number | `ExampleTask.id`, `MAX_TASKS` |
| boolean | `Task.done`, loading and cancellation flags |
| arrays | `Task[]`, `ExampleTask[]` |
| objects | A task with text, status, priority, and due date |
| interfaces | `Task`, `ExampleTask`, `PlannerContextValue` |
| types | `Theme`, `Priority`, `NewTask` |
| functions | `normalizeTasks(value: unknown): Task[]` |
| optional properties | `sourceId?: number` for API imports |
| union types | `Priority` and the discriminated `ApiResult` union |
| React + TypeScript | Typed props, useState, Context, refs, form events, and `.tsx` components |

Run `npm.cmd run typecheck` to check types. Both build commands run this check before bundling.

TypeScript checks code before it runs; fetched JSON and stored data still need runtime validation. `task-data.ts` accepts `unknown` data and validates it before constructing typed tasks.
