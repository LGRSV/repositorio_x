"""O universo de janeiro a JULHO: 1.510 + 72 = 1.582 solicitações.

Ele pediu: "atualiza o site com os de julho, para ser 1582".

POR QUE ISTO É UM ARQUIVO NOVO E NÃO UMA EDIÇÃO DO fluxo-1510.json. O conjunto de
janeiro a junho está congelado e auditado: scripts/auditoria_invariantes.py trava se o
total deixar de ser 1.510, a esteira soma cascata por cascata contra esse número, e
dezenas de textos da tela citam "as 1.510". Mexer ali para caber julho quebraria a
verificação que dá confiança ao número. Então o jan–jun continua intacto e este arquivo
soma os dois períodos por cima, cada registro carregando de onde veio.

O QUE 1.582 É E O QUE NÃO É. 1.582 é o UNIVERSO DE SOLICITAÇÕES de jan a jul. Não é o
indicador. O indicador de janeiro a junho continua sendo 1.305 (1.225 queimados + 80
avariados) e não foi recalculado. Julho entra com os 72 do recorte, dos quais 55 a régua
coloca dentro e 17 seguem pendentes de informação de campo — e pendente continua
pendente aqui.

A RESSALVA QUE VIAJA COM O DADO. O julho-2026.json diz de si mesmo, no campo `regra`,
que é indicador separado e não soma com as 1.305. Este arquivo soma porque o dono pediu
que somasse, e registra as duas coisas: o total combinado e o fato de que julho é prévia,
com decisão tomada pela régua e não por martelo.

Entradas: public/fluxo-1510.json e public/julho-2026.json
Saída:    public/fluxo-1582.json
"""

import collections
import json
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(AQUI, "..", "public")

txt = lambda v: "" if v is None else str(v).strip()


def carregar(nome):
    with open(os.path.join(PUB, nome), encoding="utf-8") as fh:
        return json.load(fh)


f10 = carregar("fluxo-1510.json")
jul = carregar("julho-2026.json")

# ── sanidade antes de somar ─────────────────────────────────────────────────
if len(f10["registros"]) != 1510:
    raise RuntimeError("fluxo-1510.json não tem 1.510 registros — não siga")
if len(jul["registros"]) != 72:
    raise RuntimeError("julho-2026.json não tem 72 registros — não siga")
dup = {r["ss"] for r in f10["registros"]} & {r["ss"] for r in jul["registros"]}
if dup:
    raise RuntimeError(f"SS repetida entre os dois períodos: {sorted(dup)[:5]}")

# ── o campo comum ───────────────────────────────────────────────────────────
# Julho nasceu com outro conjunto de campos. Aqui só entra o que os dois têm, mais o
# que julho tem de próprio e vale mostrar; o resto continua no arquivo de origem.
COMUM = ("ss", "os", "obra", "trafo", "abertura", "situacao", "criticidade",
         "localidade", "alimentador", "origem", "tipo_ss")

registros = []

for r in f10["registros"]:
    d = {k: txt(r.get(k)) for k in COMUM}
    d.update(periodo="jan–jun", congelado=True, previa=False,
             categoria=txt(r.get("categoria")),
             decisao=txt(r.get("decisao")),
             expurgo=txt(r.get("expurgo")),
             gatilho=txt(r.get("expurgo_gatilho")),
             entra="SIM" if txt(r.get("decisao")) == "INCLUIR" else
                   ("NÃO" if txt(r.get("decisao")) == "EXCLUIR" else "REVISÃO"),
             decidido_por="esteira jan–jun (congelada)",
             clientes=txt(r.get("oc_cons")),
             pot_ret=txt(r.get("pot_ret")), pot_inst=txt(r.get("pot_inst")),
             texto_ss=txt(r.get("desc_ss"))[:600], texto_os=txt(r.get("desc_os"))[:600])
    registros.append(d)

for r in jul["registros"]:
    d = {k: txt(r.get(k)) for k in COMUM}
    entra = txt(r.get("entra"))
    d.update(periodo="julho", congelado=False, previa=True,
             categoria=txt(r.get("categoria")),
             decisao={"SIM": "INCLUIR", "NÃO": "EXCLUIR"}.get(entra, "PENDENTE"),
             expurgo="SIM" if entra == "NÃO" else "NÃO",
             gatilho="",
             entra=entra,
             decidido_por=txt(r.get("decidido_por")),
             clientes=txt(r.get("clientes")),
             pot_ret=txt(r.get("pot_ret")), pot_inst=txt(r.get("pot_inst")),
             texto_ss=txt(r.get("texto_ss"))[:600], texto_os=txt(r.get("texto_os"))[:600])
    registros.append(d)

# ── o resumo ────────────────────────────────────────────────────────────────
por = lambda campo, filtro=None: dict(collections.Counter(
    r[campo] for r in registros if (filtro is None or filtro(r))).most_common())

janjun = [r for r in registros if r["periodo"] == "jan–jun"]
julho = [r for r in registros if r["periodo"] == "julho"]

resumo = {
    "total": len(registros),
    "jan_jun": len(janjun),
    "julho": len(julho),
    "entram": sum(1 for r in registros if r["entra"] == "SIM"),
    "entram_jan_jun": sum(1 for r in janjun if r["entra"] == "SIM"),
    "entram_julho": sum(1 for r in julho if r["entra"] == "SIM"),
    "pendentes_julho": sum(1 for r in julho if r["entra"] == "PENDENTE"),
    "expurgados": sum(1 for r in registros if r["expurgo"] == "SIM"),
    "em_revisao": sum(1 for r in registros if r["decisao"] == "REVISÃO"),
    "decisao": por("decisao"),
    "categoria_jan_jun": por("categoria", lambda r: r["periodo"] == "jan–jun"),
    "categoria_julho": por("categoria", lambda r: r["periodo"] == "julho"),
}

saida = {
    "meta": {
        "titulo": "Universo de janeiro a julho de 2026 — 1.582 solicitações",
        "montado_de": ["fluxo-1510.json (jan–jun, congelado)",
                       "julho-2026.json (julho, prévia)"],
        "o_que_e": ("1.582 é o UNIVERSO DE SOLICITAÇÕES de janeiro a julho: as 1.510 de "
                    "janeiro a junho mais as 72 de julho. Não é o indicador."),
        "o_que_nao_e": ("O indicador de janeiro a junho continua sendo 1.305 — 1.225 "
                        "queimados e 80 avariados — e não foi recalculado. Nenhum caso "
                        "de janeiro a junho mudou de decisão para caber aqui."),
        "julho_e_previa": ("Os 72 de julho entram com a decisão da régua, não com martelo "
                           "do dono: 55 dentro e 17 pendentes de informação de campo. "
                           "Pendente continua pendente."),
        "ressalva_de_origem": ("O julho-2026.json diz de si mesmo, no campo `regra`, que é "
                               "indicador separado e não soma com as 1.305. Este arquivo "
                               "soma porque o dono pediu que somasse; a ressalva fica "
                               "registrada para que a diferença não se perca."),
        "lacunas_julho": jul.get("avisos", []),
        "fontes": list(f10["meta"].get("fontes", [])) + list(jul.get("fontes", [])),
    },
    "resumo": resumo,
    "registros": registros,
}

with open(os.path.join(PUB, "fluxo-1582.json"), "w", encoding="utf-8") as fh:
    json.dump(saida, fh, ensure_ascii=False)

tam = os.path.getsize(os.path.join(PUB, "fluxo-1582.json")) / 1e6
print(f"public/fluxo-1582.json · {resumo['total']} registros "
      f"({resumo['jan_jun']} + {resumo['julho']}) · {tam:.1f} MB")
print(f"  entram {resumo['entram']} = {resumo['entram_jan_jun']} (jan–jun) "
      f"+ {resumo['entram_julho']} (julho) · pendentes de julho: {resumo['pendentes_julho']}")
print(f"  expurgados {resumo['expurgados']} · em revisão {resumo['em_revisao']}")
