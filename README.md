# Armine — Front-End Portfolio

A multilingual portfolio built with HTML, CSS, and JavaScript.

## Projects

- Modern Shop: product search, category filters, sorting, and a persistent cart.
- Admin Dashboard: sample sales data, period and status filters, charts, and CSV export.
- Weather App: Open-Meteo city search, current weather, and a five-day forecast.
- Music Player: synthesized Web Audio melodies with pause, resume, seeking, and volume controls.
- JavaScript Playground: a task planner with filters and localStorage persistence.
- Next.js Learning Blog: three Armenian articles with individual routes and page metadata. Source and instructions: `next-blog/README.md`.

## Local preview

Frontend verification and learning notes: [FRONTEND-GUIDE.md](FRONTEND-GUIDE.md).

Open this folder in VS Code and use Live Server to serve `index.html`.
The weather project requires internet access. Dashboard sales and shop checkout are demonstrations.

## Netlify settings

The portfolio includes Vite and Next.js static builds. `netlify.toml` configures the build automatically.

- Build command: use the command in `netlify.toml`.
- Publish directory: `.site-dist`.

Deployment ZIP files and saved browser copies are excluded from Git.

Weather data: [Open-Meteo](https://open-meteo.com/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
