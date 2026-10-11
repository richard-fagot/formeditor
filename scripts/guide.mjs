// `npm run guide` : régénère l'index des raccourcis de docs/GUIDE.md depuis le catalogue de commandes.
// `npm run guide:check` (dans `npm run check`) : échoue si une commande n'a pas de balise [cmd: …],
// si une balise ne correspond à aucune commande, ou si l'index est périmé.
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';

const GUIDE = 'docs/GUIDE.md';
const check = process.argv.includes('--check');

// Le catalogue est écrit en TypeScript et dépend de l'application : Vite le charge comme en développement.
const server = await createServer({
  configFile: false, logLevel: 'error', appType: 'custom',
  server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true, include: [] },
});
let code = 0;
try {
  const { guideCommands } = await server.ssrLoadModule('/scripts/guide/catalog.ts');
  const { checkGuide, withIndex } = await server.ssrLoadModule('/scripts/guide/guide.ts');
  const md = readFileSync(GUIDE, 'utf8');
  const list = guideCommands();
  if (check) {
    const errors = checkGuide(md, list);
    errors.forEach((e) => console.error(`${GUIDE} : ${e}`));
    if (errors.length) code = 1;
    else console.log(`${GUIDE} : conforme au catalogue (${list.length} commandes).`);
  } else {
    const next = withIndex(md, list);
    if (next !== md) writeFileSync(GUIDE, next);
    console.log(`${GUIDE} : index des raccourcis ${next === md ? 'déjà à jour' : 'régénéré'} (${list.length} commandes).`);
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  code = 1;
} finally {
  await server.close();
}
process.exit(code);
