# TP 4 : notes-api observabilité

## Naël BENHIBA et Corentin GESSE--ENTRESSANGLE

## Objectif (TP Observabilité)

Ce TP met en place une API “notes” instrumentée pour l’observabilité :
- **Logs** structurés (JSON) avec niveaux.
- **Métriques** Prometheus via `/metrics`.
- **Health** pour refléter l’état du service (ex: dépendance DB).

Les **réponses théoriques** et la **grille d’évaluation** sont dans `reponses_cours.md`.

## Prérequis

- Docker et Docker Compose

## Installation & configuration

Depuis le dossier `TP-4`, créer le fichier d'environnement à partir de l'exemple :

```bash
cp .env.example .env
```

Puis ajuster les variables si nécessaire.

Variables utiles :
- `API_PORT` pour le port de l'API
- `LOG_LEVEL` pour le niveau de logs (`info`, `warn`, `error`)

## URL de l’application

L’API est disponible sur :
- `http://localhost:${API_PORT}`

Endpoints utiles :
- `GET http://localhost:${API_PORT}/health`
- `GET http://localhost:${API_PORT}/metrics`

## Lancement

Depuis le dossier `TP-4` :

```bash
docker compose up --build
```

## Tests

L’API est testée avec `vitest` :



```bash
docker exec -ti tp-4-api-1 npm run test
```

## Observabilité

### Logs

Le projet utilise `pino` pour produire des logs JSON structurés (niveau via `LOG_LEVEL`).

### Métriques

Exposées sur `GET /metrics` (format Prometheus).

### Health

Endpoint `GET /health` (statut HTTP cohérent avec l’état du service et ses dépendances).

## Fichiers principaux

- **Application principale** : `api/src/app.js`
- **Serveur** : `api/src/server.js`
- **Base de données** : `api/src/db.js`
- **Logger** : `api/src/logger.js`
- **Métriques** : `api/src/metrics.js`
- **Configuration Docker** : `docker-compose.yml`
- **Tests** : `api/test/`

## Documentation (cours + évaluation)

- **Réponses (cours)** : `TP-4/reponses_cours.md`
- **Preuves de l'observabilité** : `TP-4/preuves/endpoint-metrics.png` (capture d'écran de l'endpoint /metrics) et `TP-4/preuves/npm-test.png` (capture d'écran de la commande npm test)
