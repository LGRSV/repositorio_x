#!/usr/bin/env python3
"""Extrai os passos e as manobras de cada ocorrência e grava passos-critica.json.

Pedido dele, e é o que faltava para ler uma interrupção de verdade: "todos os passos e manobras
feitos nas interrupções na Crítica, o elemento que foi interrompido ou com problema e os passos
feitos, tipo aberto, fechado, manobrado, restabelecido".

COMO A CRÍTICA GUARDA ISSO. Cada LINHA do arquivo é um passo — um trecho de interrupção de UM
elemento dentro de uma ocorrência —, e ela traz seis campos que contam a história inteira:

    NUM_PASSO_INIC_HDE   o passo em que este elemento foi aberto
    COD_ELE_INTERROMPIDO quem ficou sem energia nesse passo
    DTA_ABERT            quando abriu
    NUM_PASSO_FIM_HDE    o passo que devolveu a energia
    COD_ELE_FECHADO      qual elemento foi fechado para devolver
    DTA_FECH             quando fechou

E, acima de tudo isso, COD_ELE_PROBLEMA: onde o defeito estava. O elemento com defeito é um só
na ocorrência inteira; os interrompidos podem ser vários, um por passo.

A LEITURA QUE ESTE ARQUIVO ACRESCENTA. Comparando os três códigos, cada passo ganha nome:

  · restabelecido      — o elemento fechado é o próprio interrompido: voltou por onde caiu
  · socorrido por X    — fechou-se OUTRO elemento para devolver a energia: é manobra de socorro
  · não restabelecido  — não há DTA_FECH nem elemento fechado. A energia não voltou neste passo

E o PAPEL DO ATIVO AUDITADO em cada passo: com defeito, interrompido, manobrado (foi ele o
fechado, ou seja, serviu de caminho para outro voltar) ou ausente daquele passo.

A BANDEIRA QUE ELE PEDIU. Quando o transformador da SS aparece na ocorrência SÓ como manobrado
— nunca com defeito, nunca interrompido —, ele não é vítima do evento: é o caminho por onde
outro voltou. A bandeira "so_manobra" marca isso caso a caso.

Uso:  python3 scripts/gerar_passos.py [pasta com os .txt da Crítica]
"""
import collections
import csv
import datetime
import glob
import json
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FLUXO = os.path.join(RAIZ, "public", "fluxo-1510.json")
SAIDA = os.path.join(RAIZ, "public", "passos-critica.json")


def t(v):
    return "" if v is None else str(v).strip()


def main(argv):
    padroes = argv or [
        "/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad/crit/*.txt",
        "/root/.claude/uploads/74dc9c64-5026-54ee-a81e-173d2f38a735/*Critica*.txt",
    ]
    arquivos = [a for p in padroes for a in glob.glob(p)]
    if not arquivos:
        print("não achei os arquivos da Crítica — passe o caminho como argumento")
        return 2

    with open(FLUXO, encoding="utf-8") as fh:
        fluxo = json.load(fh)
    registros = fluxo["registros"]
    # só as ocorrências que interessam a alguma SS do recorte, para o arquivo não virar o acervo
    ocs = {t(r.get("oc_num")) for r in registros if t(r.get("oc_num"))}

    passos = collections.defaultdict(list)
    for f in arquivos:
        with open(f, encoding="latin-1", newline="") as fh:
            rd = csv.reader(fh, delimiter=";", quoting=csv.QUOTE_NONE)
            cab = next(rd)
            i = {c: k for k, c in enumerate(cab)}
            for row in rd:
                if len(row) < len(cab):
                    continue
                oc = row[i["NUM_SEQ_OPER_INIC_HDE"]].strip()
                if oc not in ocs:
                    continue
                fec = row[i["COD_ELE_FECHADO"]].strip()
                intr = row[i["COD_ELE_INTERROMPIDO"]].strip()
                fech_em = row[i["DTA_FECH"]].strip()
                passos[oc].append({
                    "p": row[i["NUM_PASSO_INIC_HDE"]].strip(),
                    "pf": row[i["NUM_PASSO_FIM_HDE"]].strip(),
                    "ini": row[i["DTA_ABERT"]].strip(),
                    "fim": fech_em,
                    "def": row[i["COD_ELE_PROBLEMA"]].strip(),
                    "def_t": row[i["COD_ELE_REDE_PROBLEMA"]].strip(),
                    "int": intr,
                    "int_t": row[i["COD_ELE_REDE_INTERROMPIDO"]].strip(),
                    "fec": fec,
                    "fec_t": row[i["COD_ELE_REDE_FECHADO"]].strip(),
                    "dur": row[i["DURACAO"]].strip(),
                    "cons": row[i["QTD_CONS_INTER_FAT"]].strip(),
                    # o nome do que aconteceu, lido dos próprios campos
                    "fecho": ("nao_restabelecido" if not fech_em or not fec
                              else "restabelecido" if fec == intr else "socorrido"),
                })

    for oc in passos:
        passos[oc].sort(key=lambda x: (x["ini"], x["p"]))

    # por SS: os papéis do ativo dentro da ocorrência dele
    por_ss = {}
    for r in registros:
        oc, cod, ss = t(r.get("oc_num")), t(r.get("trafo")), t(r.get("ss"))
        lista = passos.get(oc) or []
        if not lista or not cod:
            continue
        papeis = set()
        for p in lista:
            if p["def"] == cod:
                papeis.add("defeito")
            if p["int"] == cod:
                papeis.add("interrompido")
            if p["fec"] == cod:
                papeis.add("manobrado")
        por_ss[ss] = {
            "oc": oc,
            "n": len(lista),
            "papeis": sorted(papeis),
            # a bandeira: aparece só como caminho de volta de outro, nunca como vítima
            "so_manobra": bool(papeis) and papeis == {"manobrado"},
            "ausente_nos_passos": not papeis,
            "nao_restabelecido": any(p["fecho"] == "nao_restabelecido" for p in lista),
            "socorrido": any(p["fecho"] == "socorrido" for p in lista),
        }

    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    with open(SAIDA, "w", encoding="utf-8") as fh:
        json.dump({"gerado_em": datetime.datetime.now().strftime("%d/%m/%Y %H:%M"),
                   "arquivos": len(arquivos), "ocorrencias": len(passos),
                   "por_oc": passos, "por_ss": por_ss}, fh, ensure_ascii=False)

    c = collections.Counter()
    for v in por_ss.values():
        for k in ("so_manobra", "ausente_nos_passos", "nao_restabelecido", "socorrido"):
            c[k] += 1 if v[k] else 0
        c["·".join(v["papeis"]) or "(nenhum papel)"] += 1
    print(SAIDA)
    print(f"  {len(passos)} ocorrências · {sum(len(v) for v in passos.values())} passos · {len(por_ss)} SS")
    for k, v in c.most_common():
        print(f"   {v:>5}  {k}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
