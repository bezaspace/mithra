# Raksha Deployment Guide

This document explains how Raksha is deployed today, why the app is split across two hosts, and how teammates can maintain or redeploy it.

## Current Production Architecture

Raksha is deployed as two separate services:

- Frontend: Vercel
- Backend: Render

Current live endpoints:

- Frontend: `https://raksha-frontend-sage.vercel.app`
- Backend HTTP: `https://raksha-backend-xptj.onrender.com`
- Backend WebSocket: `wss://raksha-backend-xptj.onrender.com/ws/live`

The production request flow is:

1. Browser loads the React app from Vercel.
2. Frontend HTTP API calls use the Vercel origin and are rewritten to Render.
3. Frontend voice WebSocket connects directly to Render.

In practice that means:

- HTTP API requests go to paths like `/api/...` and `/health` on the Vercel domain.
- WebSocket voice traffic goes straight to Render at `/ws/live`.

## Why We Split the Deployment

We originally explored hosting everything on Vercel, but the backend architecture does not fit Vercel well in its current form.

Reasons:

- The backend exposes a persistent WebSocket server at `/ws/live` for live voice.
- The backend currently uses FastAPI rather than a Vercel-native serverless model.
- The backend also assumes local SQLite files for seeded patient and schedule data.

Because of that, we chose:

- Vercel for the React frontend
- Render free web service for the FastAPI backend

This keeps the app free to host while preserving the current realtime voice architecture.

## Repo Layout

- `back end/` - FastAPI backend
- `front end/` - Vite + React frontend
- `render.yaml` - Render blueprint for backend deployment
- `front end/vercel.json` - Vercel rewrites for frontend deployment

## Deployment Decisions

### Backend on Render

Render was chosen because it can run a normal Python web service and supports the current FastAPI + WebSocket setup.

Important Render details:

- Service type: free web service
- Runtime: Python
- Repo root for service: `back end`
- Build command: `pip install uv && uv sync --frozen`
- Start command: `.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`

The Render blueprint currently lives in `render.yaml`.

### Frontend on Vercel

Vercel was kept for the frontend because it is a good fit for a static Vite build and makes public browser deployment easy.

Vercel is responsible for:

- hosting the static frontend build
- serving the SPA routes
- proxying HTTP API requests to Render

Vercel is not responsible for proxying the live voice WebSocket in the final setup.

## Files That Make Production Work

### `render.yaml`

`render.yaml` defines the backend service configuration for Render, including:

- repository
- service name
- root directory
- build command
- start command
- health check path
- non-secret environment variables

It also declares `GEMINI_API_KEY` as `sync: false`, which means the value must be set in Render and is not committed to git.

### `front end/vercel.json`

`front end/vercel.json` contains the production rewrites:

- `/api/(.*)` -> Render backend `/api/$1`
- `/health` -> Render backend `/health`
- `/(.*)` -> `/index.html` for SPA routing

This is why direct browser visits such as `/dashboard` or `/schedule` still work on Vercel.

### `front end/src/App.tsx`

The frontend uses different URL logic in development and production:

- In development, it talks to `localhost` by env var.
- In production, normal HTTP uses `window.location.origin`.
- In production, WebSocket uses the direct Render URL.

That split is intentional.

### `front end/src/components/dashboard/dashboardApi.ts`

Dashboard API requests also use the Vercel origin in production, which keeps HTTP traffic behind Vercel rewrites instead of making cross-origin browser requests directly to Render.

## Environment Variables

### Backend Environment

Backend config is loaded from `back end/.env` locally and from Render environment variables in production.

Important backend variables:

- `GEMINI_API_KEY` - required secret
- `GEMINI_MODEL` - currently `gemini-2.5-flash-native-audio-preview-12-2025`
- `APP_NAME`
- `LOG_LEVEL`
- `FRONTEND_ORIGIN`
- `PROFILE_DB_URL`
- `PROFILE_SEED_SQL_PATH`
- `SCHEDULE_DB_URL`
- `SCHEDULE_SEED_SQL_PATH`

Notes:

- `GEMINI_API_KEY` must never be committed.
- The Render service was created with the Gemini key loaded from the local backend `.env`.
- The app currently uses SQLite file paths, which is acceptable for this MVP but not ideal for durable cloud persistence.

### Frontend Environment

Documented local frontend variables are in `front end/.env.example`:

- `VITE_BACKEND_HTTP_URL`
- `VITE_BACKEND_WS_URL`
- `VITE_BACKEND_URL`
- `VITE_APP_NAME`

For local development these should point at `localhost:8000`.

For production, Vercel env vars were set so the build has explicit backend values available. The important production behavior is:

- HTTP should resolve to the deployed frontend origin so Vercel rewrites can handle `/api`
- WebSocket should resolve to Render directly

## Backend Deployment Process (Render)

This is the process we used and should follow again for future backend deployments.

### 1. Prepare the backend for cloud hosting

We confirmed that the FastAPI app exposes:

- `GET /health`
- `WS /ws/live`

We also verified that the backend can boot from the repository using the Python tooling already defined in `back end/pyproject.toml`.

### 2. Create a Render blueprint/config

We added `render.yaml` at the repo root so Render knows how to build and run the backend.

Current key settings:

- service name: `raksha-backend`
- repo: `https://github.com/bezaspace/rak4.git`
- root directory: `back end`
- plan: `free`
- region: `oregon`
- auto deploy trigger: `off`

### 3. Create the Render service

We used Render CLI to create a web service in the selected workspace.

Tracked service details:

- workspace id: `tea-d6rmqcfdiees73btepbg`
- service id: `srv-d6rmutua2pns73fqs8a0`

### 4. Set backend environment variables in Render

The non-secret values are described in `render.yaml`, but the critical secret still has to be set in Render:

- `GEMINI_API_KEY`

If redeploying from scratch, make sure this exists before expecting live voice to work.

### 5. Deploy and verify

After deployment, we verified:

- `https://raksha-backend-xptj.onrender.com/health` returns `{"status":"ok"}`
- `wss://raksha-backend-xptj.onrender.com/ws/live` accepts a live WebSocket connection

## Frontend Deployment Process (Vercel)

This is the process we used and should follow again for future frontend deployments.

### 1. Fix missing frontend dependencies

The dashboard code referenced packages that were not yet declared in `front end/package.json`.

We added:

- `@mui/material`
- `@mui/icons-material`
- `@emotion/react`
- `@emotion/styled`
- `chart.js`
- `react-chartjs-2`

After that, the frontend build passed locally.

### 2. Add Vercel rewrites

We created `front end/vercel.json` so that:

- API requests proxy to Render
- `/health` proxies to Render
- SPA routes fall back to `index.html`

Without this file, direct navigation and same-origin API usage would not behave correctly.

### 3. Link the frontend directory to Vercel

We linked `front end/` as the Vercel project root and created the frontend project there.

Project name:

- `raksha-frontend`

### 4. Configure frontend environment variables in Vercel

We added production env vars in Vercel for the frontend build, including:

- `VITE_BACKEND_HTTP_URL`
- `VITE_BACKEND_WS_URL`
- `VITE_BACKEND_URL`
- `VITE_APP_NAME`

Even with these values present, the production code path is designed so that:

- HTTP goes through the Vercel origin
- WebSocket goes directly to Render

### 5. Disable Vercel deployment protection

The Vercel project initially required authentication due to deployment protection settings.

We disabled that protection so teammates can open the production URL without logging into Vercel.

The relevant Vercel setting that had to be changed was:

- `ssoProtection: all_except_custom_domains` -> disabled for this project

### 6. Deploy and verify

After deployment, we verified:

- the frontend site loads publicly
- `https://raksha-frontend-sage.vercel.app/health` returns the backend health payload through Vercel rewrites
- browser access to the live app works

## Production Networking Strategy

The key deployment detail for new teammates is this split:

### HTTP API traffic

HTTP API calls use the frontend origin in production.

Examples:

- `https://raksha-frontend-sage.vercel.app/api/...`
- `https://raksha-frontend-sage.vercel.app/health`

Vercel rewrites those requests to the Render backend.

Benefits:

- cleaner browser network path
- no direct browser CORS dependency for normal API calls
- easy to keep frontend and API paths consistent

### WebSocket traffic

Voice traffic does not go through Vercel rewrites.

Instead, the frontend connects directly to:

- `wss://raksha-backend-xptj.onrender.com/ws/live`

Why:

- the app relies on a persistent backend WebSocket server
- a direct test through the frontend domain did not work correctly for `/ws/live`
- the direct Render WebSocket connection works reliably

## Verification Checklist

When checking a fresh deployment, verify all of the following:

### Backend

- `GET https://raksha-backend-xptj.onrender.com/health`
- direct WebSocket connectivity to `wss://raksha-backend-xptj.onrender.com/ws/live`
- Render logs show successful FastAPI startup

### Frontend

- `https://raksha-frontend-sage.vercel.app` loads without authentication
- `/dashboard` loads correctly on hard refresh
- `/schedule` loads correctly on hard refresh
- `https://raksha-frontend-sage.vercel.app/health` returns backend health
- voice session can start from the browser
- push-to-talk and assistant audio both work

## Updating the Deployment

### If backend code changes

1. Push the backend changes to the tracked GitHub repository.
2. Redeploy the Render service.
3. Re-run backend verification checks.
4. If APIs changed, confirm frontend compatibility.

### If frontend code changes

1. Push the frontend changes to the tracked GitHub repository.
2. Trigger a new Vercel deployment.
3. Verify the production site and rewritten API paths.
4. Re-test live voice in the browser.

### If environment variables change

Update them in the host platform, not just locally:

- Render for backend runtime env vars
- Vercel for frontend build-time env vars

## Known Caveats

### Render free tier

- The backend may cold start after inactivity.
- First request or voice session may take longer when the service is asleep.

### Ephemeral local filesystem

- Render free services do not provide durable local disk persistence.
- The app currently relies on SQLite/local files, so this is acceptable only as an MVP-style deployment.
- For stronger production guarantees, migrate to managed persistent storage.

### CORS and origin handling

- Backend CORS is configured from `FRONTEND_ORIGIN`.
- Current production HTTP traffic avoids most browser CORS issues by going through Vercel rewrites.
- If we later make the browser call Render directly for HTTP APIs, `FRONTEND_ORIGIN` should be updated to the public frontend origin.

### Secrets hygiene

- The Gemini API key should remain only in local `.env` files and hosting platform secrets.
- Because a real key was used during deployment setup, rotating it later is a good precaution.

## Troubleshooting

### Frontend loads but API requests fail

Check:

- `front end/vercel.json` rewrites
- Vercel deployment status
- backend health endpoint on Render

### Frontend loads but voice does not connect

Check:

- the frontend is still using the direct Render WebSocket URL in production
- the Render backend service is awake
- `GEMINI_API_KEY` exists in Render
- browser console/network tab for `/ws/live` failures

### Vercel site asks users to log in

Check Vercel deployment protection settings and confirm project-level auth protection is disabled.

### Backend starts but some data looks reset

This is likely related to the current SQLite/local-file deployment model on Render. Long term, move persistent app data to managed storage.

## Recommended Follow-Up Improvements

- Move persistent data off local SQLite into managed storage.
- Add a custom production domain for the frontend and backend.
- Add a small deployment checklist to pull requests.
- Automate post-deploy smoke tests for `/health`, `/dashboard`, `/schedule`, and live voice startup.
- Rotate the current Gemini API key after the deployment setup is stabilized.

## Quick Reference

- Frontend project root: `front end/`
- Backend project root: `back end/`
- Render config: `render.yaml`
- Vercel config: `front end/vercel.json`
- Frontend env template: `front end/.env.example`
- Production frontend URL: `https://raksha-frontend-sage.vercel.app`
- Production backend URL: `https://raksha-backend-xptj.onrender.com`

## Backend Power Controls

To make it easy to temporarily block public use of the app, the repo now includes simple backend control commands:

- `./boff` - suspend the Render backend
- `./bon` - resume the Render backend
- `./bstatus` - check backend state

These commands call the Render API for the current backend service and are meant to be run from the repo root.

### How to use them

Run these from the project root:

```bash
./bstatus
./boff
./bon
```

Typical workflow:

1. Before sharing the app, run `./boff` to suspend the backend.
2. When teammates are ready to test, run `./bon` to bring the backend back up.
3. If you are unsure whether the backend is currently live, run `./bstatus`.

Example `./bstatus` output:

```text
Backend: raksha-backend (srv-d6rmutua2pns73fqs8a0)
State: not_suspended
Maintenance mode: off
URL: https://raksha-backend-xptj.onrender.com
```

How to read that output:

- `State: not_suspended` means the backend is live.
- `State: suspended` means the backend is off.
- `Maintenance mode` is separate from suspend/resume and should usually stay `off`.
- `URL` is the Render backend endpoint being controlled.

Behavior:

- When the backend is suspended, the Vercel frontend may still open, but the app will not function.
- When the backend is resumed, Render may take a short moment to become healthy again.
- After `./bon`, it is a good idea to run `./bstatus` once more if you want to confirm the backend is back.

### Notes

- These commands are safe convenience wrappers around the Render API.
- They do not redeploy the backend; they only suspend or resume the existing service.
- If Render CLI credentials expire, run `render login` again on this machine.

Implementation files:

- `boff`
- `bon`
- `bstatus`
- `scripts/backend-control`

The helper uses the Render CLI login credentials already stored on the local machine in the Render CLI config, or `RENDER_API_KEY` if it is set in the environment.
