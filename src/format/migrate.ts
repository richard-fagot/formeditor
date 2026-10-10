import { FORMAT_VERSION } from '../core/model';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = Record<string, any>;
/** Migration de la version `n` vers `n + 1`, indexée par `n`. */
export type Migrations = Record<number, (doc: Doc) => Doc>;

/** Migrations du format. Ajouter ici `n: (doc) => …` à chaque montée de `FORMAT_VERSION`. */
export const MIGRATIONS: Migrations = {};

/** Amène un document (unitaire ou bundle) à la version cible. */
export function migrate(doc: Doc, migrations: Migrations = MIGRATIONS, target = FORMAT_VERSION): Doc {
  let current = doc;
  let version = Number(current.formatVersion ?? 1);
  if (version > target) {
    throw new Error(`Format ${version} plus récent que celui de l'outil (${target}).`);
  }
  while (version < target) {
    const step = migrations[version];
    if (!step) throw new Error(`Aucune migration depuis la version ${version}.`);
    current = step(current);
    version++;
  }
  return current;
}
