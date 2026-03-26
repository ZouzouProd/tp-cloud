# TP Docker & Compose - Application de Notes

**Auteurs :** Naël BENHIBA et Corentin GESSE--ENTRESSANGLE

## Description du projet

Ce projet met en œuvre une application web simple avec une API Node.js et une base de données PostgreSQL, le tout orchestré avec Docker Compose. L'objectif est de démontrer la persistance des données, la communication entre services et le principe de conteneurisation.

## Fonctionnalités

- ✅ **API REST** pour gérer des notes (CRUD basique)
- ✅ **Base de données PostgreSQL** avec persistance
- ✅ **Communication inter-services** via Docker network
- ✅ **Persistance des données** avec volumes Docker
- ✅ **Configuration environnementale** complète
- ✅ **Remplaçabilité de l'API** sans perte de données

## Démarrage rapide

### Prérequis

- Docker et Docker Compose installés
- Git (pour cloner le repository)

### Installation

```bash
# Cloner le repository
git clone <URL_DU_REPO>
cd tp-cloud/TP-1

# Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env selon vos besoins

# Lancer le projet
docker compose up -d
```

Pour plus de détails, consultez le [guide d'installation](installation.md).

## Utilisation

Le guide d'utilisation complet est disponible dans [utilisation.md](utilisation.md). Voici les commandes essentielles :

### Tests rapides

```bash
# Vérifier que l'API fonctionne
curl http://localhost:3000/health

# Créer une note
curl -X POST http://localhost:3000/notes \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "content": "Ma première note"}'

# Lister les notes
curl http://localhost:3000/notes
```

## Preuves et observations

Les captures d'écran et observations sont disponibles dans le dossier `preuves/` :

- **docker-ps.png** : Inspection des conteneurs en cours d'exécution
- **api-functioning.png** : Démonstration du fonctionnement de l'API
- **database-persistence.png** : Preuve de la persistance des données
- **volume-inspection.png** : Inspection des volumes Docker

## Documentation complète

| Document | Description |
|----------|-------------|
| [installation.md](installation.md) | Guide d'installation étape par étape |
| [utilisation.md](utilisation.md) | Guide d'utilisation complet avec tests |
| [reponses_cours.md](reponses_cours.md) | Réponses aux questions théoriques du TP |
