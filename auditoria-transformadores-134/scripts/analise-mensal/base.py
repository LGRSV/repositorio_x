"""O carregador comum da análise mensal.

Este arquivo existe para que ninguém precise redescobrir as armadilhas das bases
toda vez. Cada função aqui embute uma lição que custou retrabalho:

  1. A base de SS/OS troca de codificação entre extrações. A de 10/08/2026 veio
     em utf-8 e a de 11/08/2026 veio em latin-1, com o mesmo nome de arquivo.
     Por isso `ler_ss_os` detecta em vez de assumir.

  2. O texto da SS e da OS contém quebra de linha no meio. Ler linha a linha
     perde ~60% dos registros — e o pior é que não dá erro: você simplesmente
     conclui que a SS "não existe". `ler_ss_os` junta linhas até fechar as 64
     colunas e CONFERE o total.

  3. Na Crítica, as colunas DTA_INIC_ELE e DTA_FIM_ELE vêm VAZIAS em algumas
     extrações. Quem usa elas conclui "sem ocorrência" para todo mundo. As datas
     boas são DTA_ABERT e DTA_FECH. `ler_critica` valida isso e levanta erro.

  4. O mesmo ativo aparece na Crítica em três papéis diferentes, e o casamento
     vale em qualquer um deles.

  5. Transformador de serviço auxiliar (prefixo 51/57, alimentando religador 79
     ou regulador 58) NÃO é carga de cliente e fica fora do indicador.
"""

import os
import re
import unicodedata
from datetime import datetime, timedelta

# ── a janela do site ────────────────────────────────────────────────────────
# A SS casa com a ocorrência se a abertura dela cair entre
#   (início da ocorrência − ANTES) e (fim da ocorrência + JANELA).
# Só uma hora para trás: SS aberta muito antes da ocorrência não casa.
JANELA = timedelta(hours=24)
ANTES = timedelta(hours=1)

# ── prefixos de código operativo ────────────────────────────────────────────
# Conferido contra as 1.305 de jan–jun/2026: o prefixo 57 responde por 97,6%
# do indicador, 53 por 2,1% e 52 por 0,2%. Ou seja, 57/53/52 é transformador de
# distribuição normal e NÃO deve levantar suspeita. O auxiliar é o 51.
PREFIXO = {
    "51": "serviço auxiliar",
    "56": "particular",
    "58": "regulador",
    "79": "religador",
    "57": "distribuição de cliente",
    "53": "distribuição de cliente",
    "52": "distribuição de cliente",
}
DISTRIBUICAO = {"57", "53", "52"}
# um auxiliar costuma espelhar o código do equipamento que alimenta, trocando
# só o prefixo: religador 7950099122 ↔ auxiliar 5150099122
ESPELHO = {"51": ("79", "58")}


def _texto(v):
    return "" if v is None else str(v).strip()


def _sem_acento(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def data(s):
    """Aceita os quatro formatos que aparecem nas bases. Devolve None sem drama."""
    s = _texto(s)
    for f in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%d/%m/%Y",
              "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, f)
        except ValueError:
            pass
    return None


def chave(v):
    """Normaliza série e tombamento para comparação.

    Tira espaço, ponto, traço, barra, zeros à esquerda E letra nas pontas.
    A letra importa: a ITAM grava C233582 na plaqueta e a equipe digita 233582.
    Sem tirar a letra, o mesmo equipamento vira dois.

    ATENÇÃO: a letra às vezes DISTINGUE unidades (C249930 e Z249930 são
    transformadores diferentes). Por isso quem funde duas chaves iguais deve
    exigir corroboração de tombamento, marca ou potência — ver `mesma_peca`.
    """
    v = _texto(v).upper().replace(" ", "").replace(".", "").replace("-", "").replace("/", "")
    if v in ("", "N/A", "NAOINFORMADO", "NÃOINFORMADO", "ILEGIVEL", "ILEGÍVEL", "0", "00"):
        return ""
    v = re.sub(r"^[A-Z]+", "", v)
    v = re.sub(r"[A-Z]+$", "", v)
    return v.lstrip("0") or ""


def mesma_peca(a, b):
    """True se dois registros descrevem o mesmo equipamento físico.

    Exige a chave igual E pelo menos uma corroboração — marca ou potência.
    Chave sozinha colide: numerações de série, tombamento e controle são
    espaços independentes que se cruzam por acaso.
    """
    if not (chave(a.get("serie")) and chave(a.get("serie")) == chave(b.get("serie"))):
        return False
    marca = _texto(a.get("marca")).upper() and _texto(a.get("marca")).upper() == _texto(b.get("marca")).upper()
    pot = _texto(a.get("potencia")) and _texto(a.get("potencia")) == _texto(b.get("potencia"))
    return bool(marca or pot)


# ── base de SS/OS ───────────────────────────────────────────────────────────
def ler_ss_os(*arquivos):
    """Lê as partes da base de SS/OS e devolve (cabecalho, registros).

    Detecta a codificação, junta as linhas quebradas e confere o total. Se o
    número de registros vier muito abaixo do número de linhas com o separador,
    algo está errado e é melhor estourar aqui do que entregar análise furada.
    """
    cab = None
    registros = []
    for caminho in arquivos:
        bruto = None
        for enc in ("utf-8", "latin-1"):
            try:
                bruto = open(caminho, encoding=enc).read()
                usada = enc
                break
            except UnicodeDecodeError:
                continue
        if bruto is None:
            raise RuntimeError(f"não consegui decodificar {caminho}")
        linhas = bruto.split("\n")
        c = linhas[0].split("@")
        n = len(c)
        if n != 64:
            raise RuntimeError(f"{caminho}: esperava 64 colunas, achei {n}")
        if cab is None:
            cab = c
        elif c != cab:
            raise RuntimeError(f"{caminho}: cabeçalho diferente do primeiro arquivo")
        antes = len(registros)
        buf = None
        for l in linhas[1:]:
            buf = l if buf is None else buf + " " + l
            if buf.count("@") >= n - 1:
                campos = buf.split("@")
                if len(campos) > n:               # o texto tinha @ dentro (e-mail)
                    campos = campos[: n - 1] + ["@".join(campos[n - 1:])]
                registros.append(campos)
                buf = None
        # sanidade: o total de @ dividido por (n-1) é uma boa estimativa
        estimado = bruto.count("@") // (n - 1)
        lidos = len(registros) - antes
        if lidos < estimado * 0.95:
            raise RuntimeError(
                f"{caminho}: li {lidos} registros mas o arquivo sugere ~{estimado}. "
                f"O parser de linha quebrada falhou — não siga com este resultado."
            )
        print(f"  {os.path.basename(caminho)}: {lidos} registros · {usada}")
    return cab, registros


def indexar(cab):
    """Devolve uma função campo(registro, nome) — a base repete nomes de coluna."""
    idx = {}
    for i, c in enumerate(cab):
        if c not in idx:
            idx[c] = i
    return lambda reg, nome: _texto(reg[idx[nome]]) if nome in idx else ""


# ── Crítica ─────────────────────────────────────────────────────────────────
PAPEIS = ("COD_ELE_PROBLEMA", "COD_ELE_INTERROMPIDO", "COD_ELE_FECHADO")


def ler_critica(caminho):
    """Lê a Crítica e devolve (indice, ocorrencias).

    Valida que as colunas de data usadas têm conteúdo. Já aconteceu de
    DTA_INIC_ELE e DTA_FIM_ELE virem vazias na extração inteira, o que faz
    qualquer análise concluir "nenhuma ocorrência" sem dar erro.
    """
    bruto = None
    for enc in ("latin-1", "utf-8"):
        try:
            bruto = open(caminho, encoding=enc).read()
            break
        except UnicodeDecodeError:
            continue
    linhas = bruto.split("\n")
    cab = [c.strip() for c in linhas[0].split(";")]
    I = {c: n for n, c in enumerate(cab)}
    oc = [l.split(";") for l in linhas[1:] if l.strip() and len(l.split(";")) >= len(cab)]
    if not oc:
        raise RuntimeError(f"{caminho}: nenhuma ocorrência lida")
    for col in ("DTA_ABERT", "DTA_FECH"):
        if col not in I:
            raise RuntimeError(f"{caminho}: falta a coluna {col}")
        cheias = sum(1 for o in oc if _texto(o[I[col]]))
        if cheias < len(oc) * 0.5:
            raise RuntimeError(
                f"{caminho}: a coluna {col} está vazia em {len(oc)-cheias} de {len(oc)}. "
                f"Confira se esta extração usa outro par de colunas de data."
            )
    print(f"  {os.path.basename(caminho)}: {len(oc)} ocorrências")
    return I, oc


def ocorrencias_do_ativo(I, oc, codigo):
    """Todas as ocorrências que citam o ativo, em qualquer um dos três papéis."""
    saida = []
    for o in oc:
        papeis = [p.replace("COD_ELE_", "").lower() for p in PAPEIS if _texto(o[I[p]]) == codigo]
        if papeis:
            saida.append((o, papeis))
    return saida


def casa_na_janela(abertura_ss, I, ocorrencia):
    """Devolve (casou, delta_inicio_h, delta_fim_h).

    casou é True quando a abertura da SS cai entre (início − 1 h) e (fim + 24 h).
    """
    ini = data(ocorrencia[I["DTA_ABERT"]])
    fim = data(ocorrencia[I["DTA_FECH"]])
    if not (abertura_ss and ini and fim):
        return None, None, None
    d1 = (abertura_ss - ini).total_seconds() / 3600
    d2 = (abertura_ss - fim).total_seconds() / 3600
    return (ini - ANTES) <= abertura_ss <= (fim + JANELA), round(d1, 1), round(d2, 1)


def veredito_critica(abertura_ss, I, oc, codigo):
    """Resume o estado do ativo na Crítica: SIM, fora da janela ou AUSENTE."""
    achadas = ocorrencias_do_ativo(I, oc, codigo)
    if not achadas:
        return "AUSENTE", []
    detalhe = []
    casou = False
    for o, papeis in achadas:
        ok, d1, d2 = casa_na_janela(abertura_ss, I, o)
        casou = casou or bool(ok)
        detalhe.append({
            "inicio": _texto(o[I["DTA_ABERT"]]), "fim": _texto(o[I["DTA_FECH"]]),
            "papeis": "+".join(papeis), "na_janela": bool(ok),
            "delta_inicio_h": d1, "delta_fim_h": d2,
            "causa": _texto(o[I.get("DES_CAUSA_INTER_CAU", 0)]) if "DES_CAUSA_INTER_CAU" in I else "",
            "subcausa": _texto(o[I["DES_SUB_CAUSA_INTER_SCR"]]) if "DES_SUB_CAUSA_INTER_SCR" in I else "",
            "clientes": _texto(o[I["QTD_CONS_INTER_FAT"]]) if "QTD_CONS_INTER_FAT" in I else "",
            "duracao_min": _texto(o[I["DURACAO"]]) if "DURACAO" in I else "",
            "observacao": _texto(o[I["OBSERVACAO"]]) if "OBSERVACAO" in I else "",
        })
    return ("SIM" if casou else "fora da janela"), detalhe


# ── transformador auxiliar ──────────────────────────────────────────────────
def suspeita_auxiliar(codigo, texto_ss="", clientes=None):
    """Aplica a assinatura de transformador de serviço auxiliar.

    Devolve (grau, evidencias). Grau é FORTE, SUSPEITA ou NAO.

    A assinatura foi levantada sobre 176 circuitos e 712 auxiliares reais:
    prefixo 51 ou 57, código espelhando o do religador (79) ou regulador (58),
    zero cliente faturado, e distância de 1 a 6 metros do equipamento. Nenhum
    auxiliar medido passou de 20 m e o caso mais próximo do indicador estava a
    89 m — há um vão limpo entre as duas populações.

    14% dos auxiliares NÃO têm código espelhado, então a ausência de espelho
    não descarta nada. A distância no KML é a confirmação — ver `distancia_ate`.
    """
    ev = []
    cod = _texto(codigo)
    pref = cod[:2]
    if pref in DISTRIBUICAO:
        # 57, 53 e 52 são distribuição de cliente — não levantam suspeita por si.
        # A checagem de texto continua, porque auxiliar com código de distribuição
        # existe: 2 dos 7 excluídos por auxiliar em jan–jun tinham prefixo 57.
        pass
    elif pref in PREFIXO:
        ev.append(f"prefixo {pref} = {PREFIXO[pref]}")
    t = _sem_acento(_texto(texto_ss)).upper()
    for palavra in ("ALIMENTA O RELIGADOR", "ALIMENTA O REGULADOR", "SERVICO AUXILIAR",
                    "AUXILIAR DO RELIGADOR", "DO RELIGADOR", "DO REGULADOR"):
        if palavra in t:
            ev.append(f'o texto da SS diz "{palavra.lower()}"')
            break
    espelhos = []
    for p in ESPELHO.get(pref, ()):
        alvo = p + cod[2:]
        if alvo in t.replace(" ", ""):
            espelhos.append(alvo)
            ev.append(f"o texto cita {alvo} — é o código espelhado trocando {pref} por {p}")
    if clientes not in (None, "") and str(clientes).strip() in ("0", "0.0"):
        ev.append("zero cliente faturado")
    texto_denuncia = any("texto da SS diz" in e or "código espelhado" in e for e in ev)
    if pref in ESPELHO and (espelhos or texto_denuncia or len(ev) >= 2):
        return "FORTE", ev
    if pref in ESPELHO:
        return "SUSPEITA", ev
    if texto_denuncia:
        # prefixo de distribuição, mas o texto entrega: aconteceu em 2 dos 7
        # auxiliares excluídos no primeiro semestre
        return "SUSPEITA", ev
    return "NAO", ev


def distancia_ate(lat1, lon1, lat2, lon2):
    """Haversine em metros. Serve para medir auxiliar contra religador/regulador."""
    from math import radians, sin, cos, asin, sqrt
    if None in (lat1, lon1, lat2, lon2):
        return None
    p1, p2 = radians(float(lat1)), radians(float(lat2))
    dp = p2 - p1
    dl = radians(float(lon2) - float(lon1))
    a = sin(dp / 2) ** 2 + cos(p1) * cos(p2) * sin(dl / 2) ** 2
    return round(2 * 6371000 * asin(sqrt(a)), 1)


def pontos_do_kml(caminho, pasta=None):
    """Extrai código -> (lat, lon) de um KML de circuito.

    Os transformadores de distribuição estão na pasta ET. A pasta chamada
    "Transformador" está VAZIA em todos os 176 circuitos conferidos — quem
    procura lá conclui que não há transformador nenhum.
    """
    s = open(caminho, encoding="utf-8", errors="replace").read()
    if pasta:
        m = re.search(
            r"<Folder>\s*<name>%s</name>(.*?)</Folder>" % re.escape(pasta), s, re.S | re.I)
        if not m:
            return {}
        s = m.group(1)
    saida = {}
    for nome, coord in re.findall(
            r"<Placemark>.*?<name>([^<]*)</name>.*?<coordinates>\s*([-\d.,\s]+?)\s*</coordinates>",
            s, re.S):
        partes = coord.strip().split(",")
        if len(partes) >= 2:
            try:
                saida[nome.strip()] = (float(partes[1]), float(partes[0]))
            except ValueError:
                pass
    return saida


# ── SS gêmea ────────────────────────────────────────────────────────────────
def gemeas(campo, registros, numero_ss):
    """Encontra a SS duplicada de repasse.

    Padrão confirmado em agosto/2026: duas SS com o MESMO timestamp ao segundo
    e o MESMO texto, uma REPASSADA sem OS (o registro de repasse entre órgãos)
    e outra ATENDIDA com OS. É o mesmo evento contado duas vezes; contar as
    duas infla o indicador.
    """
    alvo = next((r for r in registros if campo(r, "NUMERO_SS") == numero_ss), None)
    if not alvo:
        return []
    ab = campo(alvo, "DATA_ABERTURA_SS")
    txt = campo(alvo, "DESCRIPTION_SS").strip()[:120]
    trafo = campo(alvo, "NUM_TRAFO")
    saida = []
    for r in registros:
        if campo(r, "NUMERO_SS") == numero_ss:
            continue
        if campo(r, "NUM_TRAFO") == trafo and campo(r, "DATA_ABERTURA_SS") == ab \
                and campo(r, "DESCRIPTION_SS").strip()[:120] == txt:
            saida.append({
                "ss": campo(r, "NUMERO_SS"), "situacao": campo(r, "SITUACAO_SS"),
                "os": campo(r, "NUMERO_OS"),
                "duplicata_de_repasse": not campo(r, "NUMERO_OS")
                and "REPASSADA" in campo(r, "SITUACAO_SS").upper(),
            })
    return saida


# ── possível garantia ───────────────────────────────────────────────────────
# Regra nova, nascida de julho/2026: o ativo 5700231148 teve duas SS em onze
# dias, e a peça instalada na primeira é exatamente a retirada na segunda. Isso
# não aparece olhando o código operativo — o código é do POSTE e não muda quando
# o transformador muda. Só a SÉRIE mostra.
#
# ATENÇÃO AO QUE ESTA REGRA NÃO É. Ela NÃO está validada. A tentativa de validar
# contra as SS que a base marca ORIGEM_SS = GARANTIA DE TRAFO não fechou: das 106
# declaradas, 95 não têm série na peça retirada e a regra não tem como enxergá-las;
# das 11 restantes ela reencontrou 3, e essas 3 duraram 441 dias de mediana. Ou
# seja: as garantias que a operação de fato reconheceu passaram de um ano em campo.
# É por isso que existe a faixa OLHAR até 730 dias — um corte de 12 meses deixaria
# as três de fora. Com três casos não se calibra prazo; o prazo real tem de vir do
# CONTRATO com a reformadora e com o fabricante.
#
# E a suspeita natural NÃO se confirma: peça reformada teve mediana de 160 dias
# contra 182 da peça nova, com 40% e 41% falhando em até 90 dias. Praticamente
# iguais. Se houver problema com a reforma, não é este número que vai prová-lo.

GARANTIA_FORTE = 90
GARANTIA_SUSPEITA = 365
GARANTIA_OLHAR = 730


def serie_identifica(v):
    """A série serve para casar peça?

    Série com menos de quatro dígitos ou de um dígito só repetido não identifica
    nada e casa com qualquer coisa. Sem este filtro a regra monta cadeia em cima
    da série "1" e entrega parentesco inventado — o mesmo tipo de erro que o
    cruzamento de controle com tombamento já produziu nesta auditoria.
    """
    k = chave(v)
    return len(k) >= 4 and len(set(k)) > 1


def cadeias_de_peca(campo, registros):
    """Toda vez que a peça retirada numa SS foi instalada numa SS anterior.

    Devolve lista de dicionários com a SS que instalou, a que retirou, quantos
    dias a peça durou em campo e o grau. Cadeia de zero dia em posto diferente é
    descartada: peça não sai de um poste e aparece em outro no mesmo dia, isso é
    erro de digitação ou baixa de estoque, não histórico.
    """
    instalou = {}
    for r in registros:
        v = campo(r, "NS_INSTALADO")
        if serie_identifica(v):
            instalou.setdefault(chave(v), []).append(r)

    saida = []
    for b in registros:
        v = campo(b, "NS_RETIRADO")
        if not serie_identifica(v):
            continue
        dt_b = data(campo(b, "DATA_ABERTURA_SS"))
        if not dt_b:
            continue
        for a in instalou.get(chave(v), []):
            if a is b:
                continue
            dt_a = data(campo(a, "DATA_ABERTURA_SS"))
            if not dt_a or dt_a >= dt_b:
                continue
            dias = (dt_b - dt_a).days
            mesmo = campo(a, "NUM_TRAFO").strip() == campo(b, "NUM_TRAFO").strip()
            if dias == 0 and not mesmo:
                continue
            saida.append({
                "instalou": a, "retirou": b, "dias": dias, "mesmo_posto": mesmo,
                "serie": campo(b, "NS_RETIRADO"),
                "reformada": campo(a, "TRAFO_INSTALADO_É_REFORMADO").strip(),
                "reformadora": campo(a, "REFORMADORA_INSTALADO").strip(),
                "grau": grau_de_garantia(dias, mesmo),
            })
    return saida


def grau_de_garantia(dias, mesmo_posto):
    """FORTE / SUSPEITA / OLHAR / REMANEJO / FORA.

    Os cortes são de leitura, não de contrato. Enquanto o prazo contratual não
    entrar aqui, nenhum destes graus retira ou acrescenta caso ao indicador: eles
    dizem o que merece ser olhado, e só.
    """
    if not mesmo_posto:
        return "REMANEJO"
    if dias <= GARANTIA_FORTE:
        return "FORTE"
    if dias <= GARANTIA_SUSPEITA:
        return "SUSPEITA"
    if dias <= GARANTIA_OLHAR:
        return "OLHAR"
    return "FORA"


# ── a geometria já extraída ─────────────────────────────────────────────────
def geometria(caminho="dados/kml-pontos.json"):
    """Lê dados/kml-pontos.json e devolve (por_codigo, trechos_bt).

    Prefira esta função a pontos_do_kml(): os 176 KML de origem somam 294 MB e viviam
    num diretório descartável. O extrato tem 12 MB, está no repositório e reproduz as
    mesmas conclusões — inclusive a do transformador auxiliar.

    por_codigo mapeia o código para uma lista de (circuito, tipo, lat, lon). É lista e
    não valor único porque o mesmo código pode aparecer em mais de um circuito, e
    esconder isso já produziu conclusão errada nesta auditoria.

    ARMADILHA: o prefixo do código muda entre a SS e o KML para o MESMO equipamento. A
    solicitação chama o auxiliar de 5150099122 e o cadastro do KML chama de 5750099122 —
    mesmos oito dígitos finais, prefixo diferente. Procurar pelo código inteiro não acha.
    Use `por_final` para casar pelos dígitos finais.
    """
    import json as _json
    d = _json.load(open(caminho, encoding="utf-8"))
    por_codigo, bt = {}, {}
    for circ, v in d["circuitos"].items():
        contagem = v.get("trechos_bt", {})
        for tipo, nome, lon, lat in v["pontos"]:
            por_codigo.setdefault(nome, []).append((circ, tipo, lat, lon))
            # Todo ET entra com contagem explícita, inclusive zero. Sem isto, "não tem
            # trecho de baixa" e "não está neste extrato" viram a mesma resposta — e é
            # justamente o ZERO que denuncia o auxiliar. Ambiguidade no lugar errado.
            if tipo == "ET":
                bt[nome] = contagem.get(nome, 0)
    return por_codigo, bt


def por_final(por_codigo, digitos=8):
    """Índice pelos últimos N dígitos, para atravessar a troca de prefixo entre bases."""
    saida = {}
    for nome, ocorrencias in por_codigo.items():
        so_num = "".join(c for c in nome if c.isdigit())
        if len(so_num) >= digitos:
            saida.setdefault(so_num[-digitos:], []).extend(ocorrencias)
    return saida
