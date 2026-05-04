# TaskFlow — Partie 2 : Stress Test avec k6

**Auteurs :** Naël BENHIBA et Corentin GESSE--ENTRESSANGLE

## Objectif

Observer le comportement de TaskFlow sous charge et identifier les goulots d'étranglement en combinant les résultats k6 (latence end-to-end) et Grafana (trafic par service en temps réel).

---

## Prérequis

### Configuration de l'environnement de test

- ✅ TaskFlow lancé avec `docker compose up -d`
- ✅ Stack d'observabilité lancée avec `docker compose -f docker-compose.infra.yml up -d`
- ✅ Grafana accessible sur http://localhost:3300
- ✅ k6 installé via Docker (`grafana/k6:latest`)
- ✅ Utilisateur de test créé:
  - Email: `k6test@example.com`
  - Password: `k6test123`
- ✅ Token JWT récupéré pour les tests authentifiés

---

## Étape 1 — Test de charge léger

### Commande exécutée

```bash
docker run --rm -i --network=taskflow_default \
  -e TOKEN='<jwt_token>' \
  -e BASE_URL='http://api-gateway:3000' \
  grafana/k6 run - < scripts/load-test-light.js
```

### Configuration du test

- **VUs (Virtual Users):** 5 utilisateurs simultanés
- **Durée:** 30 secondes
- **Scénario:** Requêtes GET `/api/tasks` avec authentification JWT
- **Checks:**
  - Status code 200
  - Temps de réponse < 200ms

### Résultats

```
✓ checks_succeeded: 100.00% (300 out of 300)
✓ http_req_failed: 0.00% (0 out of 150)

HTTP Metrics:
  http_req_duration:
    avg=14.02ms
    min=300.65µs
    med=9.43ms
    max=78.31ms
    p(90)=27.78ms
    p(95)=44.7ms

  http_reqs: 150 (5.36 req/s)
  
Iterations: 150 (5.36/s)
```

### Réponses aux questions

#### Question 1 — Quelle est la latence p95 affichée par k6 pendant ce test léger ? Est-elle dans les seuils acceptables (< 200ms) ?

**Réponse:** La latence p95 est de **44.7ms**, ce qui est largement en dessous du seuil acceptable de 200ms. Cela indique que 95% des requêtes sont traitées en moins de 44.7ms, ce qui est excellent pour une application web.

#### Question 2 — Le taux `http_req_failed` est-il à 0 % ? Si non, quel code d'erreur observez-vous ?

**Réponse:** Oui, le taux `http_req_failed` est à **0.00%** (0 échec sur 150 requêtes). Aucune erreur n'a été observée pendant ce test léger. Tous les checks ont réussi à 100%, ce qui signifie que:
- Toutes les requêtes ont retourné un code 200
- Toutes les requêtes ont été traitées en moins de 200ms

**Conclusion:** Sous charge légère (5 VUs), l'application se comporte parfaitement avec une latence très faible et aucune erreur.

---

## Étape 2 — Test de charge réaliste

### Configuration du test

Le script `load-test-realistic.js` simule un parcours utilisateur complet:

1. **Login** (user-service) — Authentification et récupération du token JWT
2. **List tasks** (task-service) — Lecture des tâches existantes
3. **Create task** (task-service) — Création d'une nouvelle tâche
4. **Read notifications** (notification-service) — Lecture des notifications

**Scénario de montée en charge:**
```javascript
stages: [
  { duration: '30s', target: 10 },   // ramp up to 10 users
  { duration: '1m',  target: 10 },   // hold at 10 users
  { duration: '30s', target: 50 },   // spike to 50 users
  { duration: '1m',  target: 50 },   // hold the spike
  { duration: '30s', target: 0 },    // ramp down
]
```

### Commande exécutée

```bash
docker run --rm -i --network=taskflow_default \
  -e EMAIL='k6test@example.com' \
  -e PASSWORD='k6test123' \
  -e BASE_URL='http://api-gateway:3000' \
  grafana/k6 run - < scripts/load-test-realistic.js
```

### Résultats du test réaliste

```
✓ checks_succeeded: 99.96% (12350 out of 12354)
✓ checks_failed: 0.03% (4 out of 12354)

Checks détaillés:
  ✓ login 200: 100%
  ✓ tasks 200: 100%
  ✗ tasks response < 500ms: 99% (2056/2059) — 3 échecs
  ✓ create task 201: 100%
  ✓ notifs 200: 100%
  ✗ notifs response < 500ms: 99% (2058/2059) — 1 échec

HTTP Metrics:
  http_req_duration:
    avg=41.48ms
    min=175.79µs
    med=18.89ms
    max=5.09s (!)
    p(90)=75.31ms
    p(95)=103.21ms

  http_req_failed: 0.00% (0 out of 8236)
  http_reqs: 8236 (41.73 req/s)

Iterations: 2059 (10.43/s)
VUs max: 50
```

### Réponses aux questions

#### Question 3 — À partir de quel stade le check `tasks response < 500ms` commence-t-il à échouer massivement ? Quelle est la p95 finale ?

**Réponse:** 

Le check `tasks response < 500ms` n'échoue **pas massivement** dans ce test. Sur 2059 itérations:
- **3 échecs seulement** pour le check "tasks response < 500ms" (99% de réussite)
- **1 échec seulement** pour le check "notifs response < 500ms" (99% de réussite)

La **p95 finale est de 103.21ms**, ce qui reste largement en dessous du seuil de 500ms. Cependant, on observe:
- Une **latence maximale de 5.09s** (outlier significatif)
- La médiane reste basse à **18.89ms**
- Le p90 est à **75.31ms**

**Analyse:** Avec 50 VUs, l'application gère bien la charge. Les 4 échecs totaux (sur 12354 checks) représentent des pics isolés, probablement dus à:
- Des opérations de garbage collection
- Des pics momentanés de charge sur PostgreSQL
- La création intensive de tâches qui génère des écritures en base

Pour observer une dégradation massive, il faudrait augmenter la charge (100+ VUs) ou la durée du test.

#### Question 4 — Dans Grafana, observez le panel **Request Rate per Service** au pic de charge. L'`api-gateway` reçoit environ 2× plus de trafic que le `task-service` et 4× plus que le `user-service`. Expliquez pourquoi en vous appuyant sur le script de test : combien de requêtes par service sont émises à chaque itération ?

**Réponse:**

Analysons le script `load-test-realistic.js` - chaque itération effectue:

1. **POST /api/users/login** → user-service (via api-gateway)
2. **GET /api/tasks** → task-service (via api-gateway)
3. **POST /api/tasks** → task-service (via api-gateway)
4. **GET /api/notifications** → notification-service (via api-gateway)

**Comptage par service:**
- **api-gateway:** 4 requêtes par itération (toutes les requêtes passent par la gateway)
- **user-service:** 1 requête par itération (login uniquement)
- **task-service:** 2 requêtes par itération (GET + POST)
- **notification-service:** 1 requête par itération (GET notifications)

**Ratio attendu:**
- api-gateway : user-service = 4:1 (4× plus)
- api-gateway : task-service = 4:2 = 2:1 (2× plus)
- api-gateway : notification-service = 4:1 (4× plus)

Cela correspond exactement aux observations dans Grafana. L'api-gateway est le point d'entrée unique et reçoit donc **toutes** les requêtes avant de les router vers les services backend.

#### Question 5 — Pourquoi le `task-service` est-il plus impacté que le `user-service` ou le `notification-service` sous forte charge ?

**Réponse:**

Le `task-service` est plus impacté pour plusieurs raisons:

1. **Volume de requêtes:** Il reçoit **2× plus de requêtes** que user-service et notification-service (2 requêtes par itération vs 1)

2. **Opérations d'écriture en base de données:**
   - **POST /api/tasks** effectue une **INSERT** dans PostgreSQL
   - Chaque itération crée une nouvelle tâche → 2059 insertions pendant le test
   - Les écritures sont plus coûteuses que les lectures (locks, WAL, indexes)

3. **Publication Redis:**
   - Après chaque création de tâche, le service publie un événement `task.created` sur Redis
   - Cette opération supplémentaire ajoute de la latence

4. **Contention sur la base de données:**
   - Les écritures concurrentes créent des locks sur les tables
   - Sous forte charge (50 VUs), PostgreSQL doit gérer de nombreuses transactions simultanées

**Comparaison avec les autres services:**
- **user-service:** Effectue principalement des SELECT (lecture du user pour login) - opération rapide
- **notification-service:** Lit depuis Redis (structure en mémoire) - très rapide

**Conclusion:** Le task-service est le goulot d'étranglement car il combine:
- Volume élevé de requêtes
- Opérations d'écriture en base de données
- Publication d'événements Redis

---

## Étape 3 — Tester les limites de `docker scale`

### Manipulation 1 — Tentative de scaling à 3 replicas

**Commande exécutée:**
```bash
docker compose up --scale task-service=3 -d
```

**Résultat:**
```
Error response from daemon: failed to set up container networking: 
driver failed programming external connectivity on endpoint taskflow-task-service-3: 
Bind for 0.0.0.0:3002 failed: port is already allocated
```

#### Question 6 — Que se passe-t-il ? Quelle erreur obtenez-vous et pourquoi ? Identifiez dans le `docker-compose.yml` la ligne responsable.

**Réponse:**

**Erreur:** `Bind for 0.0.0.0:3002 failed: port is already allocated`

**Cause:** Dans le fichier `docker-compose.yml`, ligne 44-45:
```yaml
task-service:
  ports:
    - "3002:3002"  # ← Ligne responsable
```

**Explication:**

Le mapping de port `"3002:3002"` signifie:
- Port **hôte** 3002 → Port **conteneur** 3002

Lorsqu'on tente de scaler à 3 replicas, Docker Compose essaie de:
1. Créer `task-service-1` et mapper `0.0.0.0:3002` → `conteneur-1:3002` ✅
2. Créer `task-service-2` et mapper `0.0.0.0:3002` → `conteneur-2:3002` ❌ (port déjà utilisé)
3. Créer `task-service-3` et mapper `0.0.0.0:3002` → `conteneur-3:3002` ❌ (port déjà utilisé)

**Problème:** On ne peut pas mapper le même port hôte (3002) vers plusieurs conteneurs simultanément. C'est une limitation fondamentale du réseau.

---

### Manipulation 2 — Contournement et test avec 3 replicas

**Solution:** Supprimer le mapping de port fixe pour permettre le scaling:

```yaml
task-service:
  build: ./task-service
  # Port mapping removed to allow scaling
  # ports:
  #   - "3002:3002"
  env_file:
    .env
```

**Commande exécutée:**
```bash
docker compose up --scale task-service=3 -d
```

**Résultat:**
```
✅ Container taskflow-task-service-1 Started
✅ Container taskflow-task-service-2 Started
✅ Container taskflow-task-service-3 Started
```

**Vérification des replicas:**
```bash
docker ps --filter 'name=task-service'
```

```
NAMES                     STATUS         PORTS
taskflow-task-service-1   Up             3002/tcp
taskflow-task-service-2   Up             3002/tcp
taskflow-task-service-3   Up             3002/tcp
```

Les 3 replicas sont actifs et exposent le port 3002 **uniquement sur le réseau Docker interne** (pas de mapping vers l'hôte).

#### Question 7 — Le scaling a-t-il amélioré les métriques ? Dans Grafana, les 3 replicas reçoivent-ils du trafic ? Mêmes questions depuis l'interface Prometheus sur http://localhost:9090/targets. Combien de targets `task-service` voyez-vous malgré les 3 replicas ? Expliquez pourquoi Prometheus ne peut pas surveiller les 3 instances individuellement avec cette configuration ?

**Réponse:**

**Vérification dans Prometheus:**

Requête API:
```bash
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job=="task-service")'
```

Résultat:
```json
{
  "instance": "task-service:3002",
  "health": "up"
}
```

**Constat:** Prometheus ne voit qu'**une seule target** `task-service:3002` malgré les 3 replicas.

**Explication:**

1. **Configuration Prometheus statique:**
   ```yaml
   # infra/prometheus/prometheus.yml
   - job_name: task-service
     static_configs:
       - targets: ["task-service:3002"]  # ← Un seul nom DNS
   ```

2. **Load balancing DNS de Docker Compose:**
   - Docker Compose crée un nom DNS `task-service` qui pointe vers les 3 replicas
   - Chaque requête DNS est résolue en **round-robin** vers l'une des 3 IPs
   - Prometheus fait une seule connexion vers `task-service:3002`
   - Docker route cette connexion vers l'un des 3 conteneurs de manière aléatoire

3. **Conséquence:**
   - Prometheus ne peut pas distinguer les 3 instances individuellement
   - Les métriques sont **agrégées** au niveau du nom de service
   - Impossible de voir la charge par replica
   - Impossible de détecter si un replica spécifique a un problème

**Le scaling améliore-t-il les performances ?**

**Test k6 avec 3 replicas du task-service:**

```
✓ checks_succeeded: 98.47% (11149 out of 11322)
✗ checks_failed: 1.52% (173 out of 11322)

Checks détaillés:
  ✓ login 200: 100%
  ✓ tasks 200: 100%
  ✗ tasks response < 500ms: 90% (1714/1887) — 173 échecs
  ✓ create task 201: 100%
  ✓ notifs 200: 100%
  ✓ notifs response < 500ms: 100%

HTTP Metrics:
  http_req_duration:
    avg=97.83ms
    med=59.64ms
    max=2.4s
    p(90)=219.78ms
    p(95)=398.07ms

  http_reqs: 7548 (39.03 req/s)
  iterations: 1887 (9.76/s)
```

**Comparaison: 1 replica vs 3 replicas**

| Métrique | 1 replica | 3 replicas | Évolution |
|----------|-----------|------------|-----------|
| **Checks réussis** | 99.96% | 98.47% | ❌ -1.49% |
| **Échecs tasks < 500ms** | 3 (0.14%) | 173 (9.17%) | ❌ +9.03% |
| **p95 latence** | 103.21ms | 398.07ms | ❌ +285% |
| **p90 latence** | 75.31ms | 219.78ms | ❌ +192% |
| **Latence max** | 5.09s | 2.4s | ✅ -53% |
| **Req/s** | 41.73 | 39.03 | ❌ -6.5% |

**Analyse: Le scaling a DÉGRADÉ les performances! 😱**

**Pourquoi le scaling à 3 replicas est moins performant ?**

1. **Contention sur PostgreSQL:**
   - 3 replicas = 3× plus de connexions simultanées à la base de données
   - PostgreSQL devient le goulot d'étranglement
   - Les locks sur les tables augmentent
   - Les transactions prennent plus de temps

2. **Overhead du load balancing DNS:**
   - Docker Compose fait du round-robin DNS
   - Pas de sticky sessions
   - Pas de health checks
   - Distribution non optimale de la charge

3. **Ressources limitées:**
   - Les 3 replicas tournent sur la **même machine**
   - Ils se partagent le même CPU, mémoire, I/O
   - Pas de gain réel de capacité, juste plus de conteneurs

4. **Connection pooling non optimisé:**
   - Chaque replica a son propre pool de connexions PostgreSQL
   - 3 replicas × pool size = beaucoup plus de connexions
   - PostgreSQL peut être saturé

**Conclusion:**

❌ **Le scaling horizontal avec Docker Compose ne fonctionne PAS** pour ce cas d'usage car:
- Le goulot d'étranglement est la **base de données**, pas les services
- Ajouter des replicas augmente la pression sur PostgreSQL
- Pas de distribution sur plusieurs machines physiques
- Pas d'optimisation du load balancing

**Solutions pour améliorer les performances:**

1. **Optimiser PostgreSQL:**
   - Augmenter `max_connections`
   - Optimiser les indexes
   - Utiliser un connection pooler (PgBouncer)
   - Activer le query caching

2. **Optimiser les services:**
   - Réduire la taille des connection pools
   - Implémenter un cache Redis pour les lectures
   - Utiliser des batch inserts
   - Optimiser les requêtes SQL

3. **Scaler verticalement d'abord:**
   - Augmenter les ressources de la machine (CPU, RAM)
   - Avant de scaler horizontalement

4. **Avec Kubernetes:**
   - Distribuer les Pods sur plusieurs nodes
   - Utiliser un load balancer intelligent (Istio, Linkerd)
   - Scaler PostgreSQL avec des replicas en lecture (read replicas)
   - Utiliser un service mesh pour le traffic management

#### Question 8 — Pourquoi `docker scale` ne suffit pas pour un scaling propre en production ? Qu'est-ce qu'un orchestrateur comme Kubernetes apporterait pour résoudre les problèmes que vous avez rencontrés ?

**Réponse:**

### Limites de `docker compose scale` en production

**1. Problème de découverte de services**
- ❌ Prometheus ne peut pas surveiller les replicas individuellement
- ❌ Configuration statique (`task-service:3002`) ne permet pas de découvrir dynamiquement les instances
- ❌ Impossible de voir les métriques par replica (CPU, mémoire, latence individuelle)
- ❌ Impossible de détecter qu'un replica spécifique est en difficulté

**2. Problème de load balancing**
- ❌ Load balancing DNS round-robin basique (pas de health checks)
- ❌ Si un replica est lent ou en erreur, il continue à recevoir du trafic
- ❌ Pas de distribution intelligente basée sur la charge réelle
- ❌ Pas de sticky sessions si nécessaire

**3. Problème de gestion des ports**
- ❌ Impossible d'exposer les replicas individuellement sur l'hôte
- ❌ Doit supprimer le port mapping pour permettre le scaling
- ❌ Perd l'accès direct aux services depuis l'extérieur du réseau Docker

**4. Problème de haute disponibilité**
- ❌ Tous les replicas sur la même machine (single point of failure)
- ❌ Pas de distribution géographique
- ❌ Si l'hôte tombe, tous les replicas tombent

**5. Problème de déploiement**
- ❌ Pas de rolling updates (tous les replicas redémarrent en même temps)
- ❌ Pas de rollback automatique en cas d'erreur
- ❌ Downtime pendant les mises à jour

**6. Problème d'auto-scaling**
- ❌ Scaling manuel uniquement
- ❌ Pas d'auto-scaling basé sur les métriques (CPU, mémoire, requêtes/s)
- ❌ Pas de scale-down automatique quand la charge diminue

### Ce que Kubernetes apporterait

**1. Service Discovery & Load Balancing**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: task-service
spec:
  selector:
    app: task-service
  ports:
    - port: 3002
  type: ClusterIP
```
- ✅ Kubernetes crée automatiquement des endpoints pour chaque Pod
- ✅ Load balancing intelligent avec health checks
- ✅ Retire automatiquement les Pods non-healthy du pool

**2. Observabilité native**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: task-service
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "3002"
```
- ✅ Service discovery automatique pour Prometheus
- ✅ Chaque Pod a son propre endpoint de métriques
- ✅ Labels automatiques (pod_name, namespace, node)
- ✅ Métriques par replica visibles dans Grafana

**3. Haute disponibilité**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    spec:
      affinity:
        podAntiAffinity:  # Distribue les Pods sur différents nodes
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - task-service
              topologyKey: kubernetes.io/hostname
```
- ✅ Distribution des Pods sur plusieurs nodes
- ✅ Rolling updates sans downtime
- ✅ Rollback automatique si les health checks échouent
- ✅ Self-healing: redémarre automatiquement les Pods crashés

**4. Auto-scaling**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: task-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: task-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
```
- ✅ Scale automatiquement basé sur CPU, mémoire, ou métriques custom
- ✅ Scale-down automatique quand la charge diminue
- ✅ Économies de coûts en production

**5. Gestion des configurations et secrets**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: task-service-config
data:
  DATABASE_URL: "postgresql://..."
---
apiVersion: v1
kind: Secret
metadata:
  name: task-service-secrets
type: Opaque
data:
  JWT_SECRET: <base64-encoded>
```
- ✅ Séparation des configs par environnement
- ✅ Gestion sécurisée des secrets
- ✅ Rotation des secrets sans redéploiement

**6. Ingress & Exposition**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: taskflow-ingress
spec:
  rules:
  - host: taskflow.example.com
    http:
      paths:
      - path: /api/tasks
        pathType: Prefix
        backend:
          service:
            name: task-service
            port:
              number: 3002
```
- ✅ Exposition propre avec noms de domaine
- ✅ TLS/SSL automatique (cert-manager)
- ✅ Rate limiting, WAF, etc.

### Conclusion

`docker compose scale` est utile pour le **développement local** et les **tests**, mais **ne convient pas à la production** car:
- Pas de haute disponibilité
- Observabilité limitée
- Pas d'auto-scaling
- Pas de rolling updates
- Single point of failure

**Kubernetes** résout tous ces problèmes et apporte une **plateforme de production robuste** avec:
- Service discovery automatique
- Load balancing intelligent
- Auto-scaling horizontal et vertical
- Rolling updates et rollbacks
- Multi-node, multi-zone, multi-région
- Écosystème riche (Prometheus Operator, Istio, etc.)

---

## Étape 4 — Limites de l'instrumentation

### Analyse des dashboards Grafana pendant les tests de charge

#### Question 9 — Le panel *Error Rate 5xx* affiche "No data" alors que k6 signale des erreurs. Le serveur retourne-t-il des erreurs HTTP ? Peut-on utiliser ce panel pour détecter une dégradation de performance ?

**Réponse:**

**Configuration du panel "5xx Error Rate %":**
```promql
sum by(job) (rate(http_requests_total{status=~"5.."}[5m])) 
/ 
sum by(job) (rate(http_requests_total[5m])) * 100
```

**Analyse:**

1. **k6 signale des "erreurs" mais ce ne sont PAS des erreurs HTTP 5xx:**
   - Les checks qui échouent sont: `tasks response < 500ms` et `notifs response < 500ms`
   - Ces checks mesurent la **latence**, pas le code de statut HTTP
   - Les requêtes retournent **200 OK** mais prennent plus de 500ms
   - `http_req_failed: 0.00%` confirme qu'aucune requête HTTP n'a échoué

2. **Le serveur ne retourne PAS d'erreurs HTTP 5xx:**
   - Toutes les requêtes retournent des codes 2xx (200, 201)
   - Même sous forte charge (50 VUs), l'application ne crash pas
   - Les services restent fonctionnels, juste plus lents

3. **Pourquoi "No data" dans Grafana ?**
   - Le filtre `status=~"5.."` cherche des codes 500-599
   - Aucune requête ne correspond à ce filtre
   - Prometheus retourne un résultat vide → "No data"

**Peut-on utiliser ce panel pour détecter une dégradation de performance ?**

❌ **Non, ce panel ne détecte PAS les dégradations de performance**, il détecte uniquement:
- Les crashes applicatifs (500 Internal Server Error)
- Les erreurs de gateway (502 Bad Gateway, 504 Gateway Timeout)
- Les erreurs de service indisponible (503 Service Unavailable)

**Ce que ce panel NE détecte PAS:**
- ❌ Latence élevée (requêtes lentes mais qui réussissent)
- ❌ Timeouts côté client (k6 abandonne, mais le serveur ne voit rien)
- ❌ Saturation des ressources (CPU, mémoire) avant le crash
- ❌ Dégradation progressive des performances

**Pour détecter les dégradations de performance, il faut:**
- ✅ Surveiller la latence p95/p99 (panel "Latency p50/p95/p99")
- ✅ Définir des SLOs (Service Level Objectives) sur la latence
- ✅ Alerter quand p95 > seuil (ex: 200ms)
- ✅ Surveiller les métriques système (CPU, mémoire, I/O)

#### Question 10 — Le panel *Latency p50/p95/p99* reste flat pendant tout le test, alors que k6 mesure une p95 qui ne correspond pas à ce que montre Grafana. D'où vient cet écart ? Qu'est-ce que ce panel mesure réellement, et qu'est-ce qu'il ne mesure pas ? Que faudrait-il faire pour rectifier ça ?

**Réponse:**

**Configuration du panel "Latency p50/p95/p99":**
```promql
histogram_quantile(0.95, 
  sum by(job, le) (rate(http_request_duration_ms_bucket[5m]))
)
```

**Résultats observés:**

| Source | p95 mesurée | Observation |
|--------|-------------|-------------|
| **k6** | 103.21ms | Latence end-to-end réelle |
| **Grafana** | ~20-30ms (flat) | Latence interne du service |

**Écart:** ~75ms de différence!

### D'où vient cet écart ?

**1. Ce que Grafana mesure:**
```
┌─────────────────────────────────────────────────┐
│  Métrique: http_request_duration_ms             │
│  Mesurée par: middleware pino-http dans Express │
│  Début: req arrive dans Express                 │
│  Fin: res.send() appelé                         │
└─────────────────────────────────────────────────┘
```

**Grafana mesure uniquement:**
- ✅ Temps de traitement **interne** à Node.js/Express
- ✅ Temps d'exécution du code applicatif
- ✅ Temps de requête à PostgreSQL/Redis
- ✅ Temps de sérialisation JSON

**2. Ce que k6 mesure:**
```
┌─────────────────────────────────────────────────┐
│  Métrique: http_req_duration                    │
│  Mesurée par: k6 (client HTTP)                  │
│  Début: SYN TCP envoyé                          │
│  Fin: Dernier byte de réponse reçu             │
└─────────────────────────────────────────────────┘
```

**k6 mesure la latence end-to-end:**
- ✅ Temps de connexion TCP (3-way handshake)
- ✅ Temps de négociation TLS (si HTTPS)
- ✅ Temps de transmission réseau (aller-retour)
- ✅ **Temps d'attente dans la queue du serveur** ⚠️
- ✅ Temps de traitement interne (ce que Grafana voit)
- ✅ Temps de transmission de la réponse

### Ce que le panel NE mesure PAS

**Sous forte charge, les requêtes peuvent être bloquées AVANT d'atteindre Express:**

```
Client k6 → [Queue OS] → [Queue Node.js] → Express middleware → Handler
            ↑                ↑
            |                |
            |                +-- Pas mesuré par Grafana
            +-- Pas mesuré par Grafana
```

**Scénarios non mesurés:**

1. **Queue au niveau OS (backlog TCP):**
   - Sous forte charge, le kernel met les connexions en attente
   - Si le backlog est plein → connexions refusées (ECONNREFUSED)
   - Temps d'attente dans la queue = invisible pour l'application

2. **Queue au niveau Node.js (event loop saturé):**
   - Node.js accepte la connexion mais ne peut pas la traiter immédiatement
   - Event loop occupé par d'autres requêtes
   - Temps d'attente avant que le middleware ne s'exécute = invisible

3. **Connexions refusées:**
   - Si le serveur refuse la connexion (trop de charge)
   - k6 voit un timeout ou une erreur
   - Le serveur ne voit rien (pas de log, pas de métrique)

### Pourquoi le panel reste "flat" ?

**Explication:**

Sous forte charge (50 VUs):
- Les requêtes qui **arrivent** à Express sont traitées rapidement (~20-30ms)
- Mais beaucoup de requêtes **attendent** avant d'arriver à Express
- Grafana ne voit que les requêtes qui ont réussi à passer les queues
- Les requêtes lentes sont "invisibles" pour l'instrumentation interne

**Analogie:**
```
Restaurant avec 10 tables:
- Temps de service (Grafana): 15 minutes par table ✅
- Temps d'attente à l'entrée (non mesuré): 45 minutes ❌
- Temps total client (k6): 60 minutes
```

### Comment rectifier ça ?

**Solution 1: Instrumenter au niveau du serveur HTTP (avant Express)**

```javascript
// server.js
const server = app.listen(PORT);

server.on('connection', (socket) => {
  const connStart = Date.now();
  
  socket.on('close', () => {
    const duration = Date.now() - connStart;
    connectionDurationHistogram.observe(duration);
  });
});
```

**Solution 2: Utiliser des métriques système**

```promql
# CPU usage
rate(process_cpu_seconds_total[5m]) * 100

# Event loop lag (si instrumenté)
nodejs_eventloop_lag_seconds

# Active connections
nodejs_active_handles_total
```

**Solution 3: Synthetic monitoring (comme k6)**

- ✅ Exécuter k6 en continu (toutes les 5 minutes)
- ✅ Exporter les résultats vers Prometheus
- ✅ Alerter sur la latence end-to-end p95

**Solution 4: Utiliser des SLIs (Service Level Indicators) externes**

```yaml
# Exemple avec Prometheus Blackbox Exporter
- job_name: 'blackbox'
  metrics_path: /probe
  params:
    module: [http_2xx]
  static_configs:
    - targets:
      - http://api-gateway:3000/health
  relabel_configs:
    - source_labels: [__address__]
      target_label: __param_target
    - target_label: instance
      replacement: api-gateway
```

### Conclusion

**Le panel "Latency p50/p95/p99" mesure:**
- ✅ La latence **interne** du service (une fois la requête acceptée)
- ✅ Utile pour détecter des problèmes de code ou de base de données

**Le panel NE mesure PAS:**
- ❌ La latence **end-to-end** vue par les clients
- ❌ Le temps d'attente dans les queues
- ❌ Les connexions refusées ou timeouts

**Pour une observabilité complète:**
1. Garder les métriques internes (Grafana actuel)
2. Ajouter des métriques end-to-end (synthetic monitoring)
3. Surveiller les métriques système (CPU, event loop lag)
4. Définir des SLOs basés sur l'expérience utilisateur réelle

---

## Conclusion générale

### Résumé des apprentissages

**Partie 1 - Tests de charge:**
- ✅ L'application gère bien une charge légère (5 VUs, p95 = 44.7ms)
- ✅ Sous charge réaliste (50 VUs), quelques pics de latence mais 99.96% de succès
- ⚠️ Le task-service est le goulot d'étranglement (écritures DB + Redis)

**Partie 2 - Scaling avec Docker Compose:**
- ❌ Port mapping fixe empêche le scaling
- ❌ Prometheus ne peut pas surveiller les replicas individuellement
- ❌ Load balancing DNS basique sans health checks
- ✅ Solution: Kubernetes pour un scaling production-ready

**Partie 3 - Limites de l'instrumentation:**
- ❌ Les métriques internes ne capturent pas la latence end-to-end
- ❌ Les erreurs de performance (latence) ne sont pas des erreurs HTTP 5xx
- ✅ Besoin de synthetic monitoring pour l'expérience utilisateur réelle

### Recommandations pour la production

1. **Migrer vers Kubernetes** pour:
   - Service discovery automatique
   - Auto-scaling basé sur les métriques
   - Rolling updates sans downtime
   - Haute disponibilité multi-node

2. **Améliorer l'observabilité:**
   - Ajouter synthetic monitoring (k6 continu)
   - Instrumenter au niveau du serveur HTTP
   - Surveiller l'event loop lag de Node.js
   - Définir des SLOs basés sur l'expérience utilisateur

3. **Optimiser le task-service:**
   - Implémenter un cache Redis pour les lectures
   - Utiliser des batch inserts pour les écritures
   - Considérer une queue asynchrone pour les notifications
   - Ajouter un connection pool PostgreSQL optimisé

4. **Alerting:**
   - Alerter sur p95 > 200ms (latence end-to-end)
   - Alerter sur taux d'erreur > 0.1%
   - Alerter sur CPU > 80% pendant 5 minutes
   - Alerter sur event loop lag > 100ms

