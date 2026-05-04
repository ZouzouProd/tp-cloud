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

