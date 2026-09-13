# SUP Herman — Plateforme de gestion des congés et absences

Application fullstack permettant de centraliser les demandes de congés, d'automatiser leur circuit de validation (Employé → Manager / RH) et d'offrir une vision claire des absences de l'entreprise.

**Dépôt Git** : [https://github.com/Z0ro7/2FINT](https://github.com/Z0ro7/2FINT)

- **Backend** : Node.js / Express / SQLite (module natif `node:sqlite`)
- **Frontend** : React (Vite) / React Router
- **Authentification** : JWT, mots de passe hashés (bcrypt)

---

## Sommaire

1. [Installation](#1-installation)
2. [Configuration des variables d'environnement](#2-configuration-des-variables-denvironnement)
3. [Configuration de la base de données](#3-configuration-de-la-base-de-données)
4. [Lancer l'application](#4-lancer-lapplication)
5. [Comptes de démonstration](#5-comptes-de-démonstration)
6. [Documentation de l'API](#6-documentation-de-lapi)
7. [Manuel utilisateur](#7-manuel-utilisateur)
8. [Documentation technique](#8-documentation-technique)

---

## 1. Installation

### Prérequis
- Node.js ≥ 22.13 (le projet utilise le module SQLite natif de Node, `node:sqlite`, disponible sans installation supplémentaire à partir de cette version)
- npm ≥ 9

### Étapes

```bash
# 1. Cloner le dépôt
git clone https://github.com/Z0ro7/2FINT.git
cd 2FINT

# 2. Installer le backend
cd backend
npm install

# 3. Installer le frontend
cd ../frontend
npm install
```

---

## 2. Configuration des variables d'environnement

Le backend embarque directement un fichier `backend/.env` prêt à l'emploi (aucune étape de copie nécessaire) :

| Variable | Description | Valeur par défaut |
|---|---|---|
| `PORT` | Port d'écoute de l'API | `4000` |
| `CLIENT_URL` | Origine autorisée pour le CORS (URL du frontend) | `http://localhost:5173` |
| `JWT_SECRET` | Clé secrète de signature des tokens JWT — **à changer impérativement en production** | — |
| `JWT_EXPIRES_IN` | Durée de validité des tokens | `8h` |
| `DATABASE_PATH` | Chemin du fichier SQLite | `./data/database.sqlite` |
| `DEFAULT_LEAVE_BALANCE` | Solde de congés initial attribué à un nouvel utilisateur | `25` |

Le frontend n'a pas de variables d'environnement à configurer en développement : Vite proxie automatiquement `/api` et `/uploads` vers `http://localhost:4000` (voir `frontend/vite.config.js`). Pour un déploiement en production où le frontend et le backend ne partagent pas la même origine, adaptez le proxy ou servez le frontend buildé directement par le backend.

---

## 3. Configuration de la base de données

Le projet utilise **SQLite** via le module natif de Node.js, `node:sqlite` : aucun serveur de base de données à installer, aucune dépendance native à compiler (donc aucun outil de compilation type Visual Studio Build Tools requis, y compris sous Windows). Le fichier de base de données est créé automatiquement (schéma + index) au premier démarrage du backend, à l'emplacement défini par `DATABASE_PATH`.

Pour peupler la base avec un compte Ressources Humaines et des comptes de démonstration :

```bash
cd backend
npm run seed
```

Ce script est idempotent : le relancer n'écrase pas les comptes déjà existants.

> `node:sqlite` est un module encore marqué "expérimental" par Node.js (un message d'avertissement inoffensif s'affiche au démarrage), mais il est stable pour l'usage de ce projet et évite tout problème d'installation lié à la compilation de modules natifs. Le choix de SQLite simplifie par ailleurs l'installation pour ce contexte (entreprise de moins de 50 employés) ; pour une migration vers PostgreSQL/MySQL, seule la couche `src/db.js` et les requêtes SQL (compatibles à ~90 % avec la syntaxe standard) seraient à adapter.

---

## 4. Lancer l'application

### Backend

```bash
cd backend
npm run seed     # une seule fois, pour créer les comptes de démonstration
npm run dev       # démarrage avec rechargement automatique (nodemon)
# ou
npm start          # démarrage standard
```

L'API démarre sur `http://localhost:4000`. Vérification rapide : `GET http://localhost:4000/api/health`.

### Frontend

```bash
cd frontend
npm run dev
```

L'application est accessible sur `http://localhost:5173`.

### Build de production (frontend)

```bash
cd frontend
npm run build      # génère le dossier dist/
npm run preview     # prévisualise le build de production
```

---

## 5. Comptes de démonstration

Créés par `npm run seed` :

| Rôle | Email | Mot de passe |
|---|---|---|
| Ressources Humaines | `rh@supherman.com` | `Suph3rm4n!` |
| Manager | `manager@supherman.com` | `Manager123!` |
| Employé | `employe@supherman.com` | `Employe123!` |
| Employé | `employe2@supherman.com` | `Employe123!` |

> Le compte Ressources Humaines (`rh@supherman.com` / `Suph3rm4n!`) est celui requis pour l'évaluation du projet.

> En conditions réelles, seuls les RH peuvent créer des comptes (voir page *Gestion des utilisateurs*). Un mot de passe temporaire est alors généré et affiché aux RH (journalisé aussi côté serveur), à charge pour elles de le communiquer à l'utilisateur, qui devra le changer à sa première connexion.

---

## 6. Documentation de l'API

Toutes les routes (sauf `/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/reset-password` et `/api/health`) nécessitent un header :

```
Authorization: Bearer <token>
```

### Authentification — `/api/auth`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/login` | Public | `{ email, password }` → `{ token, user }` |
| POST | `/set-password` | Authentifié | `{ currentPassword?, newPassword }` — `currentPassword` requis sauf lors de la 1ère connexion |
| POST | `/forgot-password` | Public | `{ email }` → génère un jeton de réinitialisation (journalisé serveur en l'absence de service d'emailing) |
| POST | `/reset-password` | Public | `{ token, newPassword }` |
| GET | `/me` | Authentifié | Retourne l'utilisateur courant |
| GET | `/login-history` | Authentifié | Retourne les 10 dernières connexions de l'utilisateur (date, adresse IP) |

### Utilisateurs — `/api/users` (Ressources Humaines uniquement)

| Méthode | Route | Description |
|---|---|---|
| GET | `/` | Liste de tous les utilisateurs |
| GET | `/managers` | Liste simplifiée des managers actifs |
| POST | `/` | Crée un utilisateur — `{ email, first_name, last_name, role, manager_id?, leave_balance? }`. Retourne un mot de passe temporaire |
| PUT | `/:id` | Modifie un utilisateur (nom, rôle, manager, solde) |
| PATCH | `/:id/status` | `{ active: boolean }` — active/désactive un compte |
| PATCH | `/:id/reset-password` | Génère un nouveau mot de passe temporaire |

### Congés — `/api/leaves`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/mine` | Authentifié | Mes demandes |
| GET | `/:id` | Propriétaire / son manager / RH | Détail d'une demande |
| POST | `/` | Authentifié | Crée une demande — `multipart/form-data` : `type, start_date, end_date, comment?, justificatif?` |
| DELETE | `/:id` | Propriétaire | Annule une demande **En attente** |
| GET | `/` | Manager / RH | Liste filtrable — query : `employee, status, type, start, end, search, page, pageSize, sort, order`. `search` recherche sur le nom/email de l'employé. `sort` accepte `created_at, start_date, end_date, status, type, days_count, last_name` |
| PATCH | `/:id/status` | Manager (son équipe) / RH (tous) | `{ status, manager_comment? }` — commentaire obligatoire si `status = "Refusée"` |
| GET | `/calendar/all` | Authentifié | Congés validés — query : `month=YYYY-MM`, `team=mine` (managers) |

**Types de congés** : `CP`, `RTT`, `Sans Solde`, `Maladie`, `Formation`, `Autre`
**Statuts** : `En attente`, `Validée`, `Refusée`, `Annulée`

Règles métier appliquées côté serveur : date de fin ≥ date de début, calcul automatique des jours ouvrés (hors week-ends), détection des chevauchements de périodes, déduction du solde de congés à la validation (types `CP`/`RTT`).

### Tableau de bord — `/api/dashboard`

| Méthode | Route | Description |
|---|---|---|
| GET | `/` | Statistiques adaptées au rôle (solde, demandes en attente, historique, congés à venir, + indicateurs équipe/entreprise pour Manager/RH) |

### Codes d'erreur

Toutes les erreurs renvoient `{ "message": "..." }` avec un code HTTP approprié (`400` validation, `401` non authentifié, `403` accès refusé, `404` introuvable, `409` conflit, `500` erreur serveur).

---

## 7. Manuel utilisateur

### Connexion
Les comptes sont créés exclusivement par les Ressources Humaines. À la création, un mot de passe temporaire est généré ; il doit être changé lors de la première connexion. En cas d'oubli, un lien de réinitialisation est disponible depuis l'écran de connexion.

### Employé
- **Tableau de bord** : solde de congés, demandes en attente, historique récent, et un mini-calendrier du mois en cours mettant en évidence les prochains congés validés.
- **Mes demandes** : liste de toutes mes demandes, filtrable par statut et triable en cliquant sur les en-têtes de colonnes ; un clic sur une ligne ouvre le détail (avec commentaire du manager le cas échéant). Une demande *En attente* peut être annulée.
- **Nouvelle demande** : choix du type, sélection des dates (le nombre de jours ouvrés est calculé automatiquement), commentaire facultatif, ajout d'un justificatif (PDF/JPG/PNG, 5 Mo max).
- **Calendrier global** : vue mensuelle des congés validés de l'ensemble de l'entreprise.
- **Mon profil** : informations personnelles, solde de congés, changement de mot de passe, historique des 10 dernières connexions.

### Manager
Dispose de toutes les fonctionnalités Employé, ainsi que :
- **Gestion des demandes** : liste des demandes de son équipe uniquement. Filtrable par statut, type et période (dates de début/fin), avec une recherche par nom d'employé et un tri par colonne cliquable. Peut **valider** ou **refuser** (commentaire obligatoire) une demande en attente.
- **Calendrier global** : peut filtrer sur son équipe uniquement.

### Ressources Humaines
Dispose de toutes les fonctionnalités précédentes, sans restriction d'équipe, ainsi que :
- **Gestion des demandes** : voit et peut modifier le statut de toutes les demandes de l'entreprise (y compris corriger une erreur après validation/refus), avec les mêmes filtres, recherche et tri, plus un filtre par employé.
- **Gestion des utilisateurs** : création de comptes, modification des informations, attribution du rôle et du manager responsable, activation/désactivation, réinitialisation de mot de passe. Recherche par nom/email et tri par colonne cliquable.

---

## 8. Documentation technique

### Architecture générale

```
leave-management/
├── backend/               API REST (Node.js / Express)
│   ├── src/
│   │   ├── server.js       point d'entrée, middlewares globaux
│   │   ├── db.js            connexion SQLite + schéma
│   │   ├── seed.js          données de démonstration
│   │   ├── middleware/
│   │   │   └── auth.js       authentification JWT + contrôle des rôles
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── leaves.js
│   │   │   └── dashboard.js
│   │   └── utils/
│   │       └── dates.js      calcul des jours ouvrés
│   └── uploads/             fichiers justificatifs
│
└── frontend/               Application React (Vite)
    └── src/
        ├── api.js            client Axios (intercepteurs JWT)
        ├── App.jsx           routage
        ├── context/          AuthContext, ToastContext
        ├── components/       Layout, Modal, StatusBadge, ProtectedRoute...
        ├── pages/            une page par écran du cahier des charges
        ├── utils/            formatage des dates
        └── styles/theme.css  design system (vert sapin)
```

Le frontend et le backend sont deux applications indépendantes communiquant exclusivement via l'API REST (`/api/*`), ce qui permet de les déployer, faire évoluer et tester séparément.

### Modèle de données

**users** : `id, email (unique), password_hash, first_name, last_name, role (employee|manager|rh), manager_id (FK), active, must_change_password, leave_balance, reset_token, reset_token_expires, created_at`

**leave_requests** : `id, user_id (FK), type, start_date, end_date, days_count, comment, justificatif_path, status, manager_comment, reviewed_by (FK), created_at, updated_at`

**login_history** : `id, user_id (FK), logged_at, ip_address`

### Sécurité

- Mots de passe hashés avec **bcrypt** (jamais stockés ni transmis en clair au-delà de la requête initiale).
- Authentification par **JWT** signé, expiration configurable, vérifié à chaque requête protégée.
- **Contrôle d'accès par rôle** appliqué systématiquement côté serveur (middleware `authorize`), jamais uniquement côté client — l'UI masque des actions, mais l'API revalide toujours les permissions.
- **Portée des données par manager** : un manager ne peut consulter/valider que les demandes des employés dont il est explicitement le `manager_id`.
- Limitation du débit (**rate limiting**) sur la route de connexion pour limiter les attaques par force brute.
- Validation des entrées côté serveur avec `express-validator` sur toutes les routes de mutation, en complément de la validation côté frontend (jamais l'inverse).
- **Helmet** pour les en-têtes de sécurité HTTP, CORS restreint à l'origine du frontend.
- Upload de fichiers limité en taille (5 Mo) et en type (PDF/JPG/PNG) via `multer`.
- Anti-énumération sur `forgot-password` : réponse identique que le compte existe ou non.

### Choix techniques

- **SQLite (`node:sqlite`, module natif de Node.js)** plutôt qu'un SGBD client-serveur : adapté à une entreprise de moins de 50 employés, zéro configuration, **zéro dépendance native à compiler** (contrairement aux bibliothèques SQLite tierces comme `better-sqlite3`, qui nécessitent un compilateur C++ et causent fréquemment des erreurs d'installation sous Windows), API synchrone simple à raisonner. Migration possible vers PostgreSQL en isolant les accès dans `db.js`.
- **JWT stateless** plutôt que des sessions serveur : pas de stockage de session à gérer, scalable horizontalement.
- **React + Vite** : démarrage rapide, HMR, build de production optimisé.
- Le calcul des **jours ouvrés** exclut les week-ends ; les jours fériés ne sont pas déduits automatiquement dans cette version (piste d'évolution : table `holidays` + déduction dans `utils/dates.js`).

### Pistes d'évolution
- Envoi réel d'emails (notifications de validation/refus, réinitialisation de mot de passe) via un service SMTP.
- Gestion des jours fériés dans le calcul des jours ouvrés.
- Export des données (PDF/Excel) des demandes et du calendrier.
- Historique des connexions exploité dans la page Profil (la table `login_history` est déjà alimentée).
- Migration vers un SGBD client-serveur pour un passage à l'échelle au-delà de 50 employés.
