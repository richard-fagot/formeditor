# Construire index.html sur GitHub

Le workflow `.github/workflows/build.yml` (« Construire index.html ») produit `dist/index.html`
(l'éditeur complet, fichier unique) et le kit développeurs (`kit-dev/`) sur les serveurs de GitHub,
sans rien installer sur son poste.

## Mise en place (une fois)

1. Pousser la branche `main` contenant `.github/workflows/build.yml` sur GitHub.
2. Sur github.com, dépôt → onglet **Actions** : si GitHub le demande, cliquer
   « I understand my workflows, go ahead and enable them ».

## Obtenir index.html

- **Automatiquement** : chaque push sur `main` lance la construction.
- **À la demande** : onglet **Actions** → « Construire index.html » (colonne de gauche) →
  bouton **Run workflow** → branche `main` → **Run workflow**.

Une fois l'exécution terminée (coche verte, environ 1 à 2 minutes) : cliquer dessus, puis en bas
de la page, section **Artifacts** :

- `index-html` : un zip contenant `index.html`. Le dézipper et ouvrir `index.html` dans Firefox ou
  Chromium (double-clic suffit, aucun serveur nécessaire).
- `kit-dev` : le kit à livrer aux développeurs (FORMAT.md, schémas, exemple, LISEZMOI.md).

Les artefacts sont conservés 90 jours (réglage par défaut de GitHub).

## Optionnel : publier l'éditeur sur GitHub Pages

Donne une adresse web fixe (`https://<compte>.github.io/<dépôt>/`) toujours à jour avec `main`.
Attention : la page est **publique**, même si le dépôt est privé (Pages sur dépôt privé exige
en outre un abonnement GitHub payant).

1. Dépôt → **Settings** → **Pages** → *Build and deployment* → *Source* : **GitHub Actions**.
2. Dépôt → **Settings** → **Secrets and variables** → **Actions** → onglet **Variables** →
   **New repository variable** : nom `DEPLOY_PAGES`, valeur `true`.
3. Relancer le workflow (Run workflow). L'adresse apparaît dans le résumé de l'exécution
   (job `pages`) et dans Settings → Pages.

Pour arrêter la publication : supprimer la variable `DEPLOY_PAGES` (ou la mettre à `false`).

## En cas d'échec

Cliquer sur l'exécution rouge, puis sur l'étape en erreur pour lire le journal.
Le workflow ne lance que `npm ci`, `npm run build` et `npm run kit-dev` : le harnais complet
(`npm run check`) reste à lancer en local.
