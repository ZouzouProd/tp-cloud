# Grille d'évaluation -- TP CI/CD

**Travail en binôme**

Doit être rendu sous la forme d'un **repository GitHub accompagné d'un
README structuré**.

Le projet doit démontrer la mise en place d'un **pipeline CI/CD complet
incluant tests automatisés, pipeline de build et processus de release**.

La note finale est calculée sur **100 points**.

------------------------------------------------------------------------

# 1. Fonctionnement global du pipeline CI/CD

  -----------------------------------------------------------------------
  Critère                             Description
  ----------------------------------- -----------------------------------
  Pipeline CI sur `main`              Un pipeline est déclenché
                                      automatiquement lors d'un push sur
                                      la branche principale

  Exécution des tests                 Les tests sont exécutés
                                      automatiquement dans la CI et
                                      conditionnent la suite du pipeline

  Construction de l'image Docker      L'image de l'application est
                                      construite automatiquement dans le
                                      pipeline

  Publication de l'image              L'image est publiée dans le
                                      registry avec les tags attendus

  Cohérence du pipeline               Le pipeline suit une logique claire
                                      et reproductible
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 2. Mise en place d'une PR gate

  -----------------------------------------------------------------------
  Critère                             Description
  ----------------------------------- -----------------------------------
  Workflow PR                         Un pipeline est déclenché lors
                                      d'une Pull Request

  Vérification automatique            Les tests sont exécutés afin de
                                      valider la qualité du code proposé

  Séparation des responsabilités      Le pipeline PR vérifie la qualité
                                      sans construire ni publier d'image

  Utilisation correcte du modèle Git  Le développement passe par des
                                      branches et des Pull Requests
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 3. Tests automatisés de l'API

  -----------------------------------------------------------------------
  Critère                             Description
  ----------------------------------- -----------------------------------
  Structure des tests                 Les tests sont organisés de manière
                                      claire et compréhensible

  Test des endpoints                  Les endpoints principaux de l'API
                                      sont testés

  Gestion des dépendances             Les dépendances externes (base de
                                      données) sont correctement simulées
                                      ou isolées

  Pertinence des tests                Les tests vérifient réellement le
                                      comportement attendu de l'API
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 4. Processus de release

  -----------------------------------------------------------------------
  Critère                             Description
  ----------------------------------- -----------------------------------
  Pipeline de release                 Un pipeline est déclenché lors de
                                      la création d'un tag Git

  Versionnement                       Les versions suivent une logique
                                      claire de versionnement

  Publication versionnée              L'image est publiée avec un tag
                                      correspondant à la version

  Traçabilité                         Le processus permet de relier une
                                      version de l'image à un commit
                                      précis
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 5. README et documentation

  -----------------------------------------------------------------------
  Critère                             Description
  ----------------------------------- -----------------------------------
  Notice d'installation               Le projet peut être installé et
                                      exécuté en suivant les instructions

  Description du pipeline             Le fonctionnement des pipelines
                                      CI/CD est expliqué

  Processus de release                Les étapes nécessaires pour publier
                                      une nouvelle version sont décrites

  Clarté de la documentation          La documentation permet de
                                      comprendre rapidement le
                                      fonctionnement du projet
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 6. Compréhension et analyse

  -----------------------------------------------------------------------
  Critère                             Description
  ----------------------------------- -----------------------------------
  Compréhension du versionnement      Les étudiants expliquent le rôle
                                      des tags et des versions

  Analyse du pipeline                 Les étudiants démontrent qu'ils
                                      comprennent le rôle des différentes
                                      étapes

  Justification des choix             Les décisions techniques prises
                                      sont expliquées

  Analyse des comportements observés  Les observations montrent une
                                      compréhension du fonctionnement
                                      CI/CD
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# Pénalités possibles

  Situation                     Pénalité
  ----------------------------- ----------
  Pipeline CI non fonctionnel   -20
  Image Docker non publiée      -10
  Tests absents                 -15
  README absent ou incomplet    -15

------------------------------------------------------------------------

# Barème final

  Note      Interprétation
  --------- --------------------------------------------------
  90--100   Travail excellent, compréhension solide du CI/CD
  75--89    Travail maîtrisé
  60--74    Compréhension partielle
  \<60      Objectifs pédagogiques non atteints
