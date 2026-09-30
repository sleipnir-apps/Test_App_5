# Test App 5

## ⚠️ Pour avoir l'app sur mobile (EAS builds)

Tant que les étapes ci-dessous ne sont pas faites, les workflows de build mobile se terminent en *skipped* (pas en échec) — le reste (web, API, staging, prod) fonctionne sans.

1. **Crée le projet Expo** : [expo.dev](https://expo.dev) → Projects → **Create project**, copie l'**ID** affiché

   ```sh
   cd apps/mobile
   bunx eas login
   bunx eas init --id <ID_AFFICHÉ>   # ajoute extra.eas.projectId dans app.config.ts → committe-le
   ```

2. **Crée un access token** : expo.dev → Account Settings → **Access Tokens** → Create

3. **Range-le dans Infisical** (projet `apps`, env `prod`) : `TEST_APP_5_EXPO_TOKEN`

Ensuite, les builds APK Android sont automatiques :

| Événement | Profil EAS | App produite |
|---|---|---|
| PR vers develop (label `mobile`) | `pr` | `Test App 5 pr-N`, API de la PR — installable à côté des autres |
| push sur `develop` | `preview` | `Test App 5 staging`, API staging |
| push sur `main` | `production-apk` | `Test App 5`, API prod |

Les variantes coexistent sur le même téléphone (packages Android différents : `.prN`, `.staging`, standard).

## 📡 Uptime Kuma (monitoring + keep-alive Atlas)

Après le premier déploiement, ajoute 4 sondes HTTP dans Uptime Kuma — elles surveillent **et** gardent les bases Atlas actives (le `/health` ping la base à chaque requête) :

| Nom | URL |
|---|---|
| `Test App 5 - prod API` | `https://test-app-5-api.sleipnir.ovh/health` |
| `Test App 5 - prod front` | `https://test-app-5.sleipnir.ovh` |
| `Test App 5 - staging API` | `https://staging.api.test-app-5.staging.sleipnir.ovh/health` |
| `Test App 5 - staging front` | `https://staging.test-app-5.staging.sleipnir.ovh` |

> Les previews `pr-N` ne valent pas la peine d'être sondées : elles vivent le temps de la PR.
