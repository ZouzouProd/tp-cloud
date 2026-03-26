# Réponses aux questions théoriques

## Question 1 : Pourquoi séparer l’installation des dépendances et la copie du code ?

Cela permet de profiter des caches Docker. Si on copie le code avant d'installer les dépendances, et que le code ne change pas, Docker utilisera le cache pour l'étape d'installation des dépendances, ce qui sera plus rapide.

