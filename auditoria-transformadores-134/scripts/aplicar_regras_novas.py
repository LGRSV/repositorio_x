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
HOJE = datetime.datetime.now(BRASILIA).date()
# Dois meses. Depois disso a obra não vem mais — e "retido" deixa de ser espera para virar
# promessa vazia. O número é decisão do dono, não medida: fica aqui à vista para ser mudado.
PRAZO_OBRA = 60
# A regra abaixo está escrita e desligada. Ela desfaz a exclusão quando o texto apenas PRESUME
# a causa ("ao que tudo indica foi furtado") e o campo a contradiz — ocorrência no próprio
# transformador dentro da janela mais material movimentado. Fica em interruptor porque devolver
# um caso ao indicador muda o número publicado, e essa escolha é do dono, não da régua. Ligar
# aqui é a única coisa necessária para aplicá-la.
DESFAZER_PRESUNCAO = False


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


import re
import unicodedata


def norm_txt(s):
    s = unicodedata.normalize("NFD", str(s or "").upper())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", s.replace("_x000D_", " "))


# ---------------------------------------------------------------- a leitura da terceira peneira
# Causas que tiram o caso do indicador MESMO com transformador movimentado na obra. O material
# prova que houve troca; ele não prova POR QUE. Furto tem trafo baixado — foi instalado um novo
# no lugar do que levaram. Continua não sendo queima de equipamento.
#
# A exigência é ser explícito. Cada padrão abaixo exige a palavra inteira, e os que já geraram
# falso positivo carregam guarda de contexto: "veículo" só conta perto de colisão, nunca perto
# de "acesso"; "remanejar" só conta quando não é a própria troca sendo descrita.
FORA_DO_INDICADOR = [
    ("furto", r"\b(FURT\w*|ROUB\w*|VANDALIS\w*)",
     "o texto declara furto, roubo ou vandalismo"),
    ("construcao", r"\b(OBRA DE CONSTRUCAO|CONSTRUCAO DE RE|DESATIVACAO|RETIRADA DEFINITIVA)",
     "o texto declara construção ou desativação"),
    ("auxiliar", r"\b(TRAFO|TRANSFORMADOR)\s+AUXILIAR|AUXILIAR\s+D[EO]\s*(RELIGADOR|REGULADOR)",
     "é transformador auxiliar de religador ou regulador, não unidade de distribuição"),
    ("divisao", r"\bDIVISAO DE CIRCUITO",
     "o texto declara divisão de circuito — é obra de capacidade, entra como preventivo"),
    ("particular", r"\b(PARTICULAR|PROPRIEDADE DO CLIENTE)",
     "o transformador é particular ou de terceiro"),
    # Abalroamento só existia como categoria gravada na SS. Quando o executante escreve o que
    # houve — "QUEIMADO NA RDU DE PALMAS. DEVIDO CAMINHÃO" — e a SS foi aberta como queimado,
    # ninguém lia. A palavra do veículo SOZINHA não pode disparar: das nove SS que citam
    # caminhão, caminhonete ou carreta fora de "acesso", oito falam de como chegar ao poste —
    # várias com o erro de digitação que fura a guarda ("ASSECO LIVRE PARA CAMINHÃO"), e uma é
    # o texto de segurança que manda parar o veículo na chuva. Por isso o padrão exige o
    # vínculo causal na mesma frase; sem ele, é paisagem.
    ("abalroamento", r"\bABALRO\w*|\bCOLIS\w*|\bCOLIDI\w*|"
                     r"(DEVIDO|POR CAUSA D\w+|ATINGID\w+ POR|BATIDA D\w+|DERRUBAD\w+ POR)\s+"
                     r"(UM |UMA |O |A )?(CAMINHAO|CAMINHONETE|CARRETA|ONIBUS|VEICULO|TRATOR|CARRO)",
     "o texto atribui o dano a colisão de veículo"),
]

# Sinais que NÃO excluem sozinhos, mas põem o caso sob suspeita e ficam visíveis na tela.
# "MEDIDO_" é só o cabeçalho do formulário da OS, aparece em 350 casos e não é causa nenhuma.
# Sobrecarga é causa legítima de queima — a Crítica tem "QUEIMADO POR SOBRECARGA" —, mas
# também aparece em troca por potência maior, que é obra de capacidade.
# A ordem importa: estes são PONTOS DE ATENÇÃO, não veredito. As regras de exclusão acima
# continuam soberanas — quando as duas coisas aparecem no mesmo caso, a exclusão manda. Um
# sinal aqui não tira ninguém do indicador; ele marca o caso para quem for conferir à mão.
SUSPEITAS = [
    ("sobrecarga", r"\bSOBRECARG\w*",
     "o texto cita sobrecarga: pode ser queima legítima ou troca por potência maior"),
    ("plano_de_medida", r"\bPLANO DE MEDIDA\b",
     "veio como plano de medida, que costuma descrever ação programada e não falha"),
    ("remanejamento", r"\bREMANEJ\w*",
     "o texto fala em remanejar, que pode ser a própria troca ou uma realocação de ativo"),
    ("medido", r"\bMEDIDO_",
     "a OS veio pelo formulário MEDIDO_, sem descrição própria do executante"),
    ("aumento_potencia", r"\bINSTALAR\s+TR-?\s*\d{2,3}\s*KVA",
     "o texto pede instalação de potência específica: possível reforço de capacidade"),
    # Reparo improvisado. São dois casos em 1.510 — "será feito reparo de cola e fita", "já foi
    # colado" —, poucos demais para virar regra e importantes demais para ficarem invisíveis.
    # Não excluem: um trafo remendado que depois vaza e é trocado ainda é troca de equipamento.
    # Marcam o histórico de manutenção do ativo, que é o que interessa a quem for conferir.
    # "TAP" ficou de fora de propósito: aparece em 682 casos e é sempre "POS. TAP : 03", campo
    # do formulário da OS descrevendo o equipamento — nunca causa.
    ("reparo_improvisado", r"\b(COLA|COLADO|COLAGEM|FITA|SILICONE|REMEND\w*)\b",
     "o texto relata reparo improvisado no ativo — cola, fita ou remendo"),
]


# Palavras que declaram FALHA DO EQUIPAMENTO. Servem de guarda para as duas categorias de
# não-falha abaixo: elas só valem quando o texto inteiro — SS e OS — não declara falha nenhuma.
# Sem essa guarda, "trocar o poste do trafo queimado" viraria obra de segurança, e "vazamento de
# óleo no comutador de tap" viraria ajuste de tape. Nos dois casos a falha está escrita.
FALHA_DECLARADA = (r"QUEIMAD\w*|VAZAMENT\w*|DANIFICAD\w*|AVARIAD\w*|DEFEIT\w*|SEM ENERGIA|"
                   r"NAO ESTA ATENDENDO|CURTO|ESTOURAD\w*|EXPLOD\w*|DETERIORAD\w*|BUCHA|"
                   r"SOBRECARG\w*|FALHA")

# Obra de POSTE em que o transformador vai junto. O poste é substituído — por abalroamento,
# trinca ou base danificada — e o transformador desce com ele. Não falhou: foi movido por
# necessidade estrutural. Das oito SS que pedem troca de poste, sete dizem também o que o
# transformador tinha; só uma pede o poste "e transformador", sem uma palavra sobre a condição
# do equipamento. É essa que sai.
SEGURANCA = r"SUBST\w* DE POSTE|SUBSTUI\w* DE POSTE|TROCA DE POSTE|\bPOSTE \d+/\d+"

# TAP como PROBLEMA, jamais como campo do formulário. "POS. TAP : 03" aparece em 627 das 1.510
# descrevendo o equipamento retirado e não é causa de nada — por isso o padrão nunca casa a
# palavra solta. O que casa é o tape ser o motivo: interno, dentro do óleo, impossível de
# ajustar em campo. Aí o transformador é trocado para regularizar tensão, não porque falhou.
TAPE = (r"TAP DENTRO DO OLEO|TAP INTERNO|MUDANCA DE TAP|MUDAR O? ?TAP|AJUSTE DE TAP|"
        r"ALTERAR O? ?TAP|TROCA DE TAP|COMUTADOR|TAP DANIFICAD\w*|TAP QUEBRAD\w*")


def julga_texto(r):
    """Devolve (motivo_de_exclusao_ou_None, lista_de_suspeitas)."""
    t = norm_txt(str(r.get("desc_ss", "")) + " || " + str(r.get("desc_os", "")))
    fora = None
    for chave, rx, explica in FORA_DO_INDICADOR:
        m = re.search(rx, t)
        if not m:
            continue
        janela = t[max(0, m.start() - 45):m.end() + 45]
        # guardas de contexto: o que fala de acesso ao local não fala de causa
        if re.search(r"ACESSO|CAMINH|ESTRADA|TRAFEG|CHEGA", janela) and chave not in ("furto", "abalroamento"):
            continue
        fora = (chave, explica)
        break
    # as duas categorias de não-falha entram por último e só na ausência de falha declarada
    if not fora and not re.search(FALHA_DECLARADA, t):
        if re.search(SEGURANCA, t):
            fora = ("seguranca", "a obra é de poste e o transformador desceu junto — "
                                 "movido por necessidade estrutural, não por ter falhado")
        elif re.search(TAPE, t):
            fora = ("tap", "o transformador foi trocado para regularizar tensão porque o tape é "
                           "interno e não pode ser ajustado em campo — não houve falha")
    susp = [(c, e) for c, rx, e in SUSPEITAS if re.search(rx, t)]
    return fora, susp


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
    """Uma entrada por ocorrência, com o vão do primeiro passo ao último.

    Devolve DOIS índices. O primeiro, `oc`, é o que a esteira usa: ocorrências cujo DEFEITO foi
    aberto num transformador, com esse transformador como chave. O segundo, `intr`, é marcador:
    ocorrências em que o transformador foi INTERROMPIDO mas o defeito estava noutro elemento —
    20.224 linhas apontam para a unidade consumidora, 347 para chave, 7 para disjuntor. Ele não
    casa ninguém e não move número nenhum; existe para a tela poder responder "onde estava o
    defeito quando este trafo ficou sem energia", que é pergunta diferente de "este trafo teve
    defeito".
    """
    arqs = sorted(glob.glob(f"{SCR}/crit_raw/Critica-CHEIO_*.txt")) + \
        [f"{UP}/0896088f-CriticaCHEIO_122025.txt"]
    oc, intr = {}, {}
    for p in arqs:
        with open(p, encoding="latin-1", newline="") as fh:
            rd = csv.reader(fh, delimiter=";", quoting=csv.QUOTE_NONE)
            head = [h.strip().replace("ABRANGENCIA", "ABRANGÊNCIA") for h in next(rd)]
            k = {n: i for i, n in enumerate(head)}
            for r in rd:
                if len(r) != len(head):
                    continue
                if r[k["COD_ELE_REDE_PROBLEMA"]].strip() != "TR":
                    # defeito fora do transformador: só entra no índice de marcador, e só
                    # quando o elemento que ficou sem energia é um transformador
                    if r[k["COD_ELE_REDE_INTERROMPIDO"]].strip() != "TR":
                        continue
                    ci = r[k["COD_ELE_INTERROMPIDO"]].strip()
                    ni = r[k["NUM_SEQ_OPER_INIC_HDE"]].strip()
                    if not ci or not ni:
                        continue
                    ai, af = parse(r[k["DTA_ABERT"]]), parse(r[k["DTA_FECH"]])
                    b = intr.get((ni, ci))
                    if b is None:
                        intr[(ni, ci)] = {
                            "oc": ni, "trafo": ci, "ini": ai, "fim": af,
                            "def_ele": r[k["COD_ELE_REDE_PROBLEMA"]].strip(),
                            "def_cod": r[k["COD_ELE_PROBLEMA"]].strip(),
                            "causa": r[k["DES_CAUSA_INTER_CAU"]].strip(),
                            "sub": r[k["DES_SUB_CAUSA_INTER_SCR"]].strip(),
                            "cons": numero(r[k["QTD_CONS_INTER_FAT"]]),
                        }
                    else:
                        b["cons"] += numero(r[k["QTD_CONS_INTER_FAT"]])
                        if ai and (not b["ini"] or ai < b["ini"]):
                            b["ini"] = ai
                        if af and (not b["fim"] or af > b["fim"]):
                            b["fim"] = af
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
    return oc, intr


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
    oc, intr = le_critica()
    at = le_tmae()
    por_at = collections.defaultdict(list)
    for a in at.values():
        por_at[a["trafo"]].append(a)
    print(f"TMAE: {len(at):,} atendimentos em transformador (dez/2025 + jan–jul/2026, janeiro completo)")
    por = collections.defaultdict(list)
    for o in oc.values():
        por[o["trafo"]].append(o)
    por_int = collections.defaultdict(list)
    for o in intr.values():
        por_int[o["trafo"]].append(o)
    print(f"Crítica: {len(intr):,} ocorrências que interromperam transformador com defeito "
          f"em outro elemento (marcador, não casa ninguém)")
    print(f"Crítica: {len(oc):,} ocorrências em transformador (dez/2025 + jan–jun/2026)")

    antes = collections.Counter(r["cascata"] for r in fluxo["registros"])

    # ---------- etapa 0: a exclusão, que acontece ANTES da esteira e fora dela
    # Exclusão não é peneira. Peneira pergunta se o caso se sustenta; exclusão diz que o caso
    # nunca foi deste indicador. Um furto é furto tenha ou não a Crítica registrado interrupção
    # naquela janela — a ausência de fato não muda a causa declarada, e a presença também não.
    #
    # Enquanto isso morava na terceira peneira, só era julgado quem passava da primeira. Vinte e
    # nove casos com causa declarada fora do indicador — 17 furtos, 3 abalroamentos, desativações,
    # trafo auxiliar, divisão de circuito — ficavam parados em "sem interrupção na janela",
    # aparecendo como pendência de revisão quando já tinham resposta. Agora saem antes de entrar.
    FORA_CAT = {"FURTADO", "ABALROAMENTO", "PREVENTIVO", "PARTICULAR", "TRAFO AUXILIAR",
                "CONSTRUCAO", "DESATIVACAO"}
    excluidas = collections.Counter()
    devolvidas = []
    for r in fluxo["registros"]:
        cat = str(r.get("categoria_texto") or "").strip().upper()
        texto_todo = norm_txt(str(r.get("desc_ss", "")) + " || " + str(r.get("desc_os", "")))
        fora_txt, susp = julga_texto(r)
        r["suspeitas"] = " · ".join(e for _, e in susp)
        r["sob_suspeita"] = "SIM" if susp else "NÃO"
        # a flag `expurgo` herdada NÃO entra aqui. Este script grava no mesmo arquivo que lê:
        # confiar na flag faria a exclusão de uma rodada virar premissa da seguinte, e o motivo
        # real ("duplicada", "furto") degradaria para "porque já estava marcado". Cada rodada
        # rejulga do texto e da categoria, que são o dado de origem.
        # SEM OS NÃO É CASO FRACO, É CASO SEM DOCUMENTO. Quando a ordem de serviço não tem
        # descrição nenhuma E a obra não chegou a ser gerada, não existe o que ler nem o que
        # conferir: sem obra não há consulta de material, e sem OS não há relato do executante.
        # A interrupção pode até estar lá — e nos dois casos está —, mas afirmar "queimado" ou
        # "avariado" a partir só do fato seria a leitura criando o que o campo não escreveu.
        # Sai do indicador como investigável, não como falha comprovada.
        sem_documento = (not str(r.get("desc_os") or "").strip()
                         and not str(r.get("obra") or "").strip())
        # SEM OBRA DEPOIS DE 60 DIAS. Sem obra não há consulta de material, e sem material a
        # troca não se comprova — é por isso que todos estes já estavam retidos por falta de
        # prova. A diferença é que "retido" promete que a prova ainda pode chegar, e depois de
        # dois meses ela não chega mais: a obra teria sido gerada. Deixá-los na fila de
        # pendências é prometer uma resposta que o sistema já não vai dar. Os que ainda estão
        # dentro do prazo continuam retidos, porque neles a promessa é legítima.
        dias_ss = None
        _ab = parse(r.get("abertura"))
        if _ab:
            dias_ss = (HOJE - _ab.date()).days
        sem_obra_vencida = (not str(r.get("obra") or "").strip()
                            and dias_ss is not None and dias_ss > PRAZO_OBRA)
        if sem_obra_vencida and not sem_documento and not (fora_txt or cat in FORA_CAT):
            excluidas["sem_obra"] += 1
            r.update({
                "fora_da_esteira": "SIM", "cascata": "EXCLUÍDA", "decisao": "EXCLUIR",
                "expurgo": "SIM", "expurgo_gatilho": "sem_obra", "chega_e1": "NÃO",
                "exclusao_porque": (f"a obra nunca foi gerada e a SS foi aberta há {dias_ss} dias — "
                                    f"passado o prazo de {PRAZO_OBRA} dias não há mais consulta de "
                                    "material para confirmar a troca"),
                "cascata_motivo": (f"Fora do indicador: obra não gerada há {dias_ss} dias — a prova "
                                   "de material não vai mais chegar."),
                "confirmado": "", "chega_e2": "NÃO", "chega_e3": "NÃO",
                "e1_status": "—", "e2_status": "—", "e3_status": "—", "e4_status": "—",
                "e1_conflito": "", "e1_sinais": "", "e4_alertas": "",
                "ressalvas": "", "ressalvas_graves": "", "ressalvas_medias": "",
                "disputa_perdida": "NÃO", "deslocamento": "",
            })
            continue
        if sem_documento and not (fora_txt or cat in FORA_CAT):
            excluidas["sem_os"] += 1
            r.update({
                "fora_da_esteira": "SIM", "cascata": "EXCLUÍDA", "decisao": "EXCLUIR",
                "expurgo": "SIM", "expurgo_gatilho": "sem_os", "chega_e1": "NÃO",
                "exclusao_porque": ("a OS não tem descrição e a obra não foi gerada — não há "
                                    "relato do executante nem consulta de material para "
                                    "confirmar a troca; o caso é investigável, não confirmável"),
                "cascata_motivo": ("Fora do indicador: a OS não tem descrição e a obra não foi "
                                   "gerada — não há o que ler nem o que conferir."),
                "confirmado": "", "chega_e2": "NÃO", "chega_e3": "NÃO",
                "e1_status": "—", "e2_status": "—", "e3_status": "—", "e4_status": "—",
                "e1_conflito": "", "e1_sinais": "", "e4_alertas": "",
                "ressalvas": "", "ressalvas_graves": "", "ressalvas_medias": "",
                "disputa_perdida": "NÃO", "deslocamento": "",
            })
            continue
        # A CATEGORIA HERDADA NÃO VENCE O TEXTO. `categoria_texto` vem do classificador da
        # auditoria anterior, e ele marcava ABALROAMENTO quando a palavra "poste" aparecia —
        # foi esse defeito que já devolveu treze casos uma vez. Ele voltou por outra porta:
        # a exclusão por categoria não olhava o texto. Três casos saíam como dano de terceiro
        # dizendo "TRAFO QUEIMADO" e "VAZAMENTO DE ÓLEO" com todas as letras. Agora, quando o
        # rótulo herdado não tem apoio no texto E o texto declara falha do próprio
        # transformador, o rótulo perde: o que está escrito vale mais que o que foi carimbado.
        if not fora_txt and cat in FORA_CAT:
            # o texto declara falha do próprio equipamento?
            pelo_texto = bool(re.search(r"TRAFO QUEIMAD\w*|TRANSFORMADOR QUEIMAD\w*|"
                                        r"QUEIMAD\w* \d{6,}|VAZAMENTO DE OLEO", texto_todo))
            # ou o CAMPO declara? A Crítica ou o TMAE dizendo causa TRANSFORMADOR com subcausa
            # de falha é fato consumado, e fato consumado não perde para carimbo antigo. Três
            # dos oito "preventivos" tinham o atendimento declarando queima por descarga
            # atmosférica ou vazamento de óleo no próprio transformador.
            campo = " ".join(str(r.get(k) or "") for k in ("oc_causa", "oc_sub", "at_causa", "at_sub")).upper()
            pelo_campo = ("TRANSFORMADOR" in campo
                          and re.search(r"QUEIMAD|VAZAMENTO|TANQUE|FALHA BUCHA", campo))
            # O CAMPO TAMBÉM PODE CONFIRMAR A EXCLUSÃO, e aí o rótulo não cai. A Crítica
            # declarando CAUSADA POR TERCEIROS / VANDALISMO é fato consumado no mesmo grau: um
            # caso saía como abalroamento, o texto dizia "trafo queimado" — que descreve o
            # estado, não a causa — e eu o devolvi ao indicador contra o que o campo declarava.
            campo_confirma = bool(re.search(r"CAUSADA POR TERCEIROS|VANDALIS|ROUBO|FURTO", campo))
            if (pelo_texto or pelo_campo) and not campo_confirma:
                fonte = ("o texto declara falha do próprio transformador" if pelo_texto
                         else "o campo declara o transformador como elemento com defeito")
                # E A CAUSA TEM DE SER REDERIVADA. Derrubar o rótulo e manter categoria_texto
                # deixou FURTADO, ABALROAMENTO e PREVENTIVO como causa confirmada DENTRO do
                # indicador de queima — seis casos. O rótulo que cai leva junto a causa que ele
                # afirmava; quem responde no lugar dela é a prova que o derrubou.
                if re.search(r"VAZAMENTO|TANQUE", campo) or "VAZAMENTO DE OLEO" in texto_todo:
                    nova = "AVARIADO"
                elif re.search(r"QUEIMAD", campo) or re.search(
                        r"TRAFO QUEIMAD|TRANSFORMADOR QUEIMAD|QUEIMAD\w* \d{6,}", texto_todo):
                    nova = "QUEIMADO"
                elif "FALHA BUCHA" in campo:
                    nova = "QUEIMADO"
                else:
                    nova = "AVARIADO"
                r["categoria_herdada_vencida"] = (
                    f"A categoria {cat.lower()} veio do classificador anterior e nada a "
                    f"sustenta — {fonte}. O rótulo perdeu, e a causa passou a ser "
                    f"{nova.lower()}, que é o que a prova que o derrubou declara.")
                r["categoria_texto"] = nova
                r["fora_da_esteira"] = "NÃO"
                continue
            if campo_confirma and (pelo_texto or pelo_campo):
                r["exclusao_confirmada_pelo_campo"] = (
                    f"O texto descreve falha do equipamento, mas o campo declara \"{campo.strip()}\" "
                    "— causa fora do indicador. O campo é fato consumado: a exclusão fica.")
        if not (fora_txt or cat in FORA_CAT):
            r["fora_da_esteira"] = "NÃO"
            continue
        gatilho, porque = (fora_txt if fora_txt else
                           (cat.lower(), f"a SS está gravada no sistema como {cat.lower()}"))
        # o mesmo motivo chega por dois caminhos com dois nomes — pelo texto ("furto") e pela
        # categoria gravada ("furtado"). Na tela isso viraria dois filtros para a mesma coisa.
        gatilho = {"furtado": "furto", "trafo auxiliar": "auxiliar"}.get(gatilho, gatilho)
        # PRESUNÇÃO NÃO É CONSTATAÇÃO. "Possivelmente furtado", "ao que tudo indica o mesmo foi
        # furtado", "sinais de vandalismo", "tentativa de furto" — nesses a equipe supôs a partir
        # do que viu, não constatou. Continuam fora do indicador, porque quem decide isso é o
        # dono e não a régua; mas ficam marcados, porque uma suposição arquivada como fato é
        # exatamente o tipo de coisa que ninguém revisa depois.
        pass  # texto_todo já calculado acima
        if re.search(r"POSSIVELMENTE|AO QUE TUDO INDICA|PROVAVELMENTE|SINAIS DE |TENTATIVA DE |"
                     r"SUSPEITA DE ", texto_todo):
            r["exclusao_presumida"] = "SIM"
            porque = porque + " — mas o texto presume, não constata"
            # E QUANDO O CAMPO CONTRADIZ A PRESUNÇÃO, o campo ganha. É a regra da casa: o campo
            # é fato consumado, o texto é declaração — e aqui o texto nem declara, supõe. Quando
            # a Crítica registra o defeito NESTE transformador dentro da janela E a obra registra
            # transformador movimentado, a suposição não se sustenta: não se retira o que foi
            # levado. A exclusão é desfeita e o caso volta a descer as peneiras como qualquer
            # outro — voltar não é entrar, ele ainda tem de passar por todas.
            _ab = parse(r.get("abertura"))
            _cod = str(r.get("trafo") or "").strip()
            tem_oc = any((b := borda(_ab, o)) is not None and b <= JANELA
                         for o in por.get(_cod, []))
            if DESFAZER_PRESUNCAO and tem_oc and float(r.get("trafos_material") or 0) > 0:
                devolvidas.append(r["ss"])
                r.update({"fora_da_esteira": "NÃO", "exclusao_presumida": "DEVOLVIDA",
                          "expurgo": "NÃO", "expurgo_gatilho": "", "exclusao_porque": "",
                          "presuncao_desfeita": (
                              f"O texto presumia {gatilho}, mas não constatava. A Crítica registra "
                              "o defeito neste transformador dentro da janela e a obra registra "
                              "transformador movimentado: não se retira o que foi levado. A "
                              "exclusão foi desfeita e o caso voltou a descer as peneiras.")})
                continue
        else:
            r["exclusao_presumida"] = "NÃO"
        if gatilho == "construcao" and "DESATIVA" in norm_txt(str(r.get("desc_ss", ""))):
            gatilho, porque = "desativacao", "o texto declara desativação do posto de transformação"
        excluidas[gatilho] += 1
        r.update({
            "fora_da_esteira": "SIM", "cascata": "EXCLUÍDA", "decisao": "EXCLUIR",
            "expurgo": "SIM", "expurgo_gatilho": gatilho,
            "exclusao_porque": porque,
            "cascata_motivo": f"Fora do indicador: {porque}.",
            # a exclusão não passa por peneira nenhuma — os campos da esteira ficam vazios
            "confirmado": "", "chega_e1": "NÃO", "chega_e2": "NÃO", "chega_e3": "NÃO",
            "e1_status": "—", "e2_status": "—", "e3_status": "—", "e4_status": "—",
            "e1_conflito": "", "e1_sinais": "", "e4_alertas": "",
            "ressalvas": "", "ressalvas_graves": "", "ressalvas_medias": "",
            "disputa_perdida": "NÃO", "deslocamento": "",
        })
    print(f"  exclusões antes da esteira: {sum(excluidas.values())} — {dict(excluidas)}")
    if devolvidas:
        print(f"  presunções desfeitas pelo campo, devolvidas à esteira: {len(devolvidas)} — "
              + ", ".join(devolvidas))

    for r in fluxo["registros"]:
        if r.get("fora_da_esteira") == "SIM":
            continue
        r["chega_e1"] = "SIM"
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

        # ---------- marcador: onde estava o defeito quando este trafo ficou sem energia
        # Não decide nada. A esteira continua casando pelo defeito no próprio transformador;
        # isto responde a outra pergunta, e responde para os dois lados: para quem casou, diz
        # que o defeito era no ativo; para quem não casou, diz se houve interrupção na janela
        # com o defeito noutro elemento — unidade consumidora, chave, disjuntor.
        cand_int = [o for o in por_int.get(cod, [])
                    if (b := borda(ab, o)) is not None and b <= JANELA]
        vizinho_int = min(cand_int, key=lambda x: borda(ab, x)) if cand_int else None
        if melhor:
            r.update({"def_elemento": "TR", "def_ele_oc": None, "def_ele_causa": None,
                      "def_ele_sub": None, "def_ele_cod": None})
        elif vizinho_int:
            r.update({"def_elemento": vizinho_int["def_ele"], "def_ele_oc": vizinho_int["oc"],
                      "def_ele_causa": vizinho_int["causa"], "def_ele_sub": vizinho_int["sub"],
                      "def_ele_cod": vizinho_int["def_cod"]})
        else:
            r.update({"def_elemento": "", "def_ele_oc": None, "def_ele_causa": None,
                      "def_ele_sub": None, "def_ele_cod": None})

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
            # A ocorrência gravada aqui era de uma rodada antiga do funil — 29 casos retidos
            # por "sem interrupção" continuavam exibindo um oc_num, e 17 deles com elemento de
            # defeito UC ou CH, que o leitor de hoje nem indexa. O dossiê dizia "não há registro"
            # no texto e mostrava um número no campo. Reescreve com o que a busca de agora achou:
            # a ocorrência mais próxima no código do ativo, marcada como fora da janela.
            todas = por.get(cod, [])
            perto = min(todas, key=lambda x: borda(ab, x)) if (todas and ab) else None
            r.update({
                "oc_num": perto["oc"] if perto else None,
                "oc_ini": f"{perto['ini']:%Y-%m-%d %H:%M}" if perto and perto["ini"] else None,
                "oc_fim": f"{perto['fim']:%Y-%m-%d %H:%M}" if perto and perto["fim"] else None,
                "oc_dur_h": round((perto["fim"] - perto["ini"]).total_seconds() / 3600, 2)
                if perto and perto["ini"] and perto["fim"] else None,
                "oc_cons": int(perto["cons"]) if perto else None,
                "oc_causa": perto["causa"] if perto else None,
                "oc_sub": perto["sub"] if perto else None,
                "oc_tipo": perto["tipo"] if perto else None,
                "oc_passos": perto["passos"] if perto else None,
                "oc_prob_ele": "TR" if perto else None,
                "oc_papel": "defeito no próprio trafo" if perto else None,
                "oc_dist_h": round(borda(ab, perto) / 3600, 2) if perto else None,
                "oc_fora_janela": "SIM" if perto else "",
                "e1_delta_h": None, "e1_nivel": "FORA" if perto else "SEM",
            })
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
                # duplicada também sai da esteira: não é caso pendente de análise, é o mesmo
                # evento contado duas vezes. Deixá-la parada numa etapa da cascata suja a
                # contagem — quem lê vê uma pendência onde já existe resposta.
                "fora_da_esteira": "SIM", "cascata": "EXCLUÍDA", "chega_e1": "NÃO",
                "expurgo": "SIM", "expurgo_gatilho": "duplicada",
                "exclusao_porque": (f"divide o mesmo evento e o mesmo transformador com {vencedor['ss']} — "
                                    "a interrupção prova uma troca, não duas"),
                "cascata_motivo": ("Fora do indicador: divide o mesmo evento e o mesmo transformador com "
                                   f"{vencedor['ss']} — a interrupção prova uma troca, não duas."),
                "decisao": "EXCLUIR", "confirmado": "",
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

        # A causa já foi julgada na etapa 0, antes da esteira: quem tinha causa fora do
        # indicador nem chegou aqui. O que resta para a terceira peneira é a pergunta que
        # ela sempre foi — a obra comprova que um transformador foi movimentado?
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

    # ---------- a queima do para-raio não é a queima do transformador
    # "TRAFO: 5700005195 VAZAMENTO DE ÓLEO ... PARA RAIO: QUEIMADO" foi lido como queimado
    # porque a palavra aparece no texto. Ela aparece descrevendo OUTRO equipamento. O que o
    # transformador tem, escrito na mesma linha, é vazamento — avaria. São quatro casos com
    # essa forma exata: a única menção a queima é do para-raio e o trafo vaza. Não muda o
    # total, muda de que lado ele conta, e é a diferença entre queima e avaria que o indicador
    # separa.
    PARA_RAIO = (r"PARA[- ]?RAIO\w*\s*:?\s*(E\s+)?QUEIMAD\w*|PARA[- ]?RAIO\w*\s+QUEIMAD\w*|"
                 r"E PARA[- ]?RAIO\w* QUEIMAD\w*")
    corrigidos = 0
    for r in fluxo["registros"]:
        if str(r.get("categoria_texto") or "").upper() != "QUEIMADO":
            continue
        t = norm_txt(str(r.get("desc_ss", "")) + " || " + str(r.get("desc_os", "")))
        if not re.search(r"VAZAMENT\w*", t):
            continue
        if re.search(r"QUEIMAD\w*", re.sub(PARA_RAIO, " ", t)):
            continue
        corrigidos += 1
        r["categoria_texto"] = "AVARIADO"
        r["regra_leitura"] = "R6-AVARIA-PARARAIO"
        r["leitura_pararaio"] = ("A única menção a queima no texto é do para-raio; o que o "
                                 "transformador tem é vazamento de óleo. Lido como avaria.")
        if r.get("confirmado") == "QUEIMADO":
            r["confirmado"] = "AVARIADO"
    marcados = sum(1 for r in fluxo["registros"] if r.get("leitura_pararaio"))
    print(f"  queima do para-raio relida como avaria do trafo: {marcados} "
          f"({corrigidos} mudaram nesta rodada)")

    # ---------- a ocorrência mostrada fora da janela pode não ser sobre o transformador
    # Quando o caso não casou e o dossiê exibe a ocorrência mais próxima só como referência, essa
    # ocorrência ainda parece prova para quem lê rápido. Se a nota de campo dela descreve trabalho
    # em conexão, cabo, medidor ou disjuntor e não cita transformador nenhum, ela não explica
    # coisa alguma sobre este ativo — e dizer isso em voz alta é melhor do que deixar o número
    # da ocorrência sugerindo o contrário. Restrito a quem está fora da janela: dentro dela, a
    # nota omitir a palavra "trafo" é rotina e não significa nada (858 casos, 762 na saída).
    OUTRO_EQUIP = r"CONEXO\w*|CONEXAO|CABO\w*|MEDIDOR|DISJUNTOR|BORNE\w*|REAPERT\w*|ENCABECAMENTO|JUMPER"
    fora_assunto = 0
    for r in fluxo["registros"]:
        if r.get("oc_fora_janela") != "SIM":
            r["oc_outro_assunto"] = "NÃO"
            continue
        obs = norm_txt(str(r.get("oc_obs") or "") + " " + str(r.get("at_obs") or ""))
        if re.search(OUTRO_EQUIP, obs) and not re.search(r"TRAFO|TRANSFORMADOR", obs):
            r["oc_outro_assunto"] = "SIM"
            fora_assunto += 1
        else:
            r["oc_outro_assunto"] = "NÃO"
    print(f"  ocorrência fora da janela cuja nota de campo é de outro equipamento: {fora_assunto}")

    # ---------- o que a OBRA diz que é: a terceira leitura, que estava no dado e ninguém lia
    # O cadastro de obras traz um campo Descricao — "SUBST. TRAFO QUEIMADO", "SUBST. TRAFO
    # VAZANDO ÓLEO", "FURTO DE BENS TRAFO" — preenchido por quem abriu a obra, depois da
    # execução. Ele vinha no dossiê dentro do bloco de detalhe e nunca foi cruzado com nada.
    # É a terceira voz independente do caso: a SS diz o que pediu, a OS diz o que executou, a
    # obra diz sob que rótulo o custo entrou. Quando a obra e a leitura discordam, isso não
    # decide nada sozinho — mas é exatamente o tipo de divergência que ninguém deveria
    # descobrir na reunião.
    #
    # E o dicionário de SIGCO deixa de ser palpite: agrupando as 1.479 obras por número de
    # projeto, cada código mostra para que serve. 8812 é SUBST. TRAFO QUEIMADO em 98% das
    # obras; 61993 é FURTO DE BENS TRAFO em 85%; 20497 é DANO(S) CAUSADO POR TERCEIROS em
    # 100%; 8444, que aparece uma vez só, é SUBST. TRAFO VAZANDO ÓLEO.
    def limpa_desc(x):
        x = re.sub(r"\s*-\s*(TR:?\s*)?\d{6,}.*$", "", str(x or "").strip())
        return re.sub(r"\s*-\s*ID:.*$", "", x).strip().upper()

    # o rótulo que a obra dá ao caso, reduzido à causa que ele afirma
    OBRA_CAUSA = {
        "SUBST. TRAFO QUEIMADO": "QUEIMADO",
        "SUBST. TRAFO AVARIADO": "AVARIADO",
        "SUBST. TRAFO VAZANDO ÓLEO": "AVARIADO",
        "SUBST. TRAFO COM SOBRECARGA": "SOBRECARGA",
        "FURTO DE BENS TRAFO": "FURTADO",
        "FURTO DE BENS (MATERIAIS DIVERSOS)": "FURTADO",
        "DANO(S) CAUSADO POR TERCEIROS": "ABALROAMENTO",
        "POSTE DANIFICADO": "POSTE",
        "DESATIVAÇÃO DE TRAFO": "DESATIVACAO",
        "SUBST. CHAVE FUSÍVEL": "OUTRO EQUIPAMENTO",
        "MANUTENÇÃO CORRETIVA": "",
    }
    sigco_obras = collections.defaultdict(collections.Counter)
    for r in fluxo["registros"]:
        des = limpa_desc((r.get("det_obra") or {}).get("Descricao"))
        r["obra_descricao"] = des
        r["obra_causa"] = OBRA_CAUSA.get(des, "")
        sig = str(r.get("sigco") or "").strip()
        if sig and des:
            sigco_obras[sig][des] += 1
    dic = {}
    for sig, cc in sigco_obras.items():
        top, n = cc.most_common(1)[0]
        dic[sig] = {"descricao": top, "obras": sum(cc.values()),
                    "pureza": round(100 * n / sum(cc.values()))}
    fluxo["sigco"] = dic
    print(f"  dicionário de SIGCO construído das obras: {len(dic)} códigos")

    # divergência entre o que a obra afirma e o que a leitura concluiu — bandeira, não veredito
    div = 0
    for r in fluxo["registros"]:
        oc_, lc = r.get("obra_causa"), str(r.get("categoria_texto") or "").upper()
        # sobrecarga não diverge de queima: "QUEIMADO POR SOBRECARGA" é subcausa da própria
        # Crítica, e a obra dizer sobrecarga é dizer por que queimou, não que não queimou
        if not oc_ or not lc or oc_ == lc or (oc_ == "SOBRECARGA" and lc in ("QUEIMADO", "AVARIADO")):
            r["obra_diverge"] = "NÃO"
            continue
        r["obra_diverge"] = "SIM"
        r["obra_diverge_texto"] = (f"A obra foi aberta como \"{r['obra_descricao']}\" e a leitura "
                                   f"do texto concluiu {lc.lower()}. Quem abriu a obra escreveu "
                                   "isso depois da execução — é a terceira voz do caso, e ela "
                                   "não bate com a segunda.")
        div += 1
    print(f"  obras cujo rótulo diverge da leitura: {div}")

    # ---------- de quem é cada regra de exclusão
    # O contador "excluídas por você" na tela só sabia contar o que o dono marca no navegador, e
    # por isso mostrava zero — quando na verdade TODAS as categorias de exclusão existem porque
    # ele pediu, e várias nasceram de um caso que ele apontou nome por nome. Autoria não é
    # detalhe numa auditoria: quem defende o número na reunião precisa poder dizer de onde veio
    # cada corte, e "a régua decidiu" é resposta pior que "eu decidi, e eis o caso que me
    # convenceu".
    ORIGEM = {
        "furto": ("o dono pediu que furto excluísse mesmo com trafo movimentado", ""),
        "construcao": ("o dono pediu que construção excluísse", ""),
        "auxiliar": ("o dono pediu que auxiliar de religador ou regulador excluísse",
                     "ETO-RD-DP 00093/2026, ETO-RD-PS 00094/2026, ETO-RD-AR 00576/2026"),
        "divisao": ("o dono definiu que divisão de circuito entra como preventivo", ""),
        "particular": ("o dono pediu categoria própria para transformador particular",
                       "DOLP-RD-PA 00492/2026"),
        "abalroamento": ("o dono apontou uma queima atribuída a caminhão que estava na saída",
                         "DOLP-RD-PA 00264/2026"),
        "desativacao": ("o dono apontou duas desativações que estavam como pendência",
                        "DOLP-RD-PA 00652/2026, ENC-RD-PS 00508/2026"),
        "sem_os": ("o dono definiu que sem OS não se afirma queima nem avaria",
                   "DOLP-RD-PA 00348/2026, ETO-RD-DP 00233/2026"),
        "sem_obra": ("o dono definiu que obra não gerada há mais de 60 dias não se defende",
                     "DOLP-RD-PA 00096/2026"),
        "seguranca": ("o dono pediu categoria de segurança para obra de poste",
                      "ETO-RD-GU 00685/2026"),
        "tap": ("o dono pediu categoria de tape interno", "ETO-RD-AG 00214/2026"),
        "preventivo": ("categoria herdada da auditoria anterior, mantida pelo dono", ""),
        "duplicada": ("o dono pediu que a SS duplicada saísse da esteira em vez de ficar parada",
                      ""),
    }
    for r in fluxo["registros"]:
        g = str(r.get("expurgo_gatilho") or "")
        quem, caso = ORIGEM.get(g, ("", ""))
        r["exclusao_origem"] = quem
        r["exclusao_caso_origem"] = caso
        r["exclusao_pedida_pelo_dono"] = "SIM" if quem.startswith("o dono") else "NÃO"
    pedidas = sum(1 for r in fluxo["registros"] if r.get("exclusao_pedida_pelo_dono") == "SIM")
    print(f"  exclusões que existem porque o dono pediu a regra: {pedidas} de "
          f"{sum(1 for r in fluxo['registros'] if r.get('fora_da_esteira') == 'SIM')}")

    # ---------- SIGCO divergente, agora com dicionário em vez de palpite
    # A regra antiga conhecia um código só, o 8812, e por isso acusava um caso em 1.510. Com o
    # dicionário construído das obras ela sabe o que cada projeto significa e pode comparar: o
    # custo entrou num projeto que pressupõe uma causa, e a leitura concluiu outra. Não muda a
    # causa nem tira ninguém do indicador — diz para onde o dinheiro foi, que é outra pergunta
    # e tem outro dono.
    sig_div = 0
    for r in fluxo["registros"]:
        sig = str(r.get("sigco") or "").strip()
        info = dic.get(sig)
        lc = str(r.get("categoria_texto") or "").upper()
        r["sigco_descricao"] = info["descricao"] if info else ""
        r["sigco_pureza"] = info["pureza"] if info else None
        esperado = OBRA_CAUSA.get(info["descricao"], "") if info else ""
        # só acusa quando o projeto é dedicado de verdade: abaixo de 60% de pureza ele mistura
        # causas e não pressupõe nada
        if (not esperado or not lc or esperado == lc or not info or info["pureza"] < 60
                or (esperado == "SOBRECARGA" and lc in ("QUEIMADO", "AVARIADO"))):
            r["sigco_diverge"] = "NÃO"
            continue
        r["sigco_diverge"] = "SIM"
        r["sigco_diverge_texto"] = (
            f"O custo entrou no projeto SIGCO {sig}, que em {info['pureza']}% das "
            f"{info['obras']} obras é \"{info['descricao']}\". A leitura deste caso concluiu "
            f"{lc.lower()}. É divergência de enquadramento contábil, não de causa técnica.")
        sig_div += 1
    print(f"  SIGCO divergente da leitura (com dicionário): {sig_div}")

    # ---------- a obra e o SIGCO discordam entre si
    # Este é o sinal mais limpo do acervo, porque não depende de leitura nenhuma: são dois campos
    # do próprio cadastro se contradizendo. A obra foi aberta como "SUBST. TRAFO AVARIADO" e o
    # custo entrou no projeto de sobrecarga; ou a obra diz vazamento e o projeto diz queima.
    # Quem escreveu os dois foi a mesma casa, depois da execução. Não muda a causa técnica —
    # mostra que o enquadramento contábil não seguiu o que a própria obra declarou.
    interno = 0
    for r in fluxo["registros"]:
        des, sig = r.get("obra_descricao"), str(r.get("sigco") or "").strip()
        info = dic.get(sig)
        if not des or not info or info["pureza"] < 60 or info["descricao"] == des:
            r["obra_sigco_discordam"] = "NÃO"
            continue
        r["obra_sigco_discordam"] = "SIM"
        r["obra_sigco_texto"] = (
            f"A obra foi aberta como \"{des}\" e o custo entrou no projeto SIGCO {sig}, que em "
            f"{info['pureza']}% das {info['obras']} obras é \"{info['descricao']}\". São dois "
            "campos do mesmo cadastro discordando — nenhuma leitura nossa está envolvida.")
        interno += 1
    print(f"  obra e SIGCO discordam entre si: {interno}")

    # ---------- avaria enquadrada no projeto de queima
    # O SIGCO 8812 é o projeto de transformador queimado. Quando a leitura conclui avaria e a
    # obra foi enquadrada ali, o custo foi para o projeto errado — não muda a causa, muda para
    # onde o dinheiro foi. Fica como bandeira, não como veredito.
    bandeiras = 0
    for r in fluxo["registros"]:
        if (str(r.get("categoria_texto") or "").upper() == "AVARIADO"
                and str(r.get("sigco") or "").strip() == "8812"):
            r["sigco_avaria_em_queima"] = "SIM"
            bandeiras += 1
        else:
            r["sigco_avaria_em_queima"] = "NÃO"
    print(f"  avarias enquadradas no SIGCO 8812 (projeto de queima): {bandeiras}")

    # ---------- os avisos de lacuna envelheceram: as duas lacunas foram fechadas
    # O texto gravado em lacuna_base dizia "a base de interrupção só começa em 01/01/2026" e
    # "o arquivo de atendimento não tem registro entre 26 e 31 de janeiro". As duas frases
    # eram verdade quando foram escritas e deixaram de ser: dezembro/2025 e o janeiro completo
    # entraram no acervo. Deixar o aviso antigo na tela é pior do que não ter aviso — ele manda
    # o leitor desconfiar de um número que agora tem prova. O carimbo fica, dizendo o que a
    # busca encontrou depois que o arquivo chegou.
    for r in fluxo["registros"]:
        if r.get("borda_2025") == "SIM":
            r["lacuna_base"] = (
                "A janela de 24 horas desta SS retrocede para dezembro de 2025 — e dezembro "
                "agora está no acervo. " + ("A ocorrência foi encontrada lá."
                                            if r.get("oc_num") else
                                            "Mesmo assim não há ocorrência no código do ativo."))
        if r.get("tmae_gap_jan") == "SIM":
            r["lacuna_base"] = (
                "SS aberta entre 26 e 31 de janeiro, o trecho que faltava no TMAE — e o mês "
                "completo agora está no acervo. " + ("O atendimento foi encontrado."
                                                     if r.get("at_num") else
                                                     "Mesmo assim não há atendimento no código do ativo."))

    # ---------- a narrativa era de outra rodada e contradizia o próprio cabeçalho
    # 472 dossiês de 1.510 traziam um parágrafo dizendo "o caso ficou retido já na primeira
    # peneira" enquanto o cabeçalho ao lado dizia INCLUIR, ou o contrário. O texto foi escrito
    # por um funil anterior e nunca foi regerado — e um parágrafo bem escrito afirmando o
    # oposto da decisão é pior que parágrafo nenhum, porque ele convence.
    #
    # O conserto não tenta reescrever a narrativa inteira: corta as frases que AFIRMAM
    # desfecho — as que falam de peneira, de matriz, de casamento fraco — e recompõe a
    # conclusão a partir do estado de agora. O que a narrativa diz sobre o que cada base
    # registra continua, porque isso não mudou.
    # Qualquer frase que AFIRME desfecho sai. A segunda peneira, em especial, não retém mais
    # ninguém — toda frase que diz "ficou retido na segunda" é vencida por definição.
    VENCIDAS = re.compile(
        r"(ficou retido|peneira|A decisão final da matriz|Eis a contradição|"
        r"Contradição possível|é a ocorrência mais próxima no código do trafo, mas|"
        r"casamento fraco|nem a interrupção nem o atendimento sustentam|"
        r"deslocamento confirmado|atendimento fora da janela ou do elemento esperado|"
        # a própria conclusão que este bloco escreve: sem isto ela se acumula a cada rodada,
        # porque o script grava no mesmo arquivo que lê
        r"^A causa confirmada é|^Motivo da exclusão:|^Campo, texto e material convergem|"
        r"^Saiu antes da esteira|^Parou na (primeira|terceira|quarta)|^Passou pelas quatro)", re.I)
    MOTIVO_FINAL = {
        "SAÍDA": "Passou pelas quatro peneiras e está no indicador",
        "EXCLUÍDA": "Saiu antes da esteira, pela porta de exclusão",
        "RETIDO — SEM INTERRUPÇÃO NA JANELA": "Parou na primeira peneira: não há interrupção "
                                              "nem atendimento na janela de 24 horas",
        "RETIDO — SEM PROVA DE TROCA": "Parou na terceira peneira: a obra não comprova "
                                       "movimentação de transformador",
        "RETIDO — RESSALVA DA INTERRUPÇÃO": "Parou na quarta peneira: a interrupção existe, "
                                            "mas traz sinal que a enfraquece",
    }
    reescritas = 0
    for r in fluxo["registros"]:
        # Guarda a narrativa original uma vez e SEMPRE reconstrói a partir dela. Sem isso, o
        # script — que grava no arquivo que lê — anexava uma conclusão nova a cada rodada por
        # cima da anterior, e o dossiê ia acumulando parágrafos idênticos.
        if not r.get("narrativa_base"):
            r["narrativa_base"] = str(r.get("narrativa") or "").strip()
        nar = str(r.get("narrativa_base") or "").strip()
        if not nar:
            continue
        frases = [f.strip() for f in re.split(r"(?<=\.)\s+", nar) if f.strip()]
        limpas = [f for f in frases if not VENCIDAS.search(f)]
        if len(limpas) == len(frases) and r["cascata"] in nar:
            continue
        cab = MOTIVO_FINAL.get(r["cascata"], r["cascata"])
        mot = str(r.get("cascata_motivo") or "").strip()
        if mot and not mot.endswith("."):
            mot += "."
        fim = f"{cab}. {mot}".strip()
        if r.get("confirmado"):
            fim += f" A causa confirmada é {str(r['confirmado']).lower()}."
        if r.get("exclusao_porque"):
            fim += f" Motivo da exclusão: {r['exclusao_porque']}."
        r["narrativa"] = " ".join(limpas + [fim])
        r["narrativa_regerada"] = CARIMBO
        reescritas += 1
    print(f"  narrativas com conclusão vencida, recompostas do estado de agora: {reescritas}")

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
        "expurgos": sum(1 for r in R if r.get("fora_da_esteira") == "SIM"),
        "gatilhoExclusao": dict(collections.Counter(
            r.get("expurgo_gatilho") for r in R if r.get("fora_da_esteira") == "SIM")),
        "entramNaEsteira": sum(1 for r in R if r.get("fora_da_esteira") != "SIM"),
        "duplicadas": sum(1 for r in R if r.get("expurgo_gatilho") == "duplicada"),
        "e2SemAtendimento": sum(1 for r in R if r.get("deslocamento") == "SEM REGISTRO"),
        "e2SemDeslocamento": 0,
    })
    fluxo["meta"]["regra"] = (
        "A exclusão vem antes da esteira e fora dela: quem tem causa declarada fora do indicador "
        "— furto, abalroamento, construção, desativação, trafo auxiliar, divisão de circuito, "
        "particular — ou divide o evento com outra SS não entra, tenha ou não interrupção na "
        "janela. Quem entra encara a primeira peneira, que pergunta pelo fato: o código do "
        "transformador tem ocorrência na Crítica dentro de 24 horas, medidas contra o intervalo "
        "inteiro da ocorrência — do primeiro passo aberto ao último fechado. O atendimento do "
        "TMAE não retém ninguém: é marcador.")
    with open(FLUXO, "w", encoding="utf-8") as fh:
        json.dump(fluxo, fh, ensure_ascii=False)
    print(f"\ngravado · carimbo {CARIMBO} (Brasília)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
