# REPORT — TaskFlow (Observabilité)

Ce document est le **rapport d’index** pour l’observabilité du projet TaskFlow. Il regroupe les liens vers les documentations détaillées de chaque partie du TP.

## Documentation complète

### Partie 1 — Mise en place de l’observabilité
**[OBSERVABILITE_PARTIE_1.md](OBSERVABILITE_PARTIE_1.md)**

Contient :
- Configuration complète de la stack d’observabilité (OpenTelemetry, OTel Collector, Tempo, Prometheus, Loki, Promtail, Grafana)
- Réponses détaillées aux 6 questions du TP_PARTIE_1.md
- Méthodologie d’investigation avec logs, traces et métriques
- Problèmes rencontrés et solutions apportées
- Exemples de requêtes LogQL, PromQL et TraceQL

**Captures d’écran :**
- [Services Grafana](preuves/partie-1/partie-b/02-graphana_services.png)
- [Tâches Grafana](preuves/partie-1/partie-b/03_graphana_tasks.png)
- [Prometheus Targets](preuves/partie-1/partie-b/up_prometheus.png)

### Partie 2 — Tests de charge et scaling
**[OBSERVABILITE_PARTIE_2.md](OBSERVABILITE_PARTIE_2.md)**

Contient :
- Tests de charge k6 (scénarios light et realistic)
- Réponses détaillées aux 10 questions du TP_PARTIE_2.md
- Analyse comparative des performances (1 vs 3 replicas)
- Limitations de Docker Compose pour le scaling
- Analyse des écarts de latence entre k6 et Grafana
- Recommandations pour Kubernetes

**Captures d’écran :**
- [Résumé k6 test réaliste](preuves/partie-2/k6-test-realistic-summary.png)
- [Grafana Services Overview](preuves/partie-2/grafana-services-overview.png)
- [Prometheus Targets](preuves/partie-2/prometheus-targets.png)

### Partie 3 — Déploiement Kubernetes
**[OBSERVABILITE_PARTIE_3.md](OBSERVABILITE_PARTIE_3.md)**

Contient :
- Déploiement complet sur cluster kind (3 nœuds)
- Réponses détaillées aux 15 questions théoriques du TP_PARTIE_3.md
- Analyse Deployment vs StatefulSet
- Dimensionnement des ressources et justifications
- Investigation base de données (ConfigMap init.sql)
- Explication Service vs Ingress
- Scénarios d’observation (self-healing, readiness probe, rolling update)
- Réflexion sur Helm/Kustomize

**Captures d’écran :**
- [Nœuds du cluster](preuves/partie-3/get-nodes.png)
- [Pods déployés](preuves/partie-3/get-pods.png)
- [StatefulSet PostgreSQL](preuves/partie-3/statefulset-pvc.png)
- [Frontend accessible](preuves/partie-3/app-running-front.png)
- [Tables PostgreSQL](preuves/partie-3/postgres-tables.png)
- [Self-healing avant](preuves/partie-3/self-healing-before.png)
- [Self-healing après](preuves/partie-3/self-healing-after.png)

### Partie 4A — Chart Helm TaskFlow
**[OBSERVABILITY_PARTIE_4A.md](OBSERVABILITY_PARTIE_4A.md)**

Contient :
- Création du chart Helm TaskFlow
- Ajout de la dépendance Redis via le chart Bitnami
- Vérification du nom du Service Redis généré (`redis-master`)
- Réponses aux questions théoriques de la partie A, étapes 1 et 2
- Justification du choix chart officiel Redis vs template maison PostgreSQL
- Séparation des valeurs sensibles de production hors des fichiers commités

**Captures d’écran :**
- [Service Redis généré par Helm](preuves/partie-4/partie-a/verify-name-service-redis.png)

## Architecture d’observabilité

**[OBSERVABILITY_STACK.md](OBSERVABILITY_STACK.md)**

Schéma d’ensemble et explication détaillée de la stack :
- **Traces**: OpenTelemetry SDK → OTel Collector → Tempo → Grafana
- **Métriques**: `/metrics` → Prometheus → Grafana
- **Logs**: stdout Docker → Promtail → Loki → Grafana
- **Dashboards**: provisionnés automatiquement depuis `infra/grafana/dashboards/`

## Démarrage rapide

```bash
# Lancer l’application
docker compose up -d

# Lancer la stack d’observabilité
docker compose -f docker-compose.infra.yml up -d
```

**Accès :**
- Grafana : `http://localhost:3300` (admin/admin)
- Prometheus : `http://localhost:9090`
- Frontend : `http://localhost:5173`

## Grille d’évaluation

**[grille-evaluation.md](grille-evaluation.md)**

Critères d’évaluation du TP avec les points attendus pour chaque partie.
