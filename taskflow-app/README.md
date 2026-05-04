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
- kind + kubectl (pour Kubernetes) - optionnel

### Installation
```bash
npm run install:all
```

### Option 1 : Lancer avec Docker Compose

**Lancer l'application:**
```bash
docker compose up -d
```
- Frontend : `http://localhost:5173`
- API Gateway : `http://localhost:3000/health`

**Lancer l'observabilité:**
```bash
docker compose -f docker-compose.infra.yml up -d
```
- Grafana : `http://localhost:3300` (admin/admin)
- Prometheus : `http://localhost:9090`

### Option 2 : Lancer avec Kubernetes (Partie 3)

**1. Créer le cluster kind:**
```bash
kind create cluster --name taskflow --config k8s/kind-config.yaml
kubectl create namespace staging
```

**2. Charger les images Docker:**
```bash
kind load docker-image taskflow-user-service:latest taskflow-task-service:latest taskflow-notification-service:latest taskflow-api-gateway:latest taskflow-frontend:latest --name taskflow
```

**3. Créer le ConfigMap pour init.sql:**
```bash
kubectl create configmap postgres-init-script --from-file=init.sql=scripts/init.sql -n staging
```

**4. Déployer tous les services:**
```bash
kubectl apply -f k8s/base/postgres/
kubectl apply -f k8s/base/redis/
kubectl apply -f k8s/base/user-service/
kubectl apply -f k8s/base/task-service/
kubectl apply -f k8s/base/notification-service/
kubectl apply -f k8s/base/api-gateway/
kubectl apply -f k8s/base/frontend/
```

**5. Installer l'Ingress controller:**
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=90s
kubectl patch deployment ingress-nginx-controller -n ingress-nginx --type='json' -p='[{"op":"add","path":"/spec/template/spec/nodeSelector/ingress-ready","value":"true"}]'
kubectl rollout status deployment/ingress-nginx-controller -n ingress-nginx
```

**6. Déployer l'Ingress:**
```bash
kubectl apply -f k8s/base/ingress.yaml
```

**7. Accéder à l'application:**
- Frontend : `http://localhost:8080`
- API : `http://localhost:8080/api/health`

**Note:** Le port 8080 est utilisé au lieu de 80 car le port 80 peut être occupé sur Windows.

**Vérifier le déploiement:**
```bash
kubectl get all -n staging
kubectl get pods -n staging -o wide
```

**Supprimer le cluster:**
```bash
kind delete cluster --name taskflow
```

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
- **[TP_PARTIE_3.md](TP_PARTIE_3.md)** - Guide du TP Partie 3 - Déploiement Kubernetes
- **[OBSERVABILITE_PARTIE_1.md](OBSERVABILITE_PARTIE_1.md)** - Implémentation et résolution de problèmes Partie 1
- **[OBSERVABILITE_PARTIE_2.md](OBSERVABILITE_PARTIE_2.md)** - Documentation complète des tests de charge et analyse
- **[OBSERVABILITE_PARTIE_3.md](OBSERVABILITE_PARTIE_3.md)** - Documentation du déploiement Kubernetes
- **[REPORT.md](REPORT.md)** - Rapport d'analyse et preuves d'observabilité
- **[OBSERVABILITY_STACK.md](OBSERVABILITY_STACK.md)** - Architecture de la stack d'observabilité
- **[grille-evaluation.md](grille-evaluation.md)** - Grille d'évaluation du TP

## Preuves et captures d'écran

### Partie 1 - Observabilité
- **[Services Grafana](preuves/partie-1/partie-b/02-graphana_services.png)** - Dashboard d'overview des services
- **[Tâches Grafana](preuves/partie-1/partie-b/03_graphana_tasks.png)** - Dashboard des métriques métier
- **[Prometheus](preuves/partie-1/partie-b/up_prometheus.png)** - Interface Prometheus avec targets

### Partie 2 - Tests de charge k6
- **[Résumé k6 test réaliste](preuves/partie-2/k6-test-realistic-summary.png)** - Résultats du test avec 50 VUs
- **[Grafana Services Overview](preuves/partie-2/grafana-services-overview.png)** - Panel Request Rate pendant le pic de charge
- **[Prometheus Targets](preuves/partie-2/prometheus-targets.png)** - Limitation du service discovery avec Docker Compose

### Partie 3 - Déploiement Kubernetes
- Captures d'écran à ajouter dans `preuves/partie-3/`

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

### Docker Compose
- **Traces absentes** : vérifier `otel-collector` et `tempo`, config `OTEL_EXPORTER_OTLP_ENDPOINT`
- **Logs absents** : vérifier `promtail` et accès Docker socket
- **Dashboards non chargés** : vérifier montage `./infra/grafana/dashboards`
- **k6 tests échouent** : vérifier que les services sont démarrés et accessibles sur le réseau Docker
- **Scaling impossible** : vérifier que le port mapping est commenté dans `docker-compose.yml`

### Kubernetes
- **Pods en ImagePullBackOff** : charger les images avec `kind load docker-image`
- **Pods en CrashLoopBackOff** : vérifier les logs avec `kubectl logs -n staging <pod-name>`
- **Ingress ne répond pas** : vérifier que le controller est sur le control-plane avec `kubectl get pods -n ingress-nginx -o wide`
- **Base de données vide** : vérifier que le ConfigMap `postgres-init-script` existe et est monté
- **Port 80 occupé** : utiliser le port 8080 configuré dans `kind-config.yaml`
