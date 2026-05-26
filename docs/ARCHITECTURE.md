# eSonoya — Architecture Technique

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                        INTERNET                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   NGINX      │  (reverse proxy + SSL)
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  Frontend   │ │   Admin     │ │  Laravel    │
    │  Citoyen    │ │  Dashboard  │ │   API       │
    │  :3000      │ │  :3001      │ │  :8000      │
    └─────────────┘ └─────────────┘ └──────┬──────┘
                                           │
                              ┌────────────┼────────────┐
                              │            │            │
                       ┌──────▼──────┐ ┌──▼──┐  ┌─────▼────┐
                       │ PostgreSQL  │ │Redis│  │SMS API   │
                       │    :5432    │ │:6379│  │(Provider)│
                       └─────────────┘ └─────┘  └──────────┘
```

## Composants

### Frontend Citoyen (`frontend-citizen/`)
- **Framework** : Next.js 15 (App Router)
- **Language** : TypeScript strict
- **Style** : TailwindCSS + Shadcn UI
- **Forms** : React Hook Form + Zod
- **Port** : 3000

### Dashboard Admin (`admin-dashboard/`)
- **Framework** : Next.js (App Router)
- **Language** : TypeScript strict
- **Style** : TailwindCSS + Shadcn UI
- **Tables** : TanStack Table
- **Charts** : Recharts
- **Port** : 3001

### Backend API (`backend-api/`)
- **Framework** : Laravel 12
- **Auth** : Laravel Sanctum
- **Permissions** : Spatie Laravel Permission
- **Queue** : Laravel Queue (Redis)
- **Port** : 8000

### Base de Données
- **SGBD** : PostgreSQL 16
- **Port** : 5432
- **Cache** : Redis 7

## Flux d'authentification

### Citoyen (OTP SMS)
```
1. Citoyen saisit son numéro de téléphone
2. API envoie OTP via SMS Provider
3. Citoyen saisit l'OTP reçu
4. API valide l'OTP et retourne un token Sanctum
5. Frontend stocke le token (httpOnly cookie)
```

### Admin (Email + OTP)
```
1. Admin saisit email + mot de passe
2. API vérifie les credentials
3. API envoie OTP via SMS/Email
4. Admin saisit l'OTP
5. API retourne token Sanctum avec rôles/permissions
```

## Sécurité
- HTTPS obligatoire en production
- Rate limiting sur tous les endpoints sensibles
- CORS configuré strictement
- Validation côté backend toujours (même si frontend valide)
- Tokens Sanctum avec expiration
- Audit logs sur toutes les actions admin
- Protection brute force sur OTP (5 tentatives max)

## Rôles & Permissions (Spatie)
- `super-admin` : accès total
- `admin-centre` : gestion de son centre uniquement
- `agent-validation` : scan QR code uniquement
- `statisticien` : lecture statistiques uniquement

## Endpoints API principaux
```
POST   /api/auth/send-otp          # Envoi OTP citoyen
POST   /api/auth/verify-otp        # Vérification OTP citoyen
POST   /api/admin/login            # Login admin
POST   /api/admin/verify-otp       # OTP admin 2FA

GET    /api/centers                # Liste des centres
GET    /api/centers/{id}/quotas    # Quotas disponibles
POST   /api/appointments           # Créer RDV
GET    /api/appointments/{id}      # Détail RDV
GET    /api/appointments/{id}/pdf  # Télécharger PDF

POST   /api/admin/scan-qr         # Valider QR code
GET    /api/admin/stats            # Statistiques
GET    /api/admin/appointments     # Liste RDV (admin)
```
