#!/usr/bin/env python3
"""Extrai os tempos REAIS do TMAE e grava tmae-tempos.json.

POR QUE ISTO EXISTIU QUE SER FEITO. O fluxo tem at_ini e at_fim, e eles NÃO são a hora da
equipe: são a janela da ocorrência copiada. Em 1.039 das 1.160 solicitações com atendimento,
at_ini é idêntico a oc_ini. A régua do TMAE desenhada com esses campos mostrava a mesma barra da
Crítica noutra cor, e a leitura "o atendimento cabe dentro da ocorrência" era quase tautologia.

A base do TMAE tem seis marcos próprios, e é com eles que se responde a pergunta dele — a
Crítica abre, o TMAE vem um pouco depois, a SS vem um pouco depois do TMAE:

    DTA_ORIG_TNT             a origem do evento (é esta que coincide com a Crítica)
    DTA_COMU_TNT             quando a ocorrência foi comunicada à equipe
    DTA_INIC_DLCT_TNT        a equipe SAIU — é aqui que o deslocamento começa
    DTA_INIC_VERI_TNT        a equipe CHEGOU e começou a verificar
    DTA_INIC_EXEC_SERV_TNT   começou a executar o serviço
    DTA_CONCL_TNT            concluiu

E as quatro durações, em minutos: TMP preparação, TMD deslocamento, TME execução, TMA total.

A chave é NUM_SEQ_OPER_ORIG_COS_TNT, que é o mesmo número da ocorrência — por isso o at_num do
fluxo casa com ela. Uma nota por linha: não há nota repetida em 62.616 linhas.

Uso:  python3 scripts/gerar_tmae_tempos.py
"""
import collections
import csv
import datetime
import json
import os
import zipfile

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTE = os.path.join(RAIZ, "public", "bases", "originais", "Original_TMAE_Atendimentos.zip")
FLUXO = os.path.join(RAIZ, "public", "fluxo-1510.json")
SAIDA = os.path.join(RAIZ, "public", "tmae-tempos.json")

MARCOS = [
    ("origem", "DTA_ORIG_TNT"), ("comunicado", "DTA_COMU_TNT"),
    ("saiu", "DTA_INIC_DLCT_TNT"), ("chegou", "DTA_INIC_VERI_TNT"),
    ("executou", "DTA_INIC_EXEC_SERV_TNT"), ("concluiu", "DTA_CONCL_TNT"),
]


def t(v):
    return "" if v is None else str(v).strip()


def iso(v):
    """A base escreve 09-01-2026 16:31; a tela lê 2026-01-09 16:31."""
    s = t(v)
    if len(s) >= 16 and s[2] == "-" and s[5] == "-":
        return f"{s[6:10]}-{s[3:5]}-{s[0:2]} {s[11:16]}"
    return s


def main():
    z = zipfile.ZipFile(FONTE)
    dados = z.read(z.namelist()[0]).decode("latin-1", "replace").splitlines()
    rd = csv.reader(dados, delimiter=";", quoting=csv.QUOTE_NONE)
    cab = next(rd)
    i = {c: k for k, c in enumerate(cab)}

    with open(FLUXO, encoding="utf-8") as fh:
        fluxo = json.load(fh)
    notas = {t(r.get("at_num")) for r in fluxo["registros"] if t(r.get("at_num"))}

    por_nota = {}
    for row in rd:
        if len(row) < len(cab):
            continue
        n = row[i["NUM_SEQ_OPER_ORIG_COS_TNT"]].strip()
        if n not in notas:
            continue
        por_nota[n] = {
            **{nome: iso(row[i[col]]) for nome, col in MARCOS},
            "tmp": row[i["TMP"]].strip(), "tmd": row[i["TMD"]].strip(),
            "tme": row[i["TME"]].strip(), "tma": row[i["TMA"]].strip(),
            "equipe": row[i["EQUIPE"]].strip(),
            "ele_t": row[i["COD_ELE_REDE_TNT"]].strip(),
            "ele": row[i["COD_INS_TRF_TNT"]].strip(),
        }

    # por SS, para a tela não precisar cruzar nada
    por_ss = {}
    for r in fluxo["registros"]:
        d = por_nota.get(t(r.get("at_num")))
        if d:
            # o TMAE casa pelo ELEMENTO onde o defeito foi aberto; quando esse elemento não é o
            # transformador da SS, a ida ao poste que este dossiê mostra é de outro equipamento
            por_ss[t(r.get("ss"))] = {**d, "mesmo_ativo": d["ele"] == t(r.get("trafo"))}

    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    with open(SAIDA, "w", encoding="utf-8") as fh:
        json.dump({"gerado_em": datetime.datetime.now().strftime("%d/%m/%Y %H:%M"),
                   "notas": len(por_nota), "por_ss": por_ss}, fh, ensure_ascii=False)

    c = collections.Counter(v["ele_t"] for v in por_ss.values())
    print(SAIDA)
    print(f"  {len(por_nota)} notas do TMAE · {len(por_ss)} SS com tempos reais")
    print(f"  elemento do atendimento: {dict(c.most_common())}")
    print(f"  atendimento no MESMO ativo da SS: {sum(1 for v in por_ss.values() if v['mesmo_ativo'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
