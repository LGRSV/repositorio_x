"""Um comando para atualizar o site: gera, confere e diz o que falta.

    python3 scripts/atualizar.py              # roda o que dá para rodar e relata
    python3 scripts/atualizar.py --listar     # só mostra o mapa, não executa
    python3 scripts/atualizar.py --so fluxo_1582 cadastro_fis

O PROBLEMA QUE ISTO RESOLVE. Cada número do site sai de um gerador diferente, e quase
todos leem uma extração que mora em /tmp. /tmp não sobrevive ao reinício do contêiner —
já aconteceu de tudo sumir no meio do trabalho. Antes disto, descobrir o que ainda dava
para gerar era abrir script por script. Agora é um comando: ele confere a entrada de cada
gerador ANTES de rodar, executa os que têm tudo, e lista os que precisam de upload com o
caminho exato do arquivo que falta.

A REGRA QUE ELE NÃO QUEBRA. Nenhum gerador aqui recalcula indicador fechado. O 1.305 e as
1.510 de janeiro a junho são entrada, nunca saída. `auditoria_invariantes.py` roda no fim
justamente para provar isso — se o total deixar de ser 1.510, o comando falha.
"""

import argparse
import json
import os
import subprocess
import sys
import time

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.join(AQUI, "..")
PUB = os.path.join(RAIZ, "public")

# ── o registro ──────────────────────────────────────────────────────────────
# Cada gerador declara o que PRECISA para rodar. `precisa` vazio significa que ele lê só
# o que já está versionado no repositório — esses rodam sempre, mesmo em contêiner novo.
GERADORES = [
    dict(id="fluxo_1582", script="gerar_fluxo_1582.py",
         produz=["fluxo-1582.json"], precisa=[],
         nota="Soma as 1.510 de jan–jun com as 72 de julho. Lê só public/."),
    dict(id="cadastro_fis", script="gerar_cadastro_fis.py",
         produz=["cadastro-fis.json"],
         precisa=["/tmp/fisz/FIS_ETO_2026_07_E_TRANSFORMADORES_ID.csv"],
         nota="Cadastro FIS do parque. O CSV tem 36 MB e não entra no repositório — "
              "descompacte o zip do Drive em /tmp/fisz/."),
    dict(id="solo", script="gerar_solo_ativo.py", produz=["solo-ativo.json"],
         precisa=["/tmp/pedo_to.json"],
         nota="Tipo de solo por ativo, da camada de pedologia do IBGE/BDIA."),
    dict(id="revisao", script="gerar_revisao.py", produz=["revisao.json"],
         precisa=[], nota="Revisão caso a caso. Confira a entrada no cabeçalho do script."),
]

VERIFICADORES = [
    dict(id="invariantes", script="auditoria_invariantes.py",
         nota="Prova que o conjunto de jan–jun continua com 1.510 e que as cascatas fecham."),
    dict(id="numeros", script="conferir_numeros.py",
         nota="Confere os números publicados contra os arquivos de origem."),
]


def existe(p):
    return os.path.exists(p if os.path.isabs(p) else os.path.join(RAIZ, p))


def rodar(script, timeout=1800):
    caminho = os.path.join(AQUI, script)
    if not os.path.exists(caminho):
        return False, f"script não existe: {script}"
    t = time.time()
    p = subprocess.run([sys.executable, caminho], cwd=RAIZ,
                       capture_output=True, text=True, timeout=timeout)
    saida = (p.stdout or "").strip().splitlines()
    resumo = saida[-1] if saida else ""
    if p.returncode != 0:
        erro = (p.stderr or "").strip().splitlines()
        return False, (erro[-1] if erro else f"código {p.returncode}")
    return True, f"{resumo}  ({time.time()-t:.1f}s)"


def mapa():
    print("GERADORES")
    for g in GERADORES:
        falta = [x for x in g["precisa"] if not existe(x)]
        estado = "pronto" if not falta else "FALTA ENTRADA"
        print(f"  {g['id']:<14} {estado:<14} → {', '.join(g['produz'])}")
        print(f"                 {g['nota']}")
        for f in falta:
            print(f"                 falta: {f}")
    print("\nVERIFICADORES")
    for v in VERIFICADORES:
        print(f"  {v['id']:<14} {'existe' if os.path.exists(os.path.join(AQUI, v['script'])) else 'AUSENTE':<14} {v['nota']}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--listar", action="store_true", help="só mostra o mapa")
    ap.add_argument("--so", nargs="*", help="roda apenas estes ids")
    ap.add_argument("--sem-verificar", action="store_true")
    a = ap.parse_args()

    if a.listar:
        mapa()
        return 0

    alvo = [g for g in GERADORES if not a.so or g["id"] in a.so]
    feitos, pulados, falharam = [], [], []

    print("=" * 72)
    for g in alvo:
        falta = [x for x in g["precisa"] if not existe(x)]
        if falta:
            pulados.append((g, falta))
            print(f"· {g['id']:<14} PULADO — falta {falta[0]}")
            continue
        ok, msg = rodar(g["script"])
        (feitos if ok else falharam).append((g, msg))
        print(f"· {g['id']:<14} {'ok' if ok else 'FALHOU'} — {msg}")

    if not a.sem_verificar and not falharam:
        print("-" * 72)
        for v in VERIFICADORES:
            if not os.path.exists(os.path.join(AQUI, v["script"])):
                continue
            ok, msg = rodar(v["script"])
            print(f"· {v['id']:<14} {'ok' if ok else 'FALHOU'} — {msg}")
            if not ok:
                falharam.append((v, msg))

    print("=" * 72)
    print(f"gerados {len(feitos)} · pulados {len(pulados)} · falharam {len(falharam)}")
    if pulados:
        print("\nPARA COMPLETAR, suba estes arquivos e rode de novo:")
        for g, falta in pulados:
            for f in falta:
                print(f"  {f}   ({g['id']})")
    if falharam:
        print("\nFALHAS — nada foi publicado:")
        for g, msg in falharam:
            print(f"  {g['id']}: {msg}")
        return 1

    print("\nPróximo passo: pnpm build:pages, conferir no navegador "
          "(scripts/verificar_site.mjs) e só então commit.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
