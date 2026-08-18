"""O conferidor de números: a prosa da tela contra o dado, em segundos.

Cinco auditores varreram o site em 18/08/2026 e acharam 40 e poucos números envelhecidos —
frases digitadas numa rodada antiga que ficaram para trás quando as regras mudaram. Tudo
foi corrigido, mas correção sem guarda é adiamento: na próxima mudança de regra a prosa
descola de novo e ninguém vê.

Este script é a guarda. Ele recomputa cada número do fluxo-1510.json e confere que a frase
correspondente ainda existe em app/page.tsx com o número certo. Se alguém regenerar o JSON
e esquecer a prosa, ele sai com erro e diz exatamente qual frase ficou velha.

Uso:  python3 scripts/conferir_numeros.py        (0 = tudo bate; 1 = tem frase velha)

O que ele NÃO cobre: números calculados ao vivo pela tela ({br(...)}), que não apodrecem,
e números de bases externas que não estão no repositório.
"""

import json
import os
import re
import sys

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
PAGE = open(f"{RAIZ}/app/page.tsx", encoding="utf-8").read()
d = json.load(open(f"{RAIZ}/public/fluxo-1510.json", encoding="utf-8"))
R = d["registros"]


def t(r, k):
    return str(r.get(k) or "")


def br(n):
    return f"{n:,}".replace(",", ".")


S = [r for r in R if t(r, "cascata") == "SAÍDA"]
casadas = [r for r in R if r.get("oc_dist_h") == 0]
com_at = [r for r in R if t(r, "at_num")]

# ── cada verificação: (frase esperada no page.tsx, conta que a sustenta) ──
ao_menos_25 = [r for r in S]
esperadas = []


def espera(frase, rotulo):
    esperadas.append((frase, rotulo))


espera(f"tira {sum(1 for r in S if t(r,'at_fora_da_janela')=='SIM')} casos da SAÍDA, "
       f"de {br(len(S))} para {br(len(S)-sum(1 for r in S if t(r,'at_fora_da_janela')=='SIM'))}",
       "corte do atendimento fora da janela")
espera(f"acontece em {sum(1 for r in casadas if not re.search(r'TRAFO|TRANSFORMADOR', t(r,'oc_obs').upper()))} casos",
       "observação casada sem citar transformador")
espera(f"falta em {sum(1 for r in S if not t(r,'at_num'))} casos", "TMAE faltando na SAÍDA")
espera(f"em {br(sum(1 for r in com_at if t(r,'at_ini')==t(r,'oc_ini') and t(r,'at_fim')==t(r,'oc_fim')))} "
       f"das {br(len(com_at))} com atendimento", "at_ini copiado da ocorrência")
espera(f"{sum(1 for r in R if t(r,'expurgo_gatilho')=='sem_interrupcao')} nunca tiveram", "ausentes 77")

# o bloco do aterramento (o par certo / a melhor das três) usa aterramento.json
at = json.load(open(f"{RAIZ}/public/aterramento.json", encoding="utf-8"))["por_ss"]
ants = []
for r in S:
    a = at.get(t(r, "ss"))
    if a and a.get("pior") is not None:
        ants.append(a)
acima = [a for a in ants if a["pior"] > 25]
espera(f"cairiam de {len(acima)} para", "aterramento: fora da norma pela pior haste")

falhas = []
for frase, rotulo in esperadas:
    if frase not in PAGE:
        falhas.append((rotulo, frase))

# ── invariantes do conjunto (não dependem de frase; quebram se o JSON mudar torto) ──
inv = {
    "cascata SAÍDA": (len(S), 1269),
    "gatilhos sem_interrupcao": (sum(1 for r in R if t(r, "expurgo_gatilho") == "sem_interrupcao"), 77),
    "gatilhos fora_da_janela": (sum(1 for r in R if t(r, "expurgo_gatilho") == "fora_da_janela"), 31),
    "censo AUSENTE": (sum(1 for r in R if t(r, "censo_critica") == "AUSENTE"), 78),
    "casadas dist=0": (len(casadas), 1140),
    "resumo.mudaram": (d["resumo"]["mudaram"], sum(1 for r in R if t(r, "mudou_na_revisao") == "SIM")),
}
for rotulo, (a, b) in inv.items():
    if a != b:
        falhas.append((f"invariante {rotulo}", f"{a} ≠ {b}"))

if falhas:
    print(f"{len(falhas)} FRASE(S) VELHA(S) OU INVARIANTE QUEBRADA:")
    for rotulo, frase in falhas:
        print(f"  ✗ {rotulo}\n     esperado no page.tsx: {frase[:110]}")
    sys.exit(1)
print(f"tudo bate: {len(esperadas)} frases conferidas + {len(inv)} invariantes")
