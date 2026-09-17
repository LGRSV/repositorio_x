#!/usr/bin/env python3
"""Guarda o contexto de trabalho da sessão dentro do repositório (git) para
sobreviver ao fim do contêiner.

Cria contexto/<AAAA-MM-DD>_<slug>/ com:
  CONTEXTO.md      narrativa escrita pelo Claude (se já existir em --contexto)
  inventario.json  todos os arquivos do scratchpad com tamanho, data e sha
  ARQUIVOS.md      o inventário em tabela, legível
  arquivos/        cópia dos arquivos pequenos e recentes (limites abaixo)

Uso:
  snapshot.py --slug trafos-rurais [--contexto /caminho/CONTEXTO.md]
  snapshot.py --auto --motivo stop|compactacao      (usado pelos hooks)

O git faz o commit e o push na branch atual. O upload ao Drive é feito pelo
Claude com o conector (ver SKILL.md), porque o shell não tem credencial.
"""
import argparse, glob, hashlib, json, os, re, shutil, subprocess, sys, time
from datetime import datetime
from pathlib import Path

LIMITE_ARQUIVO = 10 * 1024 * 1024        # 10 MB por arquivo
LIMITE_TOTAL = 120 * 1024 * 1024         # 120 MB por snapshot
THROTTLE_AUTO_MIN = 20                   # minutos entre autosaves no Stop
EXT_IGNORADAS = {'.zip', '.gz', '.7z', '.tar', '.sqlite3', '.sqlite3-shm', '.sqlite3-wal', '.pyc', '.pkl'}
DIRS_IGNORADOS = {'node_modules', '__pycache__', '.git', '.venv', 'dist', 'pages-dist'}
PRIORIDADE = ['.md', '.py', '.js', '.mjs', '.sh', '.json', '.txt', '.csv',
              '.xlsx', '.pptx', '.docx', '.pdf', '.html', '.png', '.jpg']


def scratchpad():
    sid = os.environ.get('CLAUDE_CODE_SESSION_ID', '')
    cands = glob.glob(f'/tmp/claude-0/*/{sid}/scratchpad') if sid else []
    if not cands:
        cands = glob.glob('/tmp/claude-0/*/*/scratchpad')
    if not cands:
        return None
    return Path(max(cands, key=lambda p: os.path.getmtime(p)))


def repo_root():
    out = subprocess.run(['git', 'rev-parse', '--show-toplevel'], capture_output=True, text=True,
                         cwd=os.environ.get('CLAUDE_PROJECT_DIR') or os.getcwd())
    return Path(out.stdout.strip()) if out.returncode == 0 else None


def sha(p, n=12):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()[:n]


def ignorado(p: Path, raiz: Path, extra):
    rel = p.relative_to(raiz)
    if any(part in DIRS_IGNORADOS for part in rel.parts):
        return True
    if p.suffix.lower() in EXT_IGNORADAS:
        return True
    r = str(rel)
    return any(rel.match(pat) or r == pat.rstrip('/') or r.startswith(pat.rstrip('/') + '/') for pat in extra)


def inventariar(raiz: Path):
    extra = []
    ig = raiz / '.contextoignore'
    if ig.exists():
        extra = [l.strip() for l in ig.read_text().splitlines() if l.strip() and not l.startswith('#')]
    itens = []
    for p in raiz.rglob('*'):
        if not p.is_file() or p.name == '.contextoignore':
            continue
        st = p.stat()
        itens.append({
            'caminho': str(p.relative_to(raiz)),
            'bytes': st.st_size,
            'modificado': datetime.fromtimestamp(st.st_mtime).strftime('%Y-%m-%d %H:%M'),
            'ext': p.suffix.lower(),
            'ignorado': ignorado(p, raiz, extra),
        })
    return itens


def escolher(itens):
    """Copia até os limites. Ordem: arquivos pequenos primeiro (garante que scripts,
    JSONs de resultado e entregas entrem antes das bases grandes), depois por tipo,
    depois o mais recente primeiro. Faixas: até 1 MB, até 5 MB, o resto."""
    def faixa(b):
        return 0 if b <= 1 << 20 else (1 if b <= 5 << 20 else 2)
    def pri(ext):
        return PRIORIDADE.index(ext) if ext in PRIORIDADE else len(PRIORIDADE)
    cand = [i for i in itens if not i['ignorado'] and i['bytes'] <= LIMITE_ARQUIVO]
    grupos = {}
    for i in cand:
        grupos.setdefault((faixa(i['bytes']), pri(i['ext'])), []).append(i)
    total, escolhidos = 0, []
    for k in sorted(grupos):
        for i in sorted(grupos[k], key=lambda i: i['modificado'], reverse=True):
            if total + i['bytes'] > LIMITE_TOTAL:
                i['copiado'] = False
                i['motivo'] = 'limite total do snapshot'
                continue
            i['copiado'] = True
            total += i['bytes']
            escolhidos.append(i)
    for i in itens:
        if 'copiado' not in i:
            i['copiado'] = False
            i['motivo'] = 'ignorado' if i['ignorado'] else 'maior que 10 MB'
    return escolhidos, total


def humano(b):
    for u in ['B', 'KB', 'MB', 'GB']:
        if b < 1024:
            return f'{b:.0f} {u}'
        b /= 1024
    return f'{b:.1f} TB'


def git(raiz, *args, check=False):
    r = subprocess.run(['git', *args], cwd=raiz, capture_output=True, text=True)
    if check and r.returncode != 0:
        raise RuntimeError(r.stderr.strip())
    return r


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--slug', help='nome curto do trabalho, ex.: trafos-rurais')
    ap.add_argument('--contexto', help='CONTEXTO.md já escrito para copiar para dentro do snapshot')
    ap.add_argument('--auto', action='store_true', help='modo hook: silencioso, com throttle, nunca falha')
    ap.add_argument('--motivo', default='manual')
    ap.add_argument('--sem-push', action='store_true')
    a = ap.parse_args()

    try:
        hook_in = json.load(sys.stdin) if a.auto and not sys.stdin.isatty() else {}
    except Exception:
        hook_in = {}
    if hook_in.get('stop_hook_active'):
        return 0

    sp = scratchpad()
    raiz = repo_root()
    if not sp or not raiz:
        if not a.auto:
            print('scratchpad ou repositório não encontrado', file=sys.stderr)
        return 0 if a.auto else 1

    marca = sp / '.ultimo_autosave'
    if a.auto and a.motivo == 'stop' and marca.exists():
        if time.time() - marca.stat().st_mtime < THROTTLE_AUTO_MIN * 60:
            return 0

    hoje = datetime.now().strftime('%Y-%m-%d')
    if a.auto and not a.slug:
        # snapshot automático: uma pasta só, sempre sobrescrita; o histórico fica no git
        slug = 'auto'
        dest = raiz / 'contexto' / '_auto'
        if dest.exists():
            shutil.rmtree(dest)
    else:
        slug = re.sub(r'[^a-z0-9-]+', '-', a.slug.lower()).strip('-')
        dest = raiz / 'contexto' / f'{hoje}_{slug}'
    (dest / 'arquivos').mkdir(parents=True, exist_ok=True)

    itens = inventariar(sp)
    escolhidos, total = escolher(itens)
    for i in escolhidos:
        alvo = dest / 'arquivos' / i['caminho']
        alvo.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(sp / i['caminho'], alvo)
        i['sha'] = sha(sp / i['caminho'])

    meta = {
        'gerado_em': datetime.now().isoformat(timespec='seconds'),
        'sessao': os.environ.get('CLAUDE_CODE_SESSION_ID'),
        'sessao_remota': os.environ.get('CLAUDE_CODE_REMOTE_SESSION_ID'),
        'motivo': a.motivo,
        'scratchpad': str(sp),
        'branch': git(raiz, 'branch', '--show-current').stdout.strip(),
        'commit_base': git(raiz, 'rev-parse', '--short', 'HEAD').stdout.strip(),
        'copiados': len(escolhidos),
        'bytes_copiados': total,
        'total_arquivos': len(itens),
        'arquivos': sorted(itens, key=lambda i: i['caminho']),
    }
    (dest / 'inventario.json').write_text(json.dumps(meta, ensure_ascii=False, indent=1))

    linhas = [f'# Arquivos do scratchpad em {meta["gerado_em"]}', '',
              f'Sessão `{meta["sessao"]}` · branch `{meta["branch"]}` · motivo: {a.motivo}', '',
              f'{len(escolhidos)} de {len(itens)} arquivos copiados ({humano(total)}). '
              'Os demais são zips, bases brutas acima de 10 MB ou pastas ignoradas; '
              'eles continuam listados aqui para se saber que existiram.', '',
              '| arquivo | tamanho | modificado | copiado |', '|---|---|---|---|']
    for i in meta['arquivos']:
        linhas.append(f'| {i["caminho"]} | {humano(i["bytes"])} | {i["modificado"]} | '
                      f'{"sim" if i["copiado"] else "não — " + i.get("motivo", "")} |')
    (dest / 'ARQUIVOS.md').write_text('\n'.join(linhas) + '\n')

    # RESUMO.md: curto o bastante para subir ao Drive pelo conector
    por_pasta = {}
    for i in meta['arquivos']:
        pasta = i['caminho'].split('/')[0] if '/' in i['caminho'] else '(raiz)'
        d = por_pasta.setdefault(pasta, {'n': 0, 'copiados': 0, 'bytes': 0})
        d['n'] += 1
        d['copiados'] += 1 if i['copiado'] else 0
        d['bytes'] += i['bytes'] if i['copiado'] else 0
    res = [f'# Resumo do snapshot {dest.name}', '',
           f'Gerado em {meta["gerado_em"]} · sessão `{meta["sessao"]}` · branch `{meta["branch"]}` · motivo: {a.motivo}', '',
           f'{len(escolhidos)} de {len(itens)} arquivos copiados ({humano(total)}) para `contexto/{dest.name}/arquivos/`.', '',
           '## Por pasta', '', '| pasta | arquivos | copiados | tamanho copiado |', '|---|---|---|---|']
    for pasta in sorted(por_pasta):
        d = por_pasta[pasta]
        res.append(f'| {pasta} | {d["n"]} | {d["copiados"]} | {humano(d["bytes"])} |')
    fora = [i for i in meta['arquivos'] if not i['copiado'] and (i.get('motivo') != 'ignorado' or i['bytes'] > 1 << 20)]
    res += ['', '## Não copiados (pedir ao usuário se precisar)', '']
    res += [f'- {i["caminho"]} ({humano(i["bytes"])}) — {i.get("motivo")}' for i in fora] or ['- nenhum']
    (dest / 'RESUMO.md').write_text('\n'.join(res) + '\n')

    if a.contexto and Path(a.contexto).exists():
        shutil.copy2(a.contexto, dest / 'CONTEXTO.md')
    elif not (dest / 'CONTEXTO.md').exists():
        (dest / 'CONTEXTO.md').write_text(
            f'# Contexto — snapshot automático de {datetime.now().strftime("%d/%m/%Y %H:%M")} (motivo: {a.motivo})\n\n'
            '> Gerado pelo hook. O Claude ainda não escreveu a narrativa desta sessão; use o CONTEXTO.md\n'
            '> do snapshot manual mais recente (contexto/INDICE.md) e trate os arquivos daqui como a versão mais nova.\n'
            '> Rode `/salvar-contexto <slug>` para registrar: objetivo, estado, decisões, números, pendências, como retomar.\n')

    # índice geral: o mais recente primeiro
    idx = raiz / 'contexto' / 'INDICE.md'
    pastas = sorted([p for p in (raiz / 'contexto').iterdir() if p.is_dir() and not p.name.startswith('_')], reverse=True)
    li = ['# Índice de contextos salvos', '', 'Mais recente primeiro. Cada pasta tem CONTEXTO.md (narrativa), '
          'RESUMO.md, ARQUIVOS.md (inventário) e arquivos/ (cópias).', '']
    auto = raiz / 'contexto' / '_auto' / 'CONTEXTO.md'
    if auto.exists():
        li.append(f'- [_auto](_auto/CONTEXTO.md) — {auto.read_text().splitlines()[0][2:]} '
                  '(arquivos mais novos que o último snapshot manual)')
    for p in pastas:
        cab = ''
        c = p / 'CONTEXTO.md'
        if c.exists():
            for l in c.read_text().splitlines():
                if l.startswith('# '):
                    cab = l[2:].strip(); break
        li.append(f'- [{p.name}]({p.name}/CONTEXTO.md) — {cab}')
    idx.write_text('\n'.join(li) + '\n')

    marca.touch()

    # commit + push
    git(raiz, 'add', '-A', 'contexto')
    if git(raiz, 'diff', '--cached', '--quiet').returncode == 0:
        if not a.auto:
            print(f'nada novo para salvar em {dest.relative_to(raiz)}')
        return 0
    msg = (f'Contexto automático ({a.motivo}): {len(escolhidos)} arquivos, {humano(total)}' if slug == 'auto'
           else f'Contexto salvo: {hoje} {slug} ({len(escolhidos)} arquivos, {humano(total)})')
    git(raiz, 'commit', '-q', '-m', msg)
    if not a.sem_push:
        br = meta['branch']
        for tent, espera in enumerate([0, 2, 4, 8, 16]):
            if espera:
                time.sleep(espera)
            r = git(raiz, 'push', '-u', 'origin', br)
            if r.returncode == 0:
                break
        else:
            if not a.auto:
                print('push falhou:', r.stderr.strip(), file=sys.stderr)
    if not a.auto:
        print(f'salvo em {dest.relative_to(raiz)} — {len(escolhidos)} arquivos, {humano(total)}')
        print(f'commit: {msg}')
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as e:
        # um hook nunca deve travar a sessão
        print(f'snapshot falhou: {e}', file=sys.stderr)
        sys.exit(0 if '--auto' in sys.argv else 1)
