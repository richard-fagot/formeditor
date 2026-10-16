import json, pickle, os, collections, re
import sys
D = sys.argv[1]  # dossier de sortie d'analyse.py
agents = pickle.load(open(D + '/agents.pkl', 'rb'))
CPT = 3.6  # caractères par token (estimation, texte FR/code)


def cat(r):
    n, i = r['name'], r['input']
    if n == 'Read':
        return 'Read ' + i.get('file_path', '').replace('/home/user/formeditor/', '')
    if n == 'Bash':
        c = i.get('command', '')
        if 'npm run check' in c: return 'Bash npm run check'
        if 'playwright' in c or 'npm run smoke' in c: return 'Bash playwright'
        if 'vitest' in c or 'npm test' in c: return 'Bash vitest'
        if 'typecheck' in c or 'tsc' in c: return 'Bash typecheck'
        if 'npm run build' in c: return 'Bash build'
        if re.search(r'git (diff|show|log)', c): return 'Bash git diff/show/log'
        if c.strip().startswith('git'): return 'Bash git autre'
        if re.search(r'\b(grep|rg)\b', c): return 'Bash grep'
        if re.search(r'\b(sed|cat|head|tail|awk)\b', c): return 'Bash lecture (sed/cat)'
        if 'npm run' in c: return 'Bash npm run ' + c.split('npm run')[1].split()[0]
        return 'Bash autre'
    return n


g_name = collections.Counter(); g_cnt = collections.Counter(); g_weighted = collections.Counter()
role_cat = collections.defaultdict(collections.Counter)
role_cat_w = collections.defaultdict(collections.Counter)
big = []
files = collections.defaultdict(lambda: [0, 0, collections.Counter()])
out_est = {}
for a in agents:
    for r in a['tools']:
        c = cat(r)
        k = c if not c.startswith('Read ') else 'Read'
        g_name[k] += r['res']; g_cnt[k] += 1
        w = r['res'] / CPT * r['later_calls']
        g_weighted[k] += w
        role_cat[a['role']][k] += r['res']
        role_cat_w[a['role']][k] += w
        big.append((r['res'], a['role'], a['desc'], c, r['later_calls'], json.dumps(r['input'], ensure_ascii=False)[:160]))
        if c.startswith('Read '):
            f = c[5:]
            files[f][0] += 1; files[f][1] += r['res']; files[f][2][a['desc']] += 1
        if r['name'] in ('Grep',) or c.startswith('Bash lecture'):
            pass

print('== Par catégorie d\'outil (tous agents) : nb, ktokens résultats, Mtokens relus en cache (estim.)')
for k, v in sorted(g_weighted.items(), key=lambda x: -x[1]):
    print(f'{k:32s} {g_cnt[k]:4d}  {g_name[k]/CPT/1000:8.1f} kt  {v/1e6:6.2f} Mt')
print('total résultats', sum(g_name.values())/CPT/1000, 'kt ; relus', sum(g_weighted.values())/1e6, 'Mt')

for role in role_cat:
    print('\n== rôle', role)
    for k, v in role_cat_w[role].most_common(10):
        print(f'   {k:32s} {role_cat[role][k]/CPT/1000:8.1f} kt  {v/1e6:6.2f} Mt')

print('\n== 40 plus gros résultats (caractères, rôle, tâche, catégorie, appels suivants, entrée)')
for b in sorted(big, reverse=True)[:40]:
    print(b)

print('\n== Fichiers lus (Read) : nb lectures, ktokens, par tâche')
for f, (n, s, who) in sorted(files.items(), key=lambda x: -x[1][1])[:40]:
    print(f'{f:70s} {n:3d} {s/CPT/1000:7.1f} kt  {dict(who)}')
