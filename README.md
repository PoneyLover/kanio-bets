# KANIO - Plateforme de paris sportifs virtuels

> **KANIO (code KAN) est une monnaie 100% virtuelle et fictive, sans aucune valeur reelle.**
> Aucun paiement, depot ou retrait d'argent reel n'est possible sur cette plateforme.
> Aucune integration Stripe/PayPal/carte bancaire/crypto n'existe ni ne doit etre ajoutee.
> Ce projet est une demonstration / jeu gratuit.

## Sommaire

1. [Presentation](#1-presentation)
2. [Architecture](#2-architecture)
3. [Stack technique](#3-stack-technique)
4. [Installation locale](#4-installation-locale)
5. [Configuration (variables d'environnement)](#5-configuration-variables-denvironnement)
6. [Base de donnees, migrations, seed](#6-base-de-donnees-migrations-seed)
7. [Lancer l'application](#7-lancer-lapplication)
8. [Comptes de demonstration](#8-comptes-de-demonstration)
9. [Tests](#9-tests)
10. [API REST](#10-api-rest)
11. [Le portefeuille KANIO (ledger)](#11-le-portefeuille-kanio-ledger)
12. [Cotes dynamiques (OddsService)](#12-cotes-dynamiques-oddsservice)
13. [Settlement (reglement des paris)](#13-settlement-reglement-des-paris)
14. [Securite](#14-securite)
15. [Deploiement gratuit](#15-deploiement-gratuit)
16. [Troubleshooting](#16-troubleshooting)
17. [Limites connues / pistes d'evolution](#17-limites-connues--pistes-devolution)

## 1. Presentation

KANIO permet a un utilisateur de :

- creer un compte et recevoir un solde initial de KANIO (KAN) ;
- consulter des evenements sportifs de demonstration et leurs marches/cotes ;
- placer des paris simples avec sa monnaie virtuelle ;
- suivre ses paris (en cours / gagnes / perdus / rembourses) et l'historique complet de son portefeuille ;
- consulter un classement des joueurs.

Un compte **ADMIN** dispose d'un back-office pour gerer les utilisateurs, creer/regler/annuler des evenements et
des marches, crediter/debiter manuellement des comptes (avec justification obligatoire et journalisation), et
consulter un tableau de bord + un journal d'audit.

## 2. Architecture

Monorepo **npm workspaces** :

```
kanio-bets/
├── apps/
│   ├── web/            Frontend Next.js 14 (App Router) + TypeScript + Tailwind CSS
│   └── api/             Backend Node.js + Express + TypeScript (API REST)
├── packages/
│   └── db/               Prisma (schema, migrations, seed) - partage par l'API
├── docs/
│   └── ODDS_ALGORITHM.md Documentation detaillee de l'algorithme de cotes dynamiques
├── docker-compose.yml    Postgres local pour le developpement (alternative a Neon)
├── .env.example
└── README.md
```

**Pourquoi cette architecture est adaptee a un hebergement gratuit :**

- Le frontend (Next.js) et le backend (Express) sont deployes separement, chacun sur la plateforme la
  plus adaptee et gratuite pour son usage (Vercel pour un frontend Next.js, Render pour un service Node long-running).
- La base de donnees Postgres est hebergee sur **Neon**, dont le tier gratuit est un vrai Postgres serverless
  sans date d'expiration (contrairement a l'offre Postgres gratuite de Render qui expire au bout de 90 jours).
- Le monorepo npm workspaces evite la complexite d'outils comme Turborepo/Nx tout en partageant proprement
  le client Prisma entre le seed et l'API.

## 3. Stack technique

| Domaine          | Choix                                          |
|-------------------|------------------------------------------------|
| Frontend          | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Backend           | Node.js, Express, TypeScript                   |
| Base de donnees   | PostgreSQL (Neon en prod, Docker/Postgres local en dev) |
| ORM               | Prisma                                          |
| Authentification  | JWT (access + refresh) en cookies httpOnly, hash Argon2id |
| Validation        | Zod (cote serveur, systematique)                |
| Tests             | Vitest (unitaire + integration API via Supertest) |
| Securite          | helmet, cors, express-rate-limit, argon2, cookies httpOnly |

## 4. Installation locale

Prerequis : Node.js >= 18.18, npm >= 9, un acces a une base PostgreSQL (Neon gratuit recommande, ou
`docker compose up -d` si vous avez Docker installe).

```bash
git clone <url-du-repo> kanio-bets
cd kanio-bets
npm install
```

## 5. Configuration (variables d'environnement)

Trois fichiers `.env` sont necessaires (des `.env.example` sont fournis a chaque emplacement) :

### `packages/db/.env`

```bash
cp packages/db/.env.example packages/db/.env
```

```
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:pass@host/db?sslmode=require"   # requis avec Neon, voir plus bas
ADMIN_EMAIL="admin@kanio.local"
ADMIN_PASSWORD="ChangeMe123!"
ADMIN_USERNAME="admin"
INITIAL_KANIO_BALANCE="1000"
```

> **Important avec Neon (ou tout Postgres derriere PgBouncer en mode "transaction")** :
> - `DATABASE_URL` doit pointer vers l'endpoint **pooler** avec `&pgbouncer=true` (utilise par l'app au quotidien).
> - `DIRECT_URL` doit pointer vers l'endpoint **direct** (sans `-pooler` dans le nom d'hote), utilise uniquement
>   par `prisma migrate`. Sans cela, `prisma migrate dev/deploy` peut echouer ou se comporter de facon incoherente.
> - Voir la section [Troubleshooting](#16-troubleshooting) pour un bug tres instructif rencontre pendant le
>   developpement de ce projet a ce sujet.

### `apps/api/.env`

```bash
cp apps/api/.env.example apps/api/.env
```

Contient `DATABASE_URL` (meme valeur pooler que ci-dessus), les secrets JWT, `INITIAL_KANIO_BALANCE`,
les identifiants admin (utilises par le seed, pas par l'API elle-meme), les parametres CORS/cookies, et les
parametres de `OddsService` (`ODDS_MARGIN`, `ODDS_SMOOTHING_K`, `ODDS_MAX_DELTA_RATIO`).

**Ne jamais committer de vraies valeurs.** Generez des secrets forts pour la production, par exemple :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### `apps/web/.env.local`

```bash
cp apps/web/.env.example apps/web/.env.local
```

```
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

En production, pointez vers l'URL publique de votre API deployee (ex: `https://kanio-api.onrender.com`).

## 6. Base de donnees, migrations, seed

```bash
npm run db:generate        # genere le client Prisma
npm run db:migrate:deploy  # applique les migrations (utilise DIRECT_URL si defini)
npm run db:seed            # cree l'admin, 4 comptes demo, et des evenements de demonstration
```

En developpement local avec une base neuve, vous pouvez aussi utiliser `npm run db:migrate` (mode interactif
`prisma migrate dev`, pratique pour creer de nouvelles migrations quand vous modifiez `schema.prisma`).

Le seed est **idempotent** : le relancer ne duplique rien (upsert par email/id stable).

`npm run db:studio` ouvre Prisma Studio pour inspecter les donnees visuellement.

## 7. Lancer l'application

Dans deux terminaux separes :

```bash
npm run dev:api    # API sur http://localhost:4000
npm run dev:web    # Frontend sur http://localhost:3000
```

Ouvrez [http://localhost:3000](http://localhost:3000).

## 8. Comptes de demonstration

| Role  | Email                | Mot de passe    |
|-------|-----------------------|-----------------|
| ADMIN | admin@kanio.local      | ChangeMe123! (ou la valeur de `ADMIN_PASSWORD`) |
| USER  | alice@kanio.local      | Demo1234!       |
| USER  | bob@kanio.local        | Demo1234!       |
| USER  | chloe@kanio.local      | Demo1234!       |
| USER  | daniel@kanio.local     | Demo1234!       |

**Changez le mot de passe admin en production** via `ADMIN_PASSWORD` avant le premier seed.

## 9. Tests

Les tests d'integration necessitent une base Postgres **dediee**, distincte de la base de developpement
(ils suppriment massivement des donnees entre chaque test).

```bash
cp apps/api/.env.test.example apps/api/.env.test
```

Deux options pour `DATABASE_URL` dans `.env.test` :

- **Meme base Neon, schema separe** (recommande, ce que ce projet utilise) : ajoutez `&schema=kanio_test` a
  l'URL pooler, puis appliquez les migrations sur ce schema : `DATABASE_URL="...&schema=kanio_test" npx prisma migrate deploy --schema packages/db/prisma/schema.prisma` depuis `packages/db`.
- **Base separee** (`docker compose up -d`, base `kanio_test` locale).

Par securite, les tests refusent de s'executer si `DATABASE_URL` ne contient pas la sous-chaine `"test"`.

```bash
npm test              # apps/api : Vitest (unitaire + integration)
npm run test:watch    # mode watch
```

Couverture : inscription, connexion, permissions USER/ADMIN, placement de pari, solde insuffisant, pari sur
marche ferme/suspendu, calcul et bornage des cotes dynamiques, reglement gagnant/perdant, remboursement,
idempotence du double reglement, concurrence sur les paris (deux paris simultanes ne peuvent jamais rendre un
solde negatif), credit/debit admin.

> Note : les tests s'executent contre une base Neon distante (serverless, hebergee sur Internet). De rares
> echecs isoles et non reproductibles peuvent survenir (latence/hoquet reseau) ; relancer `npm test` suffit.
> Voir [Troubleshooting](#16-troubleshooting).

## 10. API REST

Base URL locale : `http://localhost:4000`. Toutes les reponses sont en JSON ; les erreurs suivent le format
`{ "error": { "code", "message", "details?" } }`.

### Authentification (cookies httpOnly)

| Methode | Route                  | Description                          | Auth |
|---------|-------------------------|---------------------------------------|------|
| POST    | `/api/auth/register`    | Inscription (+ solde initial)         | -    |
| POST    | `/api/auth/login`       | Connexion                             | -    |
| POST    | `/api/auth/refresh`     | Renouvelle l'access token             | cookie refresh |
| POST    | `/api/auth/logout`      | Deconnexion (revoque le refresh token)| -    |
| GET     | `/api/auth/me`          | Utilisateur courant                   | USER |

### Public

| Methode | Route                          | Description                         |
|---------|----------------------------------|--------------------------------------|
| GET     | `/api/sports`                    | Liste des sports                     |
| GET     | `/api/events?sport=&status=`     | Liste des evenements (filtrable)     |
| GET     | `/api/events/:id`                | Detail d'un evenement (marches, selections, cotes) |
| GET     | `/api/leaderboard?criteria=&limit=` | Classement (`balance`\|`profit`\|`wins`\|`roi`) |

### Utilisateur connecte

| Methode | Route                     | Description                          |
|---------|-----------------------------|----------------------------------------|
| GET     | `/api/wallet`                | Solde courant                         |
| GET     | `/api/wallet/transactions`   | Historique du ledger                  |
| POST    | `/api/bets`                  | Placer un pari `{ selectionId, stake }` |
| GET     | `/api/bets?status=`          | Mes paris                             |
| GET     | `/api/bets/:id`               | Detail d'un pari                      |

### Administration (role ADMIN requis)

| Methode | Route                                         | Description |
|---------|-------------------------------------------------|--------------|
| GET     | `/api/admin/dashboard`                          | Statistiques globales |
| GET     | `/api/admin/users?search=`                      | Recherche d'utilisateurs |
| GET     | `/api/admin/users/:id`                          | Detail (transactions + paris) |
| POST    | `/api/admin/users/:id/suspend`                  | `{ reason }` |
| POST    | `/api/admin/users/:id/reactivate`               | - |
| POST    | `/api/admin/users/:id/credit`                   | `{ amount, reason }` (justification obligatoire) |
| POST    | `/api/admin/users/:id/debit`                    | `{ amount, reason }` |
| POST    | `/api/admin/events`                             | Creer un evenement |
| PUT     | `/api/admin/events/:id`                         | Modifier (date/statut) |
| POST    | `/api/admin/events/:id/open`                    | Ouvrir aux paris |
| POST    | `/api/admin/events/:id/suspend`                 | Suspendre |
| POST    | `/api/admin/events/:id/close`                   | Fermer (avant coup d'envoi) |
| POST    | `/api/admin/events/:id/settle`                  | `{ homeScore, awayScore }` - regle l'evenement (idempotent) |
| POST    | `/api/admin/events/:id/cancel`                  | `{ reason }` - annule + rembourse integralement |
| POST    | `/api/admin/events/:id/markets`                 | Ajouter un marche + selections |
| PUT     | `/api/admin/markets/:id/status`                 | `{ status }` |
| GET     | `/api/admin/meta/options`                       | Competitions/participants pour les formulaires |
| POST    | `/api/admin/meta/participants`                  | Creer une equipe |
| POST    | `/api/admin/meta/competitions`                  | Creer une competition |
| GET     | `/api/admin/audit-logs`                         | Journal d'audit |

## 11. Le portefeuille KANIO (ledger)

`WalletService` (`apps/api/src/modules/wallet/wallet.service.ts`) est le **seul** point d'entree pour modifier
un solde. Chaque appel :

1. verrouille la ligne utilisateur (`SELECT ... FOR UPDATE`) pour serialiser les mouvements concurrents ;
2. calcule `balanceAfter` a partir du type de transaction (`INITIAL_BALANCE`, `BET_PLACED`, `BET_WIN`,
   `BET_LOSS`, `BET_REFUND`, `ADMIN_CREDIT`, `ADMIN_DEBIT`, `BONUS`) ;
3. **refuse** toute operation qui rendrait le solde negatif ;
4. met a jour `User.balanceCache` **et** insere une ligne `WalletTransaction` (`balanceBefore`, `balanceAfter`,
   montant, description, reference) **dans la meme transaction Postgres**.

Le cache de solde n'est jamais modifie seul : il est reconciliable a tout moment via
`WalletService.reconcileBalance()`, qui recalcule le solde a partir du dernier mouvement du ledger.

## 12. Cotes dynamiques (OddsService)

Voir [`docs/ODDS_ALGORITHM.md`](docs/ODDS_ALGORITHM.md) pour la formule complete et un exemple chiffre.
Resume : les cotes sont recalculees a chaque pari en melangeant la repartition reelle des mises et la cote
initiale (comme "prior"), avec une marge de bookmaker configurable, des bornes min/max par selection, et une
variation maximale par recalcul. La cote utilisee pour un pari est figee dans `BetSelection.oddsTaken` et
n'est jamais modifiee retroactivement ; l'historique complet des changements est dans `OddsHistory`.

## 13. Settlement (reglement des paris)

`SettlementService.settleEvent()` : saisie du resultat -> resolution de chaque selection (via des resolveurs
par type de marche, `resultResolvers.ts`, faciles a etendre a HANDICAP/CORRECT_SCORE) -> creditation des gains
-> tout dans une seule transaction Postgres. **Idempotent** : un evenement deja regle (`settledAt` non nul)
refuse un second reglement (409).

`SettlementService.cancelEvent()` : annule l'evenement et rembourse integralement (`BET_REFUND`) tous les
paris en attente lies a ses marches.

## 14. Securite

- Mots de passe haches avec **Argon2id**.
- JWT access (15 min) + refresh (7 jours, rotation a chaque usage, revocation en base) en cookies **httpOnly**,
  `Secure` + `SameSite=None` en production (front et API sur des domaines differents).
- Validation systematique des entrees avec **Zod** cote serveur (jamais de confiance dans le frontend).
- `helmet` (en-tetes de securite), `cors` restreint a l'origine du frontend, `express-rate-limit` (global +
  strict sur login/register + sur le placement de paris).
- Controle de role strict (`requireRole("ADMIN")`) sur toutes les routes `/api/admin/*`.
- Aucun secret dans le repository (`.env*` ignores sauf les `.example`).
- Toute action administrative sensible (credit/debit, suspension, reglement, annulation) est journalisee dans
  `AuditLog` avec l'identite de l'admin, la cible et la justification.

## 15. Deploiement gratuit

### 15.1 Base de donnees - Neon

1. Creer un compte sur [neon.tech](https://neon.tech) (gratuit, sans CB).
2. Creer un projet -> recuperer la chaine de connexion **pooled** (contient `-pooler`) et l'**unpooled** (sans
   `-pooler`) dans l'onglet "Connection Details".
3. `DATABASE_URL` = URL pooled + `&pgbouncer=true`. `DIRECT_URL` = URL unpooled.

> Verifiez toujours les conditions actuelles du free tier sur le site du fournisseur avant de vous y fier :
> les offres gratuites evoluent regulierement.

### 15.2 Backend - Render (Web Service gratuit)

1. Pousser le repo sur GitHub.
2. Sur [render.com](https://render.com), "New +" -> "Web Service" -> connecter le repo.
3. **Root Directory** : `apps/api` n'est pas suffisant seul car le monorepo doit etre installe depuis la
   racine. Configurer :
   - Build Command : `npm install && npm run build:api`
   - Start Command : `npm run start -w apps/api` (ou `node apps/api/dist/index.js`)
4. Variables d'environnement (Render dashboard) : toutes celles de `apps/api/.env` (DATABASE_URL avec
   `pgbouncer=true`, secrets JWT generes pour la prod, `CORS_ORIGIN` = URL Vercel du frontend,
   `COOKIE_SECURE=true`, `NODE_ENV=production`).
5. Avant le premier deploiement utile, executer une fois (Render Shell, ou en local avec `DATABASE_URL`/
   `DIRECT_URL` de prod) : `npm run db:migrate:deploy && npm run db:seed`.

> Le tier gratuit de Render met le service en veille apres inactivite : la premiere requete apres une pause
> peut prendre quelques secondes (cold start). Normal pour une demo.

### 15.3 Frontend - Vercel

1. Sur [vercel.com](https://vercel.com), "Add New" -> "Project" -> importer le repo GitHub.
2. **Root Directory** : `apps/web`.
3. Variables d'environnement : `NEXT_PUBLIC_API_URL` = URL du service Render (ex: `https://kanio-api.onrender.com`).
4. Deployer.

### 15.4 Domaine

Vercel et Render fournissent chacun un sous-domaine gratuit (`*.vercel.app`, `*.onrender.com`), suffisant pour
une demonstration. Un domaine personnalise peut etre attache gratuitement cote DNS sur les deux plateformes si
vous en possedez deja un (l'achat d'un nom de domaine n'est jamais gratuit).

### 15.5 Verification

1. Ouvrir l'URL Vercel -> la page d'accueil KANIO doit s'afficher.
2. S'inscrire -> verifier le solde initial.
3. Se connecter en admin -> `/admin` doit etre accessible, `/admin` refuse pour un compte USER.
4. Placer un pari -> verifier le portefeuille et l'historique.
5. Regler l'evenement correspondant en admin -> verifier le credit du gain.

## 16. Troubleshooting

**`prisma migrate dev` echoue avec "environment is non-interactive"**
Utilisez `npm run db:migrate:deploy` (`prisma migrate deploy`) en CI/scripts ; `migrate dev` est reserve a un
terminal interactif pour creer de *nouvelles* migrations.

**Erreurs aleatoires "Utilisateur introuvable" / cotes qui ne bougent pas alors qu'un pari a ete place**
Ce projet a rencontre ce bug pendant son developpement avec Neon : le pooler (PgBouncer, mode "transaction")
peut recycler une connexion physique dont le `search_path` a ete laisse sur un **autre schema** par un client
precedent (par ex. la suite de tests utilisant `?schema=kanio_test`). Les requetes generees par Prisma
qualifient toujours leurs tables et ne sont pas affectees, mais les requetes `$queryRaw` non qualifiees
(utilisees par `WalletService` et `OddsService` pour les verrous `SELECT ... FOR UPDATE`) peuvent alors cibler
le mauvais schema. **Corrige** dans ce repo via `apps/api/src/lib/dbSchema.ts`, qui qualifie explicitement
toutes les requetes brutes avec le schema issu de `DATABASE_URL`. Si vous rencontrez un symptome similaire
apres avoir modifie le code, verifiez qu'aucune nouvelle requete `$queryRaw`/`$executeRaw` n'a ete ajoutee sans
passer par `dbTable(...)`.

**Un process `npm run dev` deja lance ne prend pas en compte un `.env` modifie**
`tsx watch` recharge le code source, pas les fichiers `.env` (charges une seule fois au demarrage via
`dotenv`). Redemarrez le process apres toute modification d'un fichier `.env`.

**Echecs de tests isoles et non reproductibles**
Voir la note de la section [Tests](#9-tests) : latence reseau occasionnelle vers la base Neon distante.
Relancer `npm test` resout generalement le probleme. Si un test echoue de facon **repetee et identique**,
c'est en revanche un vrai bug a investiguer.

**Argon2 ne s'installe pas / erreur de build native**
`argon2` fournit des binaires precompiles (`prebuilds/`) pour les plateformes courantes (Windows, Linux,
macOS x64/arm64) ; aucune chaine de compilation C++ n'est necessaire dans la plupart des cas. Si votre
environnement bloque l'execution de scripts `postinstall`/`preinstall` (politiques de securite type
Application Control), autorisez explicitement les scripts de `argon2`, `prisma`, `@prisma/client` et `esbuild`.

## 17. Limites connues / pistes d'evolution

- Seul le pari **simple** est exposable via l'API v1. L'architecture (`Bet` + `BetSelection[]`, cotes figees
  par selection, resolution generique par groupe de selections dans `SettlementService`) est concue pour
  ajouter les paris **combines** sans migration de schema : il suffirait d'autoriser plusieurs
  `BetSelection` par `Bet` cote API et de multiplier les cotes pour `totalOdds`.
- Les types de marche HANDICAP et CORRECT_SCORE sont deja geres par `resolveOutcome()` mais ne sont pas
  exposes dans le formulaire de creation de marche du frontend admin (seuls MATCH_WINNER et OVER_UNDER le
  sont) - l'API les accepte deja.
- `SportsDataProvider` (`apps/api/src/modules/sports/sportsDataProvider.ts`) est un point d'extension pret a
  accueillir une source de donnees sportives externe (API tierce) sans changer le reste de l'application ;
  seule une implementation de demonstration lisant la base locale est fournie.
