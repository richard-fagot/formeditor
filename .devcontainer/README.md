# Dev container — mise en place

Conteneur Node 22 + Claude Code, accès réseau libre, `sudo` sans mot de passe pour l'utilisateur `node`.
Seul le dossier du projet est partagé avec le Mac : le reste du disque n'est pas accessible depuis le conteneur.

## Installation du kit (dans le Terminal, pas dans le Finder)

Le Finder masque les dossiers commençant par un point (`.devcontainer`, `.gitignore`).
Copiés à la souris, ils disparaissent et VS Code construit un conteneur générique, sans Node.

```bash
cd ~/chemin/vers/editeur-questionnaires        # le clone du dépôt GitHub
unzip -o ~/Downloads/kit-devcontainer.zip      # extrait à la racine, dossiers cachés compris
rm -f .devcontainer.json                       # supprime une éventuelle config générée par VS Code
rm -f .devcontainer/init-firewall.sh           # reste d'une version précédente du kit
ls -la .devcontainer                           # Dockerfile, devcontainer.json, verifier.sh, README.md
```

Ajouter la spécification : exporter le document en Markdown et l'enregistrer sous `docs/spec.md`.

## Ouverture

1. Docker Desktop lancé (Settings → Resources : 4 Go de mémoire au moins).
2. Dans VS Code : `Dev Containers: Rebuild Without Cache and Reopen in Container`.
3. À la fin, le terminal affiche le bilan de `verifier.sh` : tout doit être `[OK]`.

## Connexion et lancement de Claude Code

```bash
claude                                   # première fois : se connecter, puis /exit
claude --dangerously-skip-permissions    # sessions de travail
```

Si la page de connexion ne revient pas vers le terminal, copier le code affiché par le
navigateur et le coller dans le terminal. La connexion est conservée entre deux reconstructions.

## En cas de problème

| Symptôme | Cause probable | Correction |
| --- | --- | --- |
| `node: not found`, `claude: not found` | `.devcontainer` absent, VS Code a pris une image générique | Refaire l'installation dans le Terminal, puis Rebuild Without Cache |
| `[KO] Identite git` | Pas de `user.email` dans `~/.gitconfig` du Mac | Sur le Mac : `git config --global user.name "…"` et `git config --global user.email "…"`, puis Rebuild |
| `[KO] Acces internet` | Docker Desktop sans réseau (VPN, proxy) | Vérifier la connexion du Mac, redémarrer Docker Desktop |
| `[KO] Specification` | `docs/spec.md` pas encore ajouté | Exporter la spec en Markdown dans `docs/spec.md` |
