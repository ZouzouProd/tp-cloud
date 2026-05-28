# Travaux pratiques - Docker & Compose

> **But de l’atelier** : construire pas à pas une application réelle (API + base de données) en utilisant Docker et Docker Compose, pour comprendre **les concepts**, pas juste les commandes.

Cette fiche est volontairement :
- guidée (quoi faire)
- incomplète (pas la solution toute faite)
- structurée (pour éviter de se perdre)


## Architecture cible (à garder en tête)

```
Client → API (Node.js) → Base de données (PostgreSQL)
```

- API : stateless
- DB : stateful
- Docker : emballer
- Compose : relier

---

## Étape 0 — Setup (Docker + Compose + VS Code)

### Objectif
Être prêt à travailler sans perdre du temps sur des problèmes d’installation.

### À faire
- Installer **Docker** (Docker Desktop sur Mac/Windows, Docker Engine sur Linux)
- Vérifier que Docker tourne
- Vérifier que Docker Compose est disponible
- Installer VS Code + extensions utiles

### Commandes de vérification

```bash
docker --version
```

```bash
docker compose version
```

Test rapide :

```bash
docker run --rm hello-world
```

### Extensions VS Code recommandées
- **Docker** (Microsoft)
- **YAML** (Red Hat)
- **Thunder Client** (Thunder client)

## Étape 1 — Créer une API minimale (sans Docker)

### Objectif
Avoir une API qui démarre et répond.

### À faire
- Créer un dossier `api/`
- Initialiser un projet Node.js
- Créer un serveur HTTP
- Ajouter une route `GET /health` qui retourne `ok`


## Étape 2 — Dockeriser l’API

### Objectif
Transformer l’API en **image Docker reproductible**.

### À faire
- Créer un `Dockerfile` dans `api/`
- Choisir une image de base Node
- Définir un dossier de travail (`WORKDIR`)
- Installer les dépendances
- Démarrer l’application

### Contraintes
- Utiliser `COPY` en deux temps
- Le container doit démarrer avec une seule commande

### Questions de réflexion
> Pourquoi séparer l’installation des dépendances et la copie du code ?


## Étape 3 — Lancer l’API avec Docker Compose

### Objectif
Découvrir Docker Compose avec un seul service.

### À faire
- Créer un `docker-compose.yml`
- Définir un service `api`
- Construire l’image via Compose
- Exposer le port de l’API

### Contraintes
- Ne pas utiliser `docker run`


## Étape 4 — Configuration via variables d’environnement

### Objectif
Séparer configuration et image.

### À faire
- Passer les paramètres DB via `environment`
- Ajouter un service `db`
- Utiliser l’image officielle `postgres`
- Le port doit être configurable (variable d’environnement) pour le service `api`

### Contraintes
- Aucune valeur sensible en dur dans le code
- L’API doit se connecter à la DB via le **nom du service**

### Question de réflexion
> Pourquoi l’image Docker doit rester la même entre dev et prod ?
> Pourquoi l’API se connecte à `db` et pas à `localhost` ?


## Étape 5 — Ajouter une base de données PostgreSQL

### Objectif
Faire communiquer l’API avec la DB.

### À faire
- Initialiser la base de données avec la table `notes` :
  - `id` (serial / identity)
  - `title` (text)
  - `content` (text)
  - `created_at` (timestamp)
- Récupérer les variables d'environnement côté API pour faire communiquer l’API avec la DB

### Question de réflexion
> Pourquoi la table `notes` n'existe plus au re-lunch (après un `docker compose down`) ?


## Étape 6 — Persister les données avec un volume

### Objectif
Vérifier que l’API est remplaçable.

### À faire
- Ajouter un volume à la DB
- Monter le volume dans le bon dossier PostgreSQL
- Créer une donnée en DB
- Supprimer le container API
- Le relancer

### Observation attendue
- Les données sont toujours présentes

### Contraintes
- Les données doivent survivre à un `docker compose down`

⚠️ **Attention**, supprimer le volume (expérience “catastrophe”) :
```bash
docker compose down -v
```
cela supprime les données.

### Question de réflexion
> Pourquoi ne met-on pas les données directement dans le container ?
> Quel composant est stateful ? Lequel est stateless ?

## Étape 7 - Utiliser un fichier `.env`

### Objectif
Séparer clairement **le code**, **la configuration** et **les secrets**.

### À faire
- Créer un fichier `.env`
- Y placer :
  - `DB_HOST`
  - `DB_USER`
  - `DB_PASSWORD`
  - etc.
- Modifier `docker-compose.yml` pour charger ce fichier

### Bonnes pratiques
- Ne jamais versionner le fichier `.env`
- Ajouter un fichier `.env.example` documenté

### Question de réflexion
> Pourquoi les secrets ne doivent-ils pas être dans le code ni dans le dépôt Git ?

---

## Ce que vous savez faire à la fin

- Lire et écrire un Dockerfile simple
- Lire et écrire un docker-compose.yml
- Comprendre le rôle de chaque brique
- Observer ce qui tourne (ps/logs)
- Expliquer pourquoi Kubernetes existe

---

## Commandes utiles

### Docker

Construire une image (avec un nom lisible : `notes-api`) : 
```sh
docker build -t notes-api ./api
```

Exécuter un container **jettable** (de tests ou de démo) grâce à l'option `--rm`, à partir de l'image `notes-api` sur le port 3000 :
```bash
docker run --rm -p 3000:3000 notes-api
``` 

Idem sur le port 4200 :
```bash
docker run --rm -p 4200:3000 notes-api
``` 

Voir les images :
```bash
docker images
```

Voir les containers en cours :
```bash
docker ps
```

Voir les containers arrêter (sauf ceux exécutés avec l'option `--rm`):
```bash
docker ps -a
```

Arrêter un container :
```sh
docker stop <container_id>
```

Supprimer un container :
```sh
docker rm <container_id>
```

Surveiller conso CPU/RAM (optionnel) :
```bash
docker stats
```

### Docker Compose

Lancement des services avec build (utile après avoir modifier son code)
```bash
docker compose up --build
```

Logs d’un service Compose :
```bash
docker compose logs -f api
```

État des services Compose :
```bash
docker compose ps
```

Supprimer un container (api) :
```bash
docker compose rm api
```

Entrer dans un container (diagnostic) :
```bash
docker compose exec api sh
```

Ouvre un shell PostgreSQL à l’intérieur du container DB :
```bash
docker compose exec db psql -U user -d appdb
```

### psql

Liste les tables de la base courante :
```sql
\dt
```

Quitte le client PostgreSQL :
```sql
\q
```

Créer une table : 
```sql
CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Afficher le contenu d'une table :
```sql
SELECT * FROM notes;
```
