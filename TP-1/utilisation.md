# Guide d'utilisation - TP Docker & Compose

## Démarrage du projet

### 1. Lancer tous les services
```bash
docker compose up -d
```

### 2. Vérifier que tout fonctionne
```bash
# Vérifier l'état des conteneurs
docker compose ps

# Vérifier les logs
docker compose logs api
docker compose logs db
```

## Manipulations à effectuer

### Étape 1 : Vérifier que l'API fonctionne

#### Test de santé de l'API
```bash
curl http://localhost:3000/health
```
**Résultat attendu :**
```json
{"status":"ok","database":"up"}
```

#### Accès à l'API
```bash
curl http://localhost:3000/notes
```
**Résultat attendu :**
```json
[]
```

### Étape 2 : Créer et manipuler des données

#### Créer une note
```bash
curl -X POST http://localhost:3000/notes \
  -H "Content-Type: application/json" \
  -d '{"title": "Première note", "content": "Contenu de ma première note"}'
```

**Résultat attendu :**
```json
{
  "id": 1,
  "title": "Première note",
  "content": "Contenu de ma première note",
  "created_at": "2024-03-26T12:00:00.000Z"
}
```

#### Lister toutes les notes
```bash
curl http://localhost:3000/notes
```

#### Créer plusieurs notes pour les tests
```bash
# Note 2
curl -X POST http://localhost:3000/notes \
  -H "Content-Type: application/json" \
  -d '{"title": "Note technique", "content": "Explication du fonctionnement de Docker"}'

# Note 3
curl -X POST http://localhost:3000/notes \
  -H "Content-Type: application/json" \
  -d '{"title": "Question", "content": "Pourquoi les volumes sont-ils importants ?"}'
```

### Étape 3 : Tester la persistance des données

#### 3.1 Arrêter uniquement l'API
```bash
docker compose stop api
docker compose rm api
```

#### 3.2 Vérifier que la base de données tourne toujours
```bash
docker compose ps
```
**Observation attendue :** Seul le service `db` doit être actif.

#### 3.3 Relancer l'API
```bash
docker compose up -d api
```

#### 3.4 Vérifier que les données sont toujours là
```bash
curl http://localhost:3000/notes
```
**Observation attendue :** Toutes les notes créées précédemment doivent être présentes.

### Étape 4 : Tester la persistance complète

#### 4.1 Arrêter tous les services
```bash
docker compose down
```

#### 4.2 Relancer tout le projet
```bash
docker compose up -d
```

#### 4.3 Vérifier que les données survivent
```bash
curl http://localhost:3000/notes
```
**Observation attendue :** Les données doivent être intactes car le volume `postgres_data` persiste.

#### 4.4 Test avec suppression des volumes (pour comparaison)
```bash
# ⚠️ CELA SUPPRIMERA TOUTES LES DONNÉES
docker compose down -v
docker compose up -d
curl http://localhost:3000/notes
```
**Observation attendue :** La liste est vide, mais la table existe (grâce à init.sql).

### Étape 5 : Observer les logs et comportements

#### Logs de l'API au démarrage
```bash
docker compose logs api
```
**À observer :**
- Message de connexion à la base de données
- Message "Server listening on http://localhost:3000"

#### Logs de la base de données
```bash
docker compose logs db
```
**À observer :**
- Messages d'initialisation de PostgreSQL
- Logs des connexions depuis l'API

## Nettoyage complet (fin de TP)

```bash
# Supprimer tout sauf les images
docker compose down -v

# Optionnel : supprimer aussi les images
docker compose down -v --rmi all
```