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
# tolerância para trás: a SS costuma nascer minutos antes do registro formal da ocorrência
ANTES = 1 * 3600
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
    # REMANEJAMENTO era só marcador de suspeita, porque "remanejar" às vezes descreve a própria
    # troca. Mas os 13 casos da base dizem todos a mesma coisa, e nenhum é falha: "remanejar
    # trafo de 5 kVA por trafo de 15 kVA", "remanejar trafo de 25 kVA por trafo de 15 kVA",
    # "foi retirado e remanejado trafo do poste X para o poste Y". Trocar potência ou mudar de
    # poste é decisão de operação — o equipamento saiu porque decidiram, não porque falhou.
    # O padrão exige o verbo COLADO no equipamento, para não pegar "remanejamento" solto.
    # FALTA DE FASE INTERNA sob plano de medida. O transformador perdeu uma fase por dentro —
    # é defeito do equipamento —, mas o que a OS executa é um plano de medida com aumento de
    # potência: 75 para 112,5 kVA. O dono leu como preventivo e pediu a categoria com o nome do
    # que o campo descreveu, não do que a obra pagou. As duas coisas cabem: o defeito existiu, e
    # a troca foi decidida como capacidade.
    ("falta_fase", r"FALTA D[EA] FASE|FALTANDO FASE|SEM (UMA )?FASE INTERN|FASE INTERNA",
     "o texto declara falta de fase interna, e a troca foi executada como plano de medida com "
     "aumento de potência — o defeito existiu, mas a decisão foi de capacidade"),
    ("remanejamento", r"\bREMANEJ\w*\s+(DE\s+)?(TRAFO|TRANSFORMADOR)|"
                      r"(TRAFO|TRANSFORMADOR)\s+\w{0,12}\s*REMANEJAD\w*|"
                      r"^(MEDIDO_\s*)?(EMERGENCIAL_\s*)?REMANEJ",
     "o texto declara remanejamento: troca de potência ou mudança de poste, não falha"),
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
        r"ALTERAR O? ?TAP|TROCA DE TAP|COMUTADOR|TAP DANIFICAD\w*|TAP QUEBRAD\w*|"
        # "não está aumentando tensão mesmo alterando o TAP" — o transformador não falhou: ele
        # não dá conta da tensão pedida, e mexer no tape não resolveu. É problema de nível de
        # tensão, que se corrige com outro equipamento, não com reposição por falha.
        r"ALTERANDO O? ?TAP|MESMO (COM|ALTERANDO|MUDANDO) O? ?TAP|TAP NO MAXIMO|"
        r"TENSAO BAIXA[^.|]{0,60}TAP|TAP[^.|]{0,60}TENSAO BAIXA")


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
    # TAP FORTE vence até uma falha declarada, e a diferença com o TAP fraco é o que o texto
    # descreve. "Trafo queimado, aproveitar e mudar o tape" é queima com um pedido a mais — o
    # guard existe para isso. Mas "problemas de tensão baixa, não está aumentando tensão mesmo
    # alterando o TAP" descreve o SINTOMA e o teste que a equipe fez: o transformador não dá
    # conta da tensão pedida e mexer no tape não resolveu. Aí "avariado" é o rótulo de quem
    # abriu a SS, não o que o campo encontrou. Nível de tensão se corrige com outro equipamento,
    # não com reposição por falha.
    TAPE_FORTE = (r"TENSAO BAIXA[^.|]{0,80}TAP|TAP[^.|]{0,80}TENSAO BAIXA|"
                  r"(NAO|SEM)[^.|]{0,40}AUMENT\w*[^.|]{0,40}TENSAO[^.|]{0,60}TAP|"
                  r"MESMO (COM|ALTERANDO|MUDANDO|MEXENDO N)O? ?TAP")
    if not fora and re.search(TAPE_FORTE, t):
        fora = ("tap", "o texto descreve tensão baixa que não sobe nem mexendo no tape — o "
                       "transformador não dá conta da tensão pedida, e isso é nível de tensão, "
                       "não falha do equipamento")

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
    # Todo código de ativo que aparece na Crítica em QUALQUER papel — defeito, interrompido ou
    # manobrado. Serve para uma pergunta só, e é a que o dono fez: este transformador existe na
    # base de interrupção? Ausente daqui é ausente de verdade; o resto é questão de data ou de
    # qual elemento tinha o defeito, que são perguntas diferentes e merecem resposta diferente.
    vistos = set()
    for p in arqs:
        with open(p, encoding="latin-1", newline="") as fh:
            rd = csv.reader(fh, delimiter=";", quoting=csv.QUOTE_NONE)
            head = [h.strip().replace("ABRANGENCIA", "ABRANGÊNCIA") for h in next(rd)]
            k = {n: i for i, n in enumerate(head)}
            for r in rd:
                if len(r) != len(head):
                    continue
                for _c in ("COD_ELE_PROBLEMA", "COD_ELE_INTERROMPIDO", "COD_ELE_FECHADO"):
                    _v = r[k[_c]].strip()
                    if _v:
                        vistos.add(_v)
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
                        # Cada linha da Crítica é UM passo de manobra: um elemento aberto numa
                        # hora, fechado noutra. O resumo (min das aberturas, max dos fechos)
                        # apaga o meio do caminho, e é justamente o meio que conta a história —
                        # qual chave atuou primeiro, quando o transformador entrou, quando a
                        # última manobra devolveu energia. Guardado inteiro para a tela poder
                        # abrir a ocorrência passo a passo.
                        "detalhe": [{
                            "ini": r[k["DTA_ABERT"]].strip(), "fim": r[k["DTA_FECH"]].strip(),
                            "def": r[k["COD_ELE_PROBLEMA"]].strip(),
                            "int": r[k["COD_ELE_INTERROMPIDO"]].strip(),
                            "int_t": r[k["COD_ELE_REDE_INTERROMPIDO"]].strip(),
                            "fec": r[k["COD_ELE_FECHADO"]].strip(),
                            "fec_t": r[k["COD_ELE_REDE_FECHADO"]].strip(),
                            "cons": r[k["QTD_CONS_INTER_FAT"]].strip(),
                        }],
                    }
                else:
                    a["passos"] += 1
                    a["cons"] += numero(r[k["QTD_CONS_INTER_FAT"]])
                    a["detalhe"].append({
                        "ini": r[k["DTA_ABERT"]].strip(), "fim": r[k["DTA_FECH"]].strip(),
                        "def": r[k["COD_ELE_PROBLEMA"]].strip(),
                        "int": r[k["COD_ELE_INTERROMPIDO"]].strip(),
                        "int_t": r[k["COD_ELE_REDE_INTERROMPIDO"]].strip(),
                        "fec": r[k["COD_ELE_FECHADO"]].strip(),
                        "fec_t": r[k["COD_ELE_REDE_FECHADO"]].strip(),
                        "cons": r[k["QTD_CONS_INTER_FAT"]].strip(),
                    })
                    # o vão é do primeiro passo ao último: mínimo das aberturas, máximo dos fechos
                    if ini and (not a["ini"] or ini < a["ini"]):
                        a["ini"] = ini
                    if fim and (not a["fim"] or fim > a["fim"]):
                        a["fim"] = fim
    # ---------- e o mesmo acervo indexado só pela OCORRÊNCIA
    # O índice de cima é por (ocorrência, elemento com defeito) — foi assim que a esteira nasceu,
    # porque ela casa pelo defeito no próprio transformador. Só que isso PARTE a ocorrência: quem
    # abre um caso vê apenas os passos cujo defeito é do mesmo código, e some do dossiê tudo que
    # aconteceu no mesmo evento com defeito noutro elemento — inclusive os outros transformadores
    # que ficaram sem energia junto. O dono viu e cobrou: "quando eu clico na ocorrência associada
    # ao ativo não está aparecendo todos os transformadores".
    passos_oc = {}
    for (n, _cod), a in oc.items():
        alvo = passos_oc.setdefault(n, [])
        alvo.extend(a["detalhe"])
    for n, lst in passos_oc.items():
        lst.sort(key=lambda x: parse(x["ini"]) or datetime.datetime.min)
    return oc, intr, vistos, passos_oc


def borda(ab, o):
    """Distância da abertura da SS até a janela válida da ocorrência.

    A JANELA NÃO É SIMÉTRICA, e a assimetria é medida, não estética.

    Para frente ela é larga: a ocorrência pode fechar e a SS nascer depois, porque a troca é
    consequência do evento. Valem 24 horas depois do último passo.

    Para trás ela é curta. Se a SS abriu muito antes de a ocorrência começar, não é a mesma
    história. Mas não pode ser zero, porque a ordem normal do campo é o cliente ligar, a SS
    nascer, e a ocorrência ser registrada minutos depois: em 47 casos da saída a SS antecede o
    registro em menos de um quarto de hora, e em 60 em menos de uma hora. Uma hora de
    tolerância para trás cobre a antecipação do registro sem admitir quem abriu a SS num dia e
    teve o evento no outro — que era o que a tolerância antiga de 24 horas deixava passar.
    """
    if not ab or not o["ini"]:
        return None
    fim = o["fim"] or o["ini"]
    if o["ini"] <= ab <= fim:
        return 0.0
    return (ab - fim).total_seconds() if ab > fim else (o["ini"] - ab).total_seconds()


# Ligada por decisão dele: "se não tem interrupção registrada de verdade deveria ir direto
# para exclusão". Um atendimento herdado de rodada antiga não prova nada se a data dele não
# cabe na janela — havia atendimento de 11 de junho sustentando SS de 3 de janeiro. Desligar
# volta ao número velho, e o que muda são 51 casos.
AT_HERDADO_SO_NA_JANELA = os.environ.get("AT_HERDADO_SO_NA_JANELA", "1") == "1"


def contida_na_ss(ab, tm, o):
    """A ocorrência do próprio transformador cabe INTEIRA dentro do intervalo da SS?

    Régua que não depende da janela e que nasceu de uma pergunta do dono sobre um caso em que a
    SS abriu antes do apagão. A ordem que a janela assume — evento, depois SS — não é a única do
    campo: um trafo vazando óleo continua energizado, e ninguém fica sem luz até alguém desligar
    para trocar. Nesses, a SS nasce primeiro e o desligamento é o serviço.

    Quando a ocorrência começa depois de a SS abrir E termina antes de ela fechar, ela aconteceu
    durante o atendimento desta SS. Isso é mais forte que distância: é contenção.
    """
    if not ab or not tm or not o["ini"]:
        return False
    fim = o["fim"] or o["ini"]
    return ab <= o["ini"] and fim <= tm


def dentro(ab, o):
    """A SS cai na janela válida desta ocorrência?

    Separado de borda() de propósito: borda mede DISTÂNCIA e é o que a tela mostra; isto decide
    ADMISSÃO e é o que a esteira usa. Enquanto eram a mesma função, mudar a forma da distância
    não mudava a régua — a assimetria existia no cálculo e não no veredito.
    """
    if not ab or not o["ini"]:
        return False
    fim = o["fim"] or o["ini"]
    return (o["ini"] - datetime.timedelta(seconds=ANTES)) <= ab <= (fim + datetime.timedelta(seconds=JANELA))


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
    oc, intr, vistos, passos_oc = le_critica()
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

    # ---------- o texto da OS estava cortado em 300 caracteres
    # 688 das 1.510 descrições de OS tinham exatamente 300 caracteres — corte de uma etapa
    # anterior, não da base. E o corte cai no FIM, que é onde a OS põe o desfecho: as medições
    # depois da troca, o número de série do equipamento instalado, e quem autorizou o serviço.
    # O caso que revelou isso terminava em "AUTORIZADA PELO" e o nome ficava do outro lado da
    # tesoura. O arquivo original tem o texto inteiro, até 3.061 caracteres, e casa nas 1.510
    # pelo número da SS. Texto truncado não é texto: a leitura decide sobre o que consegue ler.
    restaurados = 0
    orig = os.path.join(RAIZ, "public", "bases", "originais", "Original_OS.xlsx")
    if os.path.exists(orig):
        import openpyxl
        wb = openpyxl.load_workbook(orig, read_only=True, data_only=True)
        ws = wb["BASE SS_OS"]
        it = ws.iter_rows(values_only=True)
        cab = [str(h) for h in next(it)]
        col = {h: i for i, h in enumerate(cab)}

        def _limpa(v):
            return re.sub(r"\s+", " ", str(v or "").replace("_x000D_", " ")).strip()

        inteiro = {}
        for linha in it:
            _ss = _limpa(linha[col["NUMERO_SS"]])
            if _ss:
                inteiro[_ss] = (_limpa(linha[col["DESCRIPTION_SS"]]),
                                _limpa(linha[col["DESCRICAO_OS"]]))
        for r in fluxo["registros"]:
            par = inteiro.get(r["ss"])
            if not par:
                continue
            for campo, novo in (("desc_ss", par[0]), ("desc_os", par[1])):
                velho = str(r.get(campo) or "")
                # Comparar tamanho cru é errado e me custou duas rodadas: o texto do arquivo
                # original guarda o espaçamento do formulário — quatro espaços entre campos —
                # e a limpeza colapsa isso. Um texto COMPLETO de 240 caracteres limpos perde
                # para um CORTADO de 300 com o espaçamento intacto, e a restauração recusava
                # exatamente os casos que precisava consertar. Compara-se o conteúdo, não a
                # quantidade de espaço em branco. E 300 exatos é assinatura de corte: nesses,
                # o original entra sempre que exista.
                cortado = len(velho) == 300
                if cortado or len(novo) > len(re.sub(r"\s+", " ", velho).strip()):
                    if novo and novo != velho:
                        r[campo] = novo
                        restaurados += 1
        wb.close()
    print(f"  descrições restauradas do arquivo original (estavam cortadas): {restaurados}")

    # ---------- a vírgula da potência foi comida na importação
    # 112,5 kVA virou 1125 em 64 registros, e 37,5 virou 375 em um. São os dois únicos valores
    # fora da tabela de potências de distribuição (5, 10, 15, 25, 30, 45, 75, 112,5, 150) — não
    # existe transformador de poste de 1.125 kVA. O erro é do import, não da base, e aparecia
    # escrito na narrativa: "trocando a potência de 75 kVA para 1125 kVA".
    DECIMAL = {"1125": "112,5", "375": "37,5", "2250": "225", "225.0": "225"}
    trocadas = 0
    for r in fluxo["registros"]:
        for campo in ("pot_ret", "pot_inst"):
            v = str(r.get(campo) or "").strip()
            if v in DECIMAL:
                r[campo] = DECIMAL[v]
                trocadas += 1
        det = r.get("det_ss")
        if isinstance(det, dict):
            for campo in ("Potencia Inst", "Potencia Ret"):
                v = str(det.get(campo) or "").strip()
                if v in DECIMAL:
                    det[campo] = DECIMAL[v]
    print(f"  potências com a vírgula recuperada: {trocadas}")

    antes = collections.Counter(r["cascata"] for r in fluxo["registros"])

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
        # FALTA DE DOCUMENTO NÃO APAGA FATO. Esta era a falha mais grave da régua, e um revisor
        # externo a resumiu numa frase: ela convertia "não consigo provar a troca" em "a falha
        # não conta". Em 16 das 22 exclusões documentais a Crítica registra causa TRANSFORMADOR
        # com subcausa de falha — em onze delas a distância da janela é ZERO, e o TMAE quase
        # sempre confirma. O campo é fato consumado; a obra que não existe não desfaz o que duas
        # bases independentes registraram. O que ela desfaz é a PROVA DA TROCA, e essa pergunta
        # é da terceira peneira, não da porta de exclusão. Estes casos voltam à esteira e param
        # lá, com o rótulo honesto: o fato existe, a troca não se comprova.
        _campo = " ".join(str(r.get(k) or "") for k in ("oc_causa", "oc_sub", "at_causa", "at_sub")).upper()
        _dist = r.get("oc_dist_h")
        campo_tem_falha = ("TRANSFORMADOR" in _campo
                           and re.search(r"QUEIMAD|VAZAMENTO|TANQUE|FALHA BUCHA", _campo)
                           and isinstance(_dist, (int, float)) and abs(_dist) <= 24)
        if campo_tem_falha and (sem_documento or sem_obra_vencida):
            r["documento_nao_apaga_fato"] = (
                "A obra não foi gerada, ou a OS não tem descrição — mas a base de interrupção "
                f"registra {r.get('oc_causa')} / {r.get('oc_sub')} neste transformador dentro da "
                "janela. Falta de documento não desfaz fato registrado: o caso volta à esteira e "
                "para na peneira do material, que é onde a pergunta sobre a troca mora.")
            # MAS SÓ QUANDO HÁ O QUE SALVAR. O fato registrado prova o EVENTO; ele não prova a
            # TROCA, e é a troca que a terceira peneira pergunta. Quando a obra nunca foi gerada
            # e nenhum transformador aparece no material, não há prova de troca em lugar nenhum —
            # e devolver o caso à esteira só o faz parar uma peneira adiante, com o rótulo
            # errado. O dono definiu isso três vezes, nomeando três casos; esta regra nasceu de
            # uma revisão interna e estava atropelando a dele sem que ninguém tivesse decidido.
            if float(r.get("trafos_material") or 0) > 0:
                sem_documento = False
                sem_obra_vencida = False
            else:
                r["documento_nao_apaga_fato"] = (
                    r["documento_nao_apaga_fato"] + " A obra, porém, não movimentou "
                    "transformador nenhum: o fato do campo sustenta o evento, não a troca. Sem "
                    "prova de troca em documento algum, o caso sai — voltar só o faria parar uma "
                    "peneira adiante com o rótulo errado.")

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
            # "TRAFO 5710235032 QUEIMADO" é a forma mais comum de escrita nestas SS, e o
            # padrão antigo não a pegava: exigia a palavra colada. O código do ativo no meio
            # fazia a guarda falhar justamente onde ela mais precisava funcionar.
            pelo_texto = bool(re.search(
                r"(TRAFO|TRANSFORMADOR|TR)\s*:?\s*\d{6,}\s*\w*\s*QUEIMAD|"
                r"TRAFO QUEIMAD\w*|TRANSFORMADOR QUEIMAD\w*|QUEIMAD\w*\s+\d{6,}|"
                r"VAZAMENTO DE OLEO", texto_todo))
            # escopo não cai por queima: auxiliar de religador e particular continuam fora do
            # indicador mesmo queimando, porque não são unidade de distribuição
            if cat in ("TRAFO AUXILIAR", "PARTICULAR"):
                pelo_texto = False
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
            # A OBRA TAMBÉM É CAMPO. Três revisores independentes apontaram o mesmo caso —
            # ETO-RD-GU 00007 — que o dono já tinha mandado devolver: a SS pede troca sem dizer
            # por quê, a OS registra 150 kVA por 150 kVA (não há ganho de capacidade que faça
            # obra preventiva), e a obra E o projeto SIGCO dizem "SUBST. TRAFO QUEIMADO". A
            # regra não o devolvia porque só lia causa e subcausa da Crítica e do TMAE. O
            # cadastro de obras é preenchido depois da execução por quem executou: quando ele e
            # o projeto contábil concordam entre si e contradizem um rótulo herdado que nada no
            # texto sustenta, o rótulo perde também.
            _od = str(r.get("obra_descricao") or "").upper()
            _sd = str((dic.get(str(r.get("sigco") or "").strip()) or {}).get("descricao") or "").upper()
            obra_diz_falha = (_od == _sd and re.search(r"QUEIMAD|AVARIAD|VAZANDO", _od) is not None)
            if (pelo_texto or pelo_campo or obra_diz_falha) and not campo_confirma:
                fonte = ("o texto declara falha do próprio transformador" if pelo_texto
                         else "o campo declara o transformador como elemento com defeito" if pelo_campo
                         else f"a obra foi aberta como \"{_od}\" e o projeto SIGCO é o mesmo — "
                              "dois registros do cadastro, preenchidos depois da execução, "
                              "concordando entre si contra o rótulo")
                # E A CAUSA TEM DE SER REDERIVADA. Derrubar o rótulo e manter categoria_texto
                # deixou FURTADO, ABALROAMENTO e PREVENTIVO como causa confirmada DENTRO do
                # indicador de queima — seis casos. O rótulo que cai leva junto a causa que ele
                # afirmava; quem responde no lugar dela é a prova que o derrubou.
                if re.search(r"VAZAMENTO|TANQUE", campo) or "VAZAMENTO DE OLEO" in texto_todo:
                    nova = "AVARIADO"
                elif obra_diz_falha:
                    # quando quem derrubou o rótulo foi o cadastro de obras, é ele que diz a
                    # causa — e não o palpite de reserva do fim da escada
                    nova = "AVARIADO" if re.search(r"AVARIAD|VAZANDO", _od) else "QUEIMADO"
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
        # O CAMPO VALE CONTRA A EXCLUSÃO PELO TEXTO TAMBÉM. Um revisor externo achou o furo: o
        # bloco que faz o campo vencer só rodava quando a exclusão vinha do rótulo herdado.
        # Quando vinha do TEXTO — furto, construção —, o campo nunca era consultado, e oito
        # casos saíam com a Crítica declarando TRANSFORMADOR com subcausa de falha a distância
        # zero da janela. Não se constata vazamento de óleo num transformador que foi levado.
        #
        # Mas a distinção que faltava é outra: nem toda exclusão é alegação de CAUSA. Auxiliar
        # de religador e transformador particular saem por ESCOPO — não são unidade de
        # distribuição, e queimar não os torna elegíveis. SS duplicada sai por CONTAGEM — o
        # campo declarar queima não desfaz o evento ter sido contado duas vezes. Só as exclusões
        # que afirmam uma causa podem ser derrubadas por outra causa declarada no campo.
        CAUSAIS = {"furto", "abalroamento", "construcao", "desativacao", "preventivo",
                   "divisao", "tap", "seguranca"}
        if fora_txt and fora_txt[0] in CAUSAIS:
            _c = " ".join(str(r.get(k) or "") for k in ("oc_causa", "oc_sub", "at_causa", "at_sub")).upper()
            _dh = r.get("oc_dist_h")
            if ("TRANSFORMADOR" in _c
                    and re.search(r"QUEIMAD|VAZAMENTO|TANQUE|FALHA BUCHA", _c)
                    and isinstance(_dh, (int, float)) and abs(_dh) <= 24):
                # e a causa vai junto: derrubar a alegação e manter categoria_texto foi o
                # erro que deixou FURTADO como causa confirmada dentro do indicador
                nova = ("AVARIADO" if re.search(r"VAZAMENTO|TANQUE", _c) else "QUEIMADO")
                r["texto_vencido_pelo_campo"] = (
                    f"O texto alegava {fora_txt[0]}, mas a base de interrupção declara "
                    f"{r.get('oc_causa')} / {r.get('oc_sub')} neste transformador a "
                    f"{abs(_dh):.1f}h da janela. O campo é fato consumado e a alegação do texto "
                    f"não o sobrepõe: a exclusão caiu, o caso voltou à esteira e a causa passou "
                    f"a ser {nova.lower()}.")
                r["categoria_texto"] = nova
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
            tem_oc = any(dentro(_ab, o) for o in por.get(_cod, []))
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
        tm = parse(r.get("termino"))
        jan = [o for o in por.get(cod, []) if dentro(ab, o) or contida_na_ss(ab, tm, o)]
        r["oc_contida_na_ss"] = "SIM" if any(
            contida_na_ss(ab, tm, o) and not dentro(ab, o) for o in por.get(cod, [])) else "NÃO"
        melhor = min(jan, key=lambda x: borda(ab, x)) if jan else None
        # o atendimento é reprocurado no TMAE completo, não herdado do campo antigo
        cand_at = [a for a in por_at.get(cod, []) if dentro(ab, a)]
        melhor_at = min(cand_at, key=lambda x: borda(ab, x)) if cand_at else None
        # A busca nova é mais estreita que o campo at_num herdado: uma correção anterior
        # recuperou 23 casos procurando pelo NÚMERO DA OCORRÊNCIA quando a chave do TMAE
        # gravou outro equipamento ("CODIGO INVALIDO" no texto). Descartar o campo herdado
        # jogaria esse trabalho fora — então ele vale como segunda via.
        # ...mas a segunda via só vale se a data dela também couber na janela. Sem esta
        # conferência, um atendimento de 11 de junho sustentava uma SS de 3 de janeiro: o campo
        # herdado entrava como fato sem que ninguém olhasse a data, e o dossiê exibia a equipe
        # de cinco meses depois embaixo de "o TMAE registra equipe no transformador na janela".
        _at_ini_h = parse(r.get("at_ini"))
        _at_fim_h = parse(r.get("at_fim")) or _at_ini_h
        _na_janela_h = dentro(ab, {"ini": _at_ini_h, "fim": _at_fim_h})
        # A correção está escrita e desligada. Ligá-la tira 52 casos da SAÍDA — de 1.269 para
        # 1.217 — e esse número vai a conselho: não é mudança para se fazer calada. Enquanto o
        # dono não decidir, o caso continua onde está e o dossiê passa a dizer que o
        # atendimento é de fora da janela, em vez de exibi-lo como se fosse prova.
        herdado = bool(str(r.get("at_num") or "").strip()) and (
            _na_janela_h or not AT_HERDADO_SO_NA_JANELA)
        if str(r.get("at_num") or "").strip() and not melhor_at and not _na_janela_h:
            # o campo continua visível no dossiê, mas rotulado pelo que ele é: fora da janela
            r["at_fora_da_janela"] = "SIM"
        else:
            r["at_fora_da_janela"] = "NÃO"
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
        cand_int = [o for o in por_int.get(cod, []) if dentro(ab, o)]
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
                "oc_detalhe": sorted(melhor.get("detalhe", []), key=lambda x: parse(x["ini"]) or datetime.datetime.min),
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
                "oc_detalhe": sorted(perto.get("detalhe", []), key=lambda x: parse(x["ini"]) or datetime.datetime.min) if perto else [],
                "oc_fora_janela": "SIM" if perto else "",
                # A SS aberta ANTES da ocorrência é um caso com nome próprio, não um "sem
                # interrupção" qualquer: o evento existe, o transformador é o mesmo, e a
                # solicitação apenas antecede o registro formal. Passou a cair aqui quando a
                # tolerância para trás encolheu de 24 horas para uma. Merece rótulo, porque a
                # pergunta que ela levanta é outra — não é "houve evento?", é "o registro
                # atrasou ou é outro evento?".
                "aberta_antes": ("SIM" if perto and perto["ini"] and ab and ab < perto["ini"]
                                 else "NÃO"),
                "aberta_antes_h": (round((perto["ini"] - ab).total_seconds() / 3600, 1)
                                   if perto and perto["ini"] and ab and ab < perto["ini"] else None),
                "e1_delta_h": None, "e1_nivel": "FORA" if perto else "SEM",
            })
            r.update({"e1_status": "RETIDO", "chega_e2": "NÃO", "chega_e3": "NÃO", "fato": "F3",
                      "fato_texto": "Sem fato — nem a Crítica nem o TMAE registram nada na janela",
                      "cascata": "RETIDO — SEM INTERRUPÇÃO NA JANELA",
                      "cascata_motivo": "O código do transformador não tem ocorrência na Crítica nem atendimento no TMAE dentro da janela",
                      # AUSENTE não é o mesmo que FORA DA JANELA, e tratar os dois como uma
                      # coisa só foi o que fez o dono pedir a conferência. Dos 115 retidos aqui,
                      # 47 não existem na Crítica em papel nenhum — nem como defeito, nem como
                      # interrompido, nem como manobrado. Esses saem do indicador: a base de
                      # interrupção simplesmente não conhece o ativo. Os outros 68 aparecem, e
                      # para eles a pergunta é outra — data errada, ou defeito de outro elemento.
                      "na_critica": "NÃO" if cod not in vistos else "SIM",
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
        # SÓ FALTA O SIAGO. Há uma diferença que a peneira tratava como uma coisa só: a obra
        # que NUNCA FOI GERADA e a obra que EXISTE mas não está no export de material. Na
        # primeira não há o que conferir; na segunda há, e o que falta é a extração chegar. São
        # 25 casos com obra aberta, número e descrição — e o material simplesmente fora do
        # arquivo que temos. Chamar isso de "sem prova" é dizer que a prova não existe, quando o
        # que não existe é o nosso acesso a ela.
        tem_obra = bool(str(r.get("obra") or "").strip())
        r["pendente_siago"] = ("SIM" if (tem_obra and r.get("material_conferido") != "SIM"
                                         and float(r.get("trafos_material") or 0) <= 0) else "NÃO")
        if float(r.get("trafos_material") or 0) <= 0:
            r.update({"e3_status": "RETIDO", "cascata": "RETIDO — SEM PROVA DE TROCA",
                      "cascata_motivo": (
                          f"A obra {r.get('obra')} existe, com descrição e enquadramento, mas não "
                          "está no export de material que temos — não é ausência de prova, é "
                          "ausência da extração. Basta o SIAGO para fechar."
                          if r.get("pendente_siago") == "SIM"
                          else r.get("e3_motivo") or "A obra não comprova movimentação de transformador"),
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

    # ---------- quem foi devolvido pelo cadastro de obras herda a causa que ELE declara
    # Passe corretivo, e ele existe por um motivo chato: este script grava no arquivo que lê.
    # Quando o rótulo herdado cai, categoria_texto é reescrita — e na rodada seguinte o ramo que
    # a reescreveu não dispara mais, porque a categoria já não é de exclusão. Se a primeira
    # rodada errou a causa, o erro fossiliza. Este passe não depende de ramo nenhum: se o
    # cadastro de obras foi quem derrubou o rótulo, é o cadastro que diz a causa, sempre.
    for r in fluxo["registros"]:
        nota = str(r.get("categoria_herdada_vencida") or "")
        if "cadastro" not in nota:
            continue
        od = str(r.get("obra_descricao") or "").upper()
        if not re.search(r"QUEIMAD|AVARIAD|VAZANDO", od):
            continue
        certa = "AVARIADO" if re.search(r"AVARIAD|VAZANDO", od) else "QUEIMADO"
        if r.get("categoria_texto") != certa:
            r["categoria_texto"] = certa
            if r.get("confirmado"):
                r["confirmado"] = certa

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

    # ---------- o ativo que não existe em base nenhuma na janela
    # Regra do dono: sem ocorrência na Crítica E sem atendimento no TMAE, o caso não é deste
    # indicador. Ela vale — mas só onde nada mais foi encontrado. Dos 96 retidos na primeira
    # peneira, 89 têm ocorrência no mesmo alimentador ou localidade dentro da janela, e em 52
    # deles a evidência aponta código operativo trocado: ali o fato provavelmente existe sob
    # outro número, e excluir seria descartar prova por erro de digitação alheio. Sobram 7 em
    # que a busca por vizinhança não achou absolutamente nada. Nesses o silêncio é resposta,
    # ainda mais agora que o acervo tem dezembro/2025, janeiro inteiro e julho.
    sem_nada = 0
    for r in fluxo["registros"]:
        if (r.get("cascata") != "RETIDO — SEM INTERRUPÇÃO NA JANELA"
                or not str(r.get("vizinho") or "").startswith("Nada")):
            continue
        sem_nada += 1
        r.update({
            "fora_da_esteira": "SIM", "cascata": "EXCLUÍDA", "decisao": "EXCLUIR",
            "expurgo": "SIM", "expurgo_gatilho": "sem_fato", "chega_e1": "NÃO",
            "exclusao_porque": ("o código do transformador não aparece na Crítica nem no TMAE "
                                "dentro da janela, e a busca por vizinhança não achou ocorrência "
                                "no alimentador, na localidade nem em código parecido — não há "
                                "fato para sustentar o evento"),
            "cascata_motivo": ("Fora do indicador: nenhuma base registra nada neste ativo na "
                               "janela, e nem o teste do vizinho achou explicação."),
            "confirmado": "", "chega_e2": "NÃO", "chega_e3": "NÃO",
            "e1_status": "—", "e2_status": "—", "e3_status": "—", "e4_status": "—",
            "e1_conflito": "", "e1_sinais": "", "e4_alertas": "",
            "ressalvas": "", "ressalvas_graves": "", "ressalvas_medias": "",
            "disputa_perdida": "NÃO", "deslocamento": "",
        })
    print(f"  ativos sem fato em base nenhuma, nem no vizinho, excluídos: {sem_nada}")

    # ---------- "sem rastro" deixa de ser categoria própria: ele mandou somar com "ausente"
    # A ordem dele: "some esses sem rastro com ausente, é a mesma coisa correto". É a mesma coisa
    # para a maioria — quem não aparece na Crítica em papel nenhum é ausente, tenha ou não
    # atendimento e vizinho. Mas NÃO para todos: conferido na base crua, dois desses casos têm
    # defeito aberto no próprio transformador, em data que não cabe na janela. Esses não são
    # ausentes; são fora da janela, e é para lá que vão. Somar os dois no balde de ausente seria
    # escrever no relatório uma frase que a base derruba em dez segundos.
    COM_DEFEITO_EM_OUTRA_DATA = {"DOLP-RD-PA 00122/2026", "ENC-RD-PS 00601/2026"}
    somados = movidos = 0
    for r in fluxo["registros"]:
        if str(r.get("expurgo_gatilho") or "") != "sem_fato":
            continue
        if str(r.get("ss") or "") in COM_DEFEITO_EM_OUTRA_DATA:
            r["expurgo_gatilho"] = "fora_da_janela"
            r["exclusao_porque"] = ("a Crítica registra defeito aberto neste transformador, mas em "
                                    "data que não cabe na janela desta SS")
            r["cascata_motivo"] = f"Fora do indicador: {r['exclusao_porque']}."
            movidos += 1
        else:
            r["expurgo_gatilho"] = "sem_interrupcao"
            r["exclusao_porque"] = ("o código não aparece na Crítica em papel nenhum — nem com "
                                    "defeito, nem interrompido, nem manobrado — nos sete meses do "
                                    "acervo; nem o teste do vizinho achou explicação")
            r["cascata_motivo"] = f"Fora do indicador: {r['exclusao_porque']}."
            somados += 1
    print(f"  “sem rastro” somado a “ausente”: {somados} · movidos para fora da janela: {movidos}")


    # ---------- de quem é cada regra de exclusão
    # O contador "excluídas por você" na tela só sabia contar o que o dono marca no navegador, e
    # por isso mostrava zero — quando na verdade TODAS as categorias de exclusão existem porque
    # ele pediu, e várias nasceram de um caso que ele apontou nome por nome. Autoria não é
    # detalhe numa auditoria: quem defende o número na reunião precisa poder dizer de onde veio
    # cada corte, e "a régua decidiu" é resposta pior que "eu decidi, e eis o caso que me
    # convenceu".
    # ------------------------------------------------------------------ o martelo do dono
    # Casos em que ele leu o dossiê inteiro e disse o que era, contra o que a regra tinha
    # decidido. Ficam aqui, um a um, com a frase dele — e não viram regra: generalizar a partir
    # de um caso foi exatamente o erro que ele já apanhou uma vez ("esse claramente é queimado
    # só está no SIGCO incorreto"). Um caso julgado é um caso julgado, não uma família.
    VEREDITO_DONO = {
        "ETO-RD-GR 00279/2026": (
            "INCLUIR", "QUEIMADO", "",
            "o dono martelou queimado e mandou marcar o zero: “queimado e classifica com zero "
            "clientes interrompidos”. A Crítica registra a ocorrência 20264137433112 com defeito "
            "no próprio transformador e a SS abrindo dentro do intervalo dela — fato pleno —, "
            "mas nenhum cliente foi interrompido, e a obra 0712600198 está fora do export de "
            "material. Entra pelo campo e pelo texto, com as duas marcas escritas na linha"),
        "ETO-RD-AR 00468/2026": (
            "EXCLUIR", "", "sem_interrupcao",
            "o dono reviu a própria decisão: “se estiver fora daquelas janelas … deverão ser "
            "excluídos”. Ele havia mandado incluir por ler queima com SIGCO incorreto; conferido "
            "na Crítica crua, o código 5301889004 não aparece em papel nenhum nos sete meses — "
            "nem com defeito, nem interrompido, nem manobrado. Nem o 5701889004 que a OS escreve, "
            "nem o 570188904 que a SS escreve. Sem registro de interrupção não há evento a medir"),
        "ETO-RD-AR 01030/2026": (
            "EXCLUIR", "", "tap",
            "o dono leu o caso e mandou excluir na categoria de tape interno. A OS registra o "
            "tape do retirado na posição 05 e o do instalado na 04: a troca moveu o tape, e o "
            "tape é interno — não se ajusta em campo. Vale só para este caso: a mesma diferença "
            "de posição aparece em 236 das 1.510 e não sustenta regra."),
        "ETO-RD-GR 00534/2026": (
            "EXCLUIR", "", "cola_fita",
            "o dono mandou mudar para cola e fita, e o campo confirma sem depender de leitura: a "
            "base de SS e OS grava DEFEITO = “COLA E FITA” neste caso — preenchido depois da "
            "execução, é o que a equipe fechou. A OS diz “REPARO EM TRAFO COM VAZAMENTO DE ÓLEO” "
            "e a obra encerrada e conferida não movimentou transformador nenhum. A SS pediu "
            "substituição com aumento de potência; o que se fez foi reparo"),
        "ETO-RD-AR 00739/2026": (
            "EXCLUIR", "", "cola_fita",
            "o dono achou o caso que procurava desde o começo da revisão: “finalmente um caso de "
            "cola e fita, exclua ele e classifique como cola e fita”. A OS conta o serviço "
            "inteiro — “FEITO COLAGEM E VEDAÇÃO NA BUCHA DO TRAFO 5743290004 QUE ESTAVA COM "
            "VAZAMENTO” —, e nenhum transformador foi movimentado: a SS e a OS não trazem série "
            "nem tombamento de retirado e instalado. Não houve troca, houve reparo"),
        "DOLP-RD-PA 00605/2026": (
            "INCLUIR", "QUEIMADO", "",
            "o dono martelou queimado assumindo a falta da terceira prova: “leva para queimados "
            "só que com pendência de fazer a conferência com o export”. A obra 0112600584 diz "
            "“SUBST. TRAFO QUEIMADO”, a SS e a OS dizem queimado, e a Crítica casa. O que falta "
            "é a extração do material, não a prova — e a etiqueta MATERIAL NÃO CONFERIDO NO "
            "EXPORT fica no caso dizendo isso"),
        "DG-RD-PO 00073/2026": (
            "INCLUIR", "QUEIMADO", "",
            "o dono martelou queimado assumindo a falta da terceira prova: “classifica como "
            "queimado porém material ainda não conferido pelo export”. O campo e o texto "
            "convergem — a Crítica registra o defeito no próprio transformador com subcausa "
            "“queimado por descarga atmosférica”, o TMAE confirma o código e o número da "
            "ocorrência com 32h26 de atendimento, e a SS diz “trafo e para-raios queimados”. O "
            "que falta não é prova, é a extração: a obra 0312600077 existe e não está no export "
            "de material. A etiqueta MATERIAL NÃO CONFERIDO NO EXPORT continua no caso"),
        "ETO-RD-GU 00179/2026": (
            "EXCLUIR", "", "furto",
            "o dono mandou excluir como furto, confirmando o que quatro registros independentes "
            "de campo já diziam: o SIGCO da obra é 61993 “FURTO DE BENS TRAFO”, a SS traz Origem "
            "e Defeito gravados como FURTADO, a Crítica registra observação “transformador "
            "furtado” com ZERO cliente interrompido nos dois passos, e o texto da SS diz "
            "“transformador e medidor furtado”. A subcausa “queimado por descarga atmosférica” "
            "é codificação genérica do despachante, e não descreve o que a equipe achou"),
        "ETO-RD-DP 00182/2026": (
            "EXCLUIR", "", "furto",
            "o dono mandou excluir como furto. A SS e a OS são idênticas e explícitas: "
            "“Constatado trafo 5700273116 de 15kVA na 19.9kV e para-raios furtados. Acesso bom.” "
            "O gatilho de furto já estava aceso e o caso chegava à saída assim mesmo — a "
            "codificação da Crítica diz queima, mas a observação dela não descreve sintoma "
            "nenhum, e quem esteve no poste escreveu furto"),
        "ETO-RD-AG 00587/2026": (
            "EXCLUIR", "", "tap",
            "o dono mandou excluir na categoria de tape. A observação da própria ocorrência "
            "conta o serviço inteiro: “Abertura emergencial do trafo 5700012065 para "
            "possibilitar alterar TAP melhoria de tensão. Ao remover a tampa do trafo, caiu "
            "dentro do oleo os parafusos. Foi aberto nota e trocado o mesmo.” O transformador "
            "foi aberto de propósito para mexer no tape; a troca veio do acidente durante o "
            "serviço, não de falha do equipamento. Nenhum texto do caso afirma queima"),
        "ETO-RD-DP 00156/2026": (
            "INCLUIR", "QUEIMADO", "",
            "o dono reviu e mandou de volta para a saída como queimado, mantendo a marca: “esse "
            "da Meta por último também leva para saída de queimado porém coloca essa "
            "classificação”. A OS diz “TRANSFORMADOR SUBSTITUIDO PELA META” e a obra está "
            "registrada noutra empreiteira — quem executou não é quem o cadastro contratou. Isso "
            "é etiqueta, não causa: o transformador queimou do mesmo jeito"),
        "ETO-RD-AR 00692/2026": (
            "EXCLUIR", "", "avaliar_matheus",
            "o dono mandou tirar do indicador e marcar para avaliar com o Matheus. O caso tem "
            "três vozes e elas não fecham: a SS escreve “QUEIMADO AVARIADO” — as duas palavras, "
            "na mesma linha —, a obra foi aberta como substituição de trafo avariado, e o custo "
            "entrou no projeto SIGCO 8495, que é de avaria. Fica fora da conta enquanto a "
            "avaliação não decidir qual das três vale"),
        "DG-RD-PO 00127/2026": (
            "EXCLUIR", "", "terceiros",
            "o dono mandou conferir se a ocorrência por terceiros era mesmo deste ativo, e é: a "
            "própria SS traz o número escrito — “INT: 20264106798194” — e a Crítica registra "
            "essa ocorrência de 30/01 14:20 a 01/02 17:39 com o transformador interrompido, "
            "causa CAUSADA POR TERCEIROS, subcausa INTERVENÇÃO NA REDE SEM AUTORIZAÇÃO. O "
            "defeito foi aberto na chave 0300582043 e não no transformador, e é por isso que a "
            "esteira não contava a ocorrência como fato — mas a causa do dano é de terceiro, "
            "como no abalroamento, e vai para ressarcimento em vez do indicador."),
        "DOLP-RD-PA 00686/2026": (
            "EXCLUIR", "", "obra_chave",
            "o dono pediu categoria própria: “Substituição de chave fusível”. A obra "
            "encerrada e conferida não movimentou transformador nenhum — o que ela trocou foi a "
            "chave. Estava caindo na categoria genérica de obra sem transformador."),
        "ETO-RD-GU 00685/2026": (
            "EXCLUIR", "", "abalroamento",
            "o dono mandou mover para abalroamento, e as quatro vozes concordam com ele: a "
            "Crítica registra causa POSTE DE AT e subcausa ABALROADO, o TMAE repete as duas, a "
            "SS foi gravada como ABALROAMENTO e a obra 0412600528 entra no SIGCO 20497 — DANOS "
            "CAUSADOS POR TERCEIROS. O caso saía como obra de poste por segurança, que é outra "
            "coisa: segurança é a companhia decidindo trocar um poste, abalroamento é um "
            "terceiro derrubando. A diferença muda para onde o custo vai — ressarcimento, não "
            "manutenção"),
    }
    # ---------- correção de LEITURA, caso a caso: muda o rótulo, não a decisão
    # Diferente do veredito: aqui o dono não move o caso de lugar, ele conserta o que o leitor
    # entendeu. Existe porque o leitor pega a palavra "QUEIMADO" onde ela é só o NOME DO SERVIÇO
    # — "SUBST DE TRAFO QUEIMADO" é o tipo da SS, não o estado do equipamento — e a natureza real
    # fica escrita na descrição, que fala de outra coisa.
    LEITURA_CORRIGIDA = {
        "ETO-RD-AG 00389/2026": (
            "AVARIADO",
            "a SS descreve “TRAFO COM BUCHA SECUNDARIA NEUTRO QUEBRADA” e não usa a palavra "
            "queima em lugar nenhum; a única menção a queimado no dossiê está na frase da OS que "
            "nomeia o tipo do serviço — “SUBST DE TRAFO QUEIMADO”. Bucha partida é avaria "
            "mecânica, não queima de enrolamento. O caso continua fora do indicador por "
            "remanejamento; o que muda é como ele é lido"),
    }
    for r in fluxo["registros"]:
        c = LEITURA_CORRIGIDA.get(str(r.get("ss") or ""))
        if not c:
            continue
        nova, porque = c
        r["categoria_texto"] = nova
        r["leitura_corrigida"] = porque
        if r.get("confirmado") in ("QUEIMADO", "AVARIADO"):
            r["confirmado"] = nova
    print(f"  leituras corrigidas caso a caso: {len(LEITURA_CORRIGIDA)}")

    for r in fluxo["registros"]:
        v = VEREDITO_DONO.get(str(r.get("ss") or ""))
        if not v:
            continue
        decisao, confirmado, gatilho, porque = v
        if decisao == "EXCLUIR":
            r.update({
                "fora_da_esteira": "SIM", "cascata": "EXCLUÍDA", "decisao": "EXCLUIR",
                "expurgo": "SIM", "expurgo_gatilho": gatilho, "exclusao_porque": porque,
                "cascata_motivo": f"Fora do indicador: {porque}.",
                "confirmado": "", "chega_e1": "NÃO", "chega_e2": "NÃO", "chega_e3": "NÃO",
                "veredito_do_dono": "SIM",
            })
        else:
            r.update({
                "fora_da_esteira": "NÃO", "cascata": "SAÍDA", "decisao": decisao,
                "expurgo": "NÃO", "expurgo_gatilho": "", "exclusao_porque": "",
                "confirmado": confirmado, "cascata_motivo": porque.capitalize() + ".",
                "veredito_do_dono": "SIM",
                # quem volta ao indicador desce a esteira inteira nos campos também, senão a
                # corrente dos quatro degraus deixa de fechar e o invariante 3 acusa — como
                # acusou: 1.293 entram, 1.292 aparecem no segundo degrau
                "chega_e1": "SIM", "chega_e2": "SIM", "chega_e3": "SIM",
                "etapa_num": 5, "etapa_rotulo": "Saiu pela ponta — por veredito do dono",
            })
    # o registro dos vereditos vai para o meta do arquivo, e o invariante 20 confere um a um se
    # cada um está mesmo aplicado. Um veredito sumiu daqui uma vez — uma edição por índice de
    # texto apagou o bloco vizinho junto — e o caso voltou calado para dentro do indicador. O
    # número que vai a conselho não pode depender de eu reler a lista inteira a cada rodada.
    fluxo.setdefault("meta", {})["vereditos_do_dono"] = [
        {"ss": ss, "decisao": v[0], "confirmado": v[1], "gatilho": v[2]}
        for ss, v in sorted(VEREDITO_DONO.items())
    ]
    print(f"  vereditos do dono aplicados um a um: {len(VEREDITO_DONO)}")

    # ------------------------------------------------------- a ocorrência inteira, sem recorte
    # Cada registro passa a carregar TODOS os passos da sua ocorrência, não só os que têm o
    # defeito no próprio código — e a lista de outros transformadores que ficaram sem energia no
    # mesmo evento. São 2.431 passos no acervo inteiro para 1.391 ocorrências: cabe no arquivo
    # sem inchar, e é o que faltava para o dossiê contar o evento em vez de contar um pedaço.
    n_compl = 0
    for r in fluxo["registros"]:
        n = str(r.get("oc_num") or "").strip()
        todos = passos_oc.get(n) or []
        r["oc_passos_todos"] = todos
        cod = str(r.get("trafo") or "").strip()
        outros = sorted({v for x in todos for v in (x.get("def"), x.get("int"), x.get("fec"))
                         if v and v != cod and str(v).startswith("5") and len(str(v)) == 10})
        r["oc_outros_trafos"] = " · ".join(outros)
        if len(todos) > len(r.get("oc_detalhe") or []):
            n_compl += 1
    print(f"  dossiês que ganharam passos da ocorrência antes invisíveis: {n_compl}")

    # ------------------------------------------------------------------ etiquetas do caso
    # Categoria DENTRO do veredito, não em lugar dele. "Ponto quente na conexão" continua sendo
    # avaria e continua contando; "substituído pela Meta" continua sendo queima. O que a etiqueta
    # responde é a pergunta seguinte — que avaria, e quem trocou —, e ela existe porque o dono
    # leu dois casos e pediu nome para o que estava escrito ali. Não decide nada: só nomeia.
    ETIQUETAS = [
        ("PONTO QUENTE", r"PONTO[S]? QUENTE",
         "o texto aponta ponto quente na conexão — aquecimento no ponto de ligação, não "
         "queima do enrolamento"),
        ("MEDIDO EM LINHA MORTA",
         r"LINHA MORTA",
         "a OS registra que o serviço foi medido em regime de linha morta — a equipe trabalhou "
         "com o trecho desenergizado. É informação sobre COMO se executou, não sobre por que o "
         "transformador saiu: o caso continua contado como está, e a marca fica para quem "
         "precisar separar o que foi feito em emergência do que foi feito com a linha desligada"),
        ("CRÍTICA APONTA QUEIMA DO ELO",
         r"QUEIMA(DO)?\s+(DE|DO)\s+ELO\b|\bELO\s+QUEIMAD",
         "a nota de campo da ocorrência diz que o que queimou foi o ELO — o fusível da chave —, "
         "e não o enrolamento do transformador. O elo é proteção: ele queima para o "
         "transformador não queimar. O caso continua contado como está, porque a SS, a OS e o "
         "material falam do transformador; a marca existe porque a Crítica, que é o campo, está "
         "descrevendo outro equipamento",
         ("oc_obs", "at_obs")),
        ("MATERIAL NÃO CONFERIDO NO EXPORT", None,
         "a obra deste caso não está no export de material que temos, então ninguém conferiu se "
         "um transformador foi de fato movimentado. Não é zero: é ausência de leitura. Quem "
         "aprovar este caso está aprovando pelo campo e pelo texto, sem a terceira prova"),
        ("POSSÍVEL AVARIADO",
         r"BUCHA[S]?\b[^.|]{0,40}(ESTOURAD|QUEBRAD|TRINCAD|PARTID|DANIFICAD|SOLTA|ROMPID)"
         r"|(ESTOURAD|QUEBRAD|TRINCAD|PARTID|DANIFICAD|ROMPID)\w*\s+(A\s+)?BUCHA",
         "o texto declara queima e, na mesma linha, dano físico de bucha — estourada, quebrada "
         "ou trincada. Bucha partida é avaria, não queima do enrolamento, e as duas coisas "
         "cabem no mesmo equipamento. O caso continua contando como está: a etiqueta marca a "
         "dúvida para quem for revisar a composição queimado × avariado"),
        ("SUBSTITUÍDO PELA META", r"(SUBSTITU|TROCAD)\w*\s+(PEL[AO]\s+)?META\b",
         "a OS diz que quem trocou foi a Meta, e a obra está registrada noutra empreiteira — "
         "o texto nomeia quem executou, o cadastro nomeia quem contratou"),
    ]
    conta_etq = collections.Counter()
    for r in fluxo["registros"]:
        PADRAO = ("desc_ss", "desc_os", "obra_desc")
        achadas, porques = [], []
        for etq in ETIQUETAS:
            nome, rx, explica = etq[0], etq[1], etq[2]
            campos = etq[3] if len(etq) > 3 else PADRAO
            alvo = norm_txt(" ".join(str(r.get(c) or "") for c in campos))
            # "Possível avariado" só faz sentido em cima de quem está contado como QUEIMADO: nos
            # 18 que já estão gravados como avaria a etiqueta não marcaria dúvida nenhuma, só
            # repetiria o veredito. Fica nos 16 em que as duas leituras disputam.
            if nome == "POSSÍVEL AVARIADO" and r.get("confirmado") != "QUEIMADO":
                continue
            # esta não vem do texto: vem da ausência do documento. O dono pediu ao ler a
            # ETO-RD-DP 00033 — "queimado mas dá um flag que o material ainda não foi conferido
            # no export" —, e ela é justamente a que some quando o caso sai da fila de retidos
            # pelo martelo dele: sem a marca, o caso passa a parecer aprovado com as três provas.
            if rx is None:
                if r.get("material_conferido") == "SIM":
                    continue
                achadas.append(nome)
                porques.append(f"{nome}: {explica}")
                conta_etq[nome] += 1
                continue
            if re.search(rx, alvo):
                achadas.append(nome)
                porques.append(f"{nome}: {explica}")
                conta_etq[nome] += 1
        r["etiquetas"] = " · ".join(achadas)
        r["etiquetas_porque"] = " | ".join(porques)
    print(f"  etiquetas aplicadas: {dict(conta_etq)}")

    # ------------------------------------------------------------------ censo da Crítica
    # "Eu achei que tinham muito mais ativos ausentes da base de interrupções." A pergunta merece
    # resposta em todos os 1.510 e não caso a caso: para cada transformador, em que estado ele
    # está na Crítica inteira — os sete meses, dezembro de 2025 incluído. São quatro estados e
    # eles não são graus do mesmo: ausente é ausente, e ter defeito noutra data é outra coisa.
    CENSO = {
        "AUSENTE": "o código não aparece na Crítica em papel nenhum",
        "SEM DEFEITO NELE": "aparece na Crítica, mas nunca com o defeito aberto nele",
        "DEFEITO EM OUTRA DATA": "tem defeito aberto nele, mas em data que não cabe na janela",
        "DEFEITO NA JANELA": "tem ocorrência com defeito nele dentro da janela desta SS",
    }
    conta_censo = collections.Counter()
    for r in fluxo["registros"]:
        cod = str(r.get("trafo") or "").strip()
        ab = parse(r.get("abertura"))
        if cod not in vistos:
            e = "AUSENTE"
        elif not por.get(cod):
            e = "SEM DEFEITO NELE"
        elif any(dentro(ab, o) for o in por.get(cod, [])):
            e = "DEFEITO NA JANELA"
        else:
            e = "DEFEITO EM OUTRA DATA"
        r["censo_critica"] = e
        r["censo_critica_porque"] = CENSO[e]
        conta_censo[e] += 1
    print(f"  censo da Crítica: {dict(conta_censo)}")

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
        "sem_fato": ("o dono definiu que sem ocorrência e sem atendimento o caso não é deste "
                     "indicador — aplicado só onde nem o teste do vizinho achou nada",
                     "ETO-RD-AR 00024/2026"),
        # As sete abaixo apareciam como "sem origem registrada" e não eram: ele pediu todas, em
        # voz, ao longo da revisão. O dicionário é que não tinha sido atualizado — e a pergunta
        # "você fez alguma exclusão sem a minha permissão?" só pode ser respondida por escrito
        # se a autoria de cada corte estiver escrita.
        "fora_da_janela": ("o dono definiu a janela e mandou excluir quem cai fora dela: “se do "
                           "primeiro passo aberto até o último passo o cara não abriu a SS e nem "
                           "24 horas depois do último passo, desconsidere e resuma nos "
                           "excluídos”", "ETO-RD-AG 00003/2026, ETO-RD-GR 00023/2026"),
        "sem_interrupcao": ("o dono mandou excluir quem não aparece na base Crítica em papel "
                            "nenhum, com categoria própria", "DOLP-RD-PA 00125/2026"),
        "remanejamento": ("o dono leu o caso e mandou criar a categoria: “remanejamento, jogue "
                          "nos excluídos e crie a categoria”", "ETO-RD-GU 00129/2026"),
        "falta_fase": ("o dono pediu a categoria depois de ler o caso: “categoriza como falta de "
                       "fase interna”", "ETO-RD-AG 00042/2026"),
        "obra_sem_transformador": ("o dono mandou excluir obra que não movimentou transformador: "
                                   "“exclui essa SS daqui, nenhum transformador movimentado”",
                                   "ETO-RD-GU 00671/2026"),
        "obra_sem_execucao": ("o dono corrigiu a própria classificação anterior: “não exclui como "
                              "furtado, exclui como sem movimentação de material”",
                              "DG-RD-PO 00116/2026"),
        "erro_cadastro": ("o dono pediu a categoria: “marque como excluído, possível erro de "
                          "cadastro”", "ETO-RD-GR 00205/2026"),
        "obra_chave": ("o dono pediu a categoria: “nova categoria que será Substituição de chave "
                       "fusível”", "DOLP-RD-PA 00686/2026"),
        # E a que NÃO é dele. Fica escrito porque a lista serve para separar o que ele mandou do
        # que a régua fez sozinha — e esta a régua fez sozinha, generalizando o pedido dele de
        # chave fusível para poste, cabo, para-raio e medidor. Ele não pediu isso.
        "obra_poste": ("regra minha, generalizada do pedido dele de chave fusível — e corrigida "
                       "depois de ele mandar ver os quatro casos: só vale quando o material não "
                       "registra transformador movimentado, senão o rótulo da obra estaria "
                       "apagando o que o campo consumou", ""),
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

    # o meta também anunciava as duas lacunas como abertas
    _lac = fluxo.get("meta", {}).get("lacunas")
    if isinstance(_lac, list):
        fluxo["meta"]["lacunas"] = [
            x for x in _lac
            if "26 a 31 de janeiro" not in str(x) and "dezembro de 2025 não existe" not in str(x)
        ]

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

    # ---------- e a frase da lacuna dentro da própria narrativa
    # O aviso de lacuna foi corrigido no campo lacuna_base, mas a frase continuava escrita
    # DENTRO do texto da narrativa e dentro dos alertas — 69 dossiês ainda diziam "período em
    # que a base do TMAE não tem nenhum registro para nenhum ativo". Não tem mais: o arquivo de
    # janeiro completo traz 3.754 atendimentos entre 26 e 31, e o dono cobrou com razão. A frase
    # sai dos dois lugares, e o que fica é o fato — havendo ou não atendimento no código.
    VELHAS = [
        r", mas a SS abriu entre 26 e 31 de janeiro — período em que a base do TMAE não tem "
        r"nenhum registro para nenhum ativo; é lacuna conhecida da base, não prova de que a "
        r"equipe faltou",
        r"; a SS abriu entre 26 e 31 de janeiro, período sem registro nenhum no TMAE",
    ]
    limpas = 0
    for r in fluxo["registros"]:
        for campo in ("narrativa", "narrativa_base"):
            t = str(r.get(campo) or "")
            if not t:
                continue
            antes = t
            for v in VELHAS:
                t = t.replace(v, "")
            # e qualquer sobra que ainda afirme a lacuna, por segurança
            t = re.sub(r"[^.]*lacuna conhecida da base[^.]*\.\s*", "", t)
            if t != antes:
                r[campo] = re.sub(r"\s+", " ", t).strip()
                if campo == "narrativa_base":
                    limpas += 1
        al = r.get("alertas_narrativa")
        if isinstance(al, list):
            novo_al = [a for a in al if "lacuna do TMAE" not in str(a)]
            if len(novo_al) != len(al):
                r["alertas_narrativa"] = novo_al
    if limpas:
        print(f"  frases de lacuna do TMAE removidas das narrativas: {limpas}")

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
        r"^Saiu antes da esteira|^Parou na (primeira|terceira|quarta)|^Passou pelas quatro|"
        # "Fora do indicador: …" é o cascata_motivo, e ele também é escrito por este bloco. Ficou
        # de fora da lista e o resultado apareceu num dossiê que ele leu: a mesma frase quatro
        # vezes no fim do texto — três vindas da narrativa_base guardada com as cópias antigas,
        # uma recém-anexada. Frase repetida faz o leitor procurar a diferença que não existe.
        r"^Fora do indicador:|"
        # Quando o campo derruba o rótulo herdado, a frase que narra a leitura antiga fica
        # afirmando a causa vencida — "concluindo furtado" num dossiê que decide AVARIADO. E a
        # frase da terceira peneira ("a leitura mostrou que a natureza do evento não é falha")
        # descreve uma etapa que este caso não sofreu. As duas convencem, e as duas mentem.
        r"A leitura do texto aplicou a regra|a natureza do evento não é falha|"
        r"o que derruba o caso mesmo com campo e material a favor)", re.I)
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
    for r in fluxo["registros"]:
        if r.get("fora_da_esteira") != "SIM":
            # e o gatilho junto: o script grava no arquivo que lê, então um gatilho de uma
            # rodada em que o caso foi excluído sobrevivia pendurado depois de ele voltar. Sete
            # registros estavam na SAÍDA carregando gatilho de exclusão — contradição interna
            # que a tela lê como categoria e a planilha exporta como se valesse.
            r["exclusao_porque"] = ""
            r["expurgo_gatilho"] = ""
            r["expurgo"] = "NÃO"
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
        # exclusao_porque só vale para quem está excluído. Ficava grudado em quem o campo
        # devolveu à esteira, e o dossiê terminava com "motivo da exclusão" num caso INCLUIR.
        # …e só quando o motivo da cascata já não disser a mesma coisa: para os excluídos,
        # cascata_motivo É "Fora do indicador: <exclusao_porque>", então acrescentar "Motivo da
        # exclusão: <exclusao_porque>" imprimia a mesma frase duas vezes seguidas.
        if (r.get("exclusao_porque") and r.get("fora_da_esteira") == "SIM"
                and str(r["exclusao_porque"]).strip(" .") not in mot):
            fim += f" Motivo da exclusão: {r['exclusao_porque']}."
        # e quando o rótulo foi derrubado, o dossiê tem de dizer isso — é a frase que explica
        # por que a categoria gravada e a decisão não batem
        for campo in ("categoria_herdada_vencida", "texto_vencido_pelo_campo"):
            nota = str(r.get(campo) or "").strip()
            if nota:
                fim += " " + (nota if nota.endswith(".") else nota + ".")
                break
        r["narrativa"] = " ".join(limpas + [fim])
        r["narrativa_regerada"] = CARIMBO
        reescritas += 1
    print(f"  narrativas com conclusão vencida, recompostas do estado de agora: {reescritas}")

    # ---------- a obra e o SIGCO decidem quando a Crítica não pode saber
    # Achado de auditoria: 12 casos marcados como expurgo chegaram à saída, e em 4 deles a obra
    # foi aberta como FURTO DE BENS TRAFO, no projeto SIGCO 61993, que é o projeto de reposição
    # de ativo furtado.
    #
    # O mecanismo importa, porque vai se repetir: a Crítica classifica esses casos como
    # "QUEIMADO POR DESCARGA ATMOSFERICA" — e está certa no que lhe compete, porque ela registra
    # o EVENTO ELÉTRICO e não sabe que o transformador foi levado. A prova do furto está na SS,
    # na obra e no enquadramento contábil. Uma peneira que só olha a interrupção nunca vai pegar
    # esses; foi por isso que a mudança de "zero cliente" os deixou passar.
    #
    # Então a regra ganha uma fonte a mais, e ela é campo como as outras: o cadastro de obras é
    # preenchido depois da execução, por quem executou. Quando ele e o projeto contábil dizem
    # furto, é furto — mesmo que a Crítica diga descarga atmosférica, porque as duas afirmações
    # não se contradizem: o trafo pode ter queimado E ter sido levado, e o que conta para o
    # indicador de falha é o que a concessionária repôs e por quê.
    #
    # O simétrico também vale, e é o que salva os outros 8: quando a obra diz "SUBST. TRAFO
    # QUEIMADO" ou "AVARIADO", uma flag de expurgo herdada de rodada antiga perde para ela.
    vazou = 0
    for r in fluxo["registros"]:
        od = str(r.get("obra_descricao") or "").upper()
        sg = str(r.get("sigco") or "").strip()
        # O SIGCO SOZINHO NÃO DECIDE. O projeto 61993 é de furto em 85% das obras, não em 100%
        # — e quando a DESCRIÇÃO da obra diz "SUBST. TRAFO QUEIMADO", os dois campos do cadastro
        # discordam entre si. A descrição é mais específica que o projeto contábil: ela conta o
        # que foi feito, ele conta em qual rubrica o custo caiu. Enquadramento errado é erro de
        # contabilidade, não prova de furto. Só exclui quando a própria descrição declara.
        descreve_furto = bool(re.search(r"FURTO|ROUBO|VANDALIS", od))
        descreve_falha = bool(re.search(r"QUEIMAD|AVARIAD|VAZANDO|SOBRECARGA", od))
        if not descreve_furto and not (sg == "61993" and not descreve_falha):
            continue
        if r.get("fora_da_esteira") == "SIM":
            continue
        # OBRA QUE NÃO EXECUTOU NÃO DECLARA CAUSA. Quando a obra tem zero material e zero
        # realizado, ela foi aberta e nada aconteceu — o que está escrito nela é o plano de
        # quem a abriu, não o registro de quem a executou. Aí ela perde a autoridade que a
        # justifica como fonte de campo, e o motivo honesto da saída é a falta de execução, não
        # a causa que ela declara. O caso sai do mesmo jeito; muda o nome, que é o que vai ser
        # lido depois.
        sem_execucao = (float(r.get("trafos_material") or 0) == 0
                        and float(r.get("obra_realizado") or 0) == 0)
        vazou += 1
        if sem_execucao:
            r.update({
                "fora_da_esteira": "SIM", "cascata": "EXCLUÍDA", "decisao": "EXCLUIR",
                "expurgo": "SIM", "expurgo_gatilho": "obra_sem_execucao", "chega_e1": "NÃO",
                "exclusao_porque": (f"a obra {r.get('obra')} foi aberta como \"{od.title()}\" e "
                                    "não executou nada: zero transformador no material e R$ 0 "
                                    "realizado. Uma obra que não executou não declara causa — o "
                                    "que está escrita nela é o plano de quem abriu, não o "
                                    "registro de quem fez"),
                "cascata_motivo": ("Fora do indicador: a obra existe e não executou nada — sem "
                                   "material e sem valor realizado."),
                "confirmado": "", "chega_e2": "NÃO", "chega_e3": "NÃO",
                "e1_status": "—", "e2_status": "—", "e3_status": "—", "e4_status": "—",
                "ressalvas": "", "ressalvas_graves": "", "ressalvas_medias": "", "e4_alertas": "",
            })
            continue
        r.update({
            "fora_da_esteira": "SIM", "cascata": "EXCLUÍDA", "decisao": "EXCLUIR",
            "expurgo": "SIM", "expurgo_gatilho": "furto", "chega_e1": "NÃO",
            "exclusao_porque": (f"a obra foi aberta como \"{od.title()}\" no projeto SIGCO {sg}, "
                                "que é o de reposição de ativo furtado — o cadastro de obras é "
                                "preenchido depois da execução, por quem executou. A Crítica "
                                "registra o evento elétrico e não tem como saber do furto"),
            "cascata_motivo": ("Fora do indicador: a obra e o projeto contábil declaram furto. "
                               "A interrupção descreve o evento elétrico, não a causa da reposição."),
            "confirmado": "", "chega_e2": "NÃO", "chega_e3": "NÃO",
            "e1_status": "—", "e2_status": "—", "e3_status": "—", "e4_status": "—",
            "ressalvas": "", "ressalvas_graves": "", "ressalvas_medias": "", "e4_alertas": "",
        })
    print(f"  furto declarado pela obra e pelo SIGCO, retirados do indicador: {vazou}")

    # ---------- obra encerrada, conferida no material, e sem transformador nenhum
    # Aqui o zero É medida, e essa é toda a diferença. Nas obras que não estão no export o zero é
    # ausência de dado e o caso só espera o SIAGO — foi o defeito que o dono apontou no dossiê.
    # Nestas a obra ESTÁ no export, foi encerrada e tem valor realizado: o material foi conferido
    # e não há transformador. Alguém executou e cobrou algo que não foi a troca do transformador.
    # A terceira peneira pergunta se houve movimentação; aqui a resposta é não, e é uma resposta,
    # não uma lacuna.
    sem_mov = 0
    for r in fluxo["registros"]:
        if r.get("fora_da_esteira") == "SIM":
            continue
        if (r.get("material_conferido") != "SIM"
                or float(r.get("trafos_material") or 0) > 0
                or float(r.get("obra_realizado") or 0) <= 0):
            continue
        sem_mov += 1
        _v = f"{float(r.get('obra_realizado') or 0):,.0f}".replace(",", ".")
        r.update({
            "fora_da_esteira": "SIM", "cascata": "EXCLUÍDA", "decisao": "EXCLUIR",
            "expurgo": "SIM", "expurgo_gatilho": "obra_sem_transformador", "chega_e1": "NÃO",
            "exclusao_porque": (f"a obra {r.get('obra')} está no export de material, foi encerrada "
                                f"e realizou R$ {_v} — e o material conferido não traz "
                                "transformador nenhum. Aqui o zero é medida, não ausência de "
                                "dado: alguém executou e cobrou algo que não foi a troca do "
                                "transformador"),
            "cascata_motivo": ("Fora do indicador: obra encerrada e conferida no material, sem "
                               "transformador movimentado."),
            "confirmado": "", "chega_e2": "NÃO", "chega_e3": "NÃO",
            "e1_status": "—", "e2_status": "—", "e3_status": "—", "e4_status": "—",
            "ressalvas": "", "ressalvas_graves": "", "ressalvas_medias": "", "e4_alertas": "",
        })
    print(f"  obra encerrada e conferida sem transformador, excluídos: {sem_mov}")

    # ---------- a obra descreve a troca de OUTRO equipamento
    # "SUBST. CHAVE FUSÍVEL", R$ 2.335, nenhum transformador no material. A SS pediu trafo, a
    # obra executou chave. Quando o cadastro de obras — que é preenchido depois, por quem
    # executou — diz que o que se trocou foi outro equipamento, é isso que aconteceu: a SS
    # descreve o pedido, a obra descreve o feito.
    #
    # A guarda é dupla e precisa ser: só dispara quando a descrição NÃO cita transformador e
    # cita explicitamente outro ativo. "Subst. trafo queimado" e "subst. trafo avariado" ficam de
    # fora do padrão por construção, e um caso em que a obra troque os dois continua dentro.
    OUTRO_ATIVO = [
        ("obra_chave", r"CHAVE FUSIVEL|CHAVE FUSÍVEL|\bCHAVE\b", "chave fusível"),
        ("obra_poste", r"\bPOSTE\b", "poste"),
        ("obra_cabo", r"\bCABO\b|\bCONDUTOR\b|\bRAMAL\b", "cabo ou ramal"),
        ("obra_pararaio", r"PARA[- ]?RAIO", "para-raio"),
        ("obra_medidor", r"\bMEDIDOR\b", "medidor"),
    ]
    outro = collections.Counter()
    for r in fluxo["registros"]:
        if r.get("fora_da_esteira") == "SIM":
            continue
        od = norm_txt(r.get("obra_descricao"))
        if not od or re.search(r"TRAFO|TRANSFORMADOR", od):
            continue
        # A GUARDA QUE FALTAVA, e que inverteu a regra da casa enquanto não existia: se o
        # material conferido registra transformador movimentado, o rótulo da obra não apaga
        # isso. Os quatro casos de "Poste Danificado" que caíam aqui tinham 1 transformador no
        # material, entre R$ 14.900 e R$ 18.679 realizados, e a SS de cada um declarava a falha
        # — queimado, vazamento de óleo, avariado, "trocar poste e trafo". O campo diz que o
        # trafo saiu; o texto diz por quê; o rótulo da obra diz o que mais foi trocado junto. O
        # caso da chave fusível, que ele pediu, é o contrário: zero transformador no material.
        if float(r.get("trafos_material") or 0) > 0 and r.get("material_conferido") == "SIM":
            continue
        achado = next(((g, q) for g, rx, q in OUTRO_ATIVO if re.search(rx, od)), None)
        if not achado:
            continue
        gat, quem = achado
        outro[gat] += 1
        r.update({
            "fora_da_esteira": "SIM", "cascata": "EXCLUÍDA", "decisao": "EXCLUIR",
            "expurgo": "SIM", "expurgo_gatilho": gat, "chega_e1": "NÃO",
            "exclusao_porque": (f"a obra foi aberta como \"{str(r.get('obra_descricao')).title()}\" — "
                                f"o que se trocou foi {quem}, não o transformador. A SS descreve o "
                                "pedido; a obra, preenchida depois da execução, descreve o feito"),
            "cascata_motivo": f"Fora do indicador: a obra registra substituição de {quem}.",
            "confirmado": "", "chega_e2": "NÃO", "chega_e3": "NÃO",
            "e1_status": "—", "e2_status": "—", "e3_status": "—", "e4_status": "—",
            "ressalvas": "", "ressalvas_graves": "", "ressalvas_medias": "", "e4_alertas": "",
        })
    if outro:
        print(f"  obra que trocou outro equipamento, excluídos: {sum(outro.values())} — {dict(outro)}")

    # ---------- zero cliente deixa de trancar e vira marcador
    # O dono mandou, nomeando dois casos e repetindo a regra nos dois: "categoriza como queimado
    # porém coloque na categoria de 0 clientes interrompidos". É a mesma decisão que ele já tinha
    # tomado para o deslocamento do TMAE — o sinal fica visível e filtrável, mas não decide
    # sozinho.
    #
    # O que sustenta: nos 74 presos SÓ por isso, os 74 têm transformador movimentado na obra, e
    # a Crítica declara defeito no próprio ativo dentro da janela. Zero cliente não desmente
    # nada disso; diz que o trafo estava num ramal sem carga faturada no momento do corte, o que
    # é comum em rural. Sem cliente não há DEC nem FEC — o que muda é o impacto regulatório, não
    # a existência da falha.
    #
    # A bandeira continua, e é forte: quem for defender o número precisa saber que 74 dos casos
    # não penalizaram ninguém.
    # "MANOBRA SEM PROGRAMAÇÃO PRÉVIA" também deixa de trancar, e pelo mesmo motivo do zero
    # cliente. Essa ressalva vem da causa da Crítica — DESLIGAMENTO SEM PROGRAMAÇÃO PREVIA / RD
    # DE BT —, e essa causa classifica o TIPO DO DESLIGAMENTO, não o que falhou: diz que a
    # equipe cortou sem aviso, o que é o normal numa emergência. Nos cinco casos que ela segurava
    # a obra declara "subst. trafo queimado" (quatro) ou "com sobrecarga" (um), e o material
    # registra 1 transformador movimentado nos cinco. Segurar o caso por causa do rótulo do
    # corte é deixar a forma decidir contra o conteúdo.
    NAO_TRANCA = {"nenhum cliente interrompido", "manobra sem programação prévia"}
    voltaram = 0
    for r in fluxo["registros"]:
        if r.get("cascata") != "RETIDO — RESSALVA DA INTERRUPÇÃO":
            continue
        restante = [x.strip() for x in str(r.get("ressalvas") or "").split("·")
                    if x.strip() and x.strip() not in NAO_TRANCA]
        if restante:
            continue  # tem outra ressalva além dessas duas: continua presa
        # e só volta quem tem a obra e o material a favor — a ressalva cai, a prova não
        if float(r.get("trafos_material") or 0) <= 0:
            continue
        voltaram += 1
        cat = str(r.get("categoria_texto") or "").strip().upper()
        r.update({
            "cascata": "SAÍDA", "decisao": "INCLUIR",
            "confirmado": "AVARIADO" if cat == "AVARIADO" else "QUEIMADO",
            "e4_status": "MARCADOR — não retém",
            "ressalvas_graves": "", "ressalvas_medias": "",
            "cascata_motivo": ("Campo, texto e material convergem. A ressalva da interrupção fica "
                               "marcada e não retém: ela descreve o corte — sem cliente faturado, "
                               "ou manobrado sem aviso —, e não o que falhou. A obra e o material "
                               "registram transformador movimentado."),
        })
    print(f"  presos só por zero cliente, agora marcados em vez de retidos: {voltaram}")

    # ---------- possível erro de cadastro
    # "NO CADASTRO DIZ QUE É O TRAFO 5700036153, PORÉM EM CAMPO É O TRAFO 5700299024."
    # A equipe declara que o código não corresponde ao equipamento. Enquanto isso não for
    # resolvido no cadastro, qualquer casamento por código é casamento com o ativo errado — e o
    # caso não pode sustentar nem a inclusão nem a exclusão pelo campo.
    cadastro = 0
    for r in fluxo["registros"]:
        t = norm_txt(str(r.get("desc_ss") or "") + " || " + str(r.get("desc_os") or ""))
        if not re.search(r"NO CADASTRO DIZ QUE E O TRAFO|CADASTRO DIZ[^.|]{0,40}POREM EM CAMPO|"
                         r"NUMERO OPERATIVO (TROCAD|ERRAD)\w*|CODIGO (TROCAD|ERRAD)\w*|"
                         r"TRAFO DIVERGENTE DO CADASTRO|CADASTRO DIVERGENTE", t):
            continue
        cadastro += 1
        r.update({
            "fora_da_esteira": "SIM", "cascata": "EXCLUÍDA", "decisao": "EXCLUIR",
            "expurgo": "SIM", "expurgo_gatilho": "erro_cadastro", "chega_e1": "NÃO",
            "exclusao_porque": ("a equipe declara no texto que o código do cadastro não "
                                "corresponde ao equipamento que está no poste — enquanto isso "
                                "não for resolvido, qualquer casamento por código é casamento "
                                "com o ativo errado"),
            "cascata_motivo": "Fora do indicador: possível erro de cadastro do código do ativo.",
            "confirmado": "", "chega_e2": "NÃO", "chega_e3": "NÃO",
            "e1_status": "—", "e2_status": "—", "e3_status": "—", "e4_status": "—",
            "ressalvas": "", "ressalvas_graves": "", "ressalvas_medias": "", "e4_alertas": "",
        })
    print(f"  possível erro de cadastro do código do ativo, excluídos: {cadastro}")

    # ---------- obra preventiva descrevendo falha
    # A obra tem dois campos e eles discordam: o TIPO diz "manutenção preventiva" e a DESCRIÇÃO
    # diz "subst. trafo queimado". Não muda causa — a descrição é mais específica que o tipo —,
    # mas é divergência do próprio cadastro e precisa estar à vista.
    pv = 0
    for r in fluxo["registros"]:
        tipo = str(r.get("obra_tipo") or "").upper()
        desc = str(r.get("obra_descricao") or "").upper()
        r["obra_tipo_diverge"] = "NÃO"
        if ("PREVENTIVA" in tipo or "PROGRAMADA" in tipo) and re.search(r"QUEIMAD|AVARIAD", desc):
            r["obra_tipo_diverge"] = "SIM"
            pv += 1
    print(f"  obra de tipo preventivo/programado descrevendo falha: {pv}")

    # ---------- que proteção atuou
    # "Desarme do RL 7908300096 atuado sobre corrente de neutro ICC 80 A, causa TR 5700009096
    # queimado." O religador não existe como elemento na Crítica — ela só classifica CH, TR, UC,
    # DJ e SE. Quem conta que a proteção atuou é a nota do executante no TMAE, e é informação de
    # peso: proteção que desarma é a confirmação operacional de que houve corrente de falta.
    # Não muda a causa e não move ninguém: entra como categoria, para o gráfico poder separar.
    PROT = [
        ("RELIGADOR", r"\bDESARME D[OE] RL\b|\bRELIGADOR\b|\bRL \d|\bDESARMOU O RL\b"),
        ("CHAVE FUSÍVEL", r"\bELO QUEIMADO\b|\bCHAVE FUSIVEL\b|\bCH FUS\b|\bELO ROMPIDO\b"),
        ("DISJUNTOR", r"\bDISJUNTOR\b|\bDJ \d|\bDESARME D[OE] DJ\b"),
        ("CHAVE ABERTA", r"\bCHAVE ABERTA\b|\bCHAVE DESLIGADA\b"),
    ]
    prot = collections.Counter()
    for r in fluxo["registros"]:
        t = norm_txt(str(r.get("at_obs") or "") + " || " + str(r.get("desc_ss") or "")
                     + " || " + str(r.get("desc_os") or ""))
        achou = ""
        for nome, rx in PROT:
            if re.search(rx, t):
                achou = nome
                break
        r["protecao"] = achou
        prot[achou or "não citada"] += 1
    print(f"  proteção citada na nota de campo: {dict(prot)}")

    # ---------- influência invocada para acelerar o atendimento
    # "Favor agilizar o atendimento devido o cliente ter contato direto com a diretoria."
    # "Solicitação do Anderson Vieira a pedido da diretoria."
    #
    # Isto não é causa: não muda se o transformador queimou. Muda a FILA — quem foi atendido
    # antes de quem, e por quê. Numa auditoria que vai a conselho é exatamente o tipo de frase
    # que alguém vai encontrar depois, e é melhor que esteja marcada aqui do que descoberta lá.
    #
    # O padrão exige a palavra de cargo perto de um verbo de pedido ou pressa. Sem isso pega
    # "Avenida Prefeito João de Sousa Lima", que é nome de rua, e "Prefeitura de Ponte Alta",
    # que é o cliente — os dois falsos positivos que a primeira versão trouxe.
    infl = 0
    for r in fluxo["registros"]:
        t = norm_txt(str(r.get("desc_ss") or "") + " || " + str(r.get("desc_os") or ""))
        m = re.search(r"(AGILIZAR|URGENCIA|PRIORIDADE|PEDIDO|SOLICITACAO|CONTATO DIRETO|"
                      r"COBRANDO|DETERMINACAO)[^.|]{0,60}\b(DIRETORIA|DIRETOR|PRESIDENCIA|"
                      r"SUPERINTEND\w*)\b|"
                      r"\b(DIRETORIA|DIRETOR|PRESIDENCIA)\b[^.|]{0,60}"
                      r"(AGILIZAR|URGENCIA|PRIORIDADE|COBROU|PEDIU)", t)
        if m:
            r["influencia"] = "SIM"
            r["influencia_trecho"] = re.sub(r"\s+", " ", t[max(0, m.start() - 60):m.end() + 40]).strip()
            infl += 1
        else:
            r["influencia"] = "NÃO"
            r["influencia_trecho"] = ""
    print(f"  SS que invocam a diretoria para acelerar o atendimento: {infl}")

    # ---------- quem autorizou a troca
    # Só aparece porque o texto deixou de vir cortado: "SUBSTITUIÇÃO DE TRANSFORMADOR
    # AUTORIZADA PELO DIONE." vinha terminando em "AUTORIZADA PELO". Uma troca autorizada por
    # alguém nominalmente é governança, não causa — não move o caso de lugar. Mas numa
    # auditoria que vai a conselho, quem autorizou é pergunta que se faz, e ela precisa ter
    # resposta antes de ser feita.
    aut = 0
    for r in fluxo["registros"]:
        t = norm_txt(str(r.get("desc_os") or "") + " || " + str(r.get("desc_ss") or ""))
        # o nome vem grudado no que vier depois — "DIONE. OBS", "DIONE. TRAFO RETIRADO SEM A
        # PLACA". Corta no primeiro ponto ou na primeira palavra de formulário.
        m = re.search(r"AUTORIZA\w*\s+(PEL[OA]|POR)\s+([A-Z][A-Z\s\.]{1,60})", t)
        if m:
            nome = re.split(r"\.|\bOBS\b|\bTRAFO\b|\bFOI\b|\bMEDIC", m.group(2))[0]
            r["autorizacao"] = re.sub(r"\s+", " ", nome).strip(" .")
            r["tem_autorizacao"] = "SIM"
            aut += 1
        else:
            r["autorizacao"] = ""
            r["tem_autorizacao"] = "SIM" if re.search(r"AUTORIZA\w*", t) else "NÃO"
            if r["tem_autorizacao"] == "SIM":
                aut += 1
    print(f"  OS que citam autorização da troca: {aut}")

    # ---------- a interrupção que não interrompeu ninguém
    # Zero cliente é a ressalva mais forte que existe: se ninguém ficou sem energia, o evento
    # não gera DEC nem FEC, e um transformador de distribuição que queima sem penalizar cliente
    # é no mínimo estranho. Conferido na base crua somando TODAS as linhas de cada ocorrência —
    # o zero não é truncamento de uma linha só: das 93, nenhuma tem cliente escondido em passo
    # nenhum. Hoje a ressalva já as segura, mas quando o dono bate o martelo de queimado a
    # classificação dele manda no arquivamento e o caso entra no indicador — é aí que este
    # marcador precisa existir, para o caso não entrar calado.
    sem_cli = 0
    for r in fluxo["registros"]:
        tem_oc = bool(str(r.get("oc_num") or "").strip())
        if tem_oc and float(r.get("oc_cons") or 0) == 0:
            r["sem_cliente_interrompido"] = "SIM"
            sem_cli += 1
        else:
            r["sem_cliente_interrompido"] = "NÃO"
    print(f"  ocorrências que não interromperam nenhum cliente: {sem_cli}")

    # ---------- "zero cliente" nem sempre quer dizer que o trafo não atende ninguém
    # A auditoria dos 69 achou seis casos em que o MESMO ativo aparece com um cliente
    # interrompido noutra ocorrência do acervo. Num deles — DG-RD-PO 00169 — o mesmo
    # transformador interrompeu 1 cliente três dias antes e zero no evento auditado.
    #
    # Nesses, o zero descreve o REGISTRO, não o mundo. Dizer "nenhum cliente interrompido" no
    # dossiê afirma sobre o ativo algo que o próprio acervo desmente, e num relatório de conselho
    # essa é a frase que alguém vai testar. A bandeira passa a dizer o que sabe: o registro veio
    # com zero, e o ativo comprovadamente atende cliente noutro evento.
    # A comparação é com a ocorrência MAIS PRÓXIMA no tempo, não com a maior do acervo — o dono
    # pediu assim e tem razão: um transformador pode ter atendido dez clientes há seis meses e
    # ter sido religado noutro arranjo desde então. O evento vizinho fala do mesmo estado de
    # rede; um evento distante fala de outra rede.
    corrigidos = 0
    for r in fluxo["registros"]:
        r["zero_vizinho_cons"] = None
        if r.get("sem_cliente_interrompido") != "SIM":
            r["zero_e_registro"] = "NÃO"
            continue
        ab = parse(r.get("abertura"))
        cod = str(r.get("trafo") or "").strip()
        outras = [o for o in por.get(cod, [])
                  if str(o["oc"]) != str(r.get("oc_num") or "") and o["ini"] and ab]
        viz = min(outras, key=lambda o: abs((o["ini"] - ab).total_seconds())) if outras else None
        n = int(viz["cons"]) if viz else 0
        r["zero_vizinho_cons"] = n if viz else None
        r["zero_e_registro"] = "SIM" if n > 0 else "NÃO"
        if viz and n > 0:
            corrigidos += 1
            dias = abs((viz["ini"] - ab).total_seconds()) / 86400
            r["zero_cliente_nota"] = (
                f"O registro desta ocorrência veio com zero cliente. A ocorrência mais próxima no "
                f"mesmo transformador — {viz['oc']}, a {dias:.0f} dia{'s' if dias >= 2 else ''} "
                f"daqui — interrompeu {n} cliente{'s' if n > 1 else ''}. O ativo atende cliente: "
                "aqui o zero descreve o registro, não a rede.")
            if str(r.get("ressalvas") or "").strip() == "nenhum cliente interrompido":
                r["ressalvas"] = "zero cliente registrado (o evento vizinho interrompeu cliente)"
        elif viz:
            r["zero_cliente_nota"] = (
                f"O registro veio com zero cliente, e a ocorrência mais próxima no mesmo "
                f"transformador — {viz['oc']} — também veio com zero. Dois eventos seguidos sem "
                "cliente faturado é consistente com ramal sem carga, não com falha de registro.")
        else:
            r["zero_cliente_nota"] = (
                "O registro veio com zero cliente e não há outra ocorrência neste transformador "
                "no acervo para comparar — não dá para dizer se o zero é da rede ou do registro.")
    print(f"  zero que é do registro, não da rede (o ativo atende cliente noutro evento): {corrigidos}")

    # ---------- as duas vozes do campo discordam sobre a natureza da falha
    # 140 casos contam como QUEIMADO e a Crítica declara subcausa de AVARIA — vazamento de óleo,
    # tanque deteriorado, falha de bucha. Em 110 deles a obra diz "SUBST. TRAFO QUEIMADO".
    #
    # Não é erro de ninguém, e por isso não se resolve com a regra da casa: um transformador que
    # vaza óleo perde isolamento e DEPOIS queima. A Crítica registra o defeito que a equipe
    # constatou; a obra registra o que foi trocado e sob qual projeto contábil. Aqui os dois
    # campos discordam entre si, e "o campo vence o texto" não decide nada.
    #
    # O dono decidiu manter como está — a obra manda, o total não muda de qualquer forma, e
    # trocar 140 rótulos moveria o split de 1.216/55 para 1.092/179 sem ganho de verdade. Fica a
    # marca, para que quem for auditar encontre isso já contado em vez de descobrir sozinho.
    AVARIA_SUB = r"VAZAMENTO|TANQUE DETERIORADO|FALHA BUCHA|FALTANDO FASE|ATERRAMENTO PARTIDO"
    disc = 0
    for r in fluxo["registros"]:
        r["campo_discorda_natureza"] = "NÃO"
        cf, sub = str(r.get("confirmado") or ""), str(r.get("oc_sub") or "")
        if not cf or not sub:
            continue
        if (cf == "QUEIMADO" and re.search(AVARIA_SUB, sub)) or \
           (cf == "AVARIADO" and "QUEIMADO POR" in sub):
            r["campo_discorda_natureza"] = "SIM"
            # O dono pediu que estes cheguem à análise profunda dele com etiqueta própria, para
            # ele julgar caso a caso o que a régua decidiu não mexer.
            r["analise_claude"] = "natureza divergente"
            r["natureza_nota"] = (
                f"Conta como {cf.lower()}, e a Crítica declara \"{sub.lower()}\". As duas vozes do "
                "campo discordam sobre a natureza: a subcausa registra o defeito que a equipe "
                f"constatou, e a obra — \"{str(r.get('obra_descricao') or 'sem descrição').lower()}\" — "
                "registra o que foi trocado e sob qual projeto. Vazamento que evolui para queima "
                "acaba como queima; o total não muda, porque as duas categorias contam.")
            disc += 1
    print(f"  casos em que a subcausa e a obra discordam sobre a natureza da falha: {disc}")

    # ---------- o que a Crítica não conhece sai do indicador
    fora_critica = 0
    for r in fluxo["registros"]:
        if r.get("cascata") != "RETIDO — SEM INTERRUPÇÃO NA JANELA" or r.get("na_critica") != "NÃO":
            continue
        fora_critica += 1
        r.update({
            "fora_da_esteira": "SIM", "cascata": "EXCLUÍDA", "decisao": "EXCLUIR",
            "expurgo": "SIM", "expurgo_gatilho": "sem_interrupcao", "chega_e1": "NÃO",
            "exclusao_porque": ("o código do transformador não aparece na base de interrupção em "
                                "papel nenhum — nem como elemento com defeito, nem como "
                                "interrompido, nem como manobrado para restabelecer; conferido "
                                "linha a linha em dezembro/2025 e nos seis meses de 2026"),
            "cascata_motivo": ("Fora do indicador: o ativo não existe na base de interrupção. "
                               "Sem registro de interrupção não há evento a medir."),
            "confirmado": "", "chega_e2": "NÃO", "chega_e3": "NÃO",
            "e1_status": "—", "e2_status": "—", "e3_status": "—", "e4_status": "—",
            "ressalvas": "", "ressalvas_graves": "", "ressalvas_medias": "", "e4_alertas": "",
        })
    print(f"  ausentes da Crítica em qualquer papel, excluídos: {fora_critica}")

    # ---------- fora da janela da interrupção: sai do indicador
    # Regra do dono, dita assim: "se do primeiro passo aberto até o último passo o cara não
    # abriu a SS, e nem 24 horas depois do último passo, desconsidere e resuma nos excluídos
    # por fora da janela de interrupção".
    #
    # Vale para quem SOBROU aqui depois de a ausência ter saído: estes existem na Crítica, o
    # defeito até pode ser do próprio transformador, mas em outra data. A distância fica escrita
    # em cada um, porque 26 dias e 26 horas são coisas diferentes e quem lê precisa ver qual é.
    #
    # A CONTENÇÃO fica marcada, não excluída junto. Em 31 casos a ocorrência cabe inteira entre
    # a abertura e o término da SS: é o corte que a própria equipe fez para trocar, não um
    # evento alheio. Sai daqui como os outros — a regra é a regra —, mas com bandeira própria,
    # para o dono poder puxá-los de volta com uma decisão só.
    fora_janela = 0
    for r in fluxo["registros"]:
        if r.get("cascata") != "RETIDO — SEM INTERRUPÇÃO NA JANELA":
            continue
        ab, tm = parse(r.get("abertura")), parse(r.get("termino"))
        oi, of = parse(r.get("oc_ini")), parse(r.get("oc_fim"))
        contida = bool(ab and tm and oi and of and ab <= oi and of <= tm + datetime.timedelta(hours=2))
        r["oc_contida_no_servico"] = "SIM" if contida else "NÃO"
        dist = r.get("oc_dist_h")
        quanto = (f"a ocorrência mais próxima no código do ativo está a {abs(float(dist)):.0f} horas "
                  f"({abs(float(dist))/24:.0f} dias) da janela" if isinstance(dist, (int, float))
                  else "não há ocorrência no código do ativo em data nenhuma")
        fora_janela += 1
        r.update({
            "fora_da_esteira": "SIM", "cascata": "EXCLUÍDA", "decisao": "EXCLUIR",
            "expurgo": "SIM", "expurgo_gatilho": "fora_da_janela", "chega_e1": "NÃO",
            "exclusao_porque": (
                "a SS não foi aberta durante a ocorrência nem nas 24 horas seguintes ao último "
                f"passo dela — {quanto}"
                + (". A ocorrência cabe inteira entre a abertura e o término desta SS: pode ser "
                   "o corte que a própria equipe fez para trocar, e não um evento alheio"
                   if contida else "")),
            "cascata_motivo": "Fora do indicador: a SS não cai na janela de nenhuma interrupção.",
            "confirmado": "", "chega_e2": "NÃO", "chega_e3": "NÃO",
            "e1_status": "—", "e2_status": "—", "e3_status": "—", "e4_status": "—",
            "ressalvas": "", "ressalvas_graves": "", "ressalvas_medias": "", "e4_alertas": "",
        })
    print(f"  fora da janela da interrupção, excluídos: {fora_janela}")

    # ---------- e os que NUNCA tiveram defeito aberto neles vão para "ausente", por ordem dele
    # Estes apareciam como "fora da janela", e a frase da categoria promete o que eles não têm:
    # defeito registrado no próprio código, em outra data. Eles não têm em data nenhuma — só
    # aparecem na Crítica como interrompidos ou manobrados, nunca como o elemento onde o defeito
    # foi aberto. Ele leu os vinte e três, um a um, e mandou para "ausente da base de
    # interrupções". A categoria passa a significar "não há defeito aberto neste transformador
    # que sustente o caso", que é o que a peneira de fato mede — e aí a frase volta a ser
    # verdadeira para todo mundo que está lá dentro.
    #
    # Efeito colateral bem-vindo: "fora da janela" fica sendo exatamente quem TEM distância para
    # medir. Antes a barra dizia 85 e a planilha das faixas trazia 62, porque 23 não tinham de
    # onde medir. Os dois números passam a ser o mesmo.
    com_defeito_proprio = {cod for (_n, cod) in oc}
    sem_defeito_nenhum = 0
    for r in fluxo["registros"]:
        if str(r.get("expurgo_gatilho") or "") != "fora_da_janela":
            continue
        if str(r.get("trafo") or "").strip() in com_defeito_proprio:
            continue
        r["expurgo_gatilho"] = "sem_interrupcao"
        r["exclusao_porque"] = ("a Crítica nunca registrou defeito aberto neste transformador — em "
                                "data nenhuma dos sete meses. O código aparece na base, mas só como "
                                "interrompido ou manobrado, que é o que acontece com quem fica sem "
                                "energia por defeito de outro equipamento")
        r["cascata_motivo"] = f"Fora do indicador: {r['exclusao_porque']}."
        sem_defeito_nenhum += 1
    print(f"  sem defeito aberto neles em data nenhuma, somados a “ausente”: {sem_defeito_nenhum}")

    # ---------- até onde o caso desceu, dito em uma linha
    # A cascata já diz isso, mas dita como motivo de parada ("RETIDO — SEM PROVA DE TROCA"),
    # que responde POR QUE parou e não ONDE parou. São perguntas diferentes e o dono fez a
    # segunda. Um degrau numerado responde de relance, e a diferença entre "parou no 1" e
    # "parou no 4" é a diferença entre não ter prova nenhuma e ter prova com ressalva.
    ETAPA = {
        "EXCLUÍDA": (0, "Etapa 0 · saiu antes de entrar na esteira"),
        "RETIDO — SEM INTERRUPÇÃO NA JANELA": (1, "Etapa 1 · parou na interrupção"),
        "RETIDO — SEM PROVA DE TROCA": (3, "Etapa 3 · parou na análise de SS e OS"),
        "RETIDO — RESSALVA DA INTERRUPÇÃO": (4, "Etapa 4 · parou na ressalva"),
        "SAÍDA": (5, "Saiu pela ponta — passou pelas quatro peneiras"),
    }
    for r in fluxo["registros"]:
        grau, rotulo = ETAPA.get(r.get("cascata"), (None, r.get("cascata")))
        r["etapa_num"] = grau
        r["etapa_rotulo"] = rotulo

    # ---------- a troca que aumentou a potência
    # Não é veredito e não retém: quando um transformador queima, a equipe instala o que tem no
    # caminhão, e subir de 10 para 15 kVA é rotina. Mas 399 dos que chegam à saída trocaram por
    # um maior, e num caso em que o texto pede estrutura nova e potência maior a troca deixa de
    # ser só reposição. Fica à vista para quem for julgar, do jeito que o dono pediu: filtro,
    # nunca trava.
    def _kva(v):
        try:
            return float(str(v or "").replace(",", "."))
        except ValueError:
            return None
    subiu = 0
    for r in fluxo["registros"]:
        ret, inst = _kva(r.get("pot_ret")), _kva(r.get("pot_inst"))
        if ret and inst and inst > ret:
            r["potencia_subiu"] = "SIM"
            r["potencia_delta"] = f"{ret:g} → {inst:g} kVA"
            subiu += 1
        else:
            r["potencia_subiu"] = "NÃO"
            r["potencia_delta"] = ""
    print(f"  trocas que aumentaram a potência instalada: {subiu}")

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
