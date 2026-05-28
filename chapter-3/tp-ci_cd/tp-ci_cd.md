
# TP CI/CD

## Introduction

Il y a un truc important : **une CI sans tests, c’est juste de l’automatisation**, pas de l’assurance qualité. Donc on va créer *le minimum vital* de tests.

### Test runners

Comme nous sommes en ESM (`import ...`), nous utiliserons **Vitest**.

#### Jest + ESM = friction

Historiquement :

* Jest est conçu autour de CommonJS
* L’ESM est supporté, mais demande une configuration spécifique
* Il faut parfois `--experimental-vm-modules`
* Mocking plus pénible
* Config Babel parfois nécessaire

Ça peut marcher mais Vitest est bien plus optimisé.

#### Vitest + ESM = natif

Vitest est construit sur Vite (ESM-first).

* `import/export` → fonctionne directement
* Pas de Babel requis
* Pas de transpilation spéciale
* Mocking simple
* Très rapide (esbuild sous le capot)

#### Autres test runners 

##### 1️⃣ Mocha

Très stable, simple.
Mais :

* Pas d’écosystème moderne aussi intégré
* Moins “plug and play” pour mocking
* Moins rapide que Vitest

##### 2️⃣ Node built-in test runner (`node --test`)

Très intéressant pédagogiquement.
Mais :

* Mocking moins ergonomique
* Pas aussi riche que Vitest/Jest
* Moins connu

##### 3️⃣ Ava

Très propre, mais niche.
Moins aligné avec l’écosystème actuel.

#### Install

```bash
npm i -D vitest supertest
```

`package.json`

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### Problèmes dans le fichier actuel

Dans `index.js` : 
* `const pool = new Pool(...)` → dépend de `process.env.DB_*`
* `waitForDb();` est appelé immédiatement → si DB absente, les tests/CI bloquent ou échouent avant même de tester un endpoint
* `app.listen(...)` est dans le même fichier → on ne peut pas importer l’app proprement pour Supertest

On a donc fait un refactor **minimal** : 
* `src/app.js` : construit l’Express app, reçoit `pool` en paramètre (injection)
* `src/db.js` : construit le vrai `Pool` + `waitForDb`
* `src/server.js` : assemble (db + app) et fait `listen`

✅ Résultat : importer `createApp` **ne déclenche plus** d’accès DB.

### `.env` et variables

L’objectif est que **les tests ne dépendent pas** de `.env`.

* `.env` reste local (gitignored)
* en CI, rien n'est injecté (ou au pire `PORT=3000`, mais même ça peut être inutile, `app` est testée sans listen)

## Partie 0 - Setup

1. Créer repo Docker Hub (si c'est pas déjà fait)
2. Créer un **Access Token** Docker Hub
3. Dans GitHub repo → Settings → Secrets → Actions :
   * `DOCKERHUB_USERNAME`
   * `DOCKERHUB_TOKEN`
4. Installer Vitest au projet

## Partie 1 - main CI

1. Checkout sur la branche `main` du repo
2. Dans un dossier `.github/workflows`, écrire et compléter le workflow `ci-main.yml`. Celui-ci doit : 
- être déclenché lors d'un push sur `main`
- déclarer les variables d’environnements nécessaires
- tester le code poussé sur `main`
- construire une image docker et pousser en registry les deux tags (`latest` et `<sha>`) si les tests sont passés

```yaml
name: Main - CI (test, build & push)

on:
[...]

permissions:
  contents: read

env:
  [...]

jobs:
  build-test-push:
    runs-on: ubuntu-latest
    steps:
      [...]

      - name: Login to Docker Hub
        [...]

      - name: Build and push
        [...]

```

3. Ajouter le squelette des tests de l’API `src/test/api.test.js`

⚠️ Penser à modifier `package.json` pour être capable de rouler des tests

```js
import { describe, it } from "vitest";

describe("API", () => {
  it("GET /health -> 200 ok when DB answers", async () => {
    throw new Error("Not yet implemented")
  });

  it("POST /notes without title -> 400", async () => {
    throw new Error("Not yet implemented")
  });
});
```

4. Pousser le code sur main et constater que :
- la CI s'est déclenchée
- elle ne passe pas (CI rouge) 
- l'image docker ne s’est pas construite et n'a pas été poussée sur docker hub

⚠️ Penser au dossier de travail, il est peut-être différent de celui à partier duquel sont exécutés les actions.

## Partie 2 — PR gate

Afin de rajouter une couche de contrôle et de gouvernance à notre repo, on force le développement de nouvelles features à être codé sur une autre branche (que `main`).

Une `pull request` doit ensuite être créée depuis cette branche vers `main` afin de passer la "quality gate" que l'on s'impose pour notre projet.

1. Depuis `main`, écrire et compléter le yaml `pr-ci.yml` afin d'ajouter le workflow qui teste (ceux qui souhaiteraient aller plus loin pourraient ajouter une vérification avec un `linter` ou autre process garantissant la qualité) le code lors d'une `pull request`. 

```yaml
name: PR - CI (tests)

on:
[...]

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      [...]
```

2. Créer une nouvelle branche
3. Compléter le fichier de test `test/api.test.js`

```js
import request from "supertest";
import { describe, it, expect, vi } from "vitest";
import { createApp } from "../src/app.js";

describe("API", () => {
  it("GET /health -> 200 ok when DB answers", async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const app = createApp({ pool });

    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.text).toBe("ok");
    expect(pool.query).toHaveBeenCalledWith("SELECT 1");
  });

  it("POST /notes without title -> 400", async () => {
    const pool = { query: vi.fn() }; // ne doit même pas être appelé
    const app = createApp({ pool });

    const res = await request(app).post("/notes").send({ content: "yo" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "title is required" });
    expect(pool.query).not.toHaveBeenCalled();
  });
});
```

4. Ouvrir PR, constater que :
- la CI passe (CI vert)
- le merge sur `main` est effectué (ce qui s'en suit d'un `push` sur `main`)
- la `main-ci` s'est déclenchée
- l'image a été construite puis poussée sur Docker Hub (tag `latest` et `<sha>`)

⚠️ Penser au dossier de travail, il est peut-être différent de celui à partier duquel sont exécutés les actions.

## Partie 3 — Release produit

1. Depuis une nouvelle branche, coder le workflow `release.yml`

```yaml
name: Release - Build & Push (version tag)

on:
  [...]

env:
  [...]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      [...]

      - name: Login Docker Hub
        [...]

      - name: Build & Push versioned image
        [...]
```

2. Envoyer la PR sur `main` et attendre que les pipelines finissent de s’exécuter.
3. Créer un tag Git :
   * `git tag v1.0.0`
   * `git push origin v1.0.0`
4. Vérifier dans Docker Hub :
   * tag `v1.0.0`

## Partie 4 — Questions écrites

* Pourquoi `latest` n’est pas une version ?
* Différence tag vs digest ?
* Pourquoi séparer staging/prod ?
* Pourquoi une version `vX.Y.Z` ne doit jamais être reconstruite ?
* Citez les avantages d'une PR gate.
* Qu’est-ce qui garantit la traçabilité ici ?

## Partie 5 📘 SECTION README — Release Process

Voici une section prête à coller dans le README, séparée des réponses et observations faites lors du TP.

Ce squelette est donné à titre indicatif, représente les informations classiques que l'on retrouve dans une section "Release Process" d'un projet. Vous êtes libre de faire la vôtre à condition que toutes les informations nécessaires à un "release process" y figurent. 

Ne pas hésiter à s'inspirer d'autres projets Git Hub public pour la rédaction.

```md
## 🚀 Release Process

This project follows a strict versioning and release workflow to ensure traceability and reproducibility.

### 🔁 Continuous Integration (on push to `main`)

[...]

### 🏷 Creating a Release (Versioned Product)

[...]

### 📌 Versioning Rules

[...]

### 🔎 Traceability

[...]
```
