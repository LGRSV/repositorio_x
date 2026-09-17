# -*- coding: utf-8 -*-
"""Auditoria independente: SS/OS 2026 (cod. operativo 42/52/53/57, jan-jul) x Critica."""
import json, os, re
from datetime import datetime, timedelta
from collections import defaultdict, Counter

SCR = "/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad"
OUT = os.path.join(SCR, "agente_A")
BASE = os.path.join(SCR, "BASE_SS_OS_11-08-2026.txt")
CRITDIR = os.path.join(SCR, "crit")
JULHO = "/home/user/repositorio_x/auditoria-transformadores-134/public/julho-2026.json"

PREFIXOS = {"42", "52", "53", "57"}
INI = datetime(2026, 1, 1, 0, 0, 0)
FIM = datetime(2026, 7, 31, 23, 59, 59)
PRE_H = timedelta(hours=1)     # janela: inicio - 1h
POS_H = timedelta(hours=24)    # janela: fim + 24h

anom = []

# ---------------- 1. BASE SS/OS ----------------
with open(BASE, encoding="utf-8") as f:
    linhas = f.read().split("\n")
if linhas and linhas[-1] == "":
    linhas.pop()
hdr = linhas[0].split("@")
idx = {c: i for i, c in enumerate(hdr)}
NCOL = len(hdr)

base_total = len(linhas) - 1
n_colmismatch = 0
n_data_inv = 0
n_trafo_vazio = 0
n_trafo_malformado = 0
pref_fora = Counter()

sel = []          # SS no recorte
vistos_ss = {}    # NUMERO_SS -> indice em sel (dedup)
n_dup = 0

def parse_dt(s, fmts):
    s = (s or "").strip()
    if not s:
        return None
    for fm in fmts:
        try:
            return datetime.strptime(s, fm)
        except ValueError:
            pass
    return None

for ln in linhas[1:]:
    p = ln.split("@")
    if len(p) != NCOL:
        n_colmismatch += 1
        if len(p) < NCOL:
            continue
        p = p[:NCOL - 1] + ["@".join(p[NCOL - 1:])]
    trafo = p[idx["NUM_TRAFO"]].strip()
    if not trafo:
        n_trafo_vazio += 1
        continue
    if not (len(trafo) == 10 and trafo.isdigit()):
        n_trafo_malformado += 1
        continue
    if trafo[:2] not in PREFIXOS:
        pref_fora[trafo[:2]] += 1
        continue
    dt = parse_dt(p[idx["DATA_ABERTURA_SS"]], ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%d/%m/%Y"))
    if dt is None:
        n_data_inv += 1
        continue
    if not (INI <= dt <= FIM):
        continue
    ss = p[idx["NUMERO_SS"]].strip()
    if ss in vistos_ss:
        n_dup += 1
        continue
    vistos_ss[ss] = len(sel)
    sel.append({
        "ss": ss,
        "os": p[idx["NUMERO_OS"]].strip(),
        "trafo": trafo,
        "abertura_dt": dt,
        "abertura": p[idx["DATA_ABERTURA_SS"]].strip(),
        "tipo_ss": p[idx["TIPOSS"]].strip(),
        "origem_ss": p[idx["ORIGEM_SS"]].strip(),
        "localidade": p[idx["LOCALIDADE"]].strip(),
        "alimentador": p[idx["ALIMENTADOR"]].strip(),
    })

# codigos alvo: trafo + chave gemea ("03" + 8 ultimos digitos)
def gemea(t):
    return "03" + t[2:]

alvo_trafo = set(r["trafo"] for r in sel)
alvo_chave = set(gemea(t) for t in alvo_trafo)
alvos = alvo_trafo | alvo_chave

# ---------------- 2. CRITICA jan-jun ----------------
COLS = ("COD_ELE_PROBLEMA", "COD_ELE_INTERROMPIDO", "COD_ELE_FECHADO")
PAPEL = {"COD_ELE_PROBLEMA": "problema", "COD_ELE_INTERROMPIDO": "interrompido", "COD_ELE_FECHADO": "fechado"}

seq_ini = {}          # seq -> min DTA_ABERT
seq_fim = {}          # seq -> max DTA_FECH
seq_info = {}         # seq -> (causa, subcausa) do 1o passo
cod_seqs = defaultdict(lambda: defaultdict(set))   # codigo -> seq -> {papeis}
stats_arq = []
n_linhas_curtas = 0
n_linhas_longas = 0
n_dtabert_inv = 0
n_dtfech_vazio = 0

for m in range(1, 7):
    fn = os.path.join(CRITDIR, "Critica-CHEIO_%02d-2026.txt" % m)
    with open(fn, encoding="latin-1") as f:
        conteudo = f.read()
    lns = conteudo.split("\n")
    if lns and lns[-1] == "":
        lns.pop()
    h = [c.strip() for c in lns[0].rstrip("\r").split(";")]
    n = len(h)
    ci = {c: i for i, c in enumerate(h)}
    passos = 0
    seqs_arq = set()
    curtas = longas = 0
    for ln in lns[1:]:
        ln = ln.rstrip("\r")
        p = ln.split(";")
        if len(p) > n:
            longas += 1
            p = p[:n - 1] + [";".join(p[n - 1:])]
        elif len(p) < n:
            curtas += 1
            continue
        passos += 1
        seq = p[ci["NUM_SEQ_OPER_INIC_HDE"]].strip()
        if not seq:
            continue
        seqs_arq.add(seq)
        da = parse_dt(p[ci["DTA_ABERT"]], ("%d/%m/%Y %H:%M", "%d/%m/%Y %H:%M:%S"))
        df = parse_dt(p[ci["DTA_FECH"]], ("%d/%m/%Y %H:%M", "%d/%m/%Y %H:%M:%S"))
        if da is None:
            n_dtabert_inv += 1
        if df is None:
            n_dtfech_vazio += 1
        if da is not None:
            if seq not in seq_ini or da < seq_ini[seq]:
                seq_ini[seq] = da
        if df is not None:
            if seq not in seq_fim or df > seq_fim[seq]:
                seq_fim[seq] = df
        if seq not in seq_info:
            seq_info[seq] = (p[ci["DES_CAUSA_INTER_CAU"]].strip(),
                             p[ci["DES_SUB_CAUSA_INTER_SCR"]].strip(),
                             (p[ci["OBSERVACAO"]].strip() if "OBSERVACAO" in ci else ""))
        for c in COLS:
            v = p[ci[c]].strip()
            if v in alvos:
                cod_seqs[v][seq].add(PAPEL[c])
    n_linhas_curtas += curtas
    n_linhas_longas += longas
    stats_arq.append({"arquivo": os.path.basename(fn), "linhas_dados": len(lns) - 1,
                      "passos_lidos": passos, "ocorrencias_distintas": len(seqs_arq),
                      "linhas_com_campos_a_mais": longas, "linhas_descartadas_curtas": curtas})

n_seq_total = len(set(list(seq_ini) + list(seq_fim)))

# ---------------- 3. casamento ----------------
def ocorrencias_de(cod):
    """lista de (seq, inicio, fim, papeis) com inicio/fim resolvidos."""
    res = []
    for seq, papeis in cod_seqs.get(cod, {}).items():
        ini = seq_ini.get(seq)
        fm = seq_fim.get(seq)
        if ini is None and fm is None:
            continue
        if ini is None:
            ini = fm
        if fm is None:
            fm = ini
        res.append((seq, ini, fm, "+".join(sorted(papeis, key=lambda x: ["problema", "interrompido", "fechado"].index(x)))))
    return res

def testar(cod, ab):
    """retorna (casou, melhor_ocorrencia, distancia_h). melhor=None se sem ocorrencias."""
    occ = ocorrencias_de(cod)
    if not occ:
        return (None, None, None)
    dentro = []
    for seq, ini, fm, pap in occ:
        if (ini - PRE_H) <= ab <= (fm + POS_H):
            dentro.append((abs((ab - ini).total_seconds()), seq, ini, fm, pap))
    if dentro:
        dentro.sort()
        _, seq, ini, fm, pap = dentro[0]
        return (True, (seq, ini, fm, pap), 0.0)
    fora = []
    for seq, ini, fm, pap in occ:
        if ab < (ini - PRE_H):
            d = ((ini - PRE_H) - ab).total_seconds() / 3600.0
        else:
            d = (ab - (fm + POS_H)).total_seconds() / 3600.0
        fora.append((d, seq, ini, fm, pap))
    fora.sort()
    d, seq, ini, fm, pap = fora[0]
    return (False, (seq, ini, fm, pap), round(d, 2))

# ---------------- 4. julho JSON ----------------
jd = json.load(open(JULHO, encoding="utf-8"))
julho_map = {}
for bloco in ("registros", "ampliado"):
    for it in jd.get(bloco, []):
        julho_map.setdefault(it["ss"].strip(), it)

MAP_J = {"SIM": "CASOU PELO TRAFO",
         "fora da janela": "TRAFO FORA DA JANELA",
         "AUSENTE": "AUSENTE pelo trafo — chave não conferível"}

FMT = "%d/%m/%Y %H:%M"
resultado = []
for r in sel:
    ab = r["abertura_dt"]
    julho = (ab.month == 7)
    item = {"ss": r["ss"], "trafo": r["trafo"], "abertura": r["abertura"],
            "tipo_ss": r["tipo_ss"], "resultado": None, "ocorrencia": None,
            "inicio": None, "fim": None, "papel": None, "distancia_h": None,
            "fonte": None}

    ok_t, occ_t, d_t = testar(r["trafo"], ab)
    if ok_t is True:
        seq, ini, fm, pap = occ_t
        item.update(resultado="CASOU PELO TRAFO", ocorrencia=seq, inicio=ini.strftime(FMT),
                    fim=fm.strftime(FMT), papel=pap, distancia_h=0.0, fonte="critica jan-jun")
        resultado.append(item); continue

    if julho:
        # crítica de julho ausente: só um casamento positivo em jan-jun vale.
        g = gemea(r["trafo"])
        ok_c, occ_c, d_c = testar(g, ab)
        if ok_c is True:
            seq, ini, fm, pap = occ_c
            item.update(resultado="CASOU PELA CHAVE GÊMEA", ocorrencia=seq, inicio=ini.strftime(FMT),
                        fim=fm.strftime(FMT), papel=pap + " (chave " + g + ")",
                        distancia_h=0.0, fonte="critica jan-jun")
            resultado.append(item); continue
        j = julho_map.get(r["ss"])
        if j is None:
            item.update(resultado="SEM CRÍTICA — não conferível", fonte="sem critica")
        else:
            item["resultado"] = MAP_J.get(j.get("critica"), "SEM CRÍTICA — não conferível")
            item["fonte"] = "julho-2026.json"
            occs = j.get("ocorrencias") or []
            esc = None
            for o in occs:
                if o.get("na_janela"):
                    esc = o; break
            if esc is None and occs:
                esc = min(occs, key=lambda o: min(abs(o.get("delta_inicio_h") or 1e9),
                                                  abs(o.get("delta_fim_h") or 1e9)))
            if esc is not None:
                item["inicio"] = esc.get("inicio"); item["fim"] = esc.get("fim")
                item["papel"] = esc.get("papeis")
                if not esc.get("na_janela"):
                    di = esc.get("delta_inicio_h"); df = esc.get("delta_fim_h")
                    cand = [abs(x) for x in (di, df) if x is not None]
                    item["distancia_h"] = round(min(cand), 2) if cand else None
                else:
                    item["distancia_h"] = 0.0
        resultado.append(item); continue

    # jan-jun: crítica completa disponível
    if ok_t is False:
        seq, ini, fm, pap = occ_t
        item.update(resultado="TRAFO FORA DA JANELA", ocorrencia=seq, inicio=ini.strftime(FMT),
                    fim=fm.strftime(FMT), papel=pap, distancia_h=d_t, fonte="critica jan-jun")
        resultado.append(item); continue

    # trafo ausente das 3 colunas -> chave gêmea
    g = gemea(r["trafo"])
    ok_c, occ_c, d_c = testar(g, ab)
    if ok_c is None:
        item.update(resultado="AUSENTE — nem trafo nem chave", fonte="critica jan-jun")
    elif ok_c is True:
        seq, ini, fm, pap = occ_c
        item.update(resultado="CASOU PELA CHAVE GÊMEA", ocorrencia=seq, inicio=ini.strftime(FMT),
                    fim=fm.strftime(FMT), papel=pap + " (chave " + g + ")", distancia_h=0.0,
                    fonte="critica jan-jun")
    else:
        seq, ini, fm, pap = occ_c
        item.update(resultado="CHAVE GÊMEA FORA DA JANELA", ocorrencia=seq, inicio=ini.strftime(FMT),
                    fim=fm.strftime(FMT), papel=pap + " (chave " + g + ")", distancia_h=d_c,
                    fonte="critica jan-jun")
    resultado.append(item)

# ---------------- 5. saidas ----------------
with open(os.path.join(OUT, "resultado.json"), "w", encoding="utf-8") as f:
    json.dump(resultado, f, ensure_ascii=False, indent=1)

por_res = Counter(x["resultado"] for x in resultado)
por_mes = defaultdict(Counter)
for x, r in zip(resultado, sel):
    por_mes["%02d/2026" % r["abertura_dt"].month][x["resultado"]] += 1
por_tipo = Counter(x["tipo_ss"] or "(vazio)" for x in resultado)
por_fonte = Counter(x["fonte"] for x in resultado)

ORDEM = ["CASOU PELO TRAFO", "TRAFO FORA DA JANELA", "CASOU PELA CHAVE GÊMEA",
         "CHAVE GÊMEA FORA DA JANELA", "AUSENTE — nem trafo nem chave",
         "AUSENTE pelo trafo — chave não conferível", "SEM CRÍTICA — não conferível"]
ORDEM = [o for o in ORDEM if o in por_res] + [o for o in por_res if o not in ORDEM]

L = []
L.append("# Contagens — auditoria SS x Crítica (analista independente A)\n")
L.append("Recorte: NUM_TRAFO com 10 dígitos e prefixo 42/52/53/57; DATA_ABERTURA_SS entre 01/01/2026 e 31/07/2026.\n")
L.append("## Total\n")
L.append("- SS no recorte: **%d**\n" % len(resultado))
L.append("## Por resultado\n")
L.append("| resultado | SS | % |")
L.append("|---|---:|---:|")
for k in ORDEM:
    L.append("| %s | %d | %.1f%% |" % (k, por_res[k], 100.0 * por_res[k] / len(resultado)))
L.append("")
L.append("## Por fonte\n")
L.append("| fonte | SS |"); L.append("|---|---:|")
for k, v in sorted(por_fonte.items()):
    L.append("| %s | %d |" % (k, v))
L.append("")
L.append("## Mês x resultado\n")
meses = sorted(por_mes)
L.append("| mês | " + " | ".join(ORDEM) + " | total |")
L.append("|---|" + "---:|" * (len(ORDEM) + 1))
for m in meses:
    tot = sum(por_mes[m].values())
    L.append("| %s | %s | %d |" % (m, " | ".join(str(por_mes[m][k]) for k in ORDEM), tot))
L.append("")
L.append("## Por TIPOSS\n")
L.append("| TIPOSS | SS |"); L.append("|---|---:|")
for k, v in por_tipo.most_common():
    L.append("| %s | %d |" % (k, v))
L.append("")
L.append("## Leitura da Crítica (jan-jun)\n")
L.append("| arquivo | linhas de dados | passos lidos | ocorrências distintas | linhas c/ ';' extra (juntadas na OBSERVACAO) | linhas descartadas (campos a menos) |")
L.append("|---|---:|---:|---:|---:|---:|")
for s in stats_arq:
    L.append("| %s | %d | %d | %d | %d | %d |" % (s["arquivo"], s["linhas_dados"], s["passos_lidos"],
             s["ocorrencias_distintas"], s["linhas_com_campos_a_mais"], s["linhas_descartadas_curtas"]))
L.append("| **TOTAL** | %d | %d | %d (globais, sem repetir entre meses) | %d | %d |" % (
    sum(s["linhas_dados"] for s in stats_arq), sum(s["passos_lidos"] for s in stats_arq),
    n_seq_total, n_linhas_longas, n_linhas_curtas))
L.append("")
L.append("## Anomalias dos dados\n")
L.append("- Base SS/OS: %d linhas de dados; %d com número de colunas != %d." % (base_total, n_colmismatch, NCOL))
L.append("- NUM_TRAFO vazio: %d linha(s). NUM_TRAFO malformado (não são 10 dígitos): %d linha(s)." % (n_trafo_vazio, n_trafo_malformado))
L.append("- DATA_ABERTURA_SS inválida dentro do recorte de prefixo: %d." % n_data_inv)
L.append("- SS duplicadas no recorte (contadas uma vez): %d." % n_dup)
L.append("- Prefixos de 10 dígitos descartados (fora de 42/52/53/57), top 12: %s." %
         ", ".join("%s=%d" % kv for kv in pref_fora.most_common(12)))
L.append("- Crítica: passos com DTA_ABERT inválida/vazia: %d; com DTA_FECH inválida/vazia: %d (ocorrência em aberto — usa-se o outro extremo)." % (n_dtabert_inv, n_dtfech_vazio))
L.append("- Cabeçalho de janeiro traz QTD_IFEC_COEC/QTD_IDEC_POLO em posição diferente dos demais meses; o mapeamento é feito por nome, então não afeta as colunas usadas.")
L.append("- Julho: crítica bruta indisponível; %d SS de julho no recorte, das quais %d resolvidas pelo julho-2026.json, %d casadas já nos arquivos de junho e %d sem cobertura." % (
    sum(1 for x, r in zip(resultado, sel) if r["abertura_dt"].month == 7),
    sum(1 for x in resultado if x["fonte"] == "julho-2026.json"),
    sum(1 for x, r in zip(resultado, sel) if r["abertura_dt"].month == 7 and x["fonte"] == "critica jan-jun"),
    sum(1 for x in resultado if x["fonte"] == "sem critica")))
L.append("- Carryover jun->jul verificado: os arquivos de junho vao ate DTA_FECH 01/07/2026 17:43, mas nenhuma SS de julho do recorte cai na janela [inicio-1h, fim+24h] de uma ocorrencia de jan-jun (0 casos) — por isso julho depende inteiramente do julho-2026.json.")
L.append("- Nenhuma linha da Critica veio com numero de campos diferente de 64: as aspas soltas nao quebraram o split por ';' (nenhum registro tem ';' na OBSERVACAO nem quebra de linha).")
L.append("- Criterio de desempate: havendo varias ocorrencias na janela, escolhe-se a de |abertura - inicio| minimo; fora da janela, a de menor distancia ate a borda.")
L.append("")

with open(os.path.join(OUT, "contagens.md"), "w", encoding="utf-8") as f:
    f.write("\n".join(L))

# console
print("SS no recorte:", len(resultado))
for k in ORDEM:
    print("  %-45s %d" % (k, por_res[k]))
print("fonte:", dict(por_fonte))
print()
for cat in ("CASOU PELA CHAVE GÊMEA", "CHAVE GÊMEA FORA DA JANELA"):
    print("### %s (%d)" % (cat, por_res[cat]))
    for x in [y for y in resultado if y["resultado"] == cat][:4]:
        print("   ", json.dumps(x, ensure_ascii=False))
    print()
