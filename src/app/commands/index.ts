// API publique du module app/commands : catalogue unique des actions utilisateur.
import { graphCommands } from './graph-commands';
import { navCommands } from './nav-commands';
import { projectCommands } from './project-commands';
import { shellCommands } from './shell-commands';
import { editCommands } from './edit-commands';
import { libraryCommands } from './library-commands';
import { libraryItemCommands } from './library-item-commands';
import { systemCommands } from './system-commands';
import type { Command } from './types';

export { type Command, labelOf } from './types';
export { download } from './files';

let catalog: Command[] | undefined;

/** Toutes les commandes (construites une fois). */
export function commands(): Command[] {
  catalog ??= [...projectCommands(), ...shellCommands(), ...graphCommands(), ...editCommands(), ...libraryCommands(), ...libraryItemCommands(), ...systemCommands(), ...navCommands()];
  return catalog;
}

export function command(id: string): Command | undefined {
  return commands().find((c) => c.id === id);
}

/** Exécute une commande si elle est disponible ; `arg` est transmis à `run`. */
export function runCommand(id: string, arg?: unknown): boolean {
  const c = command(id);
  if (!c || (c.enabled && !c.enabled())) return false;
  c.run(arg);
  return true;
}
