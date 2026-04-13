# Réponses cours

## Partie 1

### Question 1 : Montrez les logs produit par logger, à quoi ressemble-t-il ?

Exemple de log **structuré JSON** produit par Pino :

```json
{
  "level": 30,
  "time": 1713020000000,
  "pid": 12345,
  "hostname": "api",
  "id": 42,
  "msg": "Note created"
}
```

### Question 2 : En quoi ce format diffère-t-il d'un console.log classique ?

Le format JSON permet de structurer les logs avec des clés et des valeurs, ce qui facilite la lecture et l'analyse des logs. Il permet également de filtrer les logs par clé et de les stocker dans une base de données.

### Question 3 : Que se passe-t-il si vous passez LOG_LEVEL=warn ? Quels logs disparaissent et pourquoi ?

Les logs info disparaissent car le niveau de log est passé à warn, ce qui signifie que seuls les logs warn et error sont affichés.

### Question 4 : Pourquoi ne peut-on pas stocker ces logs dans un fichier sur le cloud ? (scaling etc...)

Les fichiers sur le cloud sont volatiles et ne peuvent pas être stockés de manière persistante. Dans un environnement cloud avec scaling horizontal :

- **Volatilité des instances** : Les conteneurs/VMs peuvent être créés et détruits dynamiquement selon la charge
- **Absence de stockage local** : Les systèmes cloud utilisent souvent des systèmes de fichiers éphémères
- **Problèmes de scaling** : Avec plusieurs instances, chaque instance écrirait dans son propre fichier local, rendant l'agrégation des logs impossible
- **Perte de données** : Si une instance crash ou est remplacée, tous les logs locaux sont perdus

### Question 5 : Y a-t-il une information, dans les logs fournis par pino, que l'on pourrait utiliser pour corréler nos logs comme le ferait OTel ?

Oui : côté HTTP, on peut s’appuyer sur un **identifiant de requête** (souvent `req.id` via `pino-http`) pour **regrouper tous les logs liés à une même requête**.

Pour une corrélation “comme OTel” (multi-services), il faut surtout un **trace id** propagé (par ex. `traceId` / `trace_id` issu d’un header `traceparent` ou `x-request-id`) et l’inclure dans chaque log : ce n’est pas fourni “magiquement” par Pino, c’est à l’application/middlewares de l’ajouter.

## Partie 2

### Question 1 : Montrez les logs produit par pino-http sans configuration, quels champs apparaissent ?

```json
{
  "level": "info",
  "time": 1642734401234,
  "pid": 12345,
  "hostname": "localhost",
  "req": {
    "id": 1,
    "method": "GET",
    "url": "/",
    "headers": {
      "host": "localhost:3000",
      "user-agent": "curl/7.68.0"
    }
  }
}
```

Les champs qui apparaissent typiquement sont : `level`, `time`, `pid`, `hostname`, et un objet `req` (ex: `id`, `method`, `url`, `headers`). Selon la version/configuration, on voit aussi souvent `res.statusCode` et `responseTime` (log de fin de requête).

### Question 2 : Quelles informations manquent pour diagnostiquer une requête en erreur ?

Même si `pino-http` fournit déjà souvent `statusCode` et `responseTime`, il manque généralement ce qui fait vraiment gagner du temps en debug :
- La **raison explicite** côté application (ex: règle métier “title required”, validation, etc.)
- Un **niveau de log adapté** à l’issue (info/ warn/ error) pour filtrer/alerter proprement
- Éventuellement des **champs de corrélation** (`req.id`, `traceId`) pour relier les logs d’une même requête

### Question 3 : Montrer les logs obtenus lors d'un appel échoué à cause d'une règle métier, qu'est-ce qui a changé ?

```json
{
  "level": "warn",
  "time": 1642734401234,
  "pid": 12345,
  "hostname": "localhost",
  "req": { ... },
  "res": {
    "statusCode": 400,
    "headers": { ... }
  },
  "responseTime": 15,
  "msg": "Title is required"
}
```

Ce qui a changé : niveau de log `warn`, présence de `res` avec `statusCode`, `responseTime`, et un `msg` explicite.

### Question 4 : Et maintenant ceux d'une ressource not found

```json
{
  "level": "warn",
  "time": 1642734401234,
  "pid": 12345,
  "hostname": "localhost",
  "req": { ... },
  "res": {
    "statusCode": 404,
    "headers": { ... }
  },
  "responseTime": 8,
  "msg": "Resource not found"
}
```

### Question 5 : Quel niveau de log est utilisé pour une réponse 400 ? Pour une 200 ? Pourquoi cette distinction est-elle utile ?

- **400** : niveau `warn` - indique un problème client mais l'application fonctionne
- **200** : niveau `info` - flux normal réussi

Cette distinction est utile car elle permet de filtrer facilement les problèmes : `error` pour les bugs serveur, `warn` pour les erreurs client, `info` pour le fonctionnement normal.

## Partie 3

### Question 1 : Appelez /metrics sans avoir fait d'autres requêtes, quelles métriques apparaissent déjà ? D'où viennent-elles ?

```
# HELP nodejs_heap_size_used_bytes Number of bytes used by the heap.
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes 12345678

# HELP nodejs_eventloop_lag_seconds Lag of event loop in seconds.
# TYPE nodejs_eventloop_lag_seconds gauge
nodejs_eventloop_lag_seconds 0.001

# HELP process_cpu_seconds_total Total user and system CPU time spent in seconds.
# TYPE process_cpu_seconds_total counter
process_cpu_seconds_total 0.12
```

Ces métriques viennent de `prom-client` qui collecte automatiquement les métriques par défaut du processus Node.js.

### Question 2 : Après plusieurs appels à l'API, montrez le Counter de requêtes HTTP, quels labels apparaissent ?

```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/",status_code="200"} 5
http_requests_total{method="POST",route="/notes",status_code="201"} 3
http_requests_total{method="POST",route="/notes",status_code="400"} 2
```

Les labels qui apparaissent sont : `method`, `route`, et `status_code`.

### Question 3 : Quelle différence entre un Counter et un Histogram ? Pourquoi utiliser un Histogram pour le temps de réponse plutôt qu'un Counter ?

- **Counter** : incrémente seulement (monotonique croissant)
- **Histogram** : compte les observations dans des buckets et fournit des statistiques (somme, count, quantiles)

Pour le temps de réponse, un Histogram est préférable car il permet de calculer des percentiles (p95, p99) et de voir la distribution des temps, pas seulement la moyenne.

### Question 4 : Comment votre middleware sait-il que la requête est terminée avant d'enregistrer la métrique ?

Le middleware utilise `res.on('finish', ...)` qui s'exécute lorsque la réponse est entièrement envoyée au client, garantissant que toutes les opérations sont terminées.

### Question 5 : Donnez trois approches pour mesurer un temps de réponse, commentez-les et classez-les (précision, performance, fiabilité).

1. **`Date.now()` au début/fin** : Simple mais moins précis (ms), impact performance minimal
2. **`process.hrtime.bigint()`** : Très précis (ns), léger impact performance, plus fiable
3. **Performance hooks (`perf_hooks.performance.now()`)** : Précis (µs), impact performance modéré, fiable

**Classement** : `process.hrtime.bigint()` (meilleur précision/fiabilité) > `perf_hooks.performance.now()` > `Date.now()` (plus simple mais moins précis)

## Partie 4

### Question 1 : Montrer les réponses de vos endpoints quand tout fonctionne, quel statut HTTP et quel corps de réponse ?

```json
// GET /health - tout fonctionne
Status: 200 OK
{
  "status": "healthy",
  "timestamp": "2023-01-01T12:00:00.000Z",
  "uptime": 3600,
  "database": "connected"
}
```

### Question 2 : Montrer les réponses quand la base de données est down, les statuts HTTP ont-il changé ?

```json
// GET /health - base de données down
Status: 503 Service Unavailable
{
  "status": "unhealthy",
  "timestamp": "2023-01-01T12:00:00.000Z",
  "uptime": 3600,
  "database": "disconnected",
  "error": "Database connection failed"
}
```

Oui, le statut HTTP passe de 200 à 503.

### Question 3 : Pourquoi est-il important que le statut HTTP reflète l'état du service, et pas seulement le corps JSON ?

Car les systèmes d'orchestration (Kubernetes, load balancers) lisent les codes HTTP pour prendre des décisions :
- 200 : le service est prêt à recevoir du trafic
- 503 : le service ne doit pas recevoir de trafic
- Le corps JSON est pour les humains/debug, le statut HTTP est pour les machines

### Question 4 : Quelle différence entre une livenessProbe et une readinessProbe ? Lequel de vos endpoints correspond à chacune ?

- **LivenessProbe** : vérifie si le conteneur doit être redémarré (process vivant)
- **ReadinessProbe** : vérifie si le conteneur peut recevoir du trafic (dépendances OK)

Notre endpoint `/health` correspond à une **readinessProbe** car il vérifie les dépendances (base de données). Pour une livenessProbe, un endpoint simple vérifiant juste que le processus répondrait suffirait.

