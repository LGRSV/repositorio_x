#!/usr/bin/env python3
"""Cruza as ordens de produção da reformadora com as 1.510 e grava reformadora.json.

A BASE. 838 ordens de produção do centro ETO — Tocantins, uma por equipamento enviado para
reforma, com 59 colunas: série, tombamento, fabricante, data de fabricação, reformadora, triagem,
cronologia inteira (entrada, produção, encerramento, devolução), custo de material, mão de obra e
custo total, e — o campo que abre esta análise — o MOTIVO DA RETIRADA DA REDE / CAUSA DA QUEIMA.

O ACHADO. Esse motivo é preenchido por quem ABRIU o transformador na bancada, e um dos códigos é
"NQM — Não Queimado". Ou seja: a distribuidora tirou o equipamento da rede como queimado, pagou a
troca, mandou para a reformadora, e lá dentro se constatou que ele não tinha queimado. São 34 no
arquivo inteiro e 10 dentro das 1.305 do indicador — nove delas com a Crítica registrando
"queimado por descarga atmosférica".

O CASAMENTO. A OP não traz número de SS. O vínculo é o equipamento, em duas tentativas:
  1. NÚMERO DE SÉRIE do transformador retirado, que vem da aba COLETA — o mais forte
  2. TOMBAMENTO do retirado, quando a série não bate
Cada linha guarda por qual dos dois casou, para quem for conferir saber de onde veio. Dos 1.305,
291 casaram; os demais ou não foram para reforma, ou foram para outro centro, ou não têm ficha de
COLETA com série legível.

O QUE ISTO NÃO É. A OP não desmente a SS sozinha: "não queimado" na bancada pode conviver com
avaria real que justificou a troca, e a triagem desses dez é "Reforma Total" — a reformadora
recuperou todos, com custo entre R$ 2.993 e R$ 5.486 cada. O que a lista faz é apontar onde duas
fontes discordam sobre o mesmo equipamento, para o dono julgar caso a caso. NÃO MOVE NINGUÉM.

Uso:  python3 scripts/gerar_reformadora.py
"""
import collections
import datetime
import html
import json
import os
import re

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FLUXO = os.path.join(RAIZ, "public", "fluxo-1510.json")
COLETA = os.path.join(RAIZ, "public", "coleta-ativos.json")
FONTE = os.path.join(RAIZ, "public", "bases", "originais", "Original_Reformadora_OPs.html")
SAIDA = os.path.join(RAIZ, "public", "reformadora.json")

# os campos que a tela usa; o resto das 59 colunas fica na base, não no arquivo publicado
CAMPOS = [
    ("op", "N° da OP"), ("data", "Data OP"), ("tipo", "Tipo"),
    ("triagem", "Triagem Reformadora"), ("status", "Status"),
    ("serie", "N° Série"), ("tombamento", "Tombamento"),
    ("fabricante", "Fabricante"), ("descricao", "Descrição Equipamento"),
    ("reformadora", "Reformadora"), ("motivo", "Motivo da Retirada da Rede / Causa da Queima"),
    ("sucateamento", "Motivo do Sucateamento"), ("obs", "Observações"),
    ("material", "Material R$"), ("mao_obra", "Mão de Obra R$"), ("custo", "Custo Total R$"),
    ("dias_producao", "Tempo de Produção (dias)"),
    ("dias_total", "Tempo total Envio para Reforma até Devolução (dias)"),
    ("elo", "Elo fusível"), ("oleo", "Tipo do Óleo"), ("comutador", "Comutador"),
]


def t(v):
    return "" if v is None else str(v).strip()


def limpa(celula):
    return html.unescape(re.sub(r"<[^>]+>", "", celula)).replace("\xa0", " ").strip()


def chave(v):
    """Série e tombamento vêm com zeros à esquerda em uma base e sem na outra."""
    return t(v).lstrip("0").upper()


def main():
    with open(FONTE, encoding="utf-8", errors="replace") as fh:
        bruto = fh.read()
    linhas = re.findall(r"<tr\b.*?</tr>", bruto, re.S | re.I)
    cabecalho = [limpa(c) for c in re.findall(r"<th\b.*?</th>", linhas[0], re.S | re.I)]
    ops = []
    for linha in linhas[1:]:
        celulas = [limpa(c) for c in re.findall(r"<td\b.*?</td>", linha, re.S | re.I)]
        if celulas:
            ops.append(dict(zip(cabecalho, celulas)))

    por_serie, por_tomb = {}, {}
    for o in ops:
        if chave(o.get("N° Série")):
            por_serie.setdefault(chave(o.get("N° Série")), o)
        if chave(o.get("Tombamento")):
            por_tomb.setdefault(chave(o.get("Tombamento")), o)

    with open(FLUXO, encoding="utf-8") as fh:
        fluxo = json.load(fh)
    with open(COLETA, encoding="utf-8") as fh:
        coleta = json.load(fh)["por_ss"]

    saida, via_conta = {}, collections.Counter()
    for r in fluxo["registros"]:
        ss = t(r.get("ss"))
        ficha = coleta.get(ss)
        if not ficha:
            via_conta["sem ficha da COLETA"] += 1
            continue
        o, via = None, ""
        if chave(ficha.get("ns_retirado")) in por_serie:
            o, via = por_serie[chave(ficha.get("ns_retirado"))], "número de série do retirado"
        elif chave(ficha.get("tombamento")) in por_tomb:
            o, via = por_tomb[chave(ficha.get("tombamento"))], "tombamento do retirado"
        via_conta[via or "não casou"] += 1
        if not o:
            continue
        item = {nome: t(o.get(coluna)) for nome, coluna in CAMPOS}
        item["via"] = via
        # o código do motivo, isolado: "NQM - Não Queimado" vira NQM
        item["codigo"] = (item["motivo"].split("-")[0].strip().upper() if item["motivo"] else "")
        item["nao_queimado"] = item["codigo"] == "NQM"
        saida[ss] = item

    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    with open(SAIDA, "w", encoding="utf-8") as fh:
        json.dump({"gerado_em": datetime.datetime.now().strftime("%d/%m/%Y %H:%M"),
                   "ordens_na_base": len(ops), "por_ss": saida}, fh, ensure_ascii=False)

    print(SAIDA)
    print(f"  {len(ops)} ordens de produção na base · {len(saida)} casaram com uma solicitação")
    print(f"  por: {dict(via_conta)}")
    print(f"  motivo declarado pela reformadora: "
          f"{dict(collections.Counter(v['motivo'] or '(vazio)' for v in saida.values()).most_common())}")
    print(f"  NQM — não queimado: {sum(1 for v in saida.values() if v['nao_queimado'])}")
    print(f"  triagem: {dict(collections.Counter(v['triagem'] for v in saida.values()).most_common())}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
