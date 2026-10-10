# Dev container de l'éditeur de questionnaires.
# Inspiré du conteneur de référence d'Anthropic, sans pare-feu : accès réseau libre.
# L'image de base fournit Node 22 et npm.

FROM node:22-bookworm

ARG TZ=Europe/Paris
ENV TZ="$TZ"

# Outils de base
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl git gh less procps sudo nano jq unzip \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Dépendances système des navigateurs Playwright (Chromium et Firefox).
# Les navigateurs eux-mêmes sont téléchargés par le projet (npx playwright install),
# à la version de @playwright/test du package.json : aucune contrainte de version ici.
RUN npx -y playwright@latest install-deps chromium firefox \
  || npx -y playwright@latest install-deps chromium \
  && rm -rf /var/lib/apt/lists/* /root/.npm

# L'utilisateur node peut tout installer (apt, etc.) sans mot de passe
RUN echo "node ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/node && chmod 0440 /etc/sudoers.d/node

# Paquets npm globaux installables par l'utilisateur node
RUN mkdir -p /usr/local/share/npm-global && chown -R node:node /usr/local/share

# Historique bash persistant (volume monté sur /commandhistory)
RUN mkdir /commandhistory && touch /commandhistory/.bash_history && chown -R node /commandhistory \
  && echo "export PROMPT_COMMAND='history -a' HISTFILE=/commandhistory/.bash_history" >> /home/node/.bashrc

ENV DEVCONTAINER=true

RUN mkdir -p /workspace /home/node/.claude /home/node/.cache/ms-playwright \
  && chown -R node:node /workspace /home/node/.claude /home/node/.cache
WORKDIR /workspace

USER node
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin
ENV EDITOR=nano VISUAL=nano

# Claude Code
ARG CLAUDE_CODE_VERSION=latest
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION} && claude --version
