"""Completa os 72 de julho com o que faltava, tudo da fonte de julho e da base de 11/08.

Quatro coisas foram pedidas, e cada uma vira um campo novo no caso, ao lado do que já existe:

  1. O NÚMERO DA INTERVENÇÃO. A base de SS/OS traz NUM_INT; a Crítica traz o número de
     sequência da operação. Eles NÃO são o mesmo número — só 25 dos 72 coincidem. O que liga
     as duas bases é o CÓDIGO DO ATIVO (68 dos 72). Então guardo os dois números, cada um com
     o seu nome, e digo de qual base veio. Inventar um casamento que não existe seria pior que
     deixar em branco.

  3. A OCORRÊNCIA COMPLETA, relida da Crítica de julho: causa, subcausa, e TODAS as
     observações de campo de cada passo — não só a primeira. A prévia trazia a ocorrência
     resumida; aqui vem inteira.

  2. A DATA DE FABRICAÇÃO do transformador retirado, do campo DATA_FABRICACAO_RETIRADO, para
     os agentes cruzarem com o que a OS escreveu. E, para os reincidentes, a última SS que
     INSTALOU este ativo — pelo número de série do que saiu agora.

  4. O TEXTO INTEGRAL de toda SS e OS já aberta neste código de ativo, na base inteira.

Regra que não muda: nada aqui recalcula indicador, muda classificação ou toca no 1.305.
"""

import csv
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "analise-mensal"))
from base import ler_ss_os, indexar          # noqa: E402

BASES = "/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad/bases_11-08-2026"
CRIT = "/root/.claude/uploads/74dc9c64-5026-54ee-a81e-173d2f38a735/75bd07d1-Critica__072026.txt"
APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")


def n(s):
    return re.sub(r"\s+", " ", str(s or "")).strip().upper()


def limpa(s):
    return re.sub(r"\s+", " ", str(s or "")).strip()


def dt(s):
    for f in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%d/%m/%Y",
              "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(limpa(s), f)
        except ValueError:
            pass
    return None


# ── base de SS/OS 11/08 ────────────────────────────────────────────────────
cab, regs = ler_ss_os(f"{BASES}/BASE_SS_OS_parte1.txt", f"{BASES}/BASE_SS_OS_parte2.txt")
campo = indexar(cab)
porss = {}
por_ativo_ss = defaultdict(list)          # todo histórico de SS por código de ativo
por_ns_inst = defaultdict(list)           # SS que INSTALARAM cada número de série
for r in regs:
    ss = n(campo(r, "NUMERO_SS"))
    if ss:
        porss[ss] = r
    t = n(campo(r, "NUM_TRAFO"))
    if t:
        por_ativo_ss[t].append(r)
    nsi = n(campo(r, "NS_INSTALADO"))
    if nsi and nsi not in ("", "0", "00", "N/A", "NAO TEM"):
        por_ns_inst[nsi].append(r)
print(f"base SS/OS: {len(regs)} linhas · {len(porss)} SS · {len(por_ativo_ss)} ativos")


# ── Crítica de julho, indexada pelo código do ativo em qualquer papel ─────
L = list(csv.reader(open(CRIT, encoding="latin-1"), delimiter=";"))
CB = [x.strip() for x in L[0]]
JC = {c: i for i, c in enumerate(CB)}
crregs = [r for r in L[1:] if len(r) >= len(CB) - 3 and any(r)]


def gc(r, c):
    i = JC.get(c, -1)
    return limpa(r[i]) if 0 <= i < len(r) else ""


PAPEL = [("COD_ELE_PROBLEMA", "problema"), ("COD_ELE_INTERROMPIDO", "interrompido"),
         ("COD_ELE_FECHADO", "fechado")]
crit_por_ativo = defaultdict(list)
for r in crregs:
    for col, _ in PAPEL:
        v = n(gc(r, col))
        if v:
            crit_por_ativo[v].append(r)
print(f"Crítica de julho: {len(crregs)} passos · {len(crit_por_ativo)} ativos citados")

# correções de 1 dígito no código do ativo, achadas por prefixo (ver enriquecer anterior)
CORRIGE = {"5704163001": "5704163007", "5727355076": "5727355075"}


def ocorrencias_do_ativo(trafo, abertura):
    """Todos os passos da Crítica que citam este ativo, agrupados por número de intervenção.
       A janela: SS aberta entre 1 h antes do início e 24 h depois do fim (intervalo inteiro)."""
    t = n(trafo)
    linhas = crit_por_ativo.get(t) or crit_por_ativo.get(n(CORRIGE.get(t, "")))
    if not linhas:
        return [], CORRIGE.get(t)
    ab = dt(abertura)
    grupos = defaultdict(list)
    for r in linhas:
        num = gc(r, "NUM_SEQ_OPER_INIC_HDE") or gc(r, "NUM_SEQ_OPER_FIM_HDE")
        grupos[num].append(r)
    saida = []
    for num, passos in grupos.items():
        papeis = set()
        obs, causas, subs = [], set(), set()
        ini = fim = None
        clientes = dur = ""
        for r in passos:
            for col, rot in PAPEL:
                if n(gc(r, col)) in (t, n(CORRIGE.get(t, ""))):
                    papeis.add(rot)
            a, f = dt(gc(r, "DTA_ABERT")), dt(gc(r, "DTA_FECH"))
            if a and (ini is None or a < ini):
                ini = a
            if f and (fim is None or f > fim):
                fim = f
            o = limpa(gc(r, "OBSERVACAO"))
            if o and o not in obs:
                obs.append(o)
            if gc(r, "DES_CAUSA_INTER_CAU"):
                causas.add(limpa(gc(r, "DES_CAUSA_INTER_CAU")))
            if gc(r, "DES_SUB_CAUSA_INTER_SCR"):
                subs.add(limpa(gc(r, "DES_SUB_CAUSA_INTER_SCR")))
            if gc(r, "QTD_CONS_INTER_FAT"):
                clientes = gc(r, "QTD_CONS_INTER_FAT")
            if gc(r, "DURACAO"):
                dur = gc(r, "DURACAO")
        na_janela = bool(ab and ini and fim and (ini - timedelta(hours=1)) <= ab <= (fim + timedelta(hours=24)))
        saida.append({
            "intervencao": num,
            "inicio": ini.strftime("%d/%m/%Y %H:%M") if ini else "",
            "fim": fim.strftime("%d/%m/%Y %H:%M") if fim else "",
            "papeis": "+".join(sorted(papeis)) or "—",
            "causa": " / ".join(sorted(causas)) or "não informada",
            "subcausa": " / ".join(sorted(subs)) or "não informada",
            "clientes": clientes, "duracao_min": dur,
            "passos": len(passos),
            "na_janela": na_janela,
            "observacoes": obs,
        })
    saida.sort(key=lambda o: (not o["na_janela"], o["inicio"]))
    return saida, CORRIGE.get(t)


# ── monta caso a caso ──────────────────────────────────────────────────────
d = json.load(open(f"{APP}/julho-2026.json", encoding="utf-8"))
comp = {}
for x in d["registros"]:
    ss = n(x["ss"])
    r = porss.get(ss)
    trafo = n(x["trafo"])
    it = {"ss": x["ss"], "trafo": x["trafo"]}

    # (1) número da intervenção — os dois, cada um com sua fonte
    num_ss = campo(r, "NUM_INT").strip() if r is not None else ""
    it["intervencao_ss_os"] = num_ss if re.search(r"\d{8,}", num_ss) else ""
    it["intervencao_ss_os_bruto"] = num_ss

    # (3) ocorrências completas da Crítica de julho
    ocs, ativo_corrigido = ocorrencias_do_ativo(trafo, x.get("abertura"))
    it["ocorrencias_julho"] = ocs
    it["ativo_corrigido_na_critica"] = ativo_corrigido
    # a intervenção que importa é aquela em que o ATIVO é o problema/interrompido (a falha
    # dele), não uma manobra vizinha que só o interrompeu; entre elas, a que casa na janela
    def peso(o):
        tem_defeito = "problema" in o["papeis"] or "interrompido" in o["papeis"]
        return (tem_defeito, o["na_janela"])
    principal = max(ocs, key=peso) if ocs else None
    it["intervencao_critica"] = principal["intervencao"] if principal else ""
    it["ocorrencia_principal"] = principal["intervencao"] if principal else ""
    it["ausente_na_critica"] = not ocs
    # "ausente da Crítica" quer dizer ausente das COLUNAS DE ATIVO. O revisor achou um caso
    # que não está em coluna nenhuma mas é citado no texto livre de outra ocorrência — e
    # dizer "não aparece em papel nenhum" seria impreciso.
    if not ocs:
        citado = [limpa(gc(rr, "OBSERVACAO")) for rr in crregs
                  if trafo and trafo in n(gc(rr, "OBSERVACAO"))]
        it["citado_em_observacao"] = citado[:5]

    # (2) data de fabricação do retirado (campo) — o texto vai ser lido pelos agentes
    if r is not None:
        # REFORMA. A base tem DUAS colunas chamadas REFORMADORA_DESAT (posições 38 e 39) e
        # elas divergem em 3.753 das 46.216 linhas: quem lê só uma pega metade da história.
        # Isto importa para a data de fabricação — em trafo reformado a plaqueta pode trazer
        # a data DE FÁBRICA e o sistema a data DA REFORMA, e aí a "divergência" não é erro.
        i38, i39 = [i for i, x in enumerate(cab) if x == "REFORMADORA_DESAT"][:2]
        it["reforma"] = {
            "retirado_e_reformado": campo(r, "TRANSFORMADOR_RETIRADO_É_REFORMADO").strip(),
            "reformadora_desat_col1": limpa(r[i38]) if i38 < len(r) else "",
            "reformadora_desat_col2": limpa(r[i39]) if i39 < len(r) else "",
            "data_reforma_retirado": campo(r, "DATA_REFORMA_RET").strip()[:10],
            "instalado_e_reformado": campo(r, "TRAFO_INSTALADO_É_REFORMADO").strip(),
            "reformadora_instalado": campo(r, "REFORMADORA_INSTALADO").strip(),
            "data_reforma_instalado": campo(r, "DATA_REFORMA_INST").strip()[:10],
        }
        rf = it["reforma"]
        contra = []
        if rf["retirado_e_reformado"].upper().startswith("S") and \
           "NÃO É REFORMADO" in rf["reformadora_desat_col1"].upper():
            contra.append("marcado como reformado, mas a reformadora diz NÃO É REFORMADO")
        if rf["retirado_e_reformado"].upper().startswith("N") and rf["data_reforma_retirado"]:
            contra.append(f"marcado como NÃO reformado, mas tem data de reforma "
                          f"({rf['data_reforma_retirado']})")
        if rf["reformadora_desat_col1"] != rf["reformadora_desat_col2"]:
            contra.append("as duas colunas REFORMADORA_DESAT da base discordam entre si")
        it["reforma_contradicoes"] = contra
        # IDADE DO QUE ENTROU. Ele levantou: empreiteira não deveria instalar trafo antigo,
        # e ninguém segura equipamento no estoque por anos. A conta separa as duas coisas:
        # trafo REFORMADO com data de fábrica antiga é normal — a plaqueta é a de fábrica e o
        # que vale é a data da reforma. Trafo NÃO reformado e antigo é que é a suspeita.
        # a data vem com hora colada e em formatos diferentes: corta para o dia, senão o
        # parse falha em silêncio e a regra deixa de marcar caso que deveria marcar
        fi, q = dt(campo(r, "DATA_FABRICACAO_INSTALADO").strip()[:10]), dt(str(x.get("abertura") or "")[:10])
        if fi and q:
            anos = round((q - fi).days / 365.25, 1)
            it["idade_instalado_anos"] = anos
            ref_inst = campo(r, "TRAFO_INSTALADO_É_REFORMADO").strip().upper().startswith("S")
            it["instalado_reformado"] = ref_inst
            if anos > 2 and not ref_inst:
                it["suspeita_estoque"] = (f"Entrou um transformador de {anos} anos de fábrica "
                                          f"que NÃO consta como reformado. Ou ficou anos parado "
                                          f"em estoque, ou a reforma não foi registrada, ou a "
                                          f"data de fabricação está errada.")
            elif anos > 2:
                it["nota_idade"] = (f"Entrou um transformador de {anos} anos de fábrica, mas ele "
                                    f"consta como REFORMADO — nesse caso a data antiga é a de "
                                    f"fábrica e o que vale é a data da reforma.")
        it["fab_retirado_campo"] = campo(r, "DATA_FABRICACAO_RETIRADO").strip()[:10]
        it["ns_retirado"] = campo(r, "NS_RETIRADO").strip()
        it["fab_instalado_campo"] = campo(r, "DATA_FABRICACAO_INSTALADO").strip()[:10]
        it["ns_instalado"] = campo(r, "NS_INSTALADO").strip()

        # (2b) reincidência: a última SS que instalou o transformador que AGORA saiu
        nsr = n(campo(r, "NS_RETIRADO"))
        reincid = None
        if nsr and nsr not in ("", "0", "00", "N/A", "NAO TEM"):
            candidatos = [rr for rr in por_ns_inst.get(nsr, [])
                          if n(campo(rr, "NUMERO_SS")) != ss]
            candidatos.sort(key=lambda rr: dt(campo(rr, "DATA_ABERTURA_SS")) or datetime.min)
            if candidatos:
                rr = candidatos[-1]
                reincid = {
                    "ss": campo(rr, "NUMERO_SS").strip(),
                    "os": campo(rr, "NUMERO_OS").strip(),
                    "abertura": campo(rr, "DATA_ABERTURA_SS").strip(),
                    "quando_instalou_este_ns": campo(rr, "DATA_ABERTURA_SS").strip()[:10],
                    "texto_ss": limpa(campo(rr, "DESCRIPTION_SS")),
                    "texto_os": limpa(campo(rr, "DESCRICAO_OS")),
                    "fabricante": campo(rr, "FABRICANTE_INSTALADO").strip(),
                    "fab": campo(rr, "DATA_FABRICACAO_INSTALADO").strip()[:10],
                }
        it["reincidente_ultima_instalacao"] = reincid

    # (4) texto integral de toda SS/OS anterior no mesmo ativo
    anteriores = []
    for rr in por_ativo_ss.get(trafo, []):
        if n(campo(rr, "NUMERO_SS")) == ss:
            continue
        anteriores.append({
            "ss": campo(rr, "NUMERO_SS").strip(),
            "os": campo(rr, "NUMERO_OS").strip(),
            "abertura": campo(rr, "DATA_ABERTURA_SS").strip(),
            "origem": campo(rr, "ORIGEM_SS").strip(),
            "defeito": campo(rr, "DEFEITO_SS").strip(),
            "texto_ss": limpa(campo(rr, "DESCRIPTION_SS")),
            "texto_os": limpa(campo(rr, "DESCRICAO_OS")),
        })
    anteriores.sort(key=lambda a: dt(a["abertura"]) or datetime.min, reverse=True)
    it["ss_os_anteriores_no_ativo"] = anteriores

    comp[x["ss"]] = it

# resumo honesto
tem_int = sum(1 for v in comp.values() if v["intervencao_critica"])
ausentes = [v["ss"] for v in comp.values() if v["ausente_na_critica"]]
reincid = sum(1 for v in comp.values() if v.get("reincidente_ultima_instalacao"))
com_ant = sum(1 for v in comp.values() if v["ss_os_anteriores_no_ativo"])
print(f"\ncom intervenção da Crítica: {tem_int}/72 · ausentes da Crítica: {len(ausentes)} {ausentes}")
print(f"reincidentes com instalação anterior rastreada: {reincid}")
print(f"com SS/OS anteriores no mesmo ativo: {com_ant}")
tot_obs = sum(len(o["observacoes"]) for v in comp.values() for o in v["ocorrencias_julho"])
print(f"observações de campo coletadas no total: {tot_obs}")

cam = f"{APP}/julho-completo.json"
json.dump({"gerado_em": "16/08/2026",
           "fonte": "Base SS/OS 11/08 (partes 1 e 2) · Crítica de julho de 2026 (7.007 passos)",
           "nota_intervencao": "O NUM_INT da SS/OS e o número de sequência da Crítica são "
                               "numerações diferentes; só 25 dos 72 coincidem. O que liga as "
                               "duas bases é o código do ativo (68 dos 72).",
           "por_ss": comp}, open(cam, "w"), ensure_ascii=False, separators=(",", ":"))
print(f"gravado {cam} ({os.path.getsize(cam)/1024:.0f} KB)")
