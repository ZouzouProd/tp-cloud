# Observabilité — Partie 1 (OTel + Tempo + Prometheus + Grafana)

Ce document récapitule **étape par étape** ce qui a été mis en place dans le TP, ainsi que les **problèmes rencontrés** et leurs **correctifs**.

## 1) Instrumentation OpenTelemetry (Node.js)

### 1.1. Objectif
- Générer des **traces distribuées** (HTTP/Express + PostgreSQL + HTTP client).
- Exporter les **traces** (et métriques OTLP si activées) vers un **OTel Collector** via **OTLP HTTP**.
- Ajouter les **ressources** (service.name…) pour distinguer les services dans Tempo.
- Garantir un **shutdown propre** pour ne pas perdre les spans en attente.

### 1.2. Fichiers créés / remplacés
Chaque service backend a un `src/tracing.js` initialisé via le SDK Node.

- `api-gateway/src/tracing.js`
- `user-service/src/tracing.js`
- `task-service/src/tracing.js`
- `notification-service/src/tracing.js`

Et chaque service appelle le tracing **avant** de charger Express / routes :
- `require("./tracing");` est tout en haut de `src/index.js`

### 1.3. Points clés de l’implémentation
- **NodeSDK** (`@opentelemetry/sdk-node`)
- **Resource** avec les attributs sémantiques :
  - `service.name` (ex: `api-gateway`, `user-service`…)
  - `service.version` (défaut `1.0.0`)
  - `deployment.environment` (si `NODE_ENV` ou `OTEL_DEPLOYMENT_ENVIRONMENT`)
- **Exporters OTLP HTTP** :
  - traces → `OTLPTraceExporter`
  - metrics → `OTLPMetricExporter` + `PeriodicExportingMetricReader`
- **Auto-instrumentations** :
  - HTTP, Express, PG
- **Shutdown** :
  - écoute `SIGTERM` / `SIGINT`
  - appelle `sdk.shutdown()` pour flush avant sortie

### 1.4. Variables d’environnement utiles
- `OTEL_EXPORTER_OTLP_ENDPOINT` (ex: `http://otel-collector:4318`)
- ou `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` / `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`
- `OTEL_SERVICE_NAME`, `OTEL_SERVICE_VERSION`
- `OTEL_DEPLOYMENT_ENVIRONMENT`

> Note : dans notre code, si `OTEL_EXPORTER_OTLP_ENDPOINT` finit par `/`, on le normalise, puis on utilise `/v1/traces` et `/v1/metrics`.

## 2) Configuration de l’OTel Collector

### 2.1. Objectif
Recevoir les données en **OTLP (gRPC + HTTP)**, les **batcher**, puis :
- envoyer les **traces** vers **Tempo** en **OTLP gRPC (4317)** (plus performant),
- exporter en **console** pour debug,
- exposer les **metrics** pour que Prometheus puisse les **scraper**.

### 2.2. Fichier modifié
- `infra/otel/config.yml`

### 2.3. Contenu (résumé)
- **receiver** `otlp` :
  - gRPC `0.0.0.0:4317`
  - HTTP `0.0.0.0:4318`
- **processor** : `batch`
- **exporters** :
  - `otlp/tempo` → `tempo:4317` (TLS insecure en réseau docker)
  - `debug` (console)
  - `prometheus` → `0.0.0.0:8889` (expose les métriques reçues en OTLP)
- **service.telemetry.metrics.address** : `0.0.0.0:8888` (métriques internes du collector)
- **pipelines** :
  - `traces`: `otlp` → `batch` → `otlp/tempo` + `debug`
  - `metrics`: `otlp` → `batch` → `prometheus` + `debug`

## 3) Configuration Tempo

### 3.1. Objectif
- Exposer l’API/UI Tempo sur **3200** (utilisé par Grafana).
- Recevoir les traces via **OTLP gRPC 4317**.
- Stocker **en local** avec **WAL** (Write-Ahead Log).

### 3.2. Fichier modifié
- `infra/tempo/tempo.yml`

### 3.3. Contenu (résumé)
- `server.http_listen_port: 3200`
- receiver `otlp.grpc.endpoint: 0.0.0.0:4317`
- stockage local :
  - `storage.trace.backend: local`
  - `storage.trace.local.path: /tmp/tempo/traces`
- WAL :
  - `storage.trace.wal.path: /tmp/tempo/wal`

## 4) Configuration Prometheus

### 4.1. Objectif
- Ajouter la config `global`.
- Scraper les métriques de chaque service (endpoints `/metrics`).
- Scraper les métriques internes du collector (port **8888**).

### 4.2. Fichier modifié
- `infra/prometheus/prometheus.yml`

### 4.3. Contenu (résumé)
- `global.scrape_interval: 15s`
- `global.evaluation_interval: 15s`
- `scrape_configs` :
  - `api-gateway:3000`
  - `user-service:3001`
  - `task-service:3002`
  - `notification-service:3003`
  - `otel-collector:8888` (métriques internes du collector)

## 5) Configuration Grafana (provisioning)

### 5.1. Objectif
Configurer automatiquement :
- les **datasources** (Prometheus + Tempo),
- le **chargement automatique des dashboards**.

### 5.2. Fichiers créés
- `infra/grafana/provisioning/datasources/datasources.yml`
  - Prometheus → `http://prometheus:9090` (default)
  - Tempo → `http://tempo:3200`

- `infra/grafana/provisioning/dashboard/dashboard.yml`
  - provider de dashboards depuis `path: /etc/grafana/dashboards`

> Note : un fichier `infra/grafana/provisioning/dashboards/dashboard.yml` existe aussi (même contenu). Grafana utilise le dossier `/etc/grafana/provisioning/`; le chemin “officiel” est généralement `provisioning/dashboards/…`, mais le TP demandait explicitement `provisioning/dashboard/dashboard.yml`.

### 5.3. Dossier dashboards
- `infra/grafana/dashboards/` (avec `.gitkeep`)
- Les JSON exportés depuis l’UI Grafana doivent être déposés ici pour être auto-chargés.

## 6) Docker Compose Infra

### 6.1. Objectif
Créer `docker-compose.infra.yml` avec :
- `otel-collector`
- `tempo`
- `prometheus`
- `grafana`
… et des volumes pour persister Prometheus + Grafana.

### 6.2. Fichier créé / complété
- `docker-compose.infra.yml`

### 6.3. Ports exposés (résumé)
- Tempo : `3200:3200`
- OTel Collector : `4317:4317`, `4318:4318`, `8888:8888`
- Prometheus : `9090:9090`
- Grafana : `3100:3000`

### 6.4. Volumes (persistance)
- `prometheus_data:/prometheus`
- `grafana_data:/var/lib/grafana`

### 6.5. Dépendances
Un `depends_on` est défini pour limiter les erreurs au démarrage :
- collector dépend de tempo
- prometheus dépend du collector
- grafana dépend de prometheus + tempo

> Note : `depends_on` garantit l’ordre, pas la “health”. Pour du “zéro erreur au démarrage”, il faudrait ajouter des `healthcheck` + `condition: service_healthy`.

## 7) Problèmes rencontrés et solutions

### 7.1. `TypeError: Cannot read properties of undefined (reading 'catch')` dans `tracing.js`
**Symptôme** : crash au démarrage sur :
`sdk.start().catch(...)`

**Cause** : selon les versions, `sdk.start()` ne renvoie pas toujours une Promise.

**Fix** : encapsuler avec :
`Promise.resolve(sdk.start()).catch(...)`

### 7.2. `Cannot find module 'prom-client'`
**Symptôme** : crash des services sur `require("prom-client")` dans `src/metrics.js`.

**Cause** : `prom-client` n’était pas listé dans les `dependencies`.

**Fix** :
- ajout de `prom-client` dans :
  - `api-gateway/package.json`
  - `user-service/package.json`
  - `task-service/package.json`
  - `notification-service/package.json`

### 7.3. `npm ci` échoue dans Docker (`package-lock.json` pas synchronisé)
**Symptôme** : build Docker fail sur `npm ci --omit=dev` avec erreurs “lock file not in sync”.

**Cause** : repo en **npm workspaces** + lockfile racine, et les `package-lock.json` “locaux” n’étaient pas à jour pour le build de chaque service.

**Fix appliqué** :
- mise à jour des lockfiles **par service** :
  - `npm install --package-lock-only --workspaces=false` dans chaque service

### 7.4. Panic `docker compose up --build` (trace OpenTelemetry côté CLI)
**Symptôme** : `docker compose up -d --build` panique avec un stacktrace Go OpenTelemetry.

**Cause** : bug côté binaire `docker compose` (instrumentation interne), pas lié au code du TP.

**Workaround** :
- éviter `docker compose --build` et utiliser :
  - `docker build ...` (legacy builder) pour les images
  - puis `docker compose up -d` pour relancer les conteneurs

### 7.5. `notification-service` spam `ECONNREFUSED 127.0.0.1:6379`
**Symptôme** : erreurs Redis en boucle.

**Cause** : dans Docker, `localhost` pointe vers le **conteneur lui-même**, pas vers le service `redis`.

**Fix** :
- `notification-service/src/subscriber.js`: défaut `REDIS_URL` → `redis://redis:6379`
- `task-service/src/publisher.js`: défaut `REDIS_URL` → `redis://redis:6379`

## 8) Comment lancer

### 8.1. Infra (collector + tempo + prometheus + grafana)
Depuis la racine :
- `docker compose -f docker-compose.infra.yml up -d`

### 8.2. App
- `docker compose up -d`

> Si tu dois rebuild, préfère : `docker build ...` puis `docker compose up -d` (cf. bug `docker compose --build`).

