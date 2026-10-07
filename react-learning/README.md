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

Start learning in `src/App.jsx`: `TaskItem` demonstrates props, while `App` demonstrates state, events, list rendering, and effects.

Dependencies have been installed and the production build has passed. Node.js 24 LTS was used.
