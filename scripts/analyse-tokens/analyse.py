import json, glob, os, sys, collections, datetime, pickle

# Usage : python3 -I analyse.py <session.jsonl> <dossier de sortie> [id de l'agent d'analyse à exclure]
MAIN = sys.argv[1]
SUB = MAIN[:-len('.jsonl')] + '/subagents/'
OUT = sys.argv[2]
SELF = sys.argv[3] if len(sys.argv) > 3 else ''


def ts(s):
    return datetime.datetime.fromisoformat(s.replace('Z', '+00:00'))


def content_len(c):
    if isinstance(c, str):
        return len(c)
    if isinstance(c, list):
        n = 0
        for b in c:
            if b.get('type') == 'text':
                n += len(b.get('text', ''))
            elif b.get('type') == 'image':
                n += 6000
            else:
                n += len(json.dumps(b))
        return n
    return len(json.dumps(c))


def parse(path):
    calls = collections.OrderedDict()  # msg id -> usage
    tools = []  # dicts
    by_id = {}
    times = []
    first_user = None
    call_index = 0
    order = []  # sequence of events ('call', id) / ('tool_result', tuid)
    for line in open(path):
        d = json.loads(line)
        if 'timestamp' in d:
            times.append(ts(d['timestamp']))
        t = d.get('type')
        if t == 'assistant':
            m = d['message']
            mid = m.get('id')
            if mid not in calls:
                calls[mid] = m.get('usage', {})
                order.append(('call', mid))
            else:
                u = m.get('usage', {})
                if u.get('output_tokens', 0) >= calls[mid].get('output_tokens', 0):
                    calls[mid] = u
            for b in m.get('content', []):
                if b.get('type') == 'tool_use':
                    rec = {'id': b['id'], 'name': b['name'], 'input': b.get('input', {}),
                           'call_no': len(calls), 'res': 0, 'ts': d.get('timestamp')}
                    tools.append(rec)
                    by_id[b['id']] = rec
        elif t == 'user':
            c = d['message'].get('content')
            if first_user is None:
                first_user = c if isinstance(c, str) else json.dumps(c)[:3000]
            if isinstance(c, list):
                for b in c:
                    if b.get('type') == 'tool_result' and b.get('tool_use_id') in by_id:
                        by_id[b['tool_use_id']]['res'] = content_len(b.get('content'))
                        by_id[b['tool_use_id']]['res_ts'] = d.get('timestamp')
    ncalls = len(calls)
    for r in tools:
        r['later_calls'] = ncalls - r['call_no']
    tot = collections.Counter()
    for u in calls.values():
        for k in ('input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens'):
            tot[k] += u.get(k, 0) or 0
    ctx = [ (u.get('input_tokens',0)+u.get('cache_creation_input_tokens',0)+u.get('cache_read_input_tokens',0)) for u in calls.values()]
    return dict(path=path, calls=ncalls, usage=tot, tools=tools, first_user=first_user,
                dur=(max(times) - min(times)).total_seconds() if times else 0,
                start=min(times), ctx=ctx)


agents = []
m = parse(MAIN)
m['role'] = 'orchestrateur'; m['desc'] = 'session principale'; m['aid'] = 'main'
agents.append(m)
for p in sorted(glob.glob(SUB + 'agent-*.jsonl')):
    aid = os.path.basename(p)[6:-6]
    if aid == SELF:
        continue
    meta = json.load(open(p[:-6] + '.meta.json'))
    a = parse(p)
    a['role'] = meta['agentType']; a['desc'] = meta['description']; a['aid'] = aid
    agents.append(a)

pickle.dump(agents, open(OUT + '/agents.pkl', 'wb'))

agents_sorted = [agents[0]] + sorted(agents[1:], key=lambda a: a['start'])
T = collections.Counter()
print('| Agent | Rôle | Tâche | Appels | input | cache création | cache lecture | sortie | outils | durée (min) | ctx max |')
for a in agents_sorted:
    u = a['usage']; T.update(u); T['calls'] += a['calls']; T['tools'] += len(a['tools']); T['dur'] += a['dur']
    print(f"| {a['aid'][:7]} | {a['role']} | {a['desc']} | {a['calls']} | {u['input_tokens']:,} | {u['cache_creation_input_tokens']:,} | {u['cache_read_input_tokens']:,} | {u['output_tokens']:,} | {len(a['tools'])} | {a['dur']/60:.0f} | {max(a['ctx']):,} |")
print('TOTAL', dict(T))
