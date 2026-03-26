# Réponses aux questions théoriques

## Question 1 : Pourquoi séparer l’installation des dépendances et la copie du code ?

Cela permet de profiter des caches Docker. Si on copie le code avant d'installer les dépendances, et que le code ne change pas, Docker utilisera le cache pour l'étape d'installation des dépendances, ce qui sera plus rapide.

## Question 2 : Pourquoi l'image Docker doit rester la même entre dev et prod ? Pourquoi l'API se connecte à db et pas à localhost ?

L'image Docker doit rester la même entre dev et prod pour garantir que l'application fonctionne de la même manière dans tous les environnements. Si on utilise des images différentes, on risque d'avoir des bugs qui apparaissent seulement en production parce que les versions de Node.js, les dépendances ou la configuration système ne sont pas identiques.

L'API se connecte à db et pas à localhost car dans le réseau Docker, chaque conteneur a son propre "localhost". Quand l'API tourne dans son conteneur, "localhost" pointe vers le conteneur API lui-même, pas vers la base de données. Mais Docker Compose crée un réseau privé où les conteneurs peuvent communiquer entre eux en utilisant leurs noms de service. Donc l'API peut trouver la base de données en utilisant simplement "db" comme nom d'hôte.

## Question 3 : Pourquoi la table notes n'existe plus au re-lunch (après un docker compose down) ?

Quand on fait `docker compose down`, les conteneurs sont supprimés, y compris le conteneur de la base de données PostgreSQL. Par défaut, les données de la base de données sont stockées à l'intérieur du conteneur, donc quand le conteneur est détruit, toutes les données disparaissent avec lui, y compris la table notes et toutes les entrées qu'elle contenait.

Pour garder les données entre les redémarrages, il faudrait utiliser un **volume Docker** pour persister les données de la base de données sur la machine hôte. Le volume survivrait à la suppression du conteneur et pourrait être réattaché au nouveau conteneur quand on relance `docker compose up`.

## Question 4 : Pourquoi ne met-on pas les données directement dans le container ? Quel composant est stateful ? Lequel est stateless ?

On ne met pas les données directement dans le container parce que les containers sont conçus pour être temporaires et éphémères. Si on stockait les données directement dans le container, elles seraient perdues quand le container serait arrêté ou supprimé.

Le composant stateful est la base de données (db), car elle doit conserver les données même quand les autres services sont redémarrés. Le composant stateless est l'API (api), car elle ne doit pas stocker d'état permanent - elle se contente de servir les données de la base de données et de gérer les requêtes entrantes.

## Question 5 : Pourquoi les secrets ne doivent-ils pas être dans le code ni dans le dépôt Git ? 

Les secrets ne doivent pas être dans le code ni dans le dépôt Git parce que cela compromettrait la sécurité de l'application. Si les secrets (comme les mots de passe, les clés d'API, les tokens d'authentification) sont visibles dans le code source ou dans l'historique du dépôt, n'importe qui ayant accès au code pourrait les récupérer et les utiliser pour accéder à la base de données, aux services externes ou à d'autres ressources protégées. Cela pourrait entraîner des violations de données, des accès non autorisés et des dommages financiers ou réputationnels importants.

Pour éviter cela, il est essentiel de stocker les secrets dans des variables d'environnement sécurisées, comme les fichiers `.env` ou des services de gestion des secrets (comme HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, etc.). Ces méthodes permettent de garder les secrets hors du code source et de les injecter dans les conteneurs uniquement au moment de l'exécution, de manière sécurisée et contrôlée.

