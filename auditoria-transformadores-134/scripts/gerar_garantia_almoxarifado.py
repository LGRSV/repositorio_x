"""Gera public/garantia-almoxarifado.json — o controle do almoxarifado.

O QUE É A FONTE
---------------
O "Relatório de Garantia" do fornecedor. Diferente de todas as outras bases desta
auditoria, ele não é de SOLICITAÇÃO: cada linha é uma PEÇA que saiu da rede e voltou
para o fabricante, com o rastro fiscal da devolução — nota de retorno, romaneio SGE,
controle de remessa SIENF e quem recebeu.

Ele não traz número de SS nem código operativo. Por isso a aba que o lê não entra na
cascata e não move o indicador: o que ela permite perguntar é onde cada peça devolvida
esteve instalada, e quando saiu.

COMO A PEÇA É LIGADA À AUDITORIA
--------------------------------
Por número de série e por tombamento, cada um comparado SÓ contra campo do mesmo tipo.
Cruzar controle com tombamento produz casamento falso — são numerações independentes que
colidem por acaso, e isso aconteceu com dois controles quando testado. Controle não é
chave de busca aqui porque nem a SS/OS nem a COLETA guardam esse campo; só a base da
reformadora tem, e é lá que ele funciona.

As duas chaves úteis se complementam e por isso as duas rodam: na extração de agosto/2026,
só a série achava 7 equipamentos, só o tombamento achava 4, e as duas juntas 19.

O papel importa: a mesma peça aparece ora como RETIRADA (o transformador que queimou),
ora como INSTALADA (a reposição que entrou no poste depois da queima). A aba mostra os
dois, separados, porque confundi-los inverte a leitura.

COMO RODAR
----------
    python3 scripts/gerar_garantia_almoxarifado.py \
        --relatorio  <Relatorio_Garantia.xlsx> \
        --ss-os      <BASE_SS_OS_parte1.txt> <BASE_SS_OS_parte2.txt> \
        --reformadora <reformadoraordensproducao.html>

A COLETA e o fluxo das 1.510 são lidos de public/, que já vivem no repositório.

O PARSER DA SS/OS
-----------------
Os TXT são UTF-8 separados por "@" com 64 colunas, e o texto da SS e da OS contém quebras
de linha. Ler linha a linha perde 60% dos registros — é preciso juntar até fechar as 64
colunas. Com o parser certo as duas partes dão 23.069 e 23.068 registros.
"""
import argparse
import html
import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PUBLIC = RAIZ / "public"

# Valores que significam "não preenchido" e não podem virar chave de busca: casariam
# entre si e inventariam vínculo onde não há.
VAZIO = {"", "N/A", "NÃOINFORMADO", "NAOINFORMADO", "ILEGIVEL", "ILEGÍVEL", "-", "0", "."}


def texto(v):
    return "" if v is None else str(v).strip()


def chave(v):
    """Normaliza para comparação: maiúsculas, sem espaço, sem ponto, sem zero à esquerda."""
    v = texto(v).upper().replace(" ", "")
    if v in {x.replace(" ", "") for x in VAZIO}:
        return ""
    return re.sub(r"^0+", "", v.replace(".", "")) or ""


def data_br(v):
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})", texto(v))
    return datetime(int(m.group(3)), int(m.group(2)), int(m.group(1))) if m else None


def ler_ss_os(caminhos):
    """Junta linhas até fechar as 64 colunas — o texto da SS e da OS quebra linha."""
    cabecalho, registros = None, []
    for caminho in caminhos:
        linhas = Path(caminho).read_text(encoding="utf-8").split("\n")
        cab = linhas[0].split("@")
        n = len(cab)
        if cabecalho is None:
            cabecalho = cab
        buf = None
        for linha in linhas[1:]:
            buf = linha if buf is None else buf + " " + linha
            if buf.count("@") >= n - 1:
                campos = buf.split("@")
                if len(campos) > n:  # "@" dentro do texto (e-mail): sobra vai na última
                    campos = campos[: n - 1] + ["@".join(campos[n - 1 :])]
                registros.append(campos)
                buf = None
    indice = {}
    for i, nome in enumerate(cabecalho):
        indice.setdefault(nome, i)
    return indice, registros


def ler_reformadora(caminho):
    """A tabela de ordens de produção vem como HTML de uma página só."""
    bruto = Path(caminho).read_text(encoding="utf-8", errors="replace")

    def celulas(tr, tag):
        return [
            html.unescape(re.sub(r"<[^>]+>", "", c)).replace("\xa0", " ").strip()
            for c in re.findall(r"<%s\b[^>]*>(.*?)</%s>" % (tag, tag), tr, re.S)
        ]

    trs = re.findall(r"<tr\b[^>]*>(.*?)</tr>", bruto, re.S)
    cab = celulas(trs[0], "th")
    linhas = [c for tr in trs[1:] for c in [celulas(tr, "td")] if len(c) == len(cab)]
    return {c: i for i, c in enumerate(cab)}, linhas


def ler_relatorio(caminho):
    import openpyxl

    aba = openpyxl.load_workbook(caminho, read_only=True, data_only=True).active
    linhas = list(aba.iter_rows(values_only=True))
    cab = [texto(c) for c in linhas[0]]
    dados = [r for r in linhas[1:] if any(x is not None for x in r)]
    return cab, {c: i for i, c in enumerate(cab)}, dados


def conjunto_1305():
    """As 1.305 que a tela mostra: a cascata mais o martelo do dono por cima dela.

    O martelo do dono NÃO mora em public/: a tela lê as classificações ao vivo do Supabase,
    da view trafo_classificacao_atual. O que o repositório guarda é o retrato delas no
    fechamento, em backup/2026-06-fechamento/classificacao.json — 163 classificações, e é
    esse arquivo que faz a conta fechar em 1.305 (1.225 queimados e 80 avariados).

    Sem ele sobra só a cascata, que dá 1.269. Se o número impresso ao final não for 1.305,
    é sinal de que o retrato mudou ou sumiu, e não de que o indicador se moveu.
    """
    fluxo = json.loads((PUBLIC / "fluxo-1510.json").read_text(encoding="utf-8"))["registros"]
    manual = {}
    retrato = RAIZ / "backup" / "2026-06-fechamento" / "classificacao.json"
    if retrato.exists():
        manual = {ss: texto(c) for ss, c in json.loads(retrato.read_text(encoding="utf-8")).items()}
    else:  # sem o retrato, ainda dá para gerar — só que contando apenas a cascata
        caminho = PUBLIC / "classificacoes" / "combinado.json"
        if caminho.exists():
            for bloco in json.loads(caminho.read_text(encoding="utf-8")).get("dados", {}).values():
                for ss, item in bloco.items():
                    manual[ss] = item.get("classe")
    saida, classe = set(), {}
    for r in fluxo:
        ss = texto(r.get("ss"))
        c = manual.get(ss)
        if c in ("QUEIMADO", "AVARIADO"):
            saida.add(ss)
            classe[ss] = c
        elif c in ("EXCLUIDO", "FURTADO", "PREVENTIVO"):
            continue
        elif texto(r.get("cascata")) == "SAÍDA":
            saida.add(ss)
            classe[ss] = texto(r.get("confirmado"))
    return saida, classe, {texto(r.get("ss")): r for r in fluxo}


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--relatorio", required=True, help="Relatório de Garantia do fornecedor (.xlsx)")
    p.add_argument("--ss-os", required=True, nargs="+", help="as partes da base SS/OS (.txt)")
    p.add_argument("--reformadora", required=True, help="ordens de produção da reformadora (.html)")
    p.add_argument("--saida", default=str(PUBLIC / "garantia-almoxarifado.json"))
    args = p.parse_args()

    CAB, ix, ALM = ler_relatorio(args.relatorio)
    si, SSB = ler_ss_os(args.ss_os)
    ri, OPS = ler_reformadora(args.reformadora)
    coleta = json.loads((PUBLIC / "coleta-ativos.json").read_text(encoding="utf-8"))["por_ss"]
    no_indicador, classe_de, fluxo = conjunto_1305()
    if len(no_indicador) != 1305:
        print(f"  ATENÇÃO: o conjunto reconstruído deu {len(no_indicador)}, não 1.305 — "
              f"confira backup/2026-06-fechamento/classificacao.json antes de publicar")

    def campo(linha, nome):
        return texto(linha[si[nome]]) if si.get(nome) is not None else ""

    # Nomes de coluna do relatório variam em espaço no fim; resolve pelo começo do nome.
    def col(nome):
        for c in CAB:
            if c.strip().upper().startswith(nome.upper()):
                return ix[c]
        return None

    C_CTRL, C_TOMB, C_SERIE = col("Controle"), col("Tombamento"), col("N° Série")
    C_COD, C_DESC, C_FAB = col("Código"), col("Descrição"), col("Fabricante")
    C_VAZ, C_FALHA, C_DMA = col("Equipamento com vazamento"), col("Equipamento Apresentou"), col("DMA")
    C_ST, C_NF, C_REM, C_ROM, C_FORN = col("status"), col("NF RETORNO"), col("Controle de remessa"), col("ROMANEIO"), col("FORNECEDOR")

    itens = []
    for a in ALM:
        ctrl, tomb, serie = chave(a[C_CTRL]), chave(a[C_TOMB]), chave(a[C_SERIE])
        eventos = []
        for linha in SSB:
            achou = []
            if serie and chave(campo(linha, "NS_RETIRADO")) == serie:
                achou.append(("retirado", "série"))
            if tomb and chave(campo(linha, "TOMBAMENTO_RETIRADO")) == tomb:
                achou.append(("retirado", "tombamento"))
            if serie and chave(campo(linha, "NS_INSTALADO")) == serie:
                achou.append(("instalado", "série"))
            if tomb and chave(campo(linha, "TOMBAMENTO_INSTALADO")) == tomb:
                achou.append(("instalado", "tombamento"))
            if not achou:
                continue
            d = data_br(campo(linha, "DATA_ABERTURA_SS"))
            ss = campo(linha, "NUMERO_SS")
            chaves = "+".join(sorted({k for _, k in achou}))
            for papel in sorted({p for p, _ in achou}):
                eventos.append({
                    "data": campo(linha, "DATA_ABERTURA_SS")[:10],
                    "ord": d.strftime("%Y%m%d") if d else "",
                    "papel": papel, "chave": chaves, "ss": ss,
                    "trafo": campo(linha, "NUM_TRAFO"), "local": campo(linha, "LOCALIDADE"),
                    "alim": campo(linha, "ALIMENTADOR"), "origem": campo(linha, "ORIGEM_SS"),
                    "defeito": campo(linha, "DEFEITO_SS"), "obra": campo(linha, "NUM_OBRA"),
                    "no1305": ss in no_indicador, "classe": classe_de.get(ss, ""),
                    "marca_base": campo(linha, "FABRICANTE_RETIRADO" if papel == "retirado" else "FABRICANTE_INSTALADO"),
                    "base": "SS/OS",
                })
        for ss, c in coleta.items():
            achou = []
            if serie and chave(c.get("ns_retirado")) == serie:
                achou.append(("retirado", "série"))
            if serie and chave(c.get("ns_instalado")) == serie:
                achou.append(("instalado", "série"))
            if tomb and chave(c.get("tombamento")) == tomb:
                achou.append(("retirado", "tombamento"))
            for papel, k in achou:
                eventos.append({
                    "data": "", "ord": "", "papel": papel, "chave": k, "ss": ss,
                    "trafo": texto(fluxo.get(ss, {}).get("trafo")), "local": "", "alim": "",
                    "origem": "", "defeito": "", "obra": "", "no1305": ss in no_indicador,
                    "classe": classe_de.get(ss, ""),
                    "marca_base": texto(c.get("fabricante")) if papel == "retirado" else "",
                    "base": "COLETA",
                })
        op = None
        for o in OPS:
            if ((ctrl and chave(o[ri["Controle"]]) == ctrl)
                    or (tomb and chave(o[ri["Tombamento"]]) == tomb)
                    or (serie and chave(o[ri["N° Série"]]) == serie)):
                op = {
                    "op": o[ri["N° da OP"]], "data": o[ri["Data OP"]],
                    "triagem": o[ri["Triagem Reformadora"]], "status": o[ri["Status"]],
                    "motivo_triagem": o[ri["Motivo da Troca de Triagem"]],
                    "garantia_confirmada": o[ri["Confirmada Garantia"]],
                    "reformadora": o[ri["Reformadora"]], "fabricante": o[ri["Fabricante"]],
                    "controle": o[ri["Controle"]],
                }
                break
        eventos.sort(key=lambda e: (e["ord"] or "99999999", e["base"]))
        itens.append({
            "controle": texto(a[C_CTRL]), "tombamento": texto(a[C_TOMB]), "serie": texto(a[C_SERIE]),
            "codigo": texto(a[C_COD]), "descricao": texto(a[C_DESC]), "marca": texto(a[C_FAB]),
            "vazamento": texto(a[C_VAZ]) == "True", "falha": texto(a[C_FALHA]) == "True",
            "dma": texto(a[C_DMA]), "status": texto(a[C_ST]), "nf_retorno": texto(a[C_NF]),
            "remessa": texto(a[C_REM]), "romaneio": texto(a[C_ROM]), "fornecedor": texto(a[C_FORN]),
            "eventos": eventos, "op": op,
            "achou_serie": any("série" in e["chave"] for e in eventos),
            "achou_tomb": any("tombamento" in e["chave"] for e in eventos),
            "no1305": sorted({e["ss"] for e in eventos if e["no1305"]}),
            "codigos": sorted({e["trafo"] for e in eventos if e["trafo"]}),
        })

    def conta(base, campo_nome, so_papel=None):
        n = 0
        for x in itens:
            for e in x["eventos"]:
                if e["base"] == base and campo_nome in e["chave"] and (not so_papel or e["papel"] == so_papel):
                    n += 1
                    break
        return n

    resumo = {
        "total": len(itens),
        "localizados": sum(1 for x in itens if x["eventos"]),
        "so_serie": [x["controle"] for x in itens if x["achou_serie"] and not x["achou_tomb"]],
        "so_tombamento": [x["controle"] for x in itens if x["achou_tomb"] and not x["achou_serie"]],
        "ambas": [x["controle"] for x in itens if x["achou_serie"] and x["achou_tomb"]],
        "nenhuma": [x["controle"] for x in itens if not x["eventos"]],
        "por_serie_ssos": conta("SS/OS", "série"),
        "por_serie_coleta": conta("COLETA", "série"),
        "por_tomb_ssos": conta("SS/OS", "tombamento"),
        "por_tomb_coleta": conta("COLETA", "tombamento"),
        "no1305": sum(1 for x in itens if x["no1305"]),
    }
    saida = {
        "gerado_em": datetime.now().strftime("%Y-%m-%d"),
        "fonte": f"Relatório de Garantia do almoxarifado · {len(itens)} equipamentos",
        "colunas_originais": CAB,
        "resumo": resumo,
        "itens": itens,
    }
    Path(args.saida).write_text(json.dumps(saida, ensure_ascii=False), encoding="utf-8")
    print(f"{len(itens)} equipamentos · {resumo['localizados']} localizados · {resumo['no1305']} nas 1.305")
    print(f"  série: SS/OS {resumo['por_serie_ssos']} · COLETA {resumo['por_serie_coleta']}")
    print(f"  tombamento: SS/OS {resumo['por_tomb_ssos']} · COLETA {resumo['por_tomb_coleta']}")
    print(f"  só série {len(resumo['so_serie'])} · só tombamento {len(resumo['so_tombamento'])} · ambas {len(resumo['ambas'])}")
    print(f"  gravado em {args.saida}")


if __name__ == "__main__":
    main()
