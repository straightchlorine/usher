# Usher web

React 19 + react-router 7 single-page app, built with Vite and tested via Vitest.

## Scripts

- `npm start` - Vite dev server on http://localhost:3000
- `npm run build` - production build into `build/`
- `npm test` - Vitest (jsdom), single run
- `npx eslint src --max-warnings 0` - lint
- `npm run worker:dev` / `npm run worker:test` - Cloudflare Worker that serves `build/`

## Configuration

`VITE_API_URL` sets the API base URL. It is injected into the bundle at build time
(`.env.production` sets `/api`, the nginx reverse proxy path). Without it the app
falls back to `http://localhost:8080/api`.

`VITE_DEMO_USERNAME` and `VITE_DEMO_PASSWORD` override the demo credentials.
