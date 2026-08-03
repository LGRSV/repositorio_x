#!/usr/bin/env python3
"""Confere os 17 invariantes de AUDITORIA_NOTURNA.md contra o dado.

Cada invariante reporta CONFERE, FALHA ou A OLHO (quando só pessoa consegue julgar).
Nada aqui escreve no repositório: é leitura pura.

Uso: python3 scripts/auditoria_invariantes.py   (a partir de auditoria-transformadores-134/)
"""
import json
import os
import re
import sys
from collections import Counter

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(RAIZ, "public")

resultados = []


def relata(n, titulo, ok, detalhe):
    """ok: True CONFERE, False FALHA, None A OLHO."""
    resultados.append((n, titulo, ok, detalhe))
    marca = {True: "CONFERE", False: "FALHA  ", None: "A OLHO "}[ok]
    print(f"{marca} {n:>2}. {titulo}")
    for linha in detalhe.splitlines():
        print(f"          {linha}")


fluxo = json.load(open(os.path.join(PUB, "fluxo-1510.json")))
regs = fluxo["registros"]
resumo = fluxo["resumo"]
metodo = json.load(open(os.path.join(PUB, "metodo.json")))
page = open(os.path.join(RAIZ, "app", "page.tsx"), encoding="utf-8").read()

casc = Counter(r["cascata"] for r in regs)
C = lambda k: casc.get(k, 0)
SEM_INT = "RETIDO — SEM INTERRUPÇÃO NA JANELA"
DUP = "RETIDO — SS DUPLICADA"
SEM_DES = "RETIDO — SEM DESLOCAMENTO"
SEM_PROVA = "RETIDO — SEM PROVA DE TROCA"
EXCL = "EXCLUÍDO NA LEITURA"
RESS = "RETIDO — RESSALVA DA INTERRUPÇÃO"
SAIDA = "SAÍDA"

print("=" * 78)
print("AUDITORIA DOS INVARIANTES — fluxo-1510.json")
print("=" * 78)

# ---------------------------------------------------------------- integridade
n_ss = len({r["ss"] for r in regs})
relata(1, "1.510 registros e ss único", len(regs) == 1510 and n_ss == 1510,
       f"registros={len(regs)}  ss distintos={n_ss}")

soma = sum(casc.values())
relata(2, "a soma das cascatas dá 1.510", soma == 1510,
       "  ".join(f"{k}={v}" for k, v in casc.most_common()) + f"\nsoma={soma}")

e2 = 1510 - (C(SEM_INT) + C(DUP))
e3 = e2 - C(SEM_DES)
e4 = e3 - C(SEM_PROVA) - C(EXCL)
fim = e4 - C(RESS)
g_e2 = sum(1 for r in regs if r["chega_e2"] == "SIM")
g_e3 = sum(1 for r in regs if r["chega_e3"] == "SIM")
ok3 = e2 == g_e2 and e3 == g_e3 and fim == C(SAIDA)
relata(3, "a corrente fecha nas quatro passagens", ok3,
       f"1510 − ({C(SEM_INT)} + {C(DUP)}) = {e2}   chega_e2 gravado = {g_e2}\n"
       f"{e2} − {C(SEM_DES)} = {e3}                chega_e3 gravado = {g_e3}\n"
       f"{e3} − {C(SEM_PROVA)} − {C(EXCL)} = {e4}\n"
       f"{e4} − {C(RESS)} = {fim}                  SAÍDA gravada = {C(SAIDA)}")


def pela_regra(r):
    if r["expurgo"] == "SIM":
        return EXCL
    if r["disputa_perdida"] == "SIM":
        return DUP
    if r["chega_e2"] == "NÃO":
        return SEM_INT
    if r["chega_e3"] == "NÃO":
        return SEM_DES
    if r["e3_status"] == "RETIDO":
        return SEM_PROVA
    if str(r["ressalvas_graves"]).strip() or str(r["ressalvas_medias"]).strip():
        return RESS
    return SAIDA


divergem = [r for r in regs if pela_regra(r) != r["cascata"]]
relata(4, "a regra da esteira reproduz os 1.510 rótulos", not divergem,
       f"divergências={len(divergem)}" + ("" if not divergem else
       "\n" + "\n".join(f"{r['ss']}: regra={pela_regra(r)} gravado={r['cascata']}"
                        for r in divergem[:8])))

erros5 = [r for r in regs if not (
    (r["decisao"] == "INCLUIR") == (r["cascata"] == SAIDA)
    and (r["decisao"] == "EXCLUIR") == (r["cascata"] == EXCL))]
relata(5, "decisão e cascata são a mesma coisa dita duas vezes", not erros5,
       f"fora do casamento={len(erros5)}  "
       + "  ".join(f"{k}={v}" for k, v in Counter(r['decisao'] for r in regs).items()))

conf = Counter(r["confirmado"] for r in regs if str(r["confirmado"]).strip())
fora = [r for r in regs if str(r["confirmado"]).strip() and r["cascata"] != SAIDA]
relata(6, "confirmado só existe na saída, e soma a saída",
       not fora and sum(conf.values()) == C(SAIDA),
       f"QUEIMADO={conf.get('QUEIMADO', 0)}  AVARIADO={conf.get('AVARIADO', 0)}  "
       f"soma={sum(conf.values())}  SAÍDA={C(SAIDA)}  preenchidos fora da saída={len(fora)}")

div7 = []
for bloco, campo in [("cascata", "cascata"), ("decisao", "decisao"),
                     ("confirmado", "confirmado"), ("fato", "fato"),
                     ("leitura", "leitura"), ("e1", "e1_nivel"),
                     ("decisaoMatriz", "decisao_matriz")]:
    gravado = resumo.get(bloco, {})
    recontado = Counter(r[campo] for r in regs if str(r[campo]).strip())
    for k, v in gravado.items():
        if recontado.get(k, 0) != v:
            div7.append(f"{bloco}.{k}: resumo={v} recontado={recontado.get(k, 0)}")
for chave, valor in [("total", len(regs)), ("confirmadoTotal", C(SAIDA)),
                     ("expurgos", C(EXCL)), ("duplicadas", C(DUP))]:
    if resumo.get(chave) != valor:
        div7.append(f"{chave}: resumo={resumo.get(chave)} medido={valor}")
relata(7, "todo bloco de resumo bate com a recontagem", not div7,
       "\n".join(div7) if div7 else "os 7 blocos e os 4 totais batem")

# ------------------------------------------------------------------ coerência
viola8 = [r for r in regs if r["e1_nivel"] == "FORA"
          and isinstance(r.get("oc_dist_h"), (int, float)) and abs(r["oc_dist_h"]) <= 24]
relata(8, "nenhum FORA com ocorrência dentro de 24 horas", not viola8,
       f"violações={len(viola8)}" + ("" if not viola8 else
       "\n" + "\n".join(f"{r['ss']}: oc_dist_h={r['oc_dist_h']}" for r in viola8[:8])))

def lp(v):
    return "" if v is None else str(v).strip()


# uma ocorrência só vira prova quando o casamento é A, B ou C. Duas SS podem apontar para a
# mesma ocorrência sem disputá-la: se uma delas está FORA da janela, ela não reivindica nada.
prova = {}
for r in regs:
    if lp(r["oc_num"]) and r["e1_nivel"] in ("A", "B", "C"):
        prova.setdefault(lp(r["oc_num"]), []).append(r)
disputadas = {k: v for k, v in prova.items() if len(v) > 1}
mal_resolvidas = []
for oc, rs in disputadas.items():
    perdem = [r for r in rs if r["disputa_perdida"] == "SIM"]
    if len(rs) != 2 or len(perdem) != 1 or perdem[0]["cascata"] != DUP:
        mal_resolvidas.append(f"{oc}: {len(rs)} SS, {len(perdem)} marcadas como perdedoras")
    # o carimbo é de quem cede, não dos dois: o dono segue com a prova limpa
    elif not lp(perdem[0].get("e1_conflito")):
        mal_resolvidas.append(f"{oc}: {perdem[0]['ss']} cede a prova e está sem e1_conflito")
perdedores = [r for r in regs if r["disputa_perdida"] == "SIM"]
solto = [r for r in perdedores if r["cascata"] != DUP]
relata(9, "toda ocorrência disputada é resolvida: um dono, um duplicado, os dois marcados",
       not mal_resolvidas and not solto,
       f"ocorrências reivindicadas como prova por mais de uma SS={len(disputadas)}  "
       f"perdedores={len(perdedores)}  perdedor fora de SS DUPLICADA={len(solto)}\n"
       f"e1_conflito preenchido em {sum(1 for r in regs if lp(r.get('e1_conflito')))} "
       f"({len(perdedores)} perdedores + {sum(1 for r in regs if lp(r.get('e1_conflito'))) - len(perdedores)} "
       f"que apontam para ocorrência de outra SS estando fora da janela)\n"
       + ("\n".join(mal_resolvidas) if mal_resolvidas else "todas as disputas resolvidas"))

exp_sim = {r["ss"] for r in regs if r["expurgo"] == "SIM"}
casc_exc = {r["ss"] for r in regs if r["cascata"] == EXCL}
relata(10, "expurgo e EXCLUÍDO NA LEITURA são o mesmo conjunto", exp_sim == casc_exc,
       f"expurgo=SIM: {len(exp_sim)}  cascata=EXCLUÍDO: {len(casc_exc)}  "
       f"diferença simétrica={len(exp_sim ^ casc_exc)}")

marcadas = [r for r in regs if r.get("borda_2025") == "SIM" or r.get("tmae_gap_jan") == "SIM"]
sem_aviso = [r for r in marcadas if not str(r.get("lacuna_base", "")).strip()]
relata(11, "toda SS em lacuna de base carrega o aviso no dossiê", not sem_aviso,
       f"marcadas={len(marcadas)} (borda_2025={sum(1 for r in regs if r.get('borda_2025')=='SIM')}, "
       f"tmae_gap_jan={sum(1 for r in regs if r.get('tmae_gap_jan')=='SIM')})  "
       f"sem lacuna_base={len(sem_aviso)}")

# ------------------------------------------------------------------ interface
MOJI = re.compile(r"[ÃÂ][\x80-\xBF]")
achados = []
for nome, txt in [("app/page.tsx", page),
                  ("public/metodo.json", open(os.path.join(PUB, "metodo.json"), encoding="utf-8").read())]:
    for m in MOJI.finditer(txt):
        achados.append(f"{nome}: {txt[max(0, m.start()-30):m.start()+30]!r}")
campos_txt = ["desc_ss", "desc_os", "narrativa", "oc_obs", "at_obs", "motivo_decisao",
              "cascata_motivo", "fato_texto", "leitura_texto", "lacuna_base"]
n_reg_moji = 0
for r in regs:
    for c in campos_txt:
        if isinstance(r.get(c), str) and MOJI.search(r[c]):
            n_reg_moji += 1
            if len(achados) < 12:
                achados.append(f"registro {r['ss']}.{c}")
            break
relata(12, "nenhum mojibake em page.tsx, metodo.json e nos textos dos registros",
       not achados,
       f"registros afetados={n_reg_moji}\n" + "\n".join(achados[:10]) if achados
       else "nenhuma ocorrência de [ÃÂ][\\x80-\\xBF]")

tipo = re.search(r"type Modulo\s*=\s*([^;]+);", page).group(1)
no_tipo = set(re.findall(r'"(\w+)"', tipo))
rec_bloco = page[page.index("const RECORTES"):page.index("const NAV")]
no_recortes = set(re.findall(r"^\s{4}(\w+):\s*\[", rec_bloco, re.M))
nav_bloco = page[page.index("const NAV"):page.index("const NAV") + 4000]
no_nav = set(re.findall(r'id:\s*"(\w+)"', nav_bloco))
falta_rec = no_nav - no_recortes
falta_tipo = (no_nav | no_recortes) - no_tipo
relata(13, "NAV, RECORTES e o tipo Modulo listam os mesmos módulos",
       not falta_rec and not falta_tipo,
       f"NAV={len(no_nav)} RECORTES={len(no_recortes)} tipo Modulo={len(no_tipo)}\n"
       f"em NAV sem chave em RECORTES (quebra a aba): {sorted(falta_rec) or 'nenhum'}\n"
       f"usado mas ausente do tipo Modulo: {sorted(falta_tipo) or 'nenhum'}")

# 14 — números escritos à mão no metodo.json
blocos = {b["id"]: b for b in metodo["blocos"]}
problemas = []


def texto_do_bloco(bid):
    b = blocos.get(bid, {})
    partes = list(b.get("paragrafos", []))
    for it in b.get("itens", []):
        partes.append(it["texto"] if isinstance(it, dict) else str(it))
    tab = b.get("tabela")
    if tab:
        for linha in tab["linhas"]:
            partes.extend(str(c) for c in linha)
    return "\n".join(partes)


def num(x):
    return f"{x:,}".replace(",", ".")


# tabela da cascata
tab = blocos["cascata"]["tabela"]["linhas"]
# Antes só quatro células eram conferidas — e as que envelheceram foram justamente as que
# ficavam de fora: "1.279 + 22" somando 1.301 quando a etapa recebia 1.300, o retido da
# segunda peneira em 299 quando eram 298, e a terceira passando 952 quando passa 953.
# Agora toda célula de número da tabela é conferida contra o dado.
e4 = e3 - C(EXCL) - C(SEM_PROVA)
esperado_tab = [
    (0, "Recebe", [1510]), (0, "Passa", [e2]), (0, "Fica retido", [C(SEM_INT), C(DUP)]),
    (1, "Recebe", [e2]), (1, "Passa", [e3]), (1, "Fica retido", [C(SEM_DES)]),
    (2, "Recebe", [e3]), (2, "Passa", [e4]), (2, "Fica retido", [C(SEM_PROVA), C(EXCL)]),
    (3, "Recebe", [e4]), (3, "Passa", [C(SAIDA)]), (3, "Fica retido", [C(RESS)]),
]
COL = {"Recebe": 1, "Passa": 2, "Fica retido": 3}
for i, col, esperados in esperado_tab:
    if i >= len(tab):
        continue
    celula = str(tab[i][COL[col]])
    # a célula pode somar parcelas ("1.278 + 22"): aceita se as parcelas somam o esperado
    numeros = [int(n.replace(".", "")) for n in re.findall(r"\d[\d.]*", celula)]
    for esp in esperados:
        if num(esp) in celula or esp in numeros or (len(numeros) > 1 and sum(numeros) == esp):
            continue
        problemas.append(f"cascata/linha {i+1}/{col}: tela diz {celula!r}, dado diz {num(esp)}")
if len(tab) < 4:
    problemas.append(f"cascata: a tabela tem {len(tab)} peneiras e a esteira tem 4 "
                     f"(falta a ressalva, que retém {C(RESS)})")

# frase de resultado do bloco correcoes
txt_cor = texto_do_bloco("correcoes")
q = conf.get("QUEIMADO", 0)
a = conf.get("AVARIADO", 0)
for velho, novo, oque in [("874", num(C(SAIDA)), "confirmados"),
                          ("848", num(q), "queimados"),
                          ("26 avariados", f"{a} avariados", "avariados")]:
    if velho in txt_cor:
        problemas.append(f"correcoes: a frase ainda diz {velho!r} para {oque}; o dado diz {novo}")
if "ficou igual" in txt_cor and "874" in txt_cor:
    problemas.append("correcoes: mantém 'o resultado da esteira ficou igual' com os números "
                     "de antes da correção do dano externo, que moveu 874 → 884")

# totais do resumo do metodo
txt_res = "\n".join(metodo["resumo"]["paragrafos"])
mat = resumo["decisaoMatriz"]
if num(mat["INCLUIR"]) in txt_res and num(C(SAIDA)) not in txt_res:
    problemas.append(f"resumo: usa os números da matriz ({num(mat['INCLUIR'])}/"
                     f"{mat['REVISÃO']}/{mat['EXCLUIR']}) sem dizer que são da matriz; "
                     f"a esteira entrega {C(SAIDA)}/{sum(1 for r in regs if r['decisao']=='REVISÃO')}/{C(EXCL)}")

relata(14, "todo número escrito à mão no metodo.json bate com o dado", not problemas,
       "\n".join(problemas) if problemas else "os números do metodo.json batem")

# 15 — números da interface: a barra lateral é calculada, então o risco é o literal solto
literais = re.findall(r'"([^"]*\b\d\.\d{3}\b[^"]*)"', page)
suspeitos = [s for s in literais if not any(t in s for t in ("px", "rem", "%"))]
relata(15, "números escritos na interface", None,
       f"a barra lateral, a caixa d'água e os KPIs são calculados dos registros em tempo de\n"
       f"execução — não podem divergir por construção. Literais com milhar no page.tsx: "
       f"{len(suspeitos)}\n" + "\n".join(f"  {s[:100]}" for s in suspeitos[:8]))

# 16 — datas: o dado guarda ISO e o dataBR converte na renderização
m16 = re.search(r"const dataBR = \(valor: unknown\) => \{(.+?)\n\};", page, re.S)
corpo = m16.group(1) if m16 else ""
converte = bool(re.search(r"\$\{m\[3\]\}/\$\{m\[2\]\}/\$\{m\[1\]\}", corpo))
com_hora = bool(re.search(r"m\[4\]", corpo))
iso_na_tela = re.findall(r'"\d{4}-\d{2}-\d{2}', page)
relata(16, "datas saem em dd/mm/aaaa", bool(m16) and converte and not iso_na_tela,
       f"dataBR presente no page.tsx: {'sim' if m16 else 'NÃO'}  "
       f"converte aaaa-mm-dd → dd/mm/aaaa: {'sim' if converte else 'NÃO'}  "
       f"preserva hora: {'sim' if com_hora else 'não'}\n"
       f"literais de data em ISO escritos no page.tsx: {len(iso_na_tela)}\n"
       "cobertura de cada campo na tela ainda precisa de olho — dataBR converte, mas não\n"
       "garante que todo campo de data passe por ele")

# 17 — arquivos das bases
falta, divergente, unidades = [], [], {}
for rotulo, lista, sub in [
        ("Base_*", re.findall(r'\["(Base_[^"]+)",[^]]*?"([\d,]+) MB"\]', page), ""),
        ("Original_*", re.findall(r'\["(Original_[^"]+)",[^]]*?"([\d,]+) MB"\]', page), "originais/")]:
    bate_dec = bate_bin = 0
    for arq, tam in lista:
        caminho = os.path.join(PUB, "bases", sub, arq)
        if not os.path.exists(caminho):
            falta.append(f"{sub}{arq}")
            continue
        anunciado = float(tam.replace(",", "."))
        bruto = os.path.getsize(caminho)
        dec, binario = bruto / 1_000_000, bruto / 1024 / 1024
        # a tela mostra uma casa decimal: o teste é o arredondamento, não a igualdade
        if abs(round(dec, 1) - anunciado) < 0.05:
            bate_dec += 1
        if abs(round(binario, 1) - anunciado) < 0.05:
            bate_bin += 1
        if abs(round(dec, 1) - anunciado) >= 0.05 and abs(round(binario, 1) - anunciado) >= 0.05:
            divergente.append(f"{sub}{arq}: tela diz {anunciado} MB, disco tem "
                              f"{dec:.2f} MB / {binario:.2f} MiB")
    unidades[rotulo] = (len(lista), bate_dec, bate_bin)
mistura = (unidades["Base_*"][1] == unidades["Base_*"][0]
           and unidades["Original_*"][2] == unidades["Original_*"][0]
           and unidades["Original_*"][1] < unidades["Original_*"][0])
relata(17, "todo arquivo de base existe, com o tamanho anunciado",
       not falta and not divergente,
       f"arquivos conferidos: {sum(u[0] for u in unidades.values())}  faltando: {falta or 'nenhum'}\n"
       + "\n".join(f"{k}: {v[0]} arquivos — batem em MB decimal {v[1]}, em MiB {v[2]}"
                   for k, v in unidades.items())
       + ("\n" + "\n".join(divergente) if divergente else "")
       + ("\nOBSERVAÇÃO: as duas listas da mesma tela usam unidades diferentes — as Base_* "
          "estão\nem MB decimal e as Original_* em MiB. Nenhum número está errado, mas a "
          "mesma\ngrandeza aparece em duas escalas na mesma página." if mistura else ""))

# 18 — cada peneira é seguida pela aba de quem ela reteve, com o mesmo número
# Nasceu de um defeito real: a barra dizia que a Interrupção prendia 209, e a aba de detalhe
# abria com 206 — os outros 3 eram outra linha, noutro grupo, no fim da barra. O número que a
# etapa anuncia tem que ter uma aba logo abaixo dela que abra exatamente com ele.
itens = re.findall(r'\{ id: "(\w+)", rotulo: "([^"]+)", codigo: "([^"]+)"([^}]*)\}', page)
ordem = [(i[0], i[2], re.search(r'recorte: "(\w+)"', i[3])) for i in itens]
ordem = [(mod, cod, m.group(1) if m else None) for mod, cod, m in ordem]

e2n, e3n = 1510 - C(SEM_INT) - C(DUP), 1510 - C(SEM_INT) - C(DUP) - C(SEM_DES)
PARES = [
    ("interrupcao", "semfato", "parados", C(SEM_INT) + C(DUP), "Interrupção"),
    ("deslocamento", "semdesloc", "todos", C(SEM_DES), "Deslocamento"),
    ("ssos", "expurgos", "parados", C(SEM_PROVA) + C(EXCL), "Análise de SS e OS"),
    ("ressalva", "ressalva", "todos", C(RESS), "Ressalva da interrupção"),
]
p18, ok18 = [], []
for etapa, aba, rec, esperado, nome in PARES:
    pos = [i for i, (m, _, _) in enumerate(ordem) if m == etapa]
    if not pos:
        p18.append(f"{nome}: a etapa não está na barra")
        continue
    seguinte = ordem[pos[0] + 1] if pos[0] + 1 < len(ordem) else None
    if not seguinte or seguinte[0] != aba or seguinte[2] != rec:
        p18.append(f"{nome}: a aba dos retidos não vem logo depois da etapa "
                   f"(esperado {aba}/{rec}, veio {seguinte[0] + '/' + str(seguinte[2]) if seguinte else 'nada'})")
        continue
    # o recorte pareado existe no page.tsx e cobre o mesmo universo que a etapa anuncia?
    if f'id: "{rec}"' not in page:
        p18.append(f"{nome}: o recorte {rec!r} não existe em RECORTES")
        continue
    ok18.append(f"{nome}: anuncia {esperado} e a aba {seguinte[1]} abre com {esperado}")

# o contador do cabeçalho tem que falar da lista que está na tela, não do universo inteiro
cab = re.search(r'className="header-meta".{0,200}', page, re.S)
if not cab or "listadas.length" not in cab.group(0):
    p18.append('o contador do cabeçalho não usa listadas.length: ele anuncia um número '
               'diferente do que a tabela abaixo mostra')

soma_retidos = C(SEM_INT) + C(DUP) + C(SEM_DES) + C(SEM_PROVA) + C(EXCL) + C(RESS)
if soma_retidos + C(SAIDA) != 1510:
    p18.append(f"a soma dos retidos das abas ({soma_retidos}) mais a saída ({C(SAIDA)}) "
               f"dá {soma_retidos + C(SAIDA)}, não 1.510")
relata(18, "cada peneira é seguida pela aba de quem ela reteve, com o mesmo número",
       not p18,
       ("\n".join(ok18) + f"\nnenhum caso órfão: {soma_retidos} retidos + {C(SAIDA)} na saída = 1.510"
        if not p18 else "\n".join(p18)))

# 19 — a planilha que o site oferece para download conta a mesma história que o JSON
# Nasceu do ataque mais barato que existe: Base_Esteira_Completa.xlsx dizia SAÍDA=874,
# QUEIMADO=848, AVARIADO=26 e nem tinha a categoria SS duplicada — era o estado anterior à
# correção do dano externo, e ninguém a regerou. Um clique em "baixar a base" e o número da
# apresentação virava outro. O invariante 17 não pegava: ele confere se o arquivo existe e se
# o tamanho anunciado bate, não o que está dentro.
p19 = []
try:
    import openpyxl
    cam = os.path.join(PUB, "bases", "Base_Esteira_Completa.xlsx")
    ws = openpyxl.load_workbook(cam, read_only=True)["Esteira"]
    linhas = ws.iter_rows(values_only=True)
    cab = next(linhas)
    icasc = cab.index("Cascata")
    iconf = cab.index("Confirmado")
    xc, xf, n19 = Counter(), Counter(), 0
    for linha in linhas:
        n19 += 1
        xc[linha[icasc]] += 1
        if linha[iconf]:
            xf[linha[iconf]] += 1
    if n19 != len(regs):
        p19.append(f"a planilha tem {n19} linhas e o dado tem {len(regs)}")
    for chave in set(casc) | set(xc):
        if xc.get(chave, 0) != C(chave):
            p19.append(f"cascata {chave!r}: planilha={xc.get(chave, 0)} dado={C(chave)}")
    for chave in set(conf) | set(xf):
        if xf.get(chave, 0) != conf.get(chave, 0):
            p19.append(f"confirmado {chave!r}: planilha={xf.get(chave, 0)} dado={conf.get(chave, 0)}")
    det19 = (f"{n19} linhas · saída {xc.get(SAIDA, 0)} · "
             f"{xf.get('QUEIMADO', 0)} queimados + {xf.get('AVARIADO', 0)} avariados — "
             f"igual ao fluxo-1510.json" if not p19 else "\n".join(p19))
except ImportError:
    det19 = "openpyxl não instalado: não deu para abrir a planilha"
    p19 = ["openpyxl ausente"]
relata(19, "a planilha para download conta a mesma história que o dado", not p19, det19)

# ---------------------------------------------------------------------- placar
print("=" * 78)
falhas = [r for r in resultados if r[2] is False]
olho = [r for r in resultados if r[2] is None]
print(f"CONFERE {sum(1 for r in resultados if r[2] is True)}   "
      f"FALHA {len(falhas)}   A OLHO {len(olho)}   de {len(resultados)}")
if falhas:
    print("\nFALHARAM:")
    for n, t, _, _ in falhas:
        print(f"  {n}. {t}")
print("=" * 78)
sys.exit(1 if falhas else 0)
