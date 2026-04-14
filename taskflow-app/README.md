# TaskFlow - TP Cloud & DevOps

**Auteurs :** Naël BENHIBA et Corentin GESSE--ENTRESSANGLE

Architecture multi-services pour apprendre Kubernetes, l'observabilité et le CI/CD.

## Architecture

### Services
| Service | Port | Rôle |
|---|---|---|
| api-gateway | 3000 | Point d'entrée unique, auth JWT |
| user-service | 3001 | Gestion des utilisateurs |
| task-service | 3002 | CRUD des tâches |
| notification-service | 3003 | Événements via Redis Pub/Sub |
| frontend | 5173 | Interface React |

### Infrastructure
| Outil | Port | Rôle |
|---|---|---|
| PostgreSQL | 5432 | Base de données principale |
| Redis | 6379 | Bus de messages entre services |

### Observabilité
| Outil | Port | Rôle |
|---|---|---|
| Grafana | 3300 | UI d'exploration (metrics/logs/traces) |
| Prometheus | 9090 | Backend métriques |
| Tempo | 3200 | Backend traces |
| Loki | 3100 | Backend logs |
| OTel Collector | 4317/4318/8888 | Réception OTLP + métriques internes |

## Démarrage rapide

### Prérequis
- Docker + Docker Compose
- Node.js + npm

### Installation
```bash
npm run install:all
```

### Lancer l'application
```bash
docker compose up -d
```
- Frontend : `http://localhost:5173`
- API Gateway : `http://localhost:3000/health`

### Lancer l'observabilité
```bash
docker compose -f docker-compose.infra.yml up -d
```
- Grafana : `http://localhost:3300` (admin/admin)
- Prometheus : `http://localhost:9090`

## Documentation

- **[TP_PARTIE_1.md](TP_PARTIE_1.md)** - Guide complet du TP avec instructions détaillées
- **[OBSERVABILITE_PARTIE_1.md](OBSERVABILITE_PARTIE_1.md)** - Implémentation et résolution de problèmes
- **[REPORT.md](REPORT.md)** - Rapport d'analyse et preuves d'observabilité
- **[OBSERVABILITY_STACK.md](OBSERVABILITY_STACK.md)** - Architecture de la stack d'observabilité
- **[grille-evaluation.md](grille-evaluation.md)** - Grille d'évaluation du TP

## Preuves et captures d'écran

### Captures d'écran de l'observabilité
- **[Services Grafana](preuves/partie-b/02-graphana_services.png)** - Dashboard d'overview des services
- **[Tâches Grafana](preuves/partie-b/03_graphana_tasks.png)** - Dashboard des métriques métier
- **[Prometheus](preuves/partie-b/up_prometheus.png)** - Interface Prometheus avec targets

## Guide d'observation

### Dashboards Grafana
- `Services overview` : req/s, latence p95/p99, erreurs 5xx, statut services
- `Taskflow business` : métriques métier (tâches créées, priorités, etc.)

### Requêtes utiles

**Prometheus (PromQL)**
```promql
# RPS par service
sum by (job) (rate(http_requests_total[5m]))

# Erreurs 5xx
sum by (job) (rate(http_requests_total{status=~"5.."}[5m]))

# Latence p95
histogram_quantile(0.95, sum by(job, le) (rate(http_request_duration_ms_bucket[5m])))
```

**Loki (LogQL)**
```logql
# Logs d'un service
{service="task-service"} | json

# Erreurs uniquement
{service=~".+"} | json | level="error"

# Codes HTTP 5xx
{service=~".+"} | json | statusCode >= 500
```

**Tempo (TraceQL)**
```traceql
# Traces d'un service
{ resource.service.name = "api-gateway" }

# Spans en erreur
{ status = error }
```

## Dépannage

- **Traces absentes** : vérifier `otel-collector` et `tempo`, config `OTEL_EXPORTER_OTLP_ENDPOINT`
- **Logs absents** : vérifier `promtail` et accès Docker socket
- **Dashboards non chargés** : vérifier montage `./infra/grafana/dashboards`
