import { describe, expect, it } from 'vitest';
import type { Edge, GraphNode } from '../model';
import { renameKeysIn } from './index';

const owner = { kind: 'questionnaire', id: 'q' } as const;

describe('renameKeysIn : réécriture des clés d’une sélection collée (EVO-010)', () => {
  const nodes: GraphNode[] = [
    { kind: 'question', id: 'a', key: 'date_sinistre', label: { fr: 'Le {date_sinistre}' }, type: 'date' },
    {
      kind: 'question', id: 'b', key: 'tiers', label: { fr: 'Tiers ?' }, type: 'boolean',
      when: 'date_sinistre < $today() and autre = 1', constraints: [{ rule: 'tiers_other != "" or date_sinistre.nsp' }],
    } as GraphNode,
    {
      kind: 'question', id: 'c', key: 'choix', label: { fr: 'Choix' }, type: 'single',
      options: [{ from: 'date_sinistre ? liste : []', label: 'date_sinistre' }],
    } as GraphNode,
    {
      kind: 'question', id: 'd', key: 'adr', label: { fr: 'Adresse' }, type: 'structure',
      fields: [
        { id: 'f1', key: 'tiers', label: { fr: 'x' }, type: 'text' },
        { id: 'f2', key: 'rue', label: { fr: 'y' }, type: 'text', when: 'tiers = "o" and date_sinistre' },
      ],
    } as GraphNode,
    { kind: 'fragment', id: 'e', ref: 'frg', alias: 'ident' },
  ];
  const edges: Edge[] = [{ id: 'x', from: 'b', to: 'e', when: 'tiers = true and ident.nom = "a"' }];
  const renames = { date_sinistre: 'date_sinistre_2', tiers: 'tiers_2', ident: 'ident_2' };
  const out = renameKeysIn({ nodes, edges }, renames, owner);

  it('réécrit les références aux clés renommées dans les conditions, contraintes, libellés et arêtes', () => {
    const b = out.nodes[1] as unknown as { when: string; constraints: { rule: string }[] };
    expect(b.when).toBe('date_sinistre_2 < $today() and autre = 1');
    expect(b.constraints[0]!.rule).toBe('tiers_2_other != "" or date_sinistre_2.nsp');
    expect((out.nodes[0] as unknown as { label: { fr: string } }).label.fr).toBe('Le {date_sinistre_2}');
    expect(out.edges[0]!.when).toBe('tiers_2 = true and ident_2.nom = "a"');
  });
  it('réécrit la source d’une entrée dynamique, pas ses noms relatifs', () => {
    const o = (out.nodes[2] as unknown as { options: { from: string; label: string }[] }).options[0]!;
    expect(o.from).toBe('date_sinistre_2 ? liste : []');
    expect(o.label).toBe('date_sinistre');
  });
  it('ne touche pas une clé masquée par un champ de même nom de la structure', () => {
    const f = (out.nodes[3] as unknown as { fields: { when?: string }[] }).fields[1]!;
    expect(f.when).toBe('tiers = "o" and date_sinistre_2');
  });
  it('renomme les clés et alias des nœuds eux-mêmes, sans modifier l’entrée', () => {
    expect(out.nodes.map((n) => ('key' in n ? n.key : n.kind === 'fragment' ? n.alias : ''))).toEqual(['date_sinistre_2', 'tiers_2', 'choix', 'adr', 'ident_2']);
    expect((nodes[0] as { key: string }).key).toBe('date_sinistre');
  });
});
