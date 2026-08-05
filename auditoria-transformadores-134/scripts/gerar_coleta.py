#!/usr/bin/env python3
"""Extrai a aba COLETA do arquivo de SS e grava coleta-ativos.json, uma linha por SS.

Por que existe: a data de fabricação do transformador RETIRADO não está no fluxo — ela mora na
aba COLETA do TRAFOS V4, que é o registro de quem foi ao poste trocar. É de lá que sai a
pergunta "queimou com menos de um ano de fabricado", e a tela não tem como respondê-la sem
este arquivo.

A COLETA não tem número de SS. O casamento é feito em três tentativas, nesta ordem, e a que
casou fica gravada em cada linha para quem for conferir saber de onde veio:
  1. número da ocorrência  — o vínculo mais forte, é o mesmo evento
  2. número da obra        — só quando a obra tem UMA linha na COLETA
  3. código do ativo       — só quando o código aparece UMA vez na COLETA

O bloco do equipamento retirado são as colunas R a AA: série, tombamento, fabricante, data de
fabricação, fases, classe de tensão, potência, se é reformado, reformadora e data da reforma.
O bloco do instalado tem três colunas (AB a AD) e NÃO tem data de fabricação — por isso a
DATA_FABRICAÇÃO só pode ser do retirado.

A DATA DE FABRICAÇÃO SUJA. Em parte das linhas esse campo foi preenchido com a data da coleta
ou da reforma, por cima da fabricação real. Três marcas denunciam, e qualquer uma condena:
  · a "fabricação" é posterior à abertura da SS — o equipamento teria nascido depois de queimar
  · a data é igual à DATA REFORMA da mesma linha
  · o ano é o mesmo do recorte (2026), com a SS a poucos dias
Quem tem data suja sai da conta de vida útil e fica marcado, não escondido: a tela mostra
quantos são. Contar esses como "queimou em zero dia" inflaria o achado em mais de duas vezes.

Uso:  python3 scripts/gerar_coleta.py
"""
import collections
import datetime
import json
import os
import re

import openpyxl

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTE = os.path.join(RAIZ, "public", "bases", "originais", "Original_SS_TRAFOS_V4.xlsx")
FLUXO = os.path.join(RAIZ, "public", "fluxo-1510.json")
SAIDA = os.path.join(RAIZ, "public", "coleta-ativos.json")

COLS = ["NÚMERO OPERATIVO", "Nº DA OCORRÊNCIA", "DATA OC", "SITUAÇÃO", "NS RETIRADO",
        "N_TOMBAMENTO_RETIRADO", "FABRICANTE", "DATA_FABRICAÇÃO", "FASES", "CLASSE DE TENSÃO",
        "POTÊNCIA RETIRADA", "REFORMADO", "REFORMADORA", "DATA REFORMA", "NS INSTALADO",
        "N_TOMBAMENTO_INSTALADO", "POTENCIA INSTALADA", "NÚMERO OBRA",
        "QTDE OCORRÊNCIAS ANTES DA QUEIMA (12M)", "EXISTE GD?", "CARREGAMENTO %"]


def t(v):
    return "" if v is None else str(v).strip()


def data(v):
    if isinstance(v, datetime.datetime):
        return v
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})", t(v))
    if not m:
        return None
    try:
        return datetime.datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)))
    except ValueError:
        return None


def main():
    wb = openpyxl.load_workbook(FONTE, read_only=True, data_only=True)
    ws = wb["COLETA"]
    it = ws.iter_rows(values_only=True)
    cab = list(next(it))
    idx = {c: i for i, c in enumerate(cab) if c}
    linhas = [r for r in it if any(x is not None for x in r)]
    g = lambda r, c: (r[idx[c]] if c in idx and idx[c] < len(r) else None)

    por_oc, por_obra, por_trafo = {}, collections.defaultdict(list), collections.defaultdict(list)
    for r in linhas:
        if t(g(r, "Nº DA OCORRÊNCIA")):
            por_oc.setdefault(t(g(r, "Nº DA OCORRÊNCIA")), r)
        ob = t(g(r, "NÚMERO OBRA")).lstrip("0")
        if ob:
            por_obra[ob].append(r)
        cod = t(g(r, "NÚMERO OPERATIVO"))
        if cod:
            por_trafo[cod].append(r)

    with open(FLUXO, encoding="utf-8") as fh:
        fluxo = json.load(fh)

    saida, casou = {}, collections.Counter()
    for x in fluxo["registros"]:
        ss = t(x.get("ss"))
        linha, via = None, ""
        if t(x.get("oc_num")) in por_oc:
            linha, via = por_oc[t(x.get("oc_num"))], "ocorrência"
        else:
            ob = t(x.get("obra")).lstrip("0")
            cod = t(x.get("trafo"))
            if ob and len(por_obra.get(ob, [])) == 1:
                linha, via = por_obra[ob][0], "obra"
            elif cod and len(por_trafo.get(cod, [])) == 1:
                linha, via = por_trafo[cod][0], "código do ativo"
        casou[via or "não casou"] += 1
        if linha is None:
            continue

        fab = data(g(linha, "DATA_FABRICAÇÃO"))
        ref = data(g(linha, "DATA REFORMA"))
        abertura = data(t(x.get("abertura"))[:10].replace("-", "/")[::-1]) if False else None
        try:
            abertura = datetime.datetime.strptime(t(x.get("abertura"))[:10], "%Y-%m-%d")
        except ValueError:
            abertura = None

        dias = (abertura - fab).days if (fab and abertura) else None
        suja = ""
        if fab and dias is not None and dias < 0:
            suja = "a fabricação é posterior à abertura da SS"
        elif fab and ref and fab.date() == ref.date():
            suja = "a data de fabricação é igual à da reforma"
        elif fab and abertura and fab.year >= abertura.year:
            suja = "fabricação no mesmo ano do recorte, a poucos dias da SS"

        saida[ss] = {
            "via": via,
            "fabricante": t(g(linha, "FABRICANTE")),
            "fabricacao": fab.strftime("%d/%m/%Y") if fab else "",
            "dias": dias if (fab and not suja) else None,
            "suja": suja,
            "ns_retirado": t(g(linha, "NS RETIRADO")),
            "tombamento": t(g(linha, "N_TOMBAMENTO_RETIRADO")),
            "ns_instalado": t(g(linha, "NS INSTALADO")),
            "pot_retirada": t(g(linha, "POTÊNCIA RETIRADA")),
            "pot_instalada": t(g(linha, "POTENCIA INSTALADA")),
            "reformado": t(g(linha, "REFORMADO")),
            "reformadora": t(g(linha, "REFORMADORA")),
            "reforma": ref.strftime("%d/%m/%Y") if ref else "",
            "situacao": t(g(linha, "SITUAÇÃO")),
            "ocorrencias_12m": t(g(linha, "QTDE OCORRÊNCIAS ANTES DA QUEIMA (12M)")),
            "carregamento": t(g(linha, "CARREGAMENTO %")),
            "gd": t(g(linha, "EXISTE GD?")),
        }

    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    with open(SAIDA, "w", encoding="utf-8") as fh:
        json.dump({"gerado_em": datetime.datetime.now().strftime("%d/%m/%Y %H:%M"),
                   "linhas_na_coleta": len(linhas), "por_ss": saida}, fh, ensure_ascii=False)

    com_data = sum(1 for v in saida.values() if v["dias"] is not None)
    menos = sum(1 for v in saida.values() if v["dias"] is not None and v["dias"] < 365)
    print(SAIDA)
    print(f"  COLETA: {len(linhas)} linhas · casaram {len(saida)} de {len(fluxo['registros'])} SS")
    print(f"  por: {dict(casou)}")
    print(f"  com data de fabricação confiável: {com_data} · menos de um ano de vida: {menos}")
    print(f"  data suja descartada: {sum(1 for v in saida.values() if v['suja'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
