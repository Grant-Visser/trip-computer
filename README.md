# Trip Computer 🚗⛽

A Progressive Web App for tracking vehicle fuel fill-ups. Built with Angular 18 (PWA) + TypeScript/Express/SQLite backend.

## Features

- Multiple vehicle support
- Log fill-ups with litres, price, odometer, and location (auto GPS + reverse geocode)
- Fuel efficiency stats: L/100km, cost/km, trend charts, personal records
- Import historical data from CSV or space-delimited format
- Installable PWA — works offline, optimised for mobile
- Dark theme, mobile-first UI with bottom nav

---

## Hosting

### Proxmox LXC (recommended)

One command from your Proxmox host shell:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/Grant-Visser/trip-computer/main/proxmox/trip-computer.sh)"
```

See [proxmox/README.md](./proxmox/README.md) for details.

### Docker

```bash
docker compose up -d
```

App available at `http://localhost:8080`. SQLite persisted in a named volume.

```bash
# Update
git pull && docker compose up -d --build
```

---

## Development

**Prerequisites:** Node.js 22 LTS

```bash
# Install all workspace deps
npm install

# Backend (http://localhost:3000)
npm run dev:backend

# Frontend (http://localhost:4200)
npm run dev:frontend
```

Copy `backend/.env.example` → `backend/.env` before first run.

---

## Project Structure

```
trip-computer/
├── backend/     # Express + TypeScript + SQLite
├── frontend/    # Angular 18 PWA
├── shared/      # Shared TypeScript interfaces
├── proxmox/     # LXC installer scripts
├── docker/      # Nginx + supervisor configs for Docker
└── scripts/     # deploy.sh, update.sh
```

---

## API

Base URL: `http://localhost:3000`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET/POST | `/api/vehicles` | List / create vehicles |
| GET/PUT/DELETE | `/api/vehicles/:id` | Get / update / delete vehicle |
| GET/POST | `/api/vehicles/:id/fillups` | List / add fill-ups |
| GET | `/api/vehicles/:id/stats` | Computed stats + records |
| POST | `/api/vehicles/:id/import` | Import CSV |
| GET/PUT/DELETE | `/api/fillups/:id` | Get / update / delete fill-up |

## CSV Import

**Space-delimited (Grant's format):**
```
2025/10/28 52.78 R21.63 R1141.65 570.4 32756
```

**CSV with header:**
```
date,litres,price_per_litre,total_price,trip_km,odometer
2025/10/28,52.78,21.63,1141.65,570.4,32756
```

---

## License

MIT
