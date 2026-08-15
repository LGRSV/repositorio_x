"""O transformador que saiu e o que entrou, caso a caso, nos meses de prévia.

Ele pediu: uma aba, depois do histórico do ativo, com as informações do transformador
retirado e do instalado. A pergunta parece de cadastro e não é — o que saiu do poste é o
equipamento cuja falha está sendo contada, e a auditoria vinha discutindo o caso sem nunca
mostrar a plaqueta dele.

DE ONDE VÊM OS DADOS, e por que são duas fontes e não uma:

  1. Os CAMPOS ESTRUTURADOS da base de SS/OS (NS_RETIRADO, FABRICANTE_RETIRADO,
     POTENCIA_RET, DATA_FABRICACAO_RETIRADO, TOMBAMENTO_RETIRADO, e os equivalentes do
     instalado). É o que está digitado no sistema.

  2. A LEITURA DO TEXTO DA OS. Dez leitores independentes leram as 72 ordens de serviço de
     julho palavra por palavra — o texto que a equipe escreveu depois de subir no poste,
     com abreviação, acento faltando e erro de digitação. Dessa leitura saiu a fonte de
     cada valor e, principalmente, os CONFLITOS.

As duas não são a mesma coisa em 29 dos 72 casos de julho. Um transformador teve série e
tombamento invertidos na digitação; três têm um dígito de série diferente; dois tiveram a
data de fabricação preenchida com a data do próprio serviço; e num deles a equipe escreveu
que o tombamento estava ilegível e mesmo assim um número foi digitado.

A tela mostra os dois lados e não escolhe. Só a plaqueta resolve, e o equipamento já saiu
do poste — dizer qual está certo seria inventar.

Agosto entra com os campos estruturados apenas. A leitura dos dez agentes foi de julho, e
uma aba que mostrasse agosto como se tivesse a mesma conferência mentiria por omissão.
"""

import json
import os
import re
import sys

APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "analise-mensal"))
from base import ler_ss_os, indexar          # noqa: E402

BASES = ("/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad/"
         "bases_11-08-2026")
LEITURA = ("/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad/"
           "julho_os/consolidado.json")

# valores que ocupam o campo sem informar nada: plaqueta ilegível, zero, N/A
NADA = {"", "0", "00", "000", "0000", "N/A", "NA", "-", "--", "NAO TEM", "NÃO TEM",
        "ILEGIVEL", "ILÉGIVEL", "ILEGÍVEL", "NAO INFORMADO", "NÃO INFORMADO"}


def txt(v):
    return re.sub(r"\s+", " ", str(v or "")).strip()


def vale(v):
    return txt(v).upper() not in NADA


def norm(v):
    return txt(v).upper()


cab, regs = ler_ss_os(f"{BASES}/BASE_SS_OS_parte1.txt", f"{BASES}/BASE_SS_OS_parte2.txt")
campo = indexar(cab)
porss = {}
for r in regs:
    porss.setdefault(norm(campo(r, "NUMERO_SS")), []).append(r)
print(f"{len(porss)} SS distintas na base de SS/OS")

# ── a leitura das 72 OS de julho, feita pelos dez agentes ──────────────────
lido = {}
for l in json.load(open(LEITURA, encoding="utf-8")):
    lido[norm(l["ss"])] = l
print(f"{len(lido)} OS de julho lidas no texto")


def lado(r, sufixo):
    """Um dos dois transformadores da troca, direto dos campos do sistema."""
    ret = sufixo == "RETIRADO"
    d = {
        "serie": txt(campo(r, f"NS_{sufixo}")),
        "marca": txt(campo(r, f"FABRICANTE_{sufixo}")),
        "potencia": txt(campo(r, "POTENCIA_RET" if ret else "POTENCIA_INST")),
        "fabricacao": txt(campo(r, f"DATA_FABRICACAO_{sufixo}"))[:10],
        "tombamento": txt(campo(r, f"TOMBAMENTO_{sufixo}")),
        "reformado": txt(campo(r, "TRANSFORMADOR_RETIRADO_É_REFORMADO" if ret
                               else "TRAFO_INSTALADO_É_REFORMADO")),
        "reformadora": txt(campo(r, "REFORMADORA_DESAT" if ret else "REFORMADORA_INSTALADO")),
        "data_reforma": txt(campo(r, "DATA_REFORMA_RET" if ret else "DATA_REFORMA_INST"))[:10],
    }
    # o campo preenchido com lixo é pior que o campo vazio: some com o buraco
    d["sem_tombamento"] = not vale(d["tombamento"])
    d["sem_serie"] = not vale(d["serie"])
    return d


saida, achados = {}, {"julho": 0, "agosto": 0}
for arq, mes in (("julho-2026.json", "julho"), ("agosto-2026.json", "agosto")):
    d = json.load(open(f"{APP}/{arq}", encoding="utf-8"))
    for chave in ("registros", "ampliado"):
        for c in d.get(chave, []):
            ss = norm(c.get("ss"))
            r = (porss.get(ss) or [None])[0]
            if r is None:
                continue
            item = {"ret": lado(r, "RETIRADO"), "ins": lado(r, "INSTALADO"), "mes": mes}

            L = lido.get(ss)
            if L:
                item["fontes"] = {
                    "serie": L["serie_fonte"], "marca": L["marca_fonte"],
                    "potencia": L["potencia_fonte"], "fabricacao": L["fabricacao_fonte"],
                    "tombamento": L["tombamento_fonte"],
                }
                item["os_diz"] = {k: L[k] for k in
                                  ("serie", "marca", "potencia", "fabricacao", "tombamento")
                                  if L[k]}
                item["conflitos"] = L["conflitos"]
                item["trecho_os"] = L["trecho_os"]
                item["observacao"] = L["observacao"]
                achados[mes] += 1
            saida[c["ss"]] = item

print(f"{len(saida)} casos com equipamento · lidos no texto da OS: {achados}")

# um retrato do que falta, para a tela poder dizer em números
falta = {
    "sem_serie_retirado": sum(1 for v in saida.values() if v["ret"]["sem_serie"]),
    "sem_tombamento_retirado": sum(1 for v in saida.values() if v["ret"]["sem_tombamento"]),
    "com_conflito": sum(1 for v in saida.values() if v.get("conflitos")),
}
print("faltas:", falta)

cam = f"{APP}/equipamento-mes.json"
json.dump({
    "gerado_em": "15/08/2026",
    "fonte": "Base de SS/OS 11/08/2026 (partes 1 e 2) · leitura do texto das 72 OS de "
             "julho/2026 por dez leitores independentes",
    "o_que_e": "O transformador que saiu do poste e o que entrou. Quando a OS foi lida, "
               "a tela mostra o que a equipe escreveu E o que foi digitado no sistema, "
               "lado a lado. Ela não escolhe entre os dois: só a plaqueta resolve, e o "
               "equipamento já saiu do poste.",
    "leitura_de_texto": "julho/2026 · 72 OS. Agosto entra com os campos do sistema apenas.",
    "resumo": falta,
    "por_ss": saida,
}, open(cam, "w"), ensure_ascii=False, separators=(",", ":"))
print(f"gravado: {cam} ({os.path.getsize(cam)/1024:.0f} KB)")
