#!/usr/bin/env python3
"""Reaplica a esteira inteira com as duas regras que o dono definiu.

REGRA 1 — a primeira peneira pergunta pelo FATO, não pela causa.
  Basta o código do ativo ter uma ocorrência na Crítica dentro da janela, ou um atendimento
  no TMAE. A janela vale contra o intervalo INTEIRO da ocorrência: do primeiro passo aberto
  ao último fechado, rastreado pelo número da ocorrência, independentemente de qual ativo
  cada linha cita. Uma ocorrência abre quando a primeira chave atua, não quando o
  transformador queima — medir do início dela descartava quem abriu a SS depois do
  religamento. Que causa a Crítica declarou é assunto da terceira peneira.

REGRA 2 — a segunda peneira deixa de reter. O atendimento do TMAE vira marcador.
  Motivo medido: em 848 das 884 da saída antiga o número do atendimento é idêntico ao da
  ocorrência — é a mesma nota em duas bases, não duas provas. O TMAE não tem nenhum registro
  entre 26 e 31 de janeiro. E dos 235 que ele retinha, NENHUM era "a equipe não saiu": todos
  eram "não há nota no código". Ele reprovava ausência de registro, não ausência de
  atendimento. Vira coluna, continua visível e filtrável.

Fontes da Crítica: os seis arquivos de 2026 lidos com QUOTE_NONE (o leitor antigo engolia
5.548 linhas por aspas soltas em OBSERVACAO) mais dezembro/2025, que não existia no acervo.
"""
import collections
import csv
import datetime
import glob
import json
import os

csv.field_size_limit(10 ** 8)
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FLUXO = os.path.join(RAIZ, "public", "fluxo-1510.json")
SCR = "/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad"
UP = "/root/.claude/uploads/74dc9c64-5026-54ee-a81e-173d2f38a735"
BRASILIA = datetime.timezone(datetime.timedelta(hours=-3))
CARIMBO = datetime.datetime.now(BRASILIA).strftime("%Y-%m-%d %H:%M")
JANELA = 24 * 3600


def parse(s):
    # A Crítica escreve a data com barra e o TMAE com traço. Aceitar só um dos dois faz
    # todas as datas do outro virarem None em silêncio — e aí nenhum atendimento casa, o
    # arquivo entra e não serve para nada. Foi exatamente o que aconteceu na primeira vez.
    for f in ("%d/%m/%Y %H:%M", "%d/%m/%Y %H:%M:%S", "%d-%m-%Y %H:%M", "%d-%m-%Y %H:%M:%S",
              "%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.datetime.strptime(str(s or "").strip()[:19], f)
        except (ValueError, TypeError):
            pass
    return None


def conserta_acento(s):
    """Desfaz a dupla codificação da observação do executante.

    O arquivo do TMAE é latin-1, mas o texto dentro dele já tinha sido gravado em UTF-8 antes.
    Lido como latin-1, "Intervenção" chega como "IntervenÃ§Ã£o". Recodificar para latin-1 e
    ler como UTF-8 desfaz exatamente isso. Quando não é o caso, a conversão falha e o texto
    original volta intacto — por isso o try.
    """
    s = str(s or "")
    if "Ã" not in s and "Â" not in s:
        return s
    try:
        return s.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


def numero(s):
    s = str(s or "").strip().replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def le_tmae():
    """Atendimentos por código de transformador, com o vão de janeiro já preenchido.

    O consolidado jan–jun não tem uma linha sequer entre 26 e 31 de janeiro. O arquivo
    TMAE_012026_1 tem o mês inteiro: são 3.754 atendimentos a mais, 1.428 deles em
    transformador. O que estava marcado como lacuna da base deixa de ser lacuna.
    """
    arqs = [f"{SCR}/tmae_raw/32196f1a-TMAE_2026_Jan_Jun_Consolidado.txt",
            f"{UP}/f98665ac-TMAE_012026_1.txt",
            f"{UP}/de61a9ac-TMAE_122025.txt",
            f"{UP}/5022f8c0-TMAE_072026_1.txt"]
    at = {}
    for p in arqs:
        if not os.path.exists(p):
            continue
        with open(p, encoding="latin-1", newline="") as fh:
            rd = csv.reader(fh, delimiter=";", quoting=csv.QUOTE_NONE)
            head = [h.strip() for h in next(rd)]
            k = {n: i for i, n in enumerate(head)}
            for r in rd:
                if len(r) != len(head) or r[k["COD_ELE_REDE_TNT"]].strip() != "TR":
                    continue
                cod = r[k["COD_INS_TRF_TNT"]].strip()
                n = r[k["NUM_SEQ_OPER_ORIG_COS_TNT"]].strip()
                if not cod or not n or (n, cod) in at:
                    continue
                tmd = str(r[k["TMD"]]).strip().replace(".", "").replace(",", ".")
                try:
                    tmd = float(tmd)
                except ValueError:
                    tmd = 0.0
                at[(n, cod)] = {
                    "num": n, "trafo": cod, "ini": parse(r[k["DTA_ORIG_TNT"]]),
                    "fim": parse(r[k["DTA_CONCL_TNT"]]),
                    "desloc": parse(r[k["DTA_INIC_DLCT_TNT"]]), "tmd": tmd,
                    "equipe": r[k["EQUIPE"]].strip(),
                    "causa": conserta_acento(r[k["DES_CAUSA_INTER_CAU"]].strip()),
                    "sub": conserta_acento(r[k["DES_SUB_CAUSA_INTER_SCR"]].strip()),
                    "obs": conserta_acento(r[k["DES_OBS_EXEC_SERV_TNT"]].strip())[:300],
                }
    return at


def le_critica():
    """Uma entrada por ocorrência, com o vão do primeiro passo ao último."""
    arqs = sorted(glob.glob(f"{SCR}/crit_raw/Critica-CHEIO_*.txt")) + \
        [f"{UP}/0896088f-CriticaCHEIO_122025.txt"]
    oc = {}
    for p in arqs:
        with open(p, encoding="latin-1", newline="") as fh:
            rd = csv.reader(fh, delimiter=";", quoting=csv.QUOTE_NONE)
            head = [h.strip().replace("ABRANGENCIA", "ABRANGÊNCIA") for h in next(rd)]
            k = {n: i for i, n in enumerate(head)}
            for r in rd:
                if len(r) != len(head) or r[k["COD_ELE_REDE_PROBLEMA"]].strip() != "TR":
                    continue
                cod = r[k["COD_ELE_PROBLEMA"]].strip()
                n = r[k["NUM_SEQ_OPER_INIC_HDE"]].strip()
                if not cod or not n:
                    continue
                ini, fim = parse(r[k["DTA_ABERT"]]), parse(r[k["DTA_FECH"]])
                a = oc.get((n, cod))
                if a is None:
                    oc[(n, cod)] = {
                        "oc": n, "trafo": cod, "ini": ini, "fim": fim,
                        "cons": numero(r[k["QTD_CONS_INTER_FAT"]]),
                        "sub": r[k["DES_SUB_CAUSA_INTER_SCR"]].strip(),
                        "causa": r[k["DES_CAUSA_INTER_CAU"]].strip(),
                        "tipo": r[k["COD_SUB_TIPO_OS_COS"]].strip(),
                        "loc": r[k["LOCALIDADE"]].strip(), "passos": 1,
                    }
                else:
                    a["passos"] += 1
                    a["cons"] += numero(r[k["QTD_CONS_INTER_FAT"]])
                    # o vão é do primeiro passo ao último: mínimo das aberturas, máximo dos fechos
                    if ini and (not a["ini"] or ini < a["ini"]):
                        a["ini"] = ini
                    if fim and (not a["fim"] or fim > a["fim"]):
                        a["fim"] = fim
    return oc


def borda(ab, o):
    """Distância até a borda mais próxima do intervalo. Dentro do intervalo é zero."""
    if not ab or not o["ini"]:
        return None
    if o["fim"] and o["ini"] <= ab <= o["fim"]:
        return 0.0
    c = [abs((ab - o["ini"]).total_seconds())]
    if o["fim"]:
        c.append(abs((ab - o["fim"]).total_seconds()))
    return min(c)


def ressalvas_de(o):
    """Os sinais que enfraquecem a interrupção — recalculados contra a ocorrência que casou."""
    if not o:
        return []
    s = []
    cs = f"{o.get('causa','')} {o.get('sub','')}".upper()
    if "PREVENTIV" in cs:
        s.append("interrupção preventiva")
    if o.get("tipo") == "ITP" or "PROGRAMADA" in cs:
        s.append("desligamento programado")
    if "SEM PROGRAMACAO PREVIA" in cs:
        s.append("manobra sem programação prévia")
    if "PARTICULAR" in cs:
        s.append("transformador particular")
    if not (o.get("cons") or 0):
        s.append("nenhum cliente interrompido")
    if o.get("tipo") in ("FEN", "FFA"):
        s.append("reclamacao individual (FEN/FFA)")
    return s


def main():
    with open(FLUXO, encoding="utf-8") as fh:
        fluxo = json.load(fh)
    oc = le_critica()
    at = le_tmae()
    por_at = collections.defaultdict(list)
    for a in at.values():
        por_at[a["trafo"]].append(a)
    print(f"TMAE: {len(at):,} atendimentos em transformador (dez/2025 + jan–jul/2026, janeiro completo)")
    por = collections.defaultdict(list)
    for o in oc.values():
        por[o["trafo"]].append(o)
    print(f"Crítica: {len(oc):,} ocorrências em transformador (dez/2025 + jan–jun/2026)")

    antes = collections.Counter(r["cascata"] for r in fluxo["registros"])
    for r in fluxo["registros"]:
        ab = parse(r.get("abertura"))
        cod = str(r.get("trafo") or "").strip()
        jan = [o for o in por.get(cod, []) if (b := borda(ab, o)) is not None and b <= JANELA]
        melhor = min(jan, key=lambda x: borda(ab, x)) if jan else None
        # o atendimento é reprocurado no TMAE completo, não herdado do campo antigo
        cand_at = [a for a in por_at.get(cod, []) if (b := borda(ab, a)) is not None and b <= JANELA]
        melhor_at = min(cand_at, key=lambda x: borda(ab, x)) if cand_at else None
        # A busca nova é mais estreita que o campo at_num herdado: uma correção anterior
        # recuperou 23 casos procurando pelo NÚMERO DA OCORRÊNCIA quando a chave do TMAE
        # gravou outro equipamento ("CODIGO INVALIDO" no texto). Descartar o campo herdado
        # jogaria esse trabalho fora — então ele vale como segunda via.
        herdado = bool(str(r.get("at_num") or "").strip())
        tem_at = melhor_at is not None or herdado
        if melhor_at:
            r.update({"at_num": melhor_at["num"],
                      "at_ini": f"{melhor_at['ini']:%Y-%m-%d %H:%M}" if melhor_at["ini"] else None,
                      "at_fim": f"{melhor_at['fim']:%Y-%m-%d %H:%M}" if melhor_at["fim"] else None,
                      "at_equipe": melhor_at["equipe"], "at_causa": melhor_at["causa"],
                      "at_sub": melhor_at["sub"], "at_obs": melhor_at["obs"],
                      "at_tmd": melhor_at["tmd"],
                      "at_deslocou": "SIM" if (melhor_at["desloc"] or melhor_at["tmd"] > 0) else "NÃO"})

        # ---------- peneira 1: o fato
        if melhor:
            b = borda(ab, melhor)
            r.update({
                "oc_num": melhor["oc"], "oc_ini": f"{melhor['ini']:%Y-%m-%d %H:%M}" if melhor["ini"] else None,
                "oc_fim": f"{melhor['fim']:%Y-%m-%d %H:%M}" if melhor["fim"] else None,
                "oc_dur_h": round((melhor["fim"] - melhor["ini"]).total_seconds() / 3600, 2)
                if melhor["ini"] and melhor["fim"] else None,
                "oc_cons": int(melhor["cons"]), "oc_causa": melhor["causa"], "oc_sub": melhor["sub"],
                "oc_tipo": melhor["tipo"], "oc_prob_ele": "TR", "oc_passos": melhor["passos"],
                "oc_dist_h": round(b / 3600, 2), "e1_delta_h": round(b / 3600, 2),
                "e1_nivel": "A" if b == 0 else "B", "e1_status": "SEGUE", "e1_sinais": "",
                "chega_e2": "SIM", "fato": "F1",
                "fato_texto": "Fato pleno — a Crítica registra interrupção no próprio transformador dentro da janela",
            })
        elif tem_at:
            # Passa pelo atendimento, e por isso NÃO carrega ocorrência. Deixar o oc_num velho
            # aqui fazia esta SS reivindicar como prova uma ocorrência que ela não casa — foi
            # o que criou uma disputa fantasma com a ETO-RD-AG 00289, que casa de verdade.
            r.update({"e1_status": "SEGUE", "e1_nivel": "B", "chega_e2": "SIM", "fato": "F0",
                      "fato_texto": "Fato pelo atendimento — o TMAE registra equipe no transformador na janela",
                      "oc_num": None, "oc_ini": None, "oc_fim": None, "oc_dur_h": None,
                      "oc_cons": None, "oc_causa": None, "oc_sub": None, "oc_tipo": None,
                      "oc_prob_ele": None, "oc_dist_h": None, "e1_delta_h": None})
        else:
            r.update({"e1_status": "RETIDO", "chega_e2": "NÃO", "chega_e3": "NÃO", "fato": "F3",
                      "fato_texto": "Sem fato — nem a Crítica nem o TMAE registram nada na janela",
                      "cascata": "RETIDO — SEM INTERRUPÇÃO NA JANELA",
                      "cascata_motivo": "O código do transformador não tem ocorrência na Crítica nem atendimento no TMAE dentro da janela",
                      "decisao": "REVISÃO", "confirmado": "", "disputa_perdida": "NÃO",
                      "e1_conflito": "", "ressalvas_graves": "", "ressalvas_medias": "",
                      "ressalvas": "", "e4_alertas": "", "e4_status": "OK",
                      "deslocamento": "", "e2_status": "—"})
            continue
        r["_oc_obj"] = melhor

        # a peneira 2 e as seguintes rodam na segunda passagem, depois de resolver as disputas

    # ---------- disputa: uma ocorrência prova UMA troca, não duas
    # Quando duas SS do mesmo transformador apontam para a mesma ocorrência, só uma pode
    # usá-la como fato. Fica com ela a que estiver mais perto da borda; a outra é duplicada.
    donos = collections.defaultdict(list)
    for r in fluxo["registros"]:
        o = r.get("_oc_obj")
        if o:
            donos[(o["oc"], o["trafo"])].append(r)
    perdedores = 0
    for chave, lista in donos.items():
        for r in lista:
            r["disputa_perdida"] = "NÃO"
            r["e1_conflito"] = ""
        if len(lista) < 2:
            continue
        lista.sort(key=lambda x: abs(float(x.get("oc_dist_h") or 0)))
        vencedor = lista[0]
        for r in lista[1:]:
            perdedores += 1
            r.update({
                "disputa_perdida": "SIM",
                "e1_conflito": f"a ocorrência {chave[0]} já é usada por {vencedor['ss']}",
                "chega_e2": "NÃO", "chega_e3": "NÃO",
                "cascata": "RETIDO — SS DUPLICADA",
                "cascata_motivo": ("Divide o mesmo evento e o mesmo transformador com "
                                   f"{vencedor['ss']}: a interrupção prova uma troca, não duas"),
                "decisao": "REVISÃO", "confirmado": "",
            })
    print(f"  disputas de ocorrência: {perdedores} SS marcadas como duplicadas")

    # ---------- segunda passagem: peneiras 2, 3 e 4
    for r in fluxo["registros"]:
        if r.get("chega_e2") != "SIM":
            r.pop("_oc_obj", None)
            continue
        melhor = r.pop("_oc_obj", None)
        tem_at = bool(str(r.get("at_num") or "").strip())
        deslocou = tem_at and r.get("at_deslocou") == "SIM"
        r["deslocamento"] = "CORROBORA" if deslocou else "SEM REGISTRO"
        r["e2_status"] = "MARCADOR — não retém"
        r["chega_e3"] = "SIM"

        # A terceira peneira é onde a CAUSA é julgada — e ela julga pelo que a leitura apurou,
        # não só pela flag antiga. Cinco casos chegavam à saída carregando categoria_texto
        # FURTADO, ABALROAMENTO e PREVENTIVO: o texto dizia outra causa e ninguém barrava,
        # porque a flag expurgo não tinha sido marcada neles. Furto não é queima de equipamento.
        FORA = {"FURTADO", "ABALROAMENTO", "PREVENTIVO", "PARTICULAR", "TRAFO AUXILIAR",
                "CONSTRUCAO", "DESATIVACAO"}
        cat = str(r.get("categoria_texto") or "").strip().upper()
        if r.get("expurgo") == "SIM" or cat in FORA:
            r.update({"cascata": "EXCLUÍDO NA LEITURA", "decisao": "EXCLUIR", "confirmado": "",
                      "expurgo": "SIM",
                      "cascata_motivo": f"A leitura do texto mostra outra causa: {cat.lower()}"
                      if cat in FORA else r.get("cascata_motivo", "")})
            continue
        if float(r.get("trafos_material") or 0) <= 0:
            r.update({"e3_status": "RETIDO", "cascata": "RETIDO — SEM PROVA DE TROCA",
                      "cascata_motivo": r.get("e3_motivo") or "A obra não comprova movimentação de transformador",
                      "decisao": "REVISÃO", "confirmado": ""})
            continue
        r["e3_status"] = "SEGUE"

        sin = ressalvas_de(melhor)
        # o invariante 4 lê ressalvas_graves e ressalvas_medias — são esses os campos que
        # a esteira consulta, então é neles que a ressalva recalculada tem de aterrissar
        r["ressalvas"] = " · ".join(sin)
        r["e4_alertas"] = " · ".join(sin)
        r["ressalvas_graves"] = ""
        r["ressalvas_medias"] = " · ".join(sin)
        r["e4_status"] = "ALERTA" if sin else "OK"
        if sin:
            r.update({"cascata": "RETIDO — RESSALVA DA INTERRUPÇÃO",
                      "cascata_motivo": "A interrupção tem sinal que a enfraquece: " + " · ".join(sin),
                      "decisao": "REVISÃO", "confirmado": ""})
            continue
        r.update({"cascata": "SAÍDA", "decisao": "INCLUIR",
                  "cascata_motivo": "Campo, texto e material convergem: interrupção no próprio transformador dentro da janela e troca comprovada no material",
                  "confirmado": r.get("categoria_texto") or r.get("categoria") or "QUEIMADO",
                  "revisado_em": CARIMBO,
                  "revisao_origem": "2026-08-04 · regras novas: peneira 1 pelo fato, TMAE como marcador"})

    depois = collections.Counter(r["cascata"] for r in fluxo["registros"])
    print(f"\n{'cascata':44} {'antes':>7} {'depois':>7}")
    for k in sorted(set(antes) | set(depois), key=lambda x: -depois[x]):
        print(f"  {k:42} {antes[k]:>7} {depois[k]:>7}   {depois[k]-antes[k]:+}")
    print(f"  {'TOTAL':42} {sum(antes.values()):>7} {sum(depois.values()):>7}")
    print("\n  marcador de deslocamento:",
          dict(collections.Counter(r.get("deslocamento") for r in fluxo["registros"] if r.get("deslocamento"))))

    # ---------- o resumo tem que ser recontado, é ele que a tela lê
    R = fluxo["registros"]
    def c(campo):
        return dict(collections.Counter(r.get(campo) for r in R if r.get(campo) not in (None, "")))
    fluxo["resumo"].update({
        "cascata": c("cascata"), "decisao": c("decisao"), "fato": c("fato"),
        "e1": c("e1_nivel"), "confirmado": c("confirmado"),
        "confirmadoTotal": sum(1 for r in R if r.get("confirmado")),
        "e1Retidos": sum(1 for r in R if r.get("e1_status") == "RETIDO"),
        "e4Alertas": sum(1 for r in R if r.get("e4_status") == "ALERTA"),
        "semFato": sum(1 for r in R if r.get("fato") == "F3"),
        "e3Retidos": sum(1 for r in R if r.get("cascata") == "RETIDO — SEM PROVA DE TROCA"),
        "expurgos": sum(1 for r in R if r.get("cascata") == "EXCLUÍDO NA LEITURA"),
        "duplicadas": sum(1 for r in R if r.get("cascata") == "RETIDO — SS DUPLICADA"),
        "e2SemAtendimento": sum(1 for r in R if r.get("deslocamento") == "SEM REGISTRO"),
        "e2SemDeslocamento": 0,
    })
    fluxo["meta"]["regra"] = (
        "A primeira peneira pergunta pelo fato: o código do transformador tem ocorrência na "
        "Crítica dentro de 24 horas, medidas contra o intervalo inteiro da ocorrência — do "
        "primeiro passo aberto ao último fechado. Que causa a Crítica declarou é assunto da "
        "leitura, na terceira peneira. O atendimento do TMAE não retém ninguém: é marcador.")
    with open(FLUXO, "w", encoding="utf-8") as fh:
        json.dump(fluxo, fh, ensure_ascii=False)
    print(f"\ngravado · carimbo {CARIMBO} (Brasília)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
