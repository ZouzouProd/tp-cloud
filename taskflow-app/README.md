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
- k6 (pour les tests de charge) - optionnel

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

## Tests de charge (Partie 2)

### Installation de k6

**Via Docker (recommandé):**
```bash
docker pull grafana/k6:latest
```

**Via package manager:**
```bash
# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Créer un utilisateur de test

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'
```

### Lancer les tests

**Test léger (5 VUs, 30s):**
```bash
# Avec Docker
docker run --rm -i --network=taskflow_default \
  -e TOKEN='<your_jwt_token>' \
  -e BASE_URL='http://api-gateway:3000' \
  grafana/k6 run - < scripts/load-test-light.js

# Avec k6 installé localement
k6 run -e TOKEN='<your_jwt_token>' scripts/load-test-light.js
```

**Test réaliste (10-50 VUs, 3m30s):**
```bash
# Avec Docker
docker run --rm -i --network=taskflow_default \
  -e EMAIL='test@example.com' \
  -e PASSWORD='test123' \
  -e BASE_URL='http://api-gateway:3000' \
  grafana/k6 run - < scripts/load-test-realistic.js

# Avec k6 installé localement
k6 run -e EMAIL='test@example.com' -e PASSWORD='test123' scripts/load-test-realistic.js
```

### Scaling des services

**Scaler le task-service à 3 replicas:**
```bash
docker compose up --scale task-service=3 -d
```

**Note:** Le port mapping doit être commenté dans `docker-compose.yml` pour permettre le scaling.

## Documentation

- **[TP_PARTIE_1.md](TP_PARTIE_1.md)** - Guide complet du TP Partie 1 avec instructions détaillées
- **[TP_PARTIE_2.md](TP_PARTIE_2.md)** - Guide du TP Partie 2 - Tests de charge avec k6
- **[OBSERVABILITE_PARTIE_1.md](OBSERVABILITE_PARTIE_1.md)** - Implémentation et résolution de problèmes Partie 1
- **[OBSERVABILITE_PARTIE_2.md](OBSERVABILITE_PARTIE_2.md)** - Documentation complète des tests de charge et analyse
- **[REPORT.md](REPORT.md)** - Rapport d'analyse et preuves d'observabilité
- **[OBSERVABILITY_STACK.md](OBSERVABILITY_STACK.md)** - Architecture de la stack d'observabilité
- **[grille-evaluation.md](grille-evaluation.md)** - Grille d'évaluation du TP

## Preuves et captures d'écran

### Partie 1 - Observabilité
- **[Services Grafana](preuves/partie-b/02-graphana_services.png)** - Dashboard d'overview des services
- **[Tâches Grafana](preuves/partie-b/03_graphana_tasks.png)** - Dashboard des métriques métier
- **[Prometheus](preuves/partie-b/up_prometheus.png)** - Interface Prometheus avec targets

### Partie 2 - Tests de charge k6
- **[Résumé k6 test réaliste](preuves/partie-2/k6-test-realistic-summary.png)** - Résultats du test avec 50 VUs
- **[Grafana Services Overview](preuves/partie-2/grafana-services-overview.png)** - Panel Request Rate pendant le pic de charge
- **[Prometheus Targets](preuves/partie-2/prometheus-targets.png)** - Limitation du service discovery avec Docker Compose

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
- **k6 tests échouent** : vérifier que les services sont démarrés et accessibles sur le réseau Docker
- **Scaling impossible** : vérifier que le port mapping est commenté dans `docker-compose.yml`
