import json, pickle, os, collections
import sys
D = sys.argv[1]  # dossier de sortie d'analyse.py
A = pickle.load(open(D + '/agents.pkl', 'rb'))
# Opus 5.5 : $/Mt
P_IN, P_CW, P_CR, P_OUT = 4.0, 5.0, 0.20, 20.0
THINK = 2.0  # facteur sortie réelle / sortie visible (calé sur l'orchestrateur : 28 904 / 14 423)


def vis_out(a):
    ch = 0
    for l in open(a['path']):
        d = json.loads(l)
        if d.get('type') == 'assistant':
            for b in d['message']['content']:
                if b['type'] == 'text': ch += len(b['text'])
                elif b['type'] == 'tool_use': ch += len(json.dumps(b['input'], ensure_ascii=False))
    return ch / 3.6

tot = collections.Counter(); byrole = collections.Counter(); rows = []
for a in A:
    u = a['usage']
    out = u['output_tokens'] if a['role'] == 'orchestrateur' else vis_out(a) * THINK
    c = dict(cw=u['cache_creation_input_tokens'] * P_CW / 1e6, cr=u['cache_read_input_tokens'] * P_CR / 1e6,
             out=out * P_OUT / 1e6, inp=u['input_tokens'] * P_IN / 1e6)
    s = sum(c.values())
    rows.append((a['role'], a['desc'], round(c['cw'], 2), round(c['cr'], 2), round(c['out'], 2), round(s, 2), int(out)))
    for k, v in c.items(): tot[k] += v
    byrole[a['role']] += s
T = sum(tot.values())
for r in rows: print(r, f'{r[5]/T*100:.1f}%')
print({k: round(v, 2) for k, v in tot.items()}, 'TOTAL $', round(T, 2))
print({k: (round(v, 2), round(v / T * 100, 1)) for k, v in byrole.items()})

# Gain 1 : restreindre les outils (realisateur, inventoriste) au niveau du relecteur
base_rel = 11.4e3
g_cw = g_cr = 0
for a in A:
    if a['role'] in ('realisateur', 'inventoriste'):
        extra = a['ctx'][0] - base_rel - 1500  # prompt plus long que celui du relecteur (~1,5 k)
        g_cw += extra; g_cr += extra * (a['calls'] - 1)
print('outils: cache création évité', int(g_cw), 'lecture évitée', int(g_cr), '$', round(g_cw * P_CW / 1e6 + g_cr * P_CR / 1e6, 2))

# Gain : résultats Bash persistés (tool-results) relus en entier
# Gain : cat docs/MAP.md entier
for a in A:
    for r in a['tools']:
        if 'cat docs/MAP.md' in r['input'].get('command', ''):
            print('MAP.md entier', a['desc'], r['res'] / 3.6 * r['later_calls'] * P_CR / 1e6)
