import json, pickle, os, collections, re
import sys
D = sys.argv[1]  # dossier de sortie d'analyse.py
agents = pickle.load(open(D + '/agents.pkl', 'rb'))
CPT = 3.6
for a in agents:
    c = a['ctx']
    print(f"{a['desc'][:28]:28s} premier={c[0]:>7,} moyen={sum(c)//len(c):>7,} max={max(c):>7,} appels={len(c)}")

# attribution par fichier de doc cité dans les commandes Bash / Read
DOCS = ['docs/spec.md', 'docs/EXISTANT.md', 'docs/GUIDE.md', 'docs/MAP.md', 'docs/FORMAT.md', 'docs/DECISIONS.md',
        'docs/evolutions/EVO', 'docs/evolutions/README', 'docs/ECARTS.md', 'tool-results/']
att = collections.defaultdict(lambda: collections.Counter())
attw = collections.defaultdict(lambda: collections.Counter())
for a in agents:
    for r in a['tools']:
        s = json.dumps(r['input'], ensure_ascii=False)
        hit = [d for d in DOCS if d in s]
        if not hit:
            continue
        for h in hit:
            att[h][a['role']] += r['res'] / len(hit)
            attw[h][a['role']] += r['res'] / len(hit) / CPT * r['later_calls']
print('\n== Volume lu par document (ktokens résultat ; Mtokens relus en cache estimés)')
for h in DOCS:
    tot = sum(att[h].values())
    print(f"{h:26s} {tot/CPT/1000:7.1f} kt {sum(attw[h].values())/1e6:6.2f} Mt  " +
          ', '.join(f"{k}:{v/CPT/1000:.1f}kt" for k, v in att[h].items()))

# Résultats Bash trop gros persistés -> commande d'origine
print('\n== Sorties persistées (tool-results) : commande d\'origine')
for a in agents:
    for r in a['tools']:
        if r['name'] == 'Bash':
            pass
import glob
for a in agents:
    p = a['path']
    for line in open(p):
        d = json.loads(line)
        if d.get('type') == 'user' and isinstance(d['message'].get('content'), list):
            for b in d['message']['content']:
                if b.get('type') == 'tool_result':
                    c = b.get('content')
                    txt = c if isinstance(c, str) else ' '.join(x.get('text', '') for x in c if isinstance(x, dict))
                    m = re.search(r'tool-results/(\w+)\.txt', txt)
                    if m and 'saved' in txt.lower() or (m and 'too large' in txt.lower()):
                        tr = [r for r in a['tools'] if r['id'] == b['tool_use_id']][0]
                        print(a['desc'], '|', m.group(1), '|', tr['res'], '|', json.dumps(tr['input'], ensure_ascii=False)[:200])

# Orchestrateur : appels avec forte création de cache (expiration après attente)
print('\n== Orchestrateur : cache_creation par appel (>5k)')
m = agents[0]
calls = []
for line in open(m['path']):
    d = json.loads(line)
    if d.get('type') == 'assistant':
        calls.append((d['timestamp'], d['message']['id'], d['message']['usage']))
seen = set(); prev = None
for t, i, u in calls:
    if i in seen: continue
    seen.add(i)
    if u.get('cache_creation_input_tokens', 0) > 5000:
        print(t, u.get('cache_creation_input_tokens'), u.get('cache_read_input_tokens'))
