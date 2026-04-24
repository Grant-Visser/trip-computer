# Trip Computer 🚗⛽

A Progressive Web App for tracking vehicle fuel fill-ups. Built with Angular 18 (PWA) frontend and a TypeScript/Express/SQLite backend.

## Features

- Track multiple vehicles
- Log fuel fill-ups with litres, price, odometer, and location
- Auto-detect GPS location + reverse geocode (Nominatim)
- Compute fuel efficiency (L/100km), cost/km, and trend charts
- Import historical fill-up data from CSV or space-delimited format
- Installable PWA — works offline, usable at the petrol station
- Dark theme, mobile-first UI

## Quick Start (Development)

### Prerequisites

- Node.js 20+
- npm 9+

### 1. Install dependencies

```bash
npm install          # installs workspace root deps
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure backend

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` if needed (default port 3000, SQLite at `./data/trip-computer.db`).

### 3. Run backend

```bash
npm run dev:backend
# or
cd backend && npm run dev
```

Backend runs at http://localhost:3000

### 4. Run frontend

```bash
npm run dev:frontend
# or
cd frontend && npm start
```

Frontend runs at http://localhost:4200

## 🐳 Docker

The easiest way to run Trip Computer in production.

### Quick start

```bash
docker compose up -d
```

App will be available at http://localhost:8080

### What it does
- Multi-stage build: compiles Angular frontend + TypeScript backend
- Single container: Nginx serves the frontend and proxies `/api/` to the Node backend
- SQLite database persisted in a named Docker volume (`trip-computer-data`)

### Environment variables
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Backend port (internal) |
| `DB_PATH` | `/data/trip-computer.db` | SQLite database path |
| `NODE_ENV` | `production` | Node environment |

### Updating
```bash
git pull
docker compose up -d --build
```

### Base image
Built on `node:22-trixie` (Debian 13 "Trixie" with Node.js 22 LTS).

## Project Structure

```
trip-computer/
├── backend/           # Express + TypeScript + SQLite (Drizzle ORM)
├── frontend/          # Angular 18 PWA
├── shared/            # Shared TypeScript interfaces
├── scripts/           # deploy.sh, update.sh
├── proxmox/           # LXC hosting guide + configs
└── package.json       # npm workspaces root
```

## Hosting on Proxmox LXC

See [proxmox/README.md](./proxmox/README.md) for a full guide to deploying this on a Debian 12 LXC container in Proxmox.

## API Reference

Base URL: `http://localhost:3000`

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| GET | /api/vehicles | List vehicles |
| POST | /api/vehicles | Create vehicle |
| GET | /api/vehicles/:id | Get vehicle |
| PUT | /api/vehicles/:id | Update vehicle |
| DELETE | /api/vehicles/:id | Delete vehicle |
| GET | /api/vehicles/:id/fillups | List fill-ups |
| POST | /api/vehicles/:id/fillups | Add fill-up |
| GET | /api/vehicles/:id/stats | Get stats |
| POST | /api/vehicles/:id/import | Import CSV |
| GET | /api/fillups/:id | Get fill-up |
| PUT | /api/fillups/:id | Update fill-up |
| DELETE | /api/fillups/:id | Delete fill-up |

## CSV Import Format

Supports two formats:

**CSV with header:**
```
date,litres,price_per_litre,total_price,trip_km,odometer
2025/10/28,52.78,21.63,1141.65,570.4,32756
```

**Space-delimited (raw):**
```
2025/10/28 52.78 R21.63 R1141.65 570.4 32756
```

## License

MIT
