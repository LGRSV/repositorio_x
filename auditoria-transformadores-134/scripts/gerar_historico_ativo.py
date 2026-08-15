"""O histórico do ativo: toda SS e toda interrupção que existem sobre cada transformador.

Duas perguntas que a auditoria responde caso a caso e nunca respondeu por ativo:

  1. Quantas vezes ESTE transformador pediu troca? Quando, por quem, com que causa?
  2. Quantas vezes ELE apareceu numa interrupção — não só a que casou com a SS, mas
     TODAS, inclusive as que ninguém ligou a pedido nenhum?

A segunda é a que não existia em lugar nenhum. A régua da auditoria olha a janela de
uma SS; aqui a pergunta é do ativo, sem janela: dezembro de 2025 a agosto de 2026, os
nove arquivos da Crítica, o ativo procurado nas três colunas de papel — problema,
interrompido e fechado.

Um ativo com oito interrupções e uma troca conta uma história diferente de um ativo com
uma interrupção e uma troca, e essa diferença não estava em tela nenhuma.
"""

import json
import os
import re
from collections import defaultdict

APP = "/home/user/repositorio_x/auditoria-transformadores-134/public"
AQUI = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
U = "/root/.claude/uploads/74dc9c64-5026-54ee-a81e-173d2f38a735"
PAPEIS = ("COD_ELE_PROBLEMA", "COD_ELE_INTERROMPIDO", "COD_ELE_FECHADO")

FONTES = [("dez/2025", f"{U}/0896088f-CriticaCHEIO_122025.txt")]
FONTES += [(f"{n[14:16]}/2026", f"/tmp/critica_janjun/{n}")
           for n in sorted(os.listdir("/tmp/critica_janjun")) if n.endswith(".txt")]
FONTES += [("jul/2026", f"{U}/75bd07d1-Critica__072026.txt"),
           ("ago/2026", f"{U}/44796f2e-Critica__082026_3.txt")]


def txt(v):
    return "" if v is None else str(v).strip()


# ── de quais ativos queremos a história ────────────────────────────────────
ativos = set()
ss_do_ativo = defaultdict(list)


def anota(r, periodo, decisao):
    t = txt(r.get("trafo"))
    if not t:
        return
    ativos.add(t)
    ss_do_ativo[t].append({
        "ss": txt(r.get("ss")), "d": txt(r.get("abertura"))[:16], "p": periodo,
        "v": decisao, "o": txt(r.get("os")), "b": txt(r.get("obra")),
        "e": txt(r.get("equipe_ss")), "g": txt(r.get("origem")),
        "c": txt(r.get("categoria_texto")) or txt(r.get("categoria")),
        "s": txt(r.get("situacao")),
    })


fluxo = json.load(open(f"{APP}/fluxo-1510.json", encoding="utf-8"))
for r in fluxo["registros"]:
    anota(r, "jan-jun", txt(r.get("decisao")))
for mes, arq in (("julho", "julho-2026.json"), ("agosto", "agosto-2026.json")):
    d = json.load(open(f"{APP}/{arq}", encoding="utf-8"))
    for r in d["registros"]:
        anota(r, mes, txt(r.get("entra")))
    for r in d.get("ampliado", []):
        anota(r, mes + " (fora do recorte)", "FORA")
print(f"{len(ativos)} transformadores distintos · "
      f"{sum(len(v) for v in ss_do_ativo.values())} solicitações")

# ── e agora toda interrupção que cita cada um ──────────────────────────────
inter = defaultdict(list)
lidas = 0
for rot, cam in FONTES:
    if not os.path.exists(cam):
        print(f"  {rot}: arquivo ausente — {cam}")
        continue
    linhas = open(cam, encoding="latin-1").read().split("\n")
    cab = [c.strip() for c in linhas[0].split(";")]
    J = {c: i for i, c in enumerate(cab)}
    n = 0
    for l in linhas[1:]:
        if not l.strip():
            continue
        p = l.split(";")
        if len(p) < len(cab):
            continue
        n += 1
        donos = {p[J[c]].strip() for c in PAPEIS} & ativos
        if not donos:
            continue
        reg = {
            "n": p[J["NUM_SEQ_OPER_INIC_HDE"]].strip(),
            "i": p[J["DTA_ABERT"]].strip()[:16], "f": p[J["DTA_FECH"]].strip()[:16],
            "m": p[J["DURACAO"]].strip(), "q": p[J["QTD_CONS_INTER_FAT"]].strip(),
            "c": p[J["DES_CAUSA_INTER_CAU"]].strip(),
            "s": p[J["DES_SUB_CAUSA_INTER_SCR"]].strip(),
            "a": p[J["COD_ALIMENTADOR"]].strip(),
            "o": re.sub(r"\s+", " ", p[J["OBSERVACAO"]].strip())[:400],
            "mes": rot,
        }
        for t in donos:
            papel = "+".join(c.replace("COD_ELE_", "").lower()
                             for c in PAPEIS if p[J[c]].strip() == t)
            inter[t].append({**reg, "p": papel})
    lidas += n
    print(f"  {rot}: {n} ocorrências")

for t in inter:
    inter[t].sort(key=lambda x: (x["i"][6:10], x["i"][3:5], x["i"][:2], x["i"][11:]))
print(f"\n{lidas} ocorrências lidas · {len(inter)} ativos com ao menos uma · "
      f"{sum(len(v) for v in inter.values())} ligações ativo↔interrupção")

saida = {"gerado_em": "15/08/2026", "periodo": "dez/2025 a ago/2026",
         "ocorrencias_lidas": lidas,
         "por_ativo": {t: {"ss": ss_do_ativo.get(t, []), "int": inter.get(t, [])}
                       for t in sorted(ativos)}}
cam = f"{AQUI}/historico-ativo.json"
json.dump(saida, open(cam, "w"), ensure_ascii=False, separators=(",", ":"))
print(f"gravado: {cam} ({os.path.getsize(cam)/1e6:.1f} MB)")

q = sorted(((len(v["int"]), t) for t, v in saida["por_ativo"].items()), reverse=True)[:5]
print("os cinco ativos com mais interrupções:", ", ".join(f"{t}: {n}" for n, t in q))
