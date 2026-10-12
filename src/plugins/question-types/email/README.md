# plugins/question-types/email

Type « mail » (`type: "email"`, EVO-007) : aucun paramètre propre. Raccourci par défaut : Shift+E. Aperçu : icône et `<mail>`.

- Contrôle intégré `email` (RFC 5321 / 5322, `core/contact`) : à la sortie du champ (message affiché par le champ tant que
  la page n'a pas signalé d'erreur) et à la validation de la page (`core/validation`).
- Champ `type="text"` (`inputMode="email"`) : un `type="email"` laisserait Chromium convertir un domaine accentué en punycode.
- Valeur enregistrée à chaque frappe : saisie sans espaces de bord, domaine en minuscules si l'adresse est valide.
- « Ne sais pas » : case sous le champ (`data-testid="dont-know"`), comme le texte.
