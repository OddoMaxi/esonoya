# eSonoya — Plateforme de Rendez-vous Passeport Guinéen

> Service officiel de prise de rendez-vous en ligne pour les passeports ordinaires de la République de Guinée.

## Structure du projet

```
esonoya/
├── backend-api/          # Laravel 12 API
├── frontend-citizen/     # Next.js 15 — Interface citoyen  (port 3000)
├── admin-dashboard/      # Next.js   — Dashboard admin     (port 3001)
├── database/             # Schéma SQL + diagrammes
├── docs/                 # Documentation technique
└── deployment/           # Docker, CI/CD, Nginx
```

## Prérequis

| Outil       | Version min |
|-------------|------------|
| PHP         | 8.3+       |
| Composer    | 2.x        |
| Node.js     | 22+        |
| npm         | 10+        |
| PostgreSQL  | 16+        |
| Redis       | 7+         |

## Installation rapide

### 1. Backend API

```bash
cd backend-api
cp .env.example .env
# Remplir DB_*, SMS_*, QR_SECRET_KEY dans .env

composer install
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve --port=8000
```

### 2. Frontend citoyen

```bash
cd frontend-citizen
cp .env.local.example .env.local
npm install
npm run dev   # port 3000
```

### 3. Dashboard admin

```bash
cd admin-dashboard
cp .env.local.example .env.local
npm install
npm run dev -- --port 3001
```

## Compte admin par défaut

| Email                    | Mot de passe      | Rôle        |
|--------------------------|-------------------|-------------|
| admin@esonoya.gov.gn     | eSonoya@2024!     | super-admin |
| conakry@esonoya.gov.gn   | Conakry@2024!     | admin-centre|

> **Changer immédiatement ces mots de passe en production !**

## Architecture technique

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pour le schéma complet.

## Rôles & Permissions

| Rôle              | Accès                                         |
|-------------------|-----------------------------------------------|
| `super-admin`     | Accès total                                   |
| `admin-centre`    | Son centre uniquement (quotas, RDV, stats)    |
| `agent-validation`| Scan QR code uniquement                       |
| `statisticien`    | Lecture statistiques uniquement               |

## Sprints de développement

- **Sprint 1** ✅ — Setup, auth admin, base de données
- **Sprint 2** — OTP SMS, formulaire multi-step, réservation pour autrui
- **Sprint 3** — Centres, quotas, réservation date
- **Sprint 4** — QR code, PDF, dashboard admin
- **Sprint 5** — Analytics, sécurité, optimisation, déploiement

## Variables d'environnement importantes

### Backend (`backend-api/.env`)
```
DB_CONNECTION=pgsql
DB_DATABASE=esonoya
SANCTUM_STATEFUL_DOMAINS=localhost:3000,localhost:3001
SMS_PROVIDER=orange
QR_SECRET_KEY=<clé longue et aléatoire>
```

### Frontend (`frontend-citizen/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```
