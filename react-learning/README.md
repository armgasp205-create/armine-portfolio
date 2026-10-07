# React task planner — learning project

Separate from the published static portfolio. Requires a current Node.js LTS installation.

From this directory, install dependencies once:

```powershell
npm.cmd install react react-dom
npm.cmd install -D vite
npm.cmd run dev
```

Open the local URL printed by Vite. Use `npm.cmd run build` to check the production build.

`npm.cmd run build:portfolio` builds the public `/react-planner/` page into the parent portfolio directory. Netlify runs this command automatically before publishing the portfolio. Generated output is excluded from Git.

Start in `src/App.tsx` for routing and layout, then read `src/PlannerContext.tsx` and the components and pages listed below.

## React learning map

- Components: `src/components/TaskItem.tsx`, `TaskForm.tsx`, and the three page components.
- Props: task data and callbacks passed to `TaskItem` and `TaskForm`.
- State and useState: task list, form fields, search, filters, theme, and API state.
- useEffect: task persistence, theme persistence, route focus, and API requests with cleanup.
- Context: `src/PlannerContext.tsx` shares tasks and theme across pages.
- React Router: `src/App.tsx` uses HashRouter, Routes, Route, and NavLink. Hash routes remain reloadable on static hosting.
- Forms: `src/components/TaskForm.tsx` handles text, priority, optional date, and validation.
- APIs: `src/pages/ExamplesPage.tsx` and `src/task-data.ts` load DummyJSON examples, handle errors, and prevent duplicate imports. Personal tasks are stored locally and are not sent to DummyJSON.

Run `npm.cmd test` to check stored-data migration, duplicate imports, limits, and API response validation.

Dependencies have been installed and the production build has passed. Node.js 24 LTS was used.

## TypeScript

See TYPESCRIPT.md for the complete type learning map. All React components use TSX and strict type checking. Run npm.cmd run typecheck.
