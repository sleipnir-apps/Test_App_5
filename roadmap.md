### Roadmap — template technique réutilisable

#### 0. Principe directeur

Construire un **monorepo de démarrage**, pas un framework interne surchargé.

Le template doit fournir :

- une architecture stable ;
- des conventions explicites ;
- des primitives transversales ;
- des scripts reproductibles ;
- une application exemple minimale ;
- peu de dépendances imposées.

Les règles métier, les rôles spécifiques, les paiements, les notifications ou le stockage de fichiers doivent être des **modules activables**, pas des obligations du socle.

### 1. Définir le périmètre et les conventions

Décider avant de coder :

- TypeScript partout.
- Monorepo Bun workspaces.
- Backend Fastify avec MongoDB.
- Frontend Expo / React Native.
- Un package partagé pour les contrats API et types communs.
- Validation runtime identique côté backend et frontend.
- REST documenté en OpenAPI, sauf raison solide de choisir tRPC.
- Configuration exclusivement par variables d’environnement validées au démarrage.
- Scripts de migration MongoDB versionnés et exécutables de façon idempotente.

Structure cible :

```text
template/
├── apps/
│   ├── api/                    # Bun + Fastify
│   └── mobile/                 # Expo
├── packages/
│   ├── contracts/              # schémas, DTO, types API partagés
│   ├── config/                 # ESLint, TypeScript, formatage partagés
│   └── utils/                  # utilitaires réellement génériques
├── infra/
│   ├── docker/
│   └── mongo/
├── docs/
├── scripts/
├── package.json
├── bun.lock
├── docker-compose.yml
└── README.md
```

Éviter de partager les modèles MongoDB bruts avec le frontend. Partager les **contrats de transport** : requêtes, réponses, erreurs, schémas de validation.

### 2. Mettre en place le socle du monorepo

Objectif : qu’un nouveau projet démarre en une commande après configuration des variables.

Créer :

- `package.json` racine avec workspaces.
- `tsconfig` de base partagé.
- ESLint et Prettier.
- Git hooks facultatifs via lefthook ou husky.
- `.editorconfig`.
- `.env.example` à la racine et dans chaque application.
- Docker Compose pour MongoDB local.
- scripts racine standardisés.

Scripts attendus :

```json
{
  "scripts": {
    "dev": "concurrently \"bun run --filter api dev\" \"bun run --filter mobile start\"",
    "dev:api": "bun run --filter api dev",
    "dev:mobile": "bun run --filter mobile start",
    "lint": "bun run --workspaces lint",
    "typecheck": "bun run --workspaces typecheck",
    "test": "bun run --workspaces test",
    "build": "bun run --workspaces build",
    "db:up": "docker compose up -d mongodb",
    "db:down": "docker compose down",
    "db:migrate": "bun run --filter api db:migrate",
    "db:migrate:status": "bun run --filter api db:migrate:status",
    "db:seed": "bun run --filter api db:seed"
  }
}
```

Ne pas introduire `concurrently` sans nécessité : Bun peut exécuter plusieurs scripts, mais une solution simple et documentée est préférable.

### 3. Construire le backend Fastify

#### Architecture interne

```text
apps/api/src/
├── app.ts                       # assemblage Fastify
├── server.ts                    # démarrage HTTP
├── config/
│   └── env.ts                   # validation des variables
├── plugins/
│   ├── cors.ts
│   ├── mongodb.ts
│   ├── auth.ts
│   ├── rate-limit.ts
│   ├── swagger.ts
│   └── error-handler.ts
├── modules/
│   ├── health/
│   ├── auth/
│   └── users/
├── lib/
│   ├── errors/
│   ├── logger/
│   └── pagination/
├── migrations/
├── seeds/
└── tests/
```

#### Primitives backend à fournir

- Fastify configuré.
- Logger structuré.
- Route `GET /health`.
- Gestion centralisée des erreurs.
- Réponses d’erreur cohérentes.
- Validation des variables d’environnement au démarrage.
- Connexion MongoDB ouverte et fermée proprement.
- CORS configurable.
- Rate limiting configurable.
- Swagger / OpenAPI disponible hors production ou protégé.
- Gestion de pagination.
- Gestion de filtre et tri réutilisable.
- Validation des payloads.
- Authentification prête à activer.
- Middleware d’identification de la requête (`requestId`).

Format d’erreur cible :

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Données invalides.",
    "details": []
  },
  "requestId": "..."
}
```

#### CORS

Ne jamais fixer une origine de développement dans le code.

Variables :

```text
CORS_ORIGINS=http://localhost:8081,http://localhost:19006
CORS_CREDENTIALS=true
```

Prévoir trois modes :

- développement : origines locales explicites ;
- préproduction : domaines de test explicites ;
- production : domaines applicatifs explicites.

Éviter `origin: true` en production.

### 4. Ajouter un système de migrations MongoDB

MongoDB ne fournit pas le même mécanisme de migrations relationnelles que PostgreSQL. Le template doit imposer un système clair.

Structure :

```text
apps/api/src/migrations/
├── 001-create-users-collection.ts
├── 002-add-users-email-index.ts
├── 003-backfill-users-display-name.ts
└── migration-runner.ts
```

Chaque migration doit avoir :

- un identifiant séquentiel unique ;
- une description lisible ;
- une fonction `up` ;
- idéalement une fonction `down`, si le changement est réversible ;
- une exécution transactionnelle si le déploiement MongoDB le permet ;
- un enregistrement dans une collection `_migrations`.

Exemple de contrat conceptuel :

```ts
export interface Migration {
  id: string;
  description: string;
  up: (db: Db) => Promise<void>;
  down?: (db: Db) => Promise<void>;
}
```

Règles :

- Ne jamais modifier une migration déjà appliquée.
- Toute modification de schéma ajoute une migration.
- Les index sont créés via migrations.
- Les transformations de données importantes sont séparées des changements de structure.
- Les migrations doivent être exécutables en CI et au déploiement.
- Ajouter `db:migrate:status`.
- Ajouter `db:migrate:create <nom>` pour générer un squelette.

Prévoir aussi :

```text
apps/api/src/seeds/
├── development.ts
└── test.ts
```

Les seeds ne sont jamais exécutés automatiquement en production.

### 5. Créer les contrats API partagés

Dans `packages/contracts` :

```text
packages/contracts/src/
├── auth/
│   ├── login.ts
│   └── register.ts
├── users/
│   ├── user.dto.ts
│   └── user.schema.ts
├── common/
│   ├── pagination.ts
│   └── api-error.ts
└── index.ts
```

Utiliser une bibliothèque de validation qui infère les types TypeScript, par exemple Zod.

Le backend valide les entrées à l’exécution. Le frontend réutilise les mêmes schémas pour les formulaires et le typage des appels API.

Séparer :

- `UserDocument` : représentation MongoDB interne ;
- `UserEntity` : représentation métier backend ;
- `UserDto` : réponse API exposée au frontend.

Ne jamais retourner directement un document MongoDB.

### 6. Construire le frontend Expo

#### Architecture recommandée

```text
apps/mobile/
├── app/                         # Expo Router
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── (auth)/
│   └── (app)/
├── src/
│   ├── api/
│   │   ├── client.ts
│   │   └── endpoints/
│   ├── components/
│   ├── features/
│   │   ├── auth/
│   │   └── profile/
│   ├── hooks/
│   ├── store/
│   ├── theme/
│   ├── config/
│   └── lib/
├── assets/
└── app.config.ts
```

#### Fondations frontend

- Expo Router pour la navigation.
- Client HTTP unique.
- URL API configurée par environnement.
- Timeout réseau.
- Gestion cohérente des erreurs API.
- Stockage sécurisé du jeton d’authentification.
- React Query / TanStack Query pour cache, mutations et synchronisation serveur.
- Bibliothèque de formulaires.
- Validation avec les contrats partagés.
- Écran de chargement.
- Écran d’erreur.
- État offline minimal ou message explicite.
- Thème centralisé.
- Composants de base : bouton, champ, écran, loader, message d’erreur, état vide.

Ne pas placer la logique métier dans les écrans Expo Router. Les routes doivent assembler des composants et features.

### 7. Authentification comme module de référence

L’authentification est le meilleur premier module d’exemple, car elle valide le lien complet entre les couches.

Fonctionnalités minimales :

- inscription ;
- connexion ;
- rafraîchissement de session ;
- déconnexion ;
- récupération de l’utilisateur courant ;
- routes backend protégées ;
- stockage sécurisé du jeton ;
- garde de navigation côté Expo ;
- écran profil ;
- gestion des sessions expirées.

Ne pas figer trop tôt un fournisseur social ou un système complexe de rôles. Construire une abstraction légère :

```text
AuthProvider
├── local email/password
└── futurs providers optionnels
```

### 8. Créer un module CRUD d’exemple

Ajouter un module générique, par exemple `items`, servant d’exemple réel de production :

- création ;
- liste paginée ;
- détail ;
- mise à jour ;
- suppression ;
- ownership par utilisateur ;
- index MongoDB ;
- filtres ;
- tests ;
- écrans Expo correspondants.

Ce module démontre la convention complète :

```text
backend route
→ service
→ repository MongoDB
→ contrat DTO
→ client API Expo
→ hook React Query
→ écran et composants
```

### 9. Mettre en place les tests

#### Backend

- Tests unitaires des services.
- Tests d’intégration Fastify.
- Base MongoDB de test isolée.
- Tests de migrations.
- Tests d’authentification et d’autorisation.
- Tests de schémas / contrats.

#### Frontend

- Tests des utilitaires.
- Tests des composants fondamentaux.
- Tests des hooks API.
- Tests de flux critique : connexion, déconnexion, chargement de profil.
- Tests E2E ultérieurs seulement si le template est stable.

L’objectif initial n’est pas une couverture maximale. Tester les conventions risquées : auth, migration, sérialisation, erreurs API, gestion du token.

### 10. Ajouter CI et contrôle de qualité

Pipeline minimal à chaque pull request :

```text
installation Bun
→ lint
→ typecheck
→ tests
→ build backend
→ vérification Expo
→ test des migrations sur MongoDB vierge
```

Ajouter des contrôles :

- pas de secrets dans Git ;
- validation des fichiers `.env.example` ;
- audit des dépendances ;
- vérification du lockfile ;
- vérification que les migrations sont ordonnées et uniques.

### 11. Documenter le template

Le `README` doit permettre à quelqu’un d’utiliser le dépôt sans connaître ses choix internes.

Sections nécessaires :

1. Objectif du template.
2. Stack.
3. Prérequis.
4. Installation.
5. Lancement local.
6. Configuration `.env`.
7. Scripts disponibles.
8. Migrations MongoDB.
9. Seeds.
10. Architecture du monorepo.
11. Ajouter un module backend.
12. Ajouter un écran Expo.
13. Ajouter un contrat partagé.
14. Déploiement.
15. Règles de contribution.

Créer aussi une checklist de création de projet :

```text
[ ] Renommer le projet et les applications Expo
[ ] Changer les identifiants de bundle
[ ] Créer les variables d’environnement
[ ] Démarrer MongoDB
[ ] Exécuter les migrations
[ ] Exécuter les seeds de développement
[ ] Configurer les origines CORS
[ ] Configurer le domaine de l’API
[ ] Remplacer le module exemple
```
