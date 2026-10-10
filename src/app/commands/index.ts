// API publique du module app/commands : catalogue unique des actions utilisateur.
import { graphCommands } from './graph-commands';
import { navCommands } from './nav-commands';
import { projectCommands } from './project-commands';
import type { Command } from './types';

export { type Command, labelOf } from './types';
export { connectSelectedTo } from './graph-commands';
export { download } from './files';

let catalog: Command[] | undefined;

/** Toutes les commandes (construites une fois). */
export function commands(): Command[] {
  catalog ??= [...projectCommands(), ...graphCommands(), ...navCommands()];
  return catalog;
}

export function command(id: string): Command | undefined {
  return commands().find((c) => c.id === id);
}

/** Exécute une commande si elle est disponible. */
export function runCommand(id: string): boolean {
  const c = command(id);
  if (!c || (c.enabled && !c.enabled())) return false;
  c.run();
  return true;
}
