#!/bin/bash
# Vérifie que le conteneur est prêt pour Claude Code. Lancé à chaque démarrage ;
# relançable à la main : bash .devcontainer/verifier.sh
# N'échoue jamais : il affiche un bilan, ligne par ligne.

ok=0; ko=0
check() { # check "libellé" commande...
  local label="$1"; shift
  if out=$("$@" 2>/dev/null | head -1) && [ -n "$out" ]; then
    printf '  [OK] %-24s %s\n' "$label" "$out"; ok=$((ok+1))
  else
    printf '  [KO] %-24s\n' "$label"; ko=$((ko+1))
  fi
}
reach() { curl -s -o /dev/null --connect-timeout 5 -w '%{http_code}' "$1" | grep -qv '^000$' && echo "joignable"; }

echo "=== Vérification du dev container ==="
check "Node"            node --version
check "npm"             npm --version
check "Claude Code"     claude --version
check "git"             git --version
check "Identite git"    git config user.email
check "sudo"            bash -c 'sudo -n true && echo "sans mot de passe"'
check "Acces internet"  reach https://registry.npmjs.org
check "API Anthropic"   reach https://api.anthropic.com
check "Specification"   bash -c '[ -f docs/spec.md ] && echo docs/spec.md'
check "Plan"            bash -c '[ -f docs/PLAN.md ] && echo docs/PLAN.md'

echo "=== $ok OK, $ko KO ==="
[ "$ko" -gt 0 ] && echo "Voir « En cas de problème » dans .devcontainer/README.md"
exit 0
