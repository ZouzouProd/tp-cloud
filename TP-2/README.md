# TP Docker & Cloud - Application de Notes avec Docker Hub

**Auteurs :** Naël BENHIBA et Corentin GESSE--ENTRESSANGLE

## Description du projet

Ce projet étend l'application de notes du TP-1 en intégrant les concepts de Cloud Computing et Docker Hub. L'objectif est de démontrer le déploiement d'applications conteneurisées dans un environnement Cloud, le versionnement d'images Docker, et les bonnes pratiques de déploiement industriel.

## Fonctionnalités

- ✅ **API REST complète** pour gérer des notes (CRUD complet avec PUT)
- ✅ **Base de données PostgreSQL** avec persistance
- ✅ **Images Docker versionnées** sur Docker Hub
- ✅ **Déploiement Cloud-ready** avec Docker Compose
- ✅ **Gestion des erreurs** et validation des entrées
- ✅ **Immuabilité des images** et principes Cloud

## Démarrage rapide

### Prérequis

- Docker et Docker Compose installés
- Git (pour cloner le repository)
- Accès internet (pour pull les images Docker Hub)

### Installation

```bash
# Cloner le repository
git clone <URL_DU_REPO>
cd tp-cloud/TP-2

# Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env selon vos besoins

# Lancer le projet avec les images Docker Hub
docker compose up -d
```

### Installation alternative (développement)

```bash
# Builder localement les images
docker compose up --build -d
```

## Utilisation

### Tests de l'API complète

```bash
# Vérifier que l'API fonctionne
curl http://localhost:3000/health

# Créer une note
curl -X POST http://localhost:3000/notes \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "content": "Ma première note"}'

# Lister les notes
curl http://localhost:3000/notes

# Mettre à jour une note (NOUVEAU)
curl -X PUT http://localhost:3000/notes/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Note modifiée", "content": "nouveau contenu"}'

# Supprimer une note
curl -X DELETE http://localhost:3000/notes/1
```

## Images Docker Hub

Ce projet utilise des images Docker hébergées sur Docker Hub :

- **zouzouprod291/notes-api:v1** : Version initiale de l'API
- **zouzouprod291/notes-api:v2** : Version avec support complet du CRUD (PUT ajouté)

## Preuves et observations

Les captures d'écran et observations sont disponibles dans le dossier `preuves/` :

- **curl-edit-note-api.png** : Démonstration du fonctionnement de l'endpoint PUT
- **edit-404-note.png** : Gestion des erreurs 404 lors de la modification
- **edit-validation-error-note.png** : Validation des entrées pour l'édition
- **grep-command-docker-tag.png** : Versionnement des images Docker

## Concepts Cloud démontrés

### Immuabilité des images
- Les images Docker sont versionnées (v1, v2)
- Une fois publiée, une image n'est jamais modifiée directement
- Nouvelle version = nouvelle image avec nouveau tag

### Déploiement continu
- Possibilité de déployer de nouvelles versions sans arrêt de service
- Rollback facile en changeant simplement le tag de l'image

### Configuration externe
- Variables d'environnement gérées via `.env`
- Séparation configuration/code

## Documentation complète

| Document | Description |
|----------|-------------|
| [reponses_cours.md](reponses_cours.md) | Réponses aux questions théoriques sur Docker et Cloud |
| [.env.example](.env.example) | Exemple de configuration environnementale |
| [docker-compose.yml](docker-compose.yml) | Configuration Docker Compose |

## Développement

Pour développer localement :

```bash
# Builder avec les sources locales
docker compose up --build

# Logs en temps réel
docker compose logs -f api

# Redémarrer uniquement l'API
docker compose restart api
```
