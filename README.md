# ⚡ Aegis AI — Autonomous Cloud Operations Platform

> Enterprise-grade Azure-native AI platform combining Chaos Engineering, Observability, Incident Management, AI Root Cause Analysis, Self-Healing Automation, Cost Optimization, Security Intelligence, and Platform Engineering.

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/gulmaan87/Aegis-AI-Autonomous-Cloud-Operations-Platform.git
cd Aegis-AI-Autonomous-Cloud-Operations-Platform

# 2. Configure environment
cp .env.example .env
# Edit .env and set POSTGRES_PASSWORD and JWT_SECRET

# 3. Start everything
docker compose up -d
```

| Service | URL | Description |
|---|---|---|
| Frontend | http://localhost:3000 | React dashboard |
| Backend API | http://localhost:8000 | Express REST API |
| Prometheus | http://localhost:9090 | Metrics |
| Grafana | http://localhost:3001 | Dashboards (admin/admin) |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│           React + TypeScript (Vite)          │
│     Login · Dashboard · Incident View        │
└───────────────────┬─────────────────────────┘
                    │ REST /api/*
┌───────────────────▼─────────────────────────┐
│         Express + TypeScript (Node.js)       │
│   /api/auth  ·  /api/health  ·  /metrics    │
└───────┬───────────────────────┬─────────────┘
        │ Prisma ORM            │ ioredis
   PostgreSQL 16             Redis 7
```

---

## 🛠️ Tech Stack

### Backend
| | |
|---|---|
| Runtime | Node.js 20 + TypeScript |
| Framework | Express |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Validation | Zod |
| Metrics | prom-client (Prometheus) |

### Frontend
| | |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v3 |
| Routing | React Router v6 |
| Data fetching | TanStack React Query v5 |
| HTTP | Axios |

### Infrastructure
| | |
|---|---|
| Containers | Docker + Docker Compose |
| Metrics | Prometheus |
| Dashboards | Grafana (auto-provisioned) |
| CI | GitHub Actions |
| Target cloud | Azure (AKS, OpenAI, Monitor, Key Vault) |

---

## 📁 Project Structure

```
.
├── backend/
│   ├── prisma/schema.prisma      # DB schema (User + roles)
│   ├── src/
│   │   ├── lib/
│   │   │   ├── db.ts             # Prisma singleton
│   │   │   ├── redis.ts          # Redis singleton
│   │   │   └── jwt.ts            # sign / verify
│   │   ├── middleware/auth.ts    # Bearer guard + role check
│   │   ├── routes/
│   │   │   ├── auth.ts           # register · login · me
│   │   │   └── health.ts         # liveness · readiness
│   │   └── index.ts              # Express entry point
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.ts            # Axios + JWT interceptor
│   │   │   └── auth.tsx          # Auth context + useAuth
│   │   ├── components/Layout.tsx # Sidebar shell
│   │   ├── pages/
│   │   │   ├── Login.tsx         # Sign in / Register
│   │   │   └── Dashboard.tsx     # Ops overview + health
│   │   ├── App.tsx               # Router + private route
│   │   └── index.css             # Dark theme + design tokens
│   └── Dockerfile
│
├── monitoring/
│   ├── prometheus/prometheus.yml
│   └── grafana/provisioning/datasources/prometheus.yml
│
├── .github/workflows/ci.yml      # Lint + type-check on PR
├── docker-compose.yml
└── .env.example
```

---

## 🔌 API Reference

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Create account → returns JWT |
| `POST` | `/api/auth/login` | — | Sign in → returns JWT |
| `GET` | `/api/auth/me` | ✅ | Current user from token |

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness (process alive?) |
| `GET` | `/api/health/ready` | Readiness (DB + Redis reachable?) |

### Metrics

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/metrics` | Prometheus metrics |

---

## 🗺️ 15-Level Roadmap

| Level | Feature | Weeks | Status |
|---|---|---|---|
| **1** | **Foundation** (auth, Docker, monitoring, dashboard) | 1–4 | ✅ Done |
| 2 | Predictive Intelligence | — | 🔄 Planned |
| 3 | Self-Healing Infrastructure | — | 🔄 Planned |
| 4 | AI Incident Commander | — | 🔄 Planned |
| 5 | Interactive Infrastructure Map | — | 🔄 Planned |
| 6 | AI Infrastructure Chat | — | 🔄 Planned |
| 7 | Digital Twin | — | 🔄 Planned |
| 8 | Cost Optimization | — | 🔄 Planned |
| 9 | Security Intelligence | — | 🔄 Planned |
| 10 | AI Postmortem Generator | — | 🔄 Planned |
| 11 | Voice Operations | — | 🔄 Planned |
| 12 | Multi-Agent AI | — | 🔄 Planned |
| 13 | AI Learning Engine | — | 🔄 Planned |
| 14 | Recruiter Demo Mode | — | 🔄 Planned |
| 15 | Enterprise Platform Features | — | 🔄 Planned |

---

## 📅 Weekly Plan

| Weeks | Focus | Deliverables |
|---|---|---|
| **1–4** | **Foundation** ✅ | Monorepo, auth, Docker stack, Prometheus, Grafana, dashboard |
| 5–6 | Chaos Engineering | Failure injection, incident detection, alerting |
| 7–9 | AI Operations | Azure OpenAI, AI chat, RCA, postmortem generator |
| 10–12 | Autonomous Ops | Self-healing, security intelligence, cost optimization |
| 13–16 | Enterprise | Multi-agent AI, digital twin, voice ops, recruiter demo |

---

## 🔐 Engineering Principles

- **Clean Architecture** — no abstractions with a single use (Ponytail mode)
- **API-first** — every feature behind a documented REST endpoint
- **Secure by default** — zero hardcoded secrets, all via env vars (→ Azure Key Vault in prod)
- **Production-ready** — no placeholder code, every commit deployable
- **Every feature ships with**: frontend + backend + API + DB schema + tests + docs

---

## 🧑‍💻 Local Development (without Docker)

```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev           # http://localhost:8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev           # http://localhost:3000
```

**Required env vars** (see [.env.example](.env.example)):
```
DATABASE_URL=postgresql://aegis:password@localhost:5432/aegis
REDIS_URL=redis://localhost:6379
JWT_SECRET=<generate with: openssl rand -base64 32>
```

---

## 📜 License

MIT
