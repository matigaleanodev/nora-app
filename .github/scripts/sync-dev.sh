#!/usr/bin/env bash
set -euo pipefail

# dev es un espejo: no se usa para conservar trabajo independiente.
git fetch origin main
MAIN_SHA=$(git rev-parse origin/main)
DEV_REF=$(git ls-remote --heads origin refs/heads/dev)
if [ -z "$DEV_REF" ]; then
  git push origin "$MAIN_SHA:refs/heads/dev"
  echo "dev creada desde main."
  exit 0
fi

git fetch origin dev
git checkout -B dev origin/dev
DEV_SHA=$(git rev-parse HEAD)
if git merge-base --is-ancestor HEAD "$MAIN_SHA"; then
  git merge --ff-only "$MAIN_SHA"
  git push origin dev
  exit 0
fi

if git merge --no-ff "$MAIN_SHA" -m "chore(branch-sync): sincronización automática main → dev"; then
  git push origin dev
  exit 0
fi

# Sólo los conflictos activan el fallback; otros errores deben fallar visiblemente.
if [ -z "$(git ls-files --unmerged)" ]; then
  git merge --abort || true
  echo "El merge falló sin conflictos: no se modifica dev."
  exit 1
fi
git merge --abort
git push --force-with-lease="refs/heads/dev:$DEV_SHA" origin "$MAIN_SHA:refs/heads/dev"
echo "Sincronización forzada completada: dev apunta a $MAIN_SHA."
