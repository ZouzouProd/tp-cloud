# notes_app-CI_CD

## Installation

### Prérequis

- Docker et Docker Compose
- Node.js 18
- npm

### Configuration

Depuis le dossier `TP-4`, créer le fichier d'environnement à partir de l'exemple :

```bash
cp .env.example .env
```

Puis ajuster les variables si nécessaire.

Variables utiles :
- `API_PORT` pour le port de l'API
- `LOG_LEVEL` pour le niveau de logs (`info`, `warn`, `error`)

### Lancement

Depuis le dossier `TP-4` :

```bash
docker compose up --build
```

## Logs

Le projet utilise `pino` pour produire des logs JSON structurés.

### Installation de Pino dans le conteneur API

```bash
docker compose run --rm api npm install pino
```

### Comparaison avec `console.log`

- `console.log` produit des sorties texte simples, peu adaptées à l'analyse automatique
- `pino` génère des logs JSON structurés, plus faciles à filtrer, indexer et exploiter
- `pino` permet aussi de gérer des niveaux de logs clairs : `info`, `warn`, `error`
