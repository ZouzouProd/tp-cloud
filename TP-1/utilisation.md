# Guide d'utilisation - TP Docker & Compose

## Demarrage du projet

### 1. Lancer tous les services
```bash
docker compose up -d
```

### 2. Verifier que tout fonctionne
```bash
# Verifier l'etat des conteneurs
docker compose ps

# Verifier les logs
docker compose logs api
docker compose logs db
```

## Tester les routes de l'API

Les routes de l'API sont utilisables des que le projet est lance. Il est possible de les tester avec `curl`, mais il est conseille d'utiliser Bruno car c'est plus pratique pour envoyer des requetes HTTP, modifier le body JSON, relancer plusieurs tests rapidement et conserver une collection propre pour le rendu.

### Ouvrir la collection Bruno

1. Installer puis ouvrir Bruno : https://www.usebruno.com/downloads
2. Cliquer sur `Open Collection`.
3. Selectionner le dossier `TP-1/bruno`.
4. Choisir l'environnement `local`.
5. Lancer les requetes `Get Health`, `Create Note` et `List Notes`.

## Manipulations a effectuer

### Etape 1 : Verifier que l'API fonctionne

#### Test de sante de l'API
```bash
curl http://localhost:3000/health
```
**Resultat attendu :**
```json
{"status":"ok","database":"up"}
```

#### Acces a l'API
```bash
curl http://localhost:3000/notes
```
**Resultat attendu :**
```json
[]
```

### Etape 2 : Creer et manipuler des donnees

#### Creer une note
```bash
curl -X POST http://localhost:3000/notes \
  -H "Content-Type: application/json" \
  -d '{"title": "Premiere note", "content": "Contenu de ma premiere note"}'
```

**Resultat attendu :**
```json
{
  "id": 1,
  "title": "Premiere note",
  "content": "Contenu de ma premiere note",
  "created_at": "2024-03-26T12:00:00.000Z"
}
```

#### Lister toutes les notes
```bash
curl http://localhost:3000/notes
```

#### Creer plusieurs notes pour les tests
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

### Etape 3 : Tester la persistance des donnees

#### 3.1 Arreter uniquement l'API
```bash
docker compose stop api
docker compose rm api
```

#### 3.2 Verifier que la base de donnees tourne toujours
```bash
docker compose ps
```
**Observation attendue :** Seul le service `db` doit etre actif.

#### 3.3 Relancer l'API
```bash
docker compose up -d api
```

#### 3.4 Verifier que les donnees sont toujours la
```bash
curl http://localhost:3000/notes
```
**Observation attendue :** Toutes les notes creees precedemment doivent etre presentes.

### Etape 4 : Tester la persistance complete

#### 4.1 Arreter tous les services
```bash
docker compose down
```

#### 4.2 Relancer tout le projet
```bash
docker compose up -d
```

#### 4.3 Verifier que les donnees survivent
```bash
curl http://localhost:3000/notes
```
**Observation attendue :** Les donnees doivent etre intactes car le volume `postgres_data` persiste.

#### 4.4 Test avec suppression des volumes (pour comparaison)
```bash
# Cela supprimera toutes les donnees
docker compose down -v
docker compose up -d
curl http://localhost:3000/notes
```
**Observation attendue :** La liste est vide, mais la table existe grace a `init.sql`.

### Etape 5 : Observer les logs et comportements

#### Logs de l'API au demarrage
```bash
docker compose logs api
```
**A observer :**
- Message de connexion a la base de donnees
- Message `Server listening on http://localhost:3000`

#### Logs de la base de donnees
```bash
docker compose logs db
```
**A observer :**
- Messages d'initialisation de PostgreSQL
- Logs des connexions depuis l'API

## Nettoyage complet (fin de TP)

```bash
# Supprimer tout sauf les images
docker compose down -v

# Optionnel : supprimer aussi les images
docker compose down -v --rmi all
```
