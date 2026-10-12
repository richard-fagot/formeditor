# app/persistence

Sauvegarde automatique du projet dans IndexedDB (idb-keyval), en continu (délai 500 ms après chaque
changement), et restauration au démarrage. Dépend de `format` et `app/store`.

## API
- `restoreSession()` → `Promise<boolean>` ; `startAutosave()` → désinscription.

## Contenu sauvegardé
Le bundle JSON (même format que l'export), l'indicateur « modifications non exportées », les onglets
ouverts (à la restauration, ceux d'un questionnaire ou d'un fragment disparu sont écartés), la langue de l'interface, les raccourcis personnalisés et les derniers choix de l'export d'image (`imageOptions`). L'export reste la source de vérité partageable.

## Pièges
- En `file://`, IndexedDB est disponible dans Firefox et Chromium ; toute erreur est ignorée (l'outil reste utilisable).
