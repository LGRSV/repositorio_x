"""Extrai dos 176 KML só o que a auditoria usa, e joga o resto fora.

POR QUE ISTO EXISTE. Os 176 arquivos somam 294 MB e vivem só no scratchpad deste
container, que é descartável. Se ele reciclar, some a base geométrica que sustenta a
prova de transformador auxiliar — a que mostrou o 5150099122 a 0,99 m do religador
7950099122. Nada disso está no repositório.

O QUE FICA. Só ponto com coordenada, que é o que permite medir distância:
    ET          a estação transformadora — o código operativo do trafo
    Chave       chave, religador e disjuntor
    Regulador   regulador de tensão
    EP, Gerador, Reator, Capacitor

O QUE SAI. As LineString — Trecho, TrechoBT, RedeBT. São 27.166 contra 3.974 pontos num
arquivo típico, e cada uma carrega uma lista de coordenadas. É onde estão os 294 MB.

O QUE SE PERDE E COMO ISSO É COMPENSADO. Jogar a rede de baixa tensão fora apagaria uma
prova: o auxiliar se reconhece por ter ZERO TrechoBT pendurado nele, enquanto um trafo de
cliente tem de 1 a 388. A geometria da rede não é necessária para isso — o NÚMERO é. Então
cada ET leva a contagem de TrechoBT que sai dela, um inteiro que cabe em três dígitos e
preserva o argumento sem os megabytes.

Coordenada em 6 casas decimais: 0,1 m de resolução, contra distâncias que se medem em
metros. Guardar 14 casas seria guardar ruído.
"""

import json
import os
import sys
from collections import Counter, defaultdict
from xml.etree import ElementTree as ET_

NS = "{http://www.opengis.net/kml/2.2}"
PASTAS = {"ET", "Chave", "Regulador", "EP", "Gerador", "Reator", "Capacitor",
          "CapacitorSerie", "Transformador"}

ORIGEM = sys.argv[1] if len(sys.argv) > 1 else "kml"
SAIDA = sys.argv[2] if len(sys.argv) > 2 else "kml_pontos.json"
LIMITE = int(sys.argv[3]) if len(sys.argv) > 3 else 0


def circuito_do_nome(n):
    """SE-1UI1_Circ-LD03046026.kml -> ('SE-1UI1', 'LD03046026')"""
    base = n[:-4] if n.lower().endswith(".kml") else n
    if "_Circ-" in base:
        se, circ = base.split("_Circ-", 1)
        return se, circ
    return "", base


def ler(caminho):
    """Devolve (pontos, trechos_bt_por_et).

    O parser anda em streaming e limpa cada elemento depois de usar: um dos arquivos tem
    31 mil placemarks, e guardar a árvore inteira estoura a memória sem necessidade.
    """
    pilha, pontos = [], []
    bt = Counter()
    for evento, el in ET_.iterparse(caminho, events=("start", "end")):
        tag = el.tag.replace(NS, "")
        if evento == "start":
            if tag == "Folder":
                pilha.append(None)
            continue
        if tag == "name" and pilha and pilha[-1] is None:
            pilha[-1] = (el.text or "").strip()
        elif tag == "Placemark":
            atual = next((p for p in reversed(pilha) if p), "")
            ponto = el.find(f"{NS}Point")
            nome_el = el.find(f"{NS}name")
            rotulo = (nome_el.text or "").strip() if nome_el is not None else ""
            if ponto is not None and atual in PASTAS:
                coord = ponto.find(f"{NS}coordinates")
                if coord is not None and coord.text:
                    lon, lat = coord.text.strip().split(",")[:2]
                    pontos.append([atual, rotulo, round(float(lon), 6), round(float(lat), 6)])
            elif ponto is None and rotulo.startswith("Suporte "):
                # "Suporte Chave 7950099122" é LineString, e o PRIMEIRO vértice dela cai
                # exatamente em cima do transformador que a estrutura sustenta. É o vínculo
                # nomeado entre estrutura e equipamento — foi ele que mediu 0,99 m no caso
                # do auxiliar. Descartar a linha inteira apagaria a prova; guardar só o
                # primeiro vértice custa quatro números e preserva o argumento.
                linha_el = el.find(f"{NS}LineString")
                coord = linha_el.find(f"{NS}coordinates") if linha_el is not None else None
                if coord is not None and coord.text:
                    lon, lat = coord.text.strip().split()[0].split(",")[:2]
                    pontos.append(["Suporte", rotulo, round(float(lon), 6), round(float(lat), 6)])
            if ponto is None and atual == "TrechoBT":
                # a contagem por ET: a pasta de cima é ET_<codigo>
                dono = next((p for p in reversed(pilha) if p and p.startswith("ET_")), "")
                if dono:
                    bt[dono[3:]] += 1
            el.clear()
        elif tag == "Folder":
            if pilha:
                pilha.pop()
            el.clear()
    return pontos, bt


arquivos = sorted(f for f in os.listdir(ORIGEM) if f.lower().endswith(".kml"))
if LIMITE:
    arquivos = arquivos[:LIMITE]
print(f"{len(arquivos)} arquivos\n")

saida = {"gerado_de": f"{len(arquivos)} KML da rede Energisa 2025",
         "o_que_e": "só pontos com coordenada: ET, chave, religador, regulador e afins. "
                    "As linhas de rede (Trecho, TrechoBT, RedeBT) foram descartadas — o que "
                    "elas provavam está na contagem trechos_bt por ET.",
         "circuitos": {}}
tot_pontos = 0
por_tipo = Counter()
falhas = []

for i, nome in enumerate(arquivos, 1):
    try:
        pontos, bt = ler(os.path.join(ORIGEM, nome))
    except Exception as e:
        falhas.append((nome, str(e)[:80]))
        continue
    se, circ = circuito_do_nome(nome)
    saida["circuitos"][circ] = {"se": se, "pontos": pontos, "trechos_bt": dict(bt)}
    tot_pontos += len(pontos)
    for p in pontos:
        por_tipo[p[0]] += 1
    if i % 25 == 0 or i == len(arquivos):
        print(f"  {i}/{len(arquivos)}  ·  {tot_pontos} pontos até aqui")

with open(SAIDA, "w", encoding="utf-8") as f:
    json.dump(saida, f, ensure_ascii=False, separators=(",", ":"))

mb = os.path.getsize(SAIDA) / 1e6
orig = sum(os.path.getsize(os.path.join(ORIGEM, n)) for n in arquivos) / 1e6
print(f"\ncircuitos: {len(saida['circuitos'])}")
print(f"pontos:    {tot_pontos}")
for t, q in por_tipo.most_common():
    print(f"   {q:8d}  {t}")
print(f"\nde {orig:.0f} MB para {mb:.1f} MB  ({100 - 100 * mb / orig:.1f}% menor)")
if falhas:
    print(f"\nfalharam {len(falhas)}:")
    for n, e in falhas[:10]:
        print(f"  {n}: {e}")
