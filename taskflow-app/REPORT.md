# REPORT — TaskFlow (Observabilité)

Ce document est le **rapport d’analyse** demandé par la grille d’évaluation : réponses théoriques + observations + preuves (commandes, requêtes Grafana) + démarche d’investigation.

> Les captures d’écran Grafana sont à ajouter dans ce fichier (ou un sous-dossier) au moment du rendu final.

## 1) Ce qui est en place (résumé)

- **Traces**: OpenTelemetry SDK dans chaque service Node.js → **OTel Collector** → **Tempo** → Grafana
- **Métriques**: `/metrics` exposé par chaque service → **Prometheus** → Grafana
- **Logs**: logs JSON (Pino) sur stdout Docker → **Promtail** → **Loki** → Grafana
- **Dashboards**: versionnés dans `infra/grafana/dashboards/` et provisionnés automatiquement

Schéma d’ensemble et explication détaillée: voir `OBSERVABILITY_STACK.md`.

## 2) Réponses théoriques (synthèse)

### 2.1 Traces vs métriques vs logs

- **Traces**: un *chemin complet* d’une requête (waterfall), utile pour localiser **où** est le temps/erreur (service A → service B → DB).
- **Métriques**: vues agrégées sur le temps (rates, percentiles, tendances). Idéal pour détecter un **changement** (pic d’erreurs, hausse de latence).
- **Logs**: événements détaillés (erreurs applicatives, inputs/ids). Utile pour comprendre le **quoi** (message d’erreur, contexte métier).

### 2.2 Pull vs push (Prometheus vs Loki)

- **Prometheus** fonctionne en **pull**: il scrape des endpoints `/metrics`. Avantage: modèle simple, résilience côté scrape, découverte de targets.
- **Loki** reçoit en **push** via **Promtail**: les logs sont streamés et enrichis en labels.

### 2.3 Pourquoi un OTel Collector ?

Le collector permet de:
- centraliser la sortie OTLP des services,
- appliquer du **batching** (réduit overhead),
- changer de backend (Tempo, autre) sans changer l’app,
- exposer des métriques internes utiles (health du pipeline).

## 3) Preuves (ce qui est observable dans Grafana)

### 3.1 Démarrage reproductible

Commandes (depuis `taskflow-app/`) :

```bash
docker compose up -d
docker compose -f docker-compose.infra.yml up -d
```

À constater :
- Grafana accessible sur `http://localhost:3300` (admin/admin)
- Datasources provisionnées: Prometheus, Tempo, Loki
- Dashboards auto-chargés

### 3.2 Métriques (Prometheus)

#### (A) Vérifier que Prometheus scrape bien

Prometheus UI (`http://localhost:9090`) → Status → Targets :
- `api-gateway`, `user-service`, `task-service`, `notification-service` en **UP**

Capture attendue: *Targets UP*.

#### (B) Requêtes PromQL utiles

- **RPS par service**:
  - `sum by (job) (rate(http_requests_total[5m]))`
- **Erreurs 5xx par service**:
  - `sum by (job) (rate(http_requests_total{status=~"5.."}[5m]))`
- **Latence p95**:
  - `histogram_quantile(0.95, sum by(job, le) (rate(http_request_duration_ms_bucket[5m])))`

Capture attendue: *Explore Prometheus avec un graphe non vide*.

### 3.3 Logs (Loki)

Requêtes LogQL (Grafana → Explore → Loki) :

- **Tous les logs d’un service**:
  - `{service="task-service"} | json`
- **Erreurs uniquement**:
  - `{service=~".+"} | json | level="error"`
- **Filtrer statusCode >= 500** (équivalent “par logs”):
  - `{service=~".+"} | json | statusCode >= 500`

Comparaison demandée (grille) :
- métrique: `http_requests_total{status="500"}`
- logs: `{service=~".+"} | json | statusCode >= 500`

Interprétation:
- **métriques** pour suivre un taux/volume d’erreurs (série temporelle robuste, peu de cardinalité)
- **logs** pour diagnostiquer “pourquoi” (message, payload, contexte), mais plus coûteux/volumineux

### 3.4 Traces distribuées (Tempo)

Scénario:
- déclencher une requête via le frontend: `POST /api/tasks`
- Grafana → Explore → Tempo: retrouver la trace

Requêtes TraceQL :
- **Spans d’un service**:
  - `{ resource.service.name = "api-gateway" }`
- **Erreurs**:
  - `{ status = error }`

À vérifier dans la trace:
- chaîne de spans: `api-gateway` → `task-service` → `postgres`
- attributs: `http.method`, `http.route`, `http.status_code`, `db.statement` (selon auto-instrumentation)

Capture attendue: *waterfall d’une trace multi-services*.

### 3.5 Corrélation logs ↔ traces

Les logs HTTP incluent un champ `trace_id`.

Procédure de preuve:
- Dans Tempo, ouvrir une trace et noter son `traceId`
- Dans Loki, rechercher ce `trace_id`:
  - `{service=~".+"} | json | trace_id="<TRACE_ID>"`

Capture attendue: *même traceId trouvé côté Tempo et côté Loki*.

## 4) Démarche d’investigation (exemple “pic d’erreurs”)

1. **Métriques**: identifier quel service/route explose (erreurs 5xx, latence p95/p99).
2. **Logs**: filtrer `level="error"` + `statusCode >= 500` sur ce service pour obtenir le message et le contexte.
3. **Traces**: isoler des spans en erreur ou lents pour localiser l’appel précis (gateway → service → DB).
4. **Hypothèse / action**: confirmer (ex: timeouts DB, upstream 502, payload invalide) et proposer un correctif.

## 5) Justification de choix (exemples)

- **OTLP gRPC Collector → Tempo**: plus performant pour le trafic inter-conteneurs.
- **Pino JSON**: parsing simple côté Promtail + requêtes LogQL fiables.
- **Dashboards versionnés**: reproductibilité (important pour la grille).

