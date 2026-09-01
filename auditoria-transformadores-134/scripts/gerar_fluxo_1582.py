"""O universo de janeiro a JULHO na esteira inteira: 1.510 + 72 = 1.582 solicitações.

Ele pediu, em duas rodadas: "atualiza o site com os de julho, para ser 1582" e depois
"refaça o site novamente só que com os 1582 de janeiro a julho e os expurgos". A primeira
versão deste script somava os dois períodos num esquema reduzido, para uma aba à parte. Esta
versão entrega o que a segunda frase pede: os 72 de julho DESCEM A MESMA ESTEIRA das 1.510,
com os mesmos campos, para que Interrupção, Deslocamento, Análise de SS e OS, Ressalva,
Queimados e avariados e Exclusões contem 1.582 do topo ao fim.

O QUE FICA CONGELADO. Os 1.510 registros de janeiro a junho são copiados do fluxo-1510.json
sem mudar um caractere — só ganham três etiquetas de origem (periodo, congelado, previa). O
indicador de janeiro a junho continua 1.305 (1.225 queimados + 80 avariados) e ninguém de lá
muda de decisão para caber aqui. scripts/auditoria_invariantes.py confere isso registro a
registro contra o fluxo-1510.json.

COMO JULHO ENTRA NAS PENEIRAS. Julho não passou pelo motor de jan–jun — não há TMAE nem
export de material do mês. Então a tradução é a da régua do julho-2026.json, dita nas
palavras da esteira, sem inventar prova:
  · 55 que casaram na Crítica sem ressalva  → passam as quatro peneiras → SAÍDA (INCLUIR);
    a causa confirmada é a origem da SS (QUEIMADO/AVARIADO); onde a origem está vazia, o
    texto da SS decide.
  · 9 fora da janela + 6 ausentes da Crítica → param na PRIMEIRA peneira e ficam RETIDOS —
    não excluídos. Em jan–jun isso excluía; em julho o dono ainda não bateu martelo e a
    extração da Crítica (07/08) é recente demais para ausência valer contraprova. Fica
    "RETIDO — SEM INTERRUPÇÃO NA JANELA", decisão REVISÃO.
  · 2 que casaram com ressalva (SS gêmea de repasse; indício de cola e fita) → passam as
    três primeiras e ficam na quarta: "RETIDO — RESSALVA DA INTERRUPÇÃO", decisão REVISÃO.
  · Deslocamento: "SEM REGISTRO" para quem chega à segunda peneira, porque não existe TMAE
    de julho — e o TMAE é marcador, não retém. Material: não conferido, dito assim.
  · Expurgo: nenhum em julho. Nos 72 não há auxiliar nem particular (conferido no FIS).

Julho carrega periodo="julho", previa=true, e cada registro diz em `cascata_motivo` e
`etapa_rotulo` que é prévia. Os 220 expurgos continuam sendo os de janeiro a junho.

Entradas: public/fluxo-1510.json e public/julho-2026.json
Saída:    public/fluxo-1582.json  (mesmo esquema do fluxo-1510.json, mais os campos de
          origem e o resumo do universo somado que a aba "Janeiro a julho" já lia)
"""

import collections
import copy
import datetime as dt
import json
import os
import re

AQUI = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(AQUI, "..", "public")

txt = lambda v: "" if v is None else str(v).strip()

SAIDA = "SAÍDA"
EXCL = "EXCLUÍDA"
SEM_INT = "RETIDO — SEM INTERRUPÇÃO NA JANELA"
RESS = "RETIDO — RESSALVA DA INTERRUPÇÃO"
SEM_PROVA = "RETIDO — SEM PROVA DE TROCA"


def carregar(nome):
    with open(os.path.join(PUB, nome), encoding="utf-8") as fh:
        return json.load(fh)


def iso(brasileiro):
    """'01/07/2026 17:40:40' → '2026-07-01 17:40'. As 1.510 guardam ISO; a régua da tela lê
    ISO com new Date() e um dd/mm passado direto marcaria o mês errado sem avisar."""
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})(?:\s+(\d{2}):(\d{2}))?", txt(brasileiro))
    if not m:
        return txt(brasileiro)
    d, mo, y, h, mi = m.groups()
    return f"{y}-{mo}-{d} {h or '00'}:{mi or '00'}"


def quando(s):
    try:
        return dt.datetime.strptime(iso(s), "%Y-%m-%d %H:%M")
    except ValueError:
        return None


f10 = carregar("fluxo-1510.json")
jul = carregar("julho-2026.json")

# ── sanidade antes de somar ─────────────────────────────────────────────────
if len(f10["registros"]) != 1510:
    raise RuntimeError("fluxo-1510.json não tem 1.510 registros — não siga")
if len(jul["registros"]) != 72:
    raise RuntimeError("julho-2026.json não tem 72 registros — não siga")
dup = {r["ss"] for r in f10["registros"]} & {r["ss"] for r in jul["registros"]}
if dup:
    raise RuntimeError(f"SS repetida entre os dois períodos: {sorted(dup)[:5]}")
if jul["resumo"].get("suspeita_auxiliar", 0):
    raise RuntimeError("julho-2026.json marca suspeita de auxiliar — o expurgo precisa ser decidido antes")

# ── o molde: todos os campos que um registro de jan–jun tem ─────────────────
CHAVES = []
for r in f10["registros"]:
    for k in r:
        if k not in CHAVES:
            CHAVES.append(k)
molde = {k: None for k in CHAVES}
# campos de texto ficam "" para a tela não imprimir "null"
for r in f10["registros"]:
    for k, v in r.items():
        if isinstance(v, str) and molde[k] is None:
            molde[k] = ""

registros = []

# ── janeiro a junho: cópia fiel ─────────────────────────────────────────────
for r in f10["registros"]:
    d = copy.deepcopy(r)
    d["periodo"] = "jan–jun"
    d["congelado"] = True
    d["previa"] = False
    registros.append(d)


# ── julho: a régua dita nas palavras da esteira ─────────────────────────────
def causa_confirmada(r):
    o = txt(r.get("origem")).upper()
    if o in ("QUEIMADO", "AVARIADO"):
        return o, "origem da SS"
    t = (txt(r.get("texto_ss")) + " " + txt(r.get("texto_os"))).lower()
    if "queimad" in t:
        return "QUEIMADO", "texto da SS (origem vazia)"
    if re.search(r"avariad|vazamento|bucha|vazando|danificad", t):
        return "AVARIADO", "texto da SS (origem vazia)"
    return "QUEIMADO", "padrão — origem vazia e texto sem palavra decisiva"


def ocorrencia_que_sustenta(r):
    ocs = r.get("ocorrencias") or []
    dentro = [o for o in ocs if o.get("na_janela")]
    if dentro:
        # a que tem o ativo com problema vem primeiro; depois a mais próxima
        dentro.sort(key=lambda o: ("problema" not in txt(o.get("papeis")), abs(o.get("delta_inicio_h") or 0)))
        return dentro[0], True
    if ocs:
        ocs = sorted(ocs, key=lambda o: abs(o.get("delta_inicio_h") or 9e9))
        return ocs[0], False
    return None, False


def distancia_h(abertura, oc):
    a = quando(abertura)
    i, f = quando(oc.get("inicio")), quando(oc.get("fim"))
    if not a or not i:
        return None, None
    if f and i <= a <= f:
        return 0.0, "NÃO"
    if a < i:
        return round((i - a).total_seconds() / 3600, 2), "SIM"
    if f:
        return round((a - f).total_seconds() / 3600, 2), "NÃO"
    return round((a - i).total_seconds() / 3600, 2), "NÃO"


def det_ss(r):
    return {
        "Origem Ss": txt(r.get("origem")), "Defeito Ss": txt(r.get("defeito")),
        "Tiposs": txt(r.get("tipo_ss")), "Criticidade Ss": txt(r.get("criticidade")),
        "Situacao Ss": txt(r.get("situacao")), "Num Trafo": txt(r.get("trafo")),
        "Alimentador": txt(r.get("alimentador")), "Localidade": txt(r.get("localidade")),
        "Potencia Inst": txt(r.get("pot_inst")), "Potencia Ret": txt(r.get("pot_ret")),
        "Abertura da SS": txt(r.get("abertura")), "Obra": txt(r.get("obra")),
        "OS": txt(r.get("os")), "Clientes": txt(r.get("clientes")),
    }


def det_interrupcao(oc):
    if not oc:
        return None
    return {
        "Abertura": txt(oc.get("inicio")), "Fechamento": txt(oc.get("fim")),
        "Papel do ativo": txt(oc.get("papeis")), "Na janela": "SIM" if oc.get("na_janela") else "NÃO",
        "Código da causa": txt(oc.get("causa")), "Código da subcausa": txt(oc.get("subcausa")),
        "Clientes interrompidos": txt(oc.get("clientes")), "Duração (min)": txt(oc.get("duracao_min")),
        "Observação": txt(oc.get("observacao")),
    }


PREVIA = "prévia de julho — sem TMAE e sem export de material do mês; decisão da régua, não do martelo"

for r in jul["registros"]:
    d = dict(molde)
    entra = txt(r.get("entra"))
    critica = txt(r.get("critica"))
    gemea = bool(r.get("flag_gemea"))
    oc, oc_dentro = ocorrencia_que_sustenta(r)
    conf, conf_de = causa_confirmada(r)
    cat = txt(r.get("categoria"))
    com_ressalva = cat.startswith("B")

    d.update({
        # identidade e cadastro — o mesmo que jan–jun tem
        "ss": txt(r["ss"]), "os": txt(r.get("os")), "obra": txt(r.get("obra")),
        "trafo": txt(r.get("trafo")), "abertura": iso(r.get("abertura")),
        "situacao": txt(r.get("situacao")), "criticidade": txt(r.get("criticidade")),
        "localidade": txt(r.get("localidade")), "alimentador": txt(r.get("alimentador")),
        "origem": txt(r.get("origem")), "tipo_ss": txt(r.get("tipo_ss")),
        "categoria": txt(r.get("origem")) or "OUTROS", "categoria_gravada": txt(r.get("origem")),
        "categoria_texto": conf, "coorte": "JULHO", "auditada": False,
        "desc_ss": txt(r.get("texto_ss")), "desc_os": txt(r.get("texto_os")),
        "pot_ret": txt(r.get("pot_ret")), "pot_inst": txt(r.get("pot_inst")),
        "oc_cons": int(txt(r.get("clientes")) or 0) if txt(r.get("clientes")).isdigit() else None,
        "ocorrencias_ativo": len(r.get("ocorrencias") or []), "atendimentos_ativo": 0,
        "material_conferido": "NAO", "trafos_material": None, "postes_material": None,
        "narrativa": txt(r.get("narrativa")), "narrativa_base": txt(r.get("narrativa")),
        "alertas_narrativa": [PREVIA] + (["tem SS gêmea de repasse"] if gemea else []),
        "det_ss": det_ss(r), "det_interrupcao": det_interrupcao(oc),
        "det_atendimento": None, "det_obra": None,
        "oc_passos_todos": [], "oc_detalhe": [], "oc_num": "", "oc_casou_por": "defeito" if oc else "",
        "tmae_corrobora": "não", "tmae_gap_jan": "NÃO", "borda_2025": "",
        "lacuna_base": "Julho não tem TMAE nem export de material extraídos: o deslocamento fica sem registro e o material sem conferência. A Crítica usada é a extração de 07/08/2026.",
        "revisado_em": txt(r.get("decidido_em")), "revisao_origem": txt(r.get("decidido_por")),
        "fora_da_esteira": "NÃO", "expurgo": "NÃO", "expurgo_gatilho": "",
        "exclusao_porque": "", "exclusao_origem": "", "exclusao_pedida_pelo_dono": "NÃO",
        "e0_status": "SEGUE", "e0_motivo": "",
        "chega_e1": "SIM", "disputa_perdida": "NÃO", "decisao_anterior": "",
        "mudou_na_revisao": "NÃO", "pendente_siago": "NÃO", "sob_suspeita": "NÃO",
        "leitura": "L1", "leitura_texto": "O texto da SS e da OS descreve falha do transformador",
        "regra_leitura": "R6-QUEIMADO-TEXTO" if conf == "QUEIMADO" else "R6-AVARIADO-TEXTO",
        "confianca_leitura": "media",
        "at_deslocou": "", "at_fora_da_janela": "NÃO", "e4_alertas": "",
        "ressalvas": "", "ressalvas_graves": "", "ressalvas_medias": "",
        "sem_cliente_interrompido": "NÃO", "int_na_janela": "SIM" if oc_dentro else "NÃO",
        "oc_contida_na_ss": "SIM" if oc_dentro else "NÃO",
    })

    # a ocorrência que sustenta (ou a mais próxima, quando nenhuma cai na janela)
    if oc:
        dist, antes = distancia_h(r.get("abertura"), oc)
        d.update({
            "oc_ini": iso(oc.get("inicio")), "oc_fim": iso(oc.get("fim")),
            "oc_causa": txt(oc.get("causa")), "oc_sub": txt(oc.get("subcausa")),
            "oc_obs": txt(oc.get("observacao")), "oc_papel": txt(oc.get("papeis")),
            "oc_dist_h": dist, "aberta_antes": antes,
            "oc_dur_h": round(int(txt(oc.get("duracao_min")) or 0) / 60, 2) if txt(oc.get("duracao_min")).isdigit() else None,
            "oc_nivel_decisao": "DENTRO" if oc_dentro else ("ADJ" if dist is not None and dist <= 24 else "LONGE"),
        })

    # primeira peneira: o fato
    if critica == "SIM":
        d.update(e1_nivel="A", e1_status="SEGUE", fato="F1", censo_critica="DEFEITO NA JANELA",
                 censo_critica_porque="a abertura da SS cai na janela de uma ocorrência do próprio ativo",
                 fato_texto="Fato pleno — a Crítica de julho registra interrupção no próprio transformador dentro da janela",
                 e1_delta_h=d.get("oc_dist_h"))
    elif critica == "AUSENTE":
        d.update(e1_nivel="SEM", e1_status="RETIDO", fato="F3", censo_critica="AUSENTE",
                 censo_critica_porque="o código do transformador não aparece na extração da Crítica de julho (07/08/2026)",
                 fato_texto="Sem fato ainda — o ativo não aparece na Crítica de julho; ausência não é contraprova em mês recente")
    else:  # fora da janela
        d.update(e1_nivel="FORA", e1_status="RETIDO", fato="F3", censo_critica="DEFEITO EM OUTRA DATA",
                 censo_critica_porque="há ocorrência no ativo, mas a abertura da SS não cai na janela dela",
                 fato_texto="Sem fato na janela — a ocorrência do ativo existe, mas em outra data; aguarda o martelo do dono")

    if entra == "SIM":
        d.update({
            "chega_e2": "SIM", "chega_e3": "SIM",
            "deslocamento": "SEM REGISTRO", "e2_nivel": "SEM", "e2_status": "MARCADOR — não retém",
            "e3_status": "SEGUE", "e3_motivo": "texto da SS e da OS lidos; material de julho não extraído",
            "e4_status": "OK",
            "cascata": SAIDA, "decisao": "INCLUIR", "decisao_matriz": "INCLUIR",
            "confirmado": conf, "etapa_num": 5,
            "etapa_rotulo": "Saiu pela ponta — passou pelas quatro peneiras (prévia de julho)",
            "cascata_motivo": f"Casou na Crítica de julho sem ressalva e o texto declara falha; causa confirmada pela {conf_de}. {PREVIA.capitalize()}.",
            "motivo_decisao": txt(r.get("justificativa")),
        })
    elif com_ressalva:
        pend = txt(r.get("justificativa"))
        d.update({
            "chega_e2": "SIM", "chega_e3": "SIM",
            "deslocamento": "SEM REGISTRO", "e2_nivel": "SEM", "e2_status": "MARCADOR — não retém",
            "e3_status": "SEGUE", "e3_motivo": "texto da SS e da OS lidos; material de julho não extraído",
            "e4_status": "ALERTA", "e4_alertas": pend,
            "ressalvas": pend, "ressalvas_medias": pend,
            "cascata": RESS, "decisao": "REVISÃO", "decisao_matriz": "REVISÃO",
            "confirmado": "", "etapa_num": 4,
            "etapa_rotulo": "Etapa 4 · retido pela ressalva da interrupção (prévia de julho)",
            "cascata_motivo": f"Casou na Crítica de julho, mas com ressalva: {pend} {PREVIA.capitalize()}.",
            "motivo_decisao": pend,
            "sob_suspeita": "SIM", "suspeitas": pend,
        })
    else:
        d.update({
            "chega_e2": "NÃO", "chega_e3": "NÃO",
            "deslocamento": "", "e2_nivel": "SEM", "e2_status": "—",
            "e3_status": "—", "e3_motivo": "", "e4_status": "—",
            "cascata": SEM_INT, "decisao": "REVISÃO", "decisao_matriz": "REVISÃO",
            "confirmado": "", "etapa_num": 1,
            "etapa_rotulo": "Etapa 1 · retido na interrupção — aguarda a Crítica seguinte ou o martelo (prévia de julho)",
            "cascata_motivo": ("Parou na primeira peneira: " + (
                "o ativo não aparece na Crítica de julho. Em jan–jun isso excluía; em julho fica retido porque a extração é recente e a ocorrência só entra quando finaliza."
                if critica == "AUSENTE" else
                "há ocorrência no ativo, mas a abertura da SS não cai na janela dela. Em agosto o dono decidiu que SS aberta antes da ocorrência entra; aqui o critério espera a palavra dele.")
                + f" {PREVIA.capitalize()}."),
            "motivo_decisao": txt(r.get("justificativa")),
        })
        if gemea:
            d["ressalvas"] = "tem SS gêmea de repasse"
            d["sob_suspeita"] = "SIM"

    d["periodo"] = "julho"
    d["congelado"] = False
    d["previa"] = True
    registros.append(d)

# ── conferências antes de gravar ───────────────────────────────────────────
jj = [r for r in registros if r["periodo"] == "jan–jun"]
ju = [r for r in registros if r["periodo"] == "julho"]
assert len(jj) == 1510 and len(ju) == 72
c_ju = collections.Counter(r["cascata"] for r in ju)
assert c_ju == {SAIDA: 55, SEM_INT: 15, RESS: 2}, c_ju
assert all(r["expurgo"] == "NÃO" for r in ju)
assert sum(1 for r in registros if r["expurgo"] == "SIM") == 220
# nenhum registro de jan–jun mudou
for a, b in zip(f10["registros"], jj):
    for k in a:
        assert a[k] == b[k], (a["ss"], k)

# ── o resumo, nas chaves que a tela e os invariantes leem ──────────────────
cnt = lambda campo, lista=registros: dict(collections.Counter(
    r[campo] for r in lista if txt(r.get(campo))).most_common())
casc = collections.Counter(r["cascata"] for r in registros)

resumo = dict(f10["resumo"])  # herda as chaves de método (mudaram, janelaCorrigida, …)
resumo.update({
    "total": len(registros),
    "cascata": cnt("cascata"),
    "decisao": cnt("decisao"),
    "confirmado": cnt("confirmado"),
    "confirmadoTotal": casc[SAIDA],
    "fato": cnt("fato"),
    "leitura": cnt("leitura"),
    "e1": cnt("e1_nivel"),
    "decisaoMatriz": cnt("decisao_matriz"),
    "expurgos": casc[EXCL],
    "entramNaEsteira": len(registros) - casc[EXCL],
    "duplicadas": sum(1 for r in registros if r.get("expurgo_gatilho") == "duplicada"),
    "e1Retidos": sum(1 for r in registros if r.get("e1_status") == "RETIDO"),
    "e2SemAtendimento": sum(1 for r in registros if r.get("deslocamento") == "SEM REGISTRO"),
    "e3Retidos": casc[SEM_PROVA],
    "e4Alertas": sum(1 for r in registros if r.get("e4_status") == "ALERTA"),
    "comNarrativa": sum(1 for r in registros if txt(r.get("narrativa"))),
    "comCoordenada": sum(1 for r in registros if r.get("lat") is not None),
    "gatilhoExclusao": cnt("expurgo_gatilho"),
    # o que a aba "Janeiro a julho" já lia
    "jan_jun": len(jj), "julho": len(ju),
    "entram": sum(1 for r in registros if r["decisao"] == "INCLUIR"),
    "entram_jan_jun": sum(1 for r in jj if r["decisao"] == "INCLUIR"),
    "entram_julho": sum(1 for r in ju if r["decisao"] == "INCLUIR"),
    "pendentes_julho": sum(1 for r in ju if r["decisao"] == "REVISÃO"),
    "expurgados": casc[EXCL],
    "em_revisao": sum(1 for r in registros if r["decisao"] == "REVISÃO"),
    "categoria_jan_jun": cnt("categoria", jj),
    "categoria_julho": dict(collections.Counter(txt(r.get("categoria")) for r in jul["registros"]).most_common()),
    "julho_cascata": dict(c_ju),
    "indicador_jan_jun": {"total": 1305, "queimados": 1225, "avariados": 80,
                          "nota": "congelado — não recalculado por este arquivo"},
})

meta = copy.deepcopy(f10["meta"])
meta.update({
    "titulo": "Fluxo de análise — 1.582 SS de janeiro a julho de 2026",
    "fontes": list(f10["meta"].get("fontes", [])) + [f"Julho/2026 · {f}" for f in jul.get("fontes", [])],
    "lacunas": list(f10["meta"].get("lacunas", [])) + [
        "Julho não tem TMAE extraído: o deslocamento dos 57 que passam a primeira peneira fica SEM REGISTRO — marcador, não retém.",
        "Julho não tem export de material: a terceira peneira lê o texto da SS e da OS e marca material como não conferido.",
        "A Crítica de julho é a extração de 07/08/2026: ocorrência só entra quando finaliza, então ausência ainda não é contraprova — por isso os 6 ausentes ficam retidos e não excluídos.",
    ] + list(jul.get("avisos", [])),
    "periodos": {
        "jan–jun": {"registros": 1510, "congelado": True, "origem": "fluxo-1510.json",
                    "indicador": "1.305 = 1.225 queimados + 80 avariados — não recalculado"},
        "julho": {"registros": 72, "congelado": False, "previa": True, "origem": "julho-2026.json",
                  "traducao": "régua do mês dita nas palavras da esteira: 55 SAÍDA, 15 retidos na interrupção, 2 retidos pela ressalva; 0 expurgos"},
    },
    "montado_de": ["fluxo-1510.json (jan–jun, congelado)", "julho-2026.json (julho, prévia)"],
    "o_que_e": ("1.582 é o UNIVERSO DE SOLICITAÇÕES de janeiro a julho: as 1.510 de janeiro a junho "
                "mais as 72 de julho, descendo a mesma esteira."),
    "o_que_nao_e": ("O indicador de janeiro a junho continua sendo 1.305 — 1.225 queimados e 80 avariados — "
                    "e não foi recalculado. Nenhum caso de janeiro a junho mudou de decisão para caber aqui."),
    "julho_e_previa": ("Os 72 de julho entram com a decisão da régua, não com martelo do dono: 55 na saída, "
                       "15 retidos na primeira peneira e 2 retidos pela ressalva. Retido continua retido."),
    "ressalva_de_origem": ("O julho-2026.json diz de si mesmo, no campo `regra`, que é indicador separado e não "
                           "soma com as 1.305. Este arquivo soma porque o dono pediu que somasse; a ressalva "
                           "fica registrada para que a diferença não se perca."),
    "lacunas_julho": list(jul.get("avisos", [])),
})

saida = {
    "meta": meta,
    "resumo": resumo,
    "registros": registros,
    "historico": f10.get("historico", []),
    "sigco": f10.get("sigco", {}),
}

destino = os.path.join(PUB, "fluxo-1582.json")
with open(destino, "w", encoding="utf-8") as fh:
    json.dump(saida, fh, ensure_ascii=False)

tam = os.path.getsize(destino) / 1e6
print(f"public/fluxo-1582.json · {resumo['total']} registros ({len(jj)} + {len(ju)}) · {tam:.1f} MB")
print("  cascata:", "  ".join(f"{k}={v}" for k, v in casc.most_common()))
print(f"  saída {casc[SAIDA]} = {resumo['entram_jan_jun']} (jan–jun) + {resumo['entram_julho']} (julho)"
      f" · confirmado {resumo['confirmado']}")
print(f"  expurgos {casc[EXCL]} (todos de jan–jun) · em revisão {resumo['em_revisao']}"
      f" ({sum(1 for r in jj if r['decisao']=='REVISÃO')} jan–jun + {resumo['pendentes_julho']} julho)")
