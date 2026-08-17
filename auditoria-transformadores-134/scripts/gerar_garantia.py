"""Transformador que queimou pouco tempo depois de ter sido instalado: garantia.

Ele achou o caso e me cobrou com razão: a SS ENC-RD-PS 00004/2025 instalou o transformador
de série 1610908 em 02/01/2025, e a SS ENC-RD-PS 00621/2026 tirou o MESMO equipamento
queimado em 04/07/2026. Dezoito meses no poste. Isso é candidato a garantia, e a auditoria
não estava olhando para isso — ela olhava o poste, não o EQUIPAMENTO.

A diferença importa: rastrear pelo poste responde "este ponto da rede queima muito". Rastrear
pelo NÚMERO DE SÉRIE responde "este equipamento falhou cedo" — e é essa a pergunta da
garantia, do fabricante e da reformadora.

COMO O RASTREIO É FEITO: o número de série que sai numa SS (NS_RETIRADO) é procurado como
NS_INSTALADO em todas as SS anteriores da base. Quando bate, temos a data em que aquele
equipamento entrou em serviço, quem o fabricou e se era novo ou reformado.

DUAS CONTAS, e elas respondem a perguntas diferentes:
  - TEMPO NO POSTE: da instalação até a queima. É o que interessa para garantia de serviço
    e para cobrar da reformadora.
  - IDADE NA QUEIMA: da fabricação até a queima. É o que interessa para garantia de fábrica.
Um transformador pode ter 3 meses de poste e 4 anos de fábrica — ficou parado no estoque. A
planilha mostra as duas, porque cobrar do fabricante por equipamento que envelheceu no
almoxarifado seria errado, e o contrário também.

O QUE ESTE SCRIPT NÃO FAZ: dizer que a garantia vale. O prazo é contratual e varia — não
está em nenhuma base que eu tenha. Aqui se estabelece o FATO (este equipamento durou tanto)
e a lista de quem precisa ser conferido contra o contrato.
"""

import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "analise-mensal"))
from base import ler_ss_os, indexar          # noqa: E402

BASES = "/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad/bases_11-08-2026"
APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")


def n(s):
    return re.sub(r"\s+", " ", str(s or "")).strip().upper()


def limpa(s):
    return re.sub(r"\s+", " ", str(s or "")).strip()


def dt(s):
    t = limpa(s)[:19]
    for f in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%d/%m/%Y",
              "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(t[:len(datetime.now().strftime(f))] if False else t, f)
        except ValueError:
            pass
    for f in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(t[:10], f)
        except ValueError:
            pass
    return None


# série que não identifica nada: contar isso como rastreio seria inventar cadeia
LIXO = {"", "0", "00", "000", "0000", "N/A", "NA", "-", "--", "NAO TEM", "NÃO TEM",
        "ILEGIVEL", "ILÉGIVEL", "ILEGÍVEL", "SEM SERIE", "1", "11", "111"}


def serie_vale(v):
    s = n(v)
    return s not in LIXO and len(re.sub(r"\D", "", s)) >= 3


cab, regs = ler_ss_os(f"{BASES}/BASE_SS_OS_parte1.txt", f"{BASES}/BASE_SS_OS_parte2.txt")
campo = indexar(cab)
print(f"base: {len(regs)} linhas")

# quem INSTALOU cada número de série, e quando
instalou = defaultdict(list)
for r in regs:
    ns = n(campo(r, "NS_INSTALADO"))
    if serie_vale(ns):
        d = dt(campo(r, "DATA_ABERTURA_SS"))
        if d:
            instalou[ns].append((d, r))
for k in instalou:
    instalou[k].sort(key=lambda x: x[0])
print(f"números de série com instalação rastreada: {len(instalou)}")

# o universo da auditoria: as 1.305 mais julho e agosto
alvo = {}
mil = json.load(open("/tmp/os1305.json"))
for ss, classe in mil.items():
    alvo[n(ss)] = ("jan–jun/2026 · as 1.305", classe)
for arq, rot in (("julho-2026.json", "julho/2026"), ("agosto-2026.json", "agosto/2026")):
    d = json.load(open(f"{APP}/{arq}", encoding="utf-8"))
    for x in d["registros"]:
        alvo.setdefault(n(x["ss"]), (rot + " · recorte", x.get("entra")))
    for x in d.get("ampliado", []):
        alvo.setdefault(n(x["ss"]), (rot + " · ampliado", x.get("entra")))
print(f"casos da auditoria: {len(alvo)}")

linhas = []
for r in regs:
    ss = n(campo(r, "NUMERO_SS"))
    if ss not in alvo:
        continue
    nsr = n(campo(r, "NS_RETIRADO"))
    saida = dt(campo(r, "DATA_ABERTURA_SS"))
    if not serie_vale(nsr) or not saida:
        continue
    # a instalação mais recente ANTES desta retirada
    antes = [(d, rr) for d, rr in instalou.get(nsr, [])
             if d < saida and n(campo(rr, "NUMERO_SS")) != ss]
    if not antes:
        continue
    d_inst, r_inst = antes[-1]
    dias = (saida - d_inst).days
    fab = dt(campo(r, "DATA_FABRICACAO_RETIRADO"))
    # a data de fabricação às vezes é a data do serviço (armadilha já vista): descarta
    idade_meses = None
    if fab and fab < saida and (saida - fab).days > 20:
        idade_meses = round((saida - fab).days / 30.44, 1)
    reformado = n(campo(r_inst, "TRAFO_INSTALADO_É_REFORMADO")).startswith("S")
    linhas.append({
        "ss_queima": campo(r, "NUMERO_SS").strip(),
        "recorte": alvo[ss][0], "classe": alvo[ss][1],
        "trafo": campo(r, "NUM_TRAFO").strip(),
        "localidade": campo(r, "LOCALIDADE").strip(),
        "ns": campo(r, "NS_RETIRADO").strip(),
        "fabricante": campo(r, "FABRICANTE_RETIRADO").strip(),
        "potencia": campo(r, "POTENCIA_RET").strip(),
        "data_queima": saida.strftime("%d/%m/%Y"),
        "ss_instalou": campo(r_inst, "NUMERO_SS").strip(),
        "os_instalou": campo(r_inst, "NUMERO_OS").strip(),
        "data_instalacao": d_inst.strftime("%d/%m/%Y"),
        "dias_no_poste": dias,
        "meses_no_poste": round(dias / 30.44, 1),
        "era_reformado": "Sim" if reformado else "Não",
        "reformadora": campo(r_inst, "REFORMADORA_INSTALADO").strip(),
        "fab_do_equipamento": campo(r, "DATA_FABRICACAO_RETIRADO").strip()[:10],
        "idade_na_queima_meses": idade_meses,
        "mesmo_poste": n(campo(r, "NUM_TRAFO")) == n(campo(r_inst, "NUM_TRAFO")),
        "poste_da_instalacao": campo(r_inst, "NUM_TRAFO").strip(),
        "origem": campo(r, "ORIGEM_SS").strip(),
        "defeito": campo(r, "DEFEITO_SS").strip(),
        "texto_ss_queima": limpa(campo(r, "DESCRIPTION_SS")),
        "texto_os_instalacao": limpa(campo(r_inst, "DESCRICAO_OS")),
    })

linhas.sort(key=lambda x: x["dias_no_poste"])
print(f"\nequipamentos rastreados da instalação até a queima: {len(linhas)}")
for faixa, rot in ((180, "menos de 6 meses"), (365, "menos de 1 ano"),
                   (548, "menos de 18 meses"), (730, "menos de 2 anos")):
    q = sum(1 for x in linhas if x["dias_no_poste"] < faixa)
    print(f"   {q:4d}  duraram {rot} no poste")
print("\nos 15 que menos duraram:")
for x in linhas[:15]:
    print(f"   {x['dias_no_poste']:5d} dias · {x['ss_queima']:24s} NS {x['ns']:>9s} · "
          f"{x['fabricante'][:8]:8s} · reformado {x['era_reformado']} · instalado por {x['ss_instalou']}")

json.dump(linhas, open("/tmp/garantia.json", "w"), ensure_ascii=False)
print(f"\ngravado /tmp/garantia.json")
