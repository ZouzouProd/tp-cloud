# Réponses aux questions du cours

## Question 1 : Pourquoi une image locale ne suffit pas ?

Une image locale ne suffit pas car elle ne contient pas les dépendances externes dont l'application a besoin pour fonctionner. Par exemple, une application Node.js a besoin de PostgreSQL pour stocker ses données. Si on lance uniquement l'image de l'application, elle ne pourra pas se connecter à la base de données car PostgreSQL n'est pas installé dans l'image.

## Question 2 : Pourquoi faire la commande docker login ?

La commande `docker login` est nécessaire pour authentifier l'utilisateur auprès du registre Docker (Docker Hub). Cela permet de pousser des images vers le registre ou de les tirer (pull) depuis celui-ci. Sans cette authentification, l'utilisateur ne pourra pas accéder aux images privées ou pousser ses propres images.

## Question 3 : Quelles différences y a-t-il entre docker tag et docker build ?

`docker build` est utilisé pour construire une image à partir d'un Dockerfile, tandis que `docker tag` est utilisé pour donner un nom et une version à une image existante. Par exemple, `docker build -t mon-image:1.0 .` construit une image avec le nom "mon-image" et la version "1.0", tandis que `docker tag mon-image:1.0 mon-utilisateur/mon-image:1.0` donne un nom et une version à une image existante.

## Question 4 : Que ce qui se passe réellement avec un docker push ?

Lorsqu'on exécute `docker push`, l'image est envoyée vers le registre Docker (Docker Hub). Cela permet de partager l'image avec d'autres personnes ou de la déployer sur un serveur. L'image est stockée dans le registre et peut être téléchargée (pull) par d'autres utilisateurs.

## Question 5 : Pourquoi la solution suivante n'est-elle pas valable dans le Cloud ?

La solution de modifier directement l'image v1 n'est pas valable dans le Cloud car les images Docker doivent être immuables. Une fois déployée, une image ne peut pas être modifiée directement car cela briserait les principes de traçabilité, de reproductibilité et de sécurité. Les plateformes Cloud s'attendent à ce que les images soient des artefacts statiques avec un versionnement clair (v1, v2, etc.) pour permettre les rollback et l'audit des déploiements.
