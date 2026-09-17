# -*- coding: utf-8 -*-
import json, collections, re, unicodedata

def n(s):
    s = unicodedata.normalize("NFD", str(s or "")).encode("ascii","ignore").decode().upper()
    return re.sub(r"\s+", " ", s)

d = json.load(open("as_1696.json"))

def so_pela_ss(r):
    o = n(r.get("origem_ss")); f = n(r.get("defeito_ss")); t = n(r.get("tss"))
    if "FURT" in o or "FURT" in f or "FURT" in t or "ROUB" in t or "VANDAL" in f:
        return "FURTO"
    if "ABALRO" in f or "ABALRO" in t or "COLIS" in t:
        return "ABALROAMENTO"
    if "REMANEJ" in t:
        return "REMANEJAMENTO"
    if "PREVENTIV" in o or "PREVENTIV" in t or "PROGRAMAD" in t:
        return "PREVENTIVO/PROGRAMADO"
    if "TAPE" in t or "REGULARIZACAO DE TENSAO" in t:
        return "TAPE/REGULARIZACAO DE TENSAO"
    if "DIVISAO DE CIRCUITO" in t:
        return "DIVISAO DE CIRCUITO"
    if o in ("POSTE","CABOS BT"):
        return "POSTE/REDE"
    if "AVARIAD" in o:
        return "AVARIADO"
    if "QUEIMAD" in o:
        return "QUEIMADO"
    return "SEM PISTA NA SS"

# categorias que dependem de outra fonte, por construcao
DEPENDE = {
 "AUSENTE DA CRÍTICA":"Crítica", "FORA DA JANELA DA CRÍTICA":"Crítica",
 "RETIDO — SEM INTERRUPÇÃO NA JANELA":"Crítica", "RETIDO — RESSALVA DA INTERRUPÇÃO":"Crítica",
 "SEM OBRA — PASSADOS 60 DIAS":"obra", "SEM OS E SEM OBRA":"OS/obra",
 "OBRA SEM TRANSFORMADOR NO MATERIAL":"obra", "OBRA SEM EXECUÇÃO":"obra",
 "RETIDO — SEM PROVA DE TROCA":"obra/campo",
 "SEM TROCA (NÃO SUBSTITUÍDO)":"OS", "SS DUPLICADA":"cruzamento",
 "ERRO DE CADASTRO — NÃO É TRANSFORMADOR":"cadastro/OS",
 "SUBSTITUIÇÃO DE CHAVE FUSÍVEL":"OS", "AUXILIAR DE RELIGADOR":"cadastro/OS",
 "FALTA DE FASE":"OS", "MELHORIA DE POSTO":"OS/obra",
 "AVALIAR COM O MATHEUS":"externo", "INCONCLUSIVO":"—",
}

acerto = collections.Counter(); erro = collections.Counter()
mat = collections.defaultdict(collections.Counter)
for r in d:
    real = (r.get("categoria") or "").strip().upper()
    ss = so_pela_ss(r)
    mat[real][ss] += 1

tot_ok = 0; tot = 0
print("%-38s %5s %5s  %s" % ("CATEGORIA REAL","TOT","SÓ-SS","o que a SS sozinha diria"))
for real, c in sorted(mat.items(), key=lambda x: -sum(x[1].values())):
    total = sum(c.values())
    ok = c.get(n(real).replace("Í","I"), 0)
    # comparacao normalizada
    ok = sum(v for k,v in c.items() if n(k)==n(real))
    tot += total; tot_ok += ok
    top = ", ".join("%s %d" % (k,v) for k,v in c.most_common(3))
    print("%-38s %5d %5d  %s" % (real[:38], total, ok, top))
print()
print("acerto so com a SS: %d/%d = %.1f%%" % (tot_ok, tot, 100*tot_ok/tot))
dep = sum(sum(c.values()) for k,c in mat.items() if k in DEPENDE)
print("categorias que a SS nao ve por construcao: %d SS" % dep)
