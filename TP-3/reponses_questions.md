# Partie 4 - Questions écrites

## Pourquoi `latest` n'est pas une version ?

`latest` n'identifie pas une version précise du produit. C'est un tag flottant qui pointe simplement vers la dernière image poussée avec ce nom. Il peut donc changer dans le temps sans que le nom change, ce qui ne garantit ni la reproductibilité ni la traçabilité.

## Différence entre tag et digest

Un tag est un alias lisible par un humain, par exemple `latest`, `a43d72e...` ou `v1.0.0`. Il peut être déplacé vers une autre image.

Un digest est l'identifiant immuable d'une image, basé sur son contenu, par exemple `sha256:...`. Si le contenu change, le digest change. Le digest garantit donc que l'on parle exactement de la même image.

## Pourquoi séparer staging et prod ?

La séparation entre staging et production permet de valider une version dans un environnement intermédiaire avant exposition aux utilisateurs. Cela réduit le risque, permet de tester la configuration de déploiement dans des conditions proches du réel, et évite qu'un changement non vérifié impacte directement la production.

## Pourquoi une version `vX.Y.Z` ne doit jamais être reconstruite ?

Une version publiée doit rester stable et reproductible. Si on reconstruit `v1.0.0` plus tard, on risque d'obtenir une image différente à cause d'un changement de dépendances, d'environnement ou de configuration. On perd alors la garantie que `v1.0.0` désigne toujours exactement le même produit.

## Citez les avantages d'une PR gate

Une PR gate force le passage par une branche dédiée et par une vérification avant merge. Cela apporte plusieurs avantages : exécution automatique des tests avant intégration, réduction du risque d'introduire une régression sur `main`, meilleure revue des changements, historique plus clair des intégrations, et gouvernance plus stricte du dépôt.

## Qu'est-ce qui garantit la traçabilité ici ?

La traçabilité est assurée par plusieurs éléments combinés : l'historique Git, les pull requests, les workflows GitHub Actions, et les tags Docker publiés. En particulier, le tag d'image basé sur le commit (`<sha>`) permet de relier une image Docker à un commit Git précis, tandis qu'un tag de release comme `v1.0.0` permet d'identifier une version produit clairement nommée.
