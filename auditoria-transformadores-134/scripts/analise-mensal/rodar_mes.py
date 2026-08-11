"""Roda a análise de um mês e gera a planilha.

    python3 rodar_mes.py 08/2026 --pasta /caminho/das/bases [--saida Agosto.xlsx]

A pasta precisa conter, com estes nomes:

    BASE_SS_OS_parte1.txt      a base de SS e OS (utf-8 ou latin-1, separador @)
    BASE_SS_OS_parte2.txt      idem
    Critica_MMAAAA.txt         a Crítica do mês (latin-1, separador ;)
    infotrafo.xlsx             opcional: a lista de SS de transformador do mês

Nada mais é necessário. O script diz na tela o que encontrou e o que faltou,
e a planilha registra em toda linha de onde veio cada afirmação.

O que ele NÃO faz de propósito: decidir sozinho os casos que dependem de
informação de campo. Cola e fita, "não precisou substituir", auxiliar sem
confirmação geométrica e SS aberta antes da ocorrência saem marcados como
PENDENTE DE DECISÃO, com o que a base sabe, para o dono bater o martelo.
"""

import argparse
import json
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from base import (ler_ss_os, ler_critica, indexar, data, veredito_critica,
                  suspeita_auxiliar, gemeas, chave)

# origens que indicam falha do transformador
FALHA = {"QUEIMADO", "AVARIADO"}
# tipos de SS que são de transformador mesmo quando a origem não diz
TIPO_TRAFO = {"FORMS SUBST DE TRANSFORMADOR", "MELHORIA POSTO DE TRANSFORMAÇÃO"}


def e_de_transformador(campo, r):
    """Quatro caminhos, porque nenhum sozinho pega tudo."""
    porques = []
    if campo(r, "TIPOSS") in TIPO_TRAFO:
        porques.append("tipo de SS")
    if campo(r, "ORIGEM_SS") in FALHA | {"GARANTIA DE TRAFO", "SOBRECARGA PREVENTIVA"}:
        porques.append("origem da SS")
    if campo(r, "POTENCIA_RET") or campo(r, "POTENCIA_INST") or campo(r, "NS_RETIRADO"):
        porques.append("troca registrada no campo")
    txt = (campo(r, "DESCRIPTION_SS") + " " + campo(r, "DESCRICAO_OS")).upper()
    if re.search(r"\bTRAFO|TRANSFORMADOR|KVA", txt):
        porques.append("texto")
    return porques


def main():
    p = argparse.ArgumentParser()
    p.add_argument("mes", help="no formato MM/AAAA")
    p.add_argument("--pasta", required=True)
    p.add_argument("--saida", default=None)
    p.add_argument("--ate", default=None, help="dia limite, ex: 10")
    a = p.parse_args()
    mm, aaaa = a.mes.split("/")
    pasta = a.pasta.rstrip("/")

    print(f"\nANÁLISE DE {a.mes}\n")
    print("Lendo a base de SS/OS:")
    partes = [f"{pasta}/BASE_SS_OS_parte1.txt", f"{pasta}/BASE_SS_OS_parte2.txt"]
    faltando = [x for x in partes if not os.path.exists(x)]
    if faltando:
        sys.exit(f"faltam arquivos: {faltando}")
    cab, regs = ler_ss_os(*partes)
    campo = indexar(cab)
    print(f"  total: {len(regs)} registros\n")

    crit = next((f"{pasta}/{n}" for n in os.listdir(pasta)
                 if n.lower().startswith("critica") and n.endswith(".txt")), None)
    if not crit:
        sys.exit("não achei o arquivo da Crítica na pasta (Critica_*.txt)")
    print("Lendo a Crítica:")
    I, oc = ler_critica(crit)
    print()

    # ── o universo do mês ───────────────────────────────────────────────────
    do_mes = [r for r in regs if campo(r, "DATA_ABERTURA_SS")[3:10] == f"{mm}/{aaaa}"]
    if a.ate:
        do_mes = [r for r in do_mes if int(campo(r, "DATA_ABERTURA_SS")[:2]) <= int(a.ate)]
    print(f"SS abertas no mês: {len(do_mes)}")
    trafo = [(r, e_de_transformador(campo, r)) for r in do_mes]
    trafo = [(r, p) for r, p in trafo if p]
    print(f"  destas, de transformador: {len(trafo)}")
    falha = [(r, p) for r, p in trafo if campo(r, "ORIGEM_SS") in FALHA]
    print(f"  com origem QUEIMADO ou AVARIADO: {len(falha)}\n")

    linhas = []
    for r, porques in sorted(trafo, key=lambda x: campo(x[0], "DATA_ABERTURA_SS")[6:10]
                             + campo(x[0], "DATA_ABERTURA_SS")[3:5]
                             + campo(x[0], "DATA_ABERTURA_SS")[:2]
                             + campo(x[0], "DATA_ABERTURA_SS")[11:]):
        ss = campo(r, "NUMERO_SS")
        cod = campo(r, "NUM_TRAFO")
        ab = data(campo(r, "DATA_ABERTURA_SS"))
        estado, detalhe = veredito_critica(ab, I, oc, cod)
        grau, ev = suspeita_auxiliar(cod, campo(r, "DESCRIPTION_SS"), campo(r, "QTD_CLIENTES"))
        gem = gemeas(campo, regs, ss)

        pendencias = []
        if grau in ("FORTE", "SUSPEITA"):
            pendencias.append(f"auxiliar? {grau} — confirmar distância no KML")
        if estado == "AUSENTE":
            pendencias.append("ausente da Crítica — pode ser ocorrência ainda não finalizada")
        if estado == "fora da janela":
            d = [x for x in detalhe if x["delta_inicio_h"] is not None]
            if d and all(x["delta_inicio_h"] < 0 for x in d):
                pendencias.append("SS aberta ANTES da ocorrência — decisão do dono")
            else:
                pendencias.append("ocorrência fora da janela de 24 h — decisão do dono")
        if not campo(r, "NUMERO_OS"):
            pendencias.append("sem OS — apontamento pendente, não é contraprova")
        if any(g["duplicata_de_repasse"] for g in gem):
            pendencias.append("tem SS gêmea de repasse — não contar duas vezes")
        txt = (campo(r, "DESCRIPTION_SS") + " " + campo(r, "DESCRICAO_OS")).upper()
        if "COLA E FITA" in txt or campo(r, "FEITO_COLA_E_FITA").upper() == "SIM":
            pendencias.append("indício de cola e fita — não é troca")
        if "NAO PRECISOU SUBSTITUIR" in txt or "NÃO PRECISOU SUBSTITUIR" in txt:
            pendencias.append("texto diz que não precisou substituir")

        linhas.append({
            "ss": ss, "trafo": cod,
            "abertura": campo(r, "DATA_ABERTURA_SS"), "termino": campo(r, "DATA_TERMINO_SS"),
            "situacao": campo(r, "SITUACAO_SS"), "os": campo(r, "NUMERO_OS"),
            "origem": campo(r, "ORIGEM_SS"), "defeito": campo(r, "DEFEITO_SS"),
            "tipo_ss": campo(r, "TIPOSS"), "criticidade": campo(r, "CRITICIDADE_SS"),
            "obra": campo(r, "NUM_OBRA"), "alimentador": campo(r, "ALIMENTADOR"),
            "localidade": campo(r, "LOCALIDADE"), "clientes": campo(r, "QTD_CLIENTES"),
            "pot_ret": campo(r, "POTENCIA_RET"), "pot_inst": campo(r, "POTENCIA_INST"),
            "ns_ret": campo(r, "NS_RETIRADO"), "ns_inst": campo(r, "NS_INSTALADO"),
            "fab_ret": campo(r, "FABRICANTE_RETIRADO"),
            "critica": estado, "ocorrencias": detalhe,
            "auxiliar": grau, "auxiliar_evidencias": ev,
            "gemeas": gem, "capturado_por": porques,
            "pendencias": pendencias,
            "entra": "SIM" if (estado == "SIM" and grau == "NAO" and not pendencias) else "PENDENTE",
            "texto_ss": campo(r, "DESCRIPTION_SS"), "texto_os": campo(r, "DESCRICAO_OS"),
        })

    # ── resumo na tela ──────────────────────────────────────────────────────
    print("CRÍTICA")
    for k, v in Counter(x["critica"] for x in linhas).most_common():
        print(f"  {k:16s} {v}")
    print("\nAUXILIAR")
    for k, v in Counter(x["auxiliar"] for x in linhas).most_common():
        print(f"  {k:16s} {v}")
    print("\nPENDÊNCIAS MAIS COMUNS")
    for k, v in Counter(p for x in linhas for p in x["pendencias"]).most_common():
        print(f"  {v:3d} · {k}")
    limpos = [x for x in linhas if x["entra"] == "SIM"]
    print(f"\nCASAM SEM RESSALVA: {len(limpos)} de {len(linhas)}")
    print(f"AGUARDAM DECISÃO:  {len(linhas)-len(limpos)}")
    print("\nO indicador do mês NÃO sai daqui sozinho: as pendências acima")
    print("dependem de informação de campo que a base não tem.\n")

    saida = a.saida or f"analise_{mm}_{aaaa}.json"
    json.dump(linhas, open(saida, "w"), ensure_ascii=False, indent=1)
    print(f"gravado: {saida}")
    try:
        from planilha import gerar
        xlsx = saida.replace(".json", ".xlsx")
        gerar(linhas, xlsx, a.mes, os.path.basename(crit))
        print(f"gravado: {xlsx}")
    except ImportError:
        print("(planilha.py não encontrado — só o JSON foi gerado)")


if __name__ == "__main__":
    main()
