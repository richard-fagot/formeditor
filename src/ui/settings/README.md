# ui/settings

Onglet « Paramètres » (spec §3.9, §4.1, §4.4). Dépend de `app/commands`, `app/shortcuts`, `app/store`, `core/validation`,
`core/references`, `ui-kit`.

## Composants
- `Settings` : mise en page des trois sections.
- `LanguagesSection` : langues des contenus du projet ; ajouter (`lang.add`), retirer (`lang.remove`, jamais la langue
  par défaut ; les textes déjà saisis restent), définir par défaut (`lang.default`).
- `TranslationsSection` : textes non traduits (`missingTranslation`, `useIssues` d'`app/issues`), filtrables par langue ;
  un clic ouvre l'onglet du questionnaire (vue logigramme) ou de la bibliothèque et sélectionne le nœud.
- `ShortcutsSection` : chaque action du catalogue (visible dans la palette ou dotée d'un raccourci par défaut), ses
  combinaisons (`keysOf`), ajout par frappe (`comboOf`, Échap annule), retrait, retour au défaut (`shortcut.set`,
  `shortcut.reset`) ; doublons signalés sur les actions personnalisées (`normalizeKey`).

## Pièges
- La saisie d'un raccourci se fait dans un champ en lecture seule dont le `keydown` est arrêté (`stopPropagation`) :
  aucune commande ne se déclenche pendant la capture.
