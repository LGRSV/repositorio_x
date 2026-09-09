"""Extração das 1.582 separada por categoria — uma aba por categoria.

Uma SS tem exatamente uma categoria:
  · quem fica no indicador é rotulada pelo que foi (queimado, avariado);
  · quem sai é rotulada pelo motivo de sair (ausente da Crítica, furto, sem obra…);
  · quem está retida é rotulada pelo que falta.

O vocabulário e a ordem das abas vivem em `public/categorias-extracao.json`, que é a
mesma fonte que o site lê — para o rótulo da planilha e o da tela não poderem divergir.

Leitura ao lado do caso: não recalcula o 1.305 nem o 1.582.
"""

import argparse
import collections
import datetime as dt
import json
import os

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FLUXO = os.path.join(RAIZ, "public", "fluxo-1582.json")
MAPA = os.path.join(RAIZ, "public", "categorias-extracao.json")
SAIDA = os.path.join(RAIZ, "public", "bases", "Base_Por_Categoria.xlsx")
# a mesma extração numa aba só: uma linha por SS, para quem vai jogar numa dinâmica
SAIDA_PLANA = os.path.join(RAIZ, "public", "bases", "Base_Categorias.xlsx")

COLUNAS = [
    ("Categoria da extração", "categoria_extracao"),
    ("SS", "ss"), ("OS", "os"), ("Obra", "obra"), ("Ativo", "trafo"),
    ("Abertura da SS", "abertura"), ("Término", "termino"), ("Mês", "mes"),
    ("Localidade", "localidade"), ("Alimentador", "alimentador"), ("Equipe", "equipe_ss"),
    ("Cascata", "cascata"), ("Decisão", "decisao"), ("Fato", "fato"), ("Leitura", "leitura"),
    ("Categoria pelo texto", "categoria_texto"), ("Categoria gravada", "categoria_gravada"),
    ("Gatilho da exclusão", "expurgo_gatilho"), ("Por que foi excluída", "exclusao_porque"),
    ("Motivo da cascata", "cascata_motivo"),
    ("Ocorrência", "oc_num"), ("Início da ocorrência", "oc_ini"), ("Fim da ocorrência", "oc_fim"),
    ("Duração (h)", "oc_dur_h"), ("Clientes interrompidos", "oc_cons"),
    ("Distância até a janela (h)", "oc_dist_h"), ("Papel do trafo", "oc_papel"),
    ("Causa em campo", "oc_causa"), ("Subcausa em campo", "oc_sub"),
    ("Observação em campo", "oc_obs"),
    ("Atendimento", "at_num"), ("Equipe do TMAE", "at_equipe"), ("Deslocamento", "at_deslocou"),
    ("Observação do executante", "at_obs"),
    ("Trafos no material", "trafos_material"), ("Material conferido", "material_conferido"),
    ("Potência retirada", "pot_ret"), ("Potência instalada", "pot_inst"),
    ("Situação da SS", "situacao"), ("Criticidade", "criticidade"), ("Tipo da SS", "tipo_ss"),
    ("Origem", "origem"), ("Solicitante", "solicitante"),
    ("Período", "periodo"), ("Prévia de julho", "previa"),
    ("Descrição da SS", "desc_ss"), ("Descrição da OS", "desc_os"),
]


def rotular(registro, mapa):
    """O rótulo de uma SS: a cascata manda, e dentro dela o gatilho ou a categoria do texto."""
    cascata = str(registro.get("cascata") or "").strip()
    por_cascata = mapa["porCascata"].get(cascata)
    if por_cascata is not None:
        categoria = str(registro.get("categoria_texto") or "").strip().upper()
        return por_cascata.get(categoria) or por_cascata["_"]
    gatilho = str(registro.get("expurgo_gatilho") or "").strip()
    return mapa["porGatilho"].get(gatilho, "SEM CATEGORIA")


def principal():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fluxo", default=FLUXO)
    ap.add_argument("--saida", default=SAIDA)
    ap.add_argument("--saida-plana", default=SAIDA_PLANA)
    a = ap.parse_args()

    fluxo = json.load(open(a.fluxo, encoding="utf-8"))
    mapa = json.load(open(MAPA, encoding="utf-8"))
    registros = fluxo["registros"]

    for r in registros:
        r["categoria_extracao"] = rotular(r, mapa)
        r["mes"] = str(r.get("abertura") or "")[:7]

    grupos = collections.defaultdict(list)
    for r in registros:
        grupos[r["categoria_extracao"]].append(r)

    orfas = [k for k in grupos if k not in mapa["ordem"]]
    if orfas:
        raise SystemExit(f"categoria fora da ordem declarada: {orfas}")
    sem = len(grupos.get("SEM CATEGORIA", []))
    if sem:
        raise SystemExit(f"{sem} SS ficaram sem categoria — o mapa não cobre algum gatilho")

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Resumo"
    ws.append([f"As {len(registros):,} SS de janeiro a julho de 2026, separadas por categoria".replace(",", ".")])
    ws["A1"].font = Font(bold=True, size=13)
    ws.append([f"Gerado em {dt.datetime.now():%d/%m/%Y %H:%M} · fonte {os.path.basename(a.fluxo)}"])
    ws.append([])
    ws.append(["Categoria", "SS", "no indicador", "excluídas", "retidas", "jan–jun", "julho"])
    for c in ws[4]:
        c.font = Font(bold=True)
    for chave in mapa["ordem"]:
        g = grupos.get(chave)
        if not g:
            continue
        ws.append([
            chave, len(g),
            sum(1 for r in g if r.get("cascata") == "SAÍDA"),
            sum(1 for r in g if r.get("cascata") == "EXCLUÍDA"),
            sum(1 for r in g if str(r.get("cascata") or "").startswith("RETIDO")),
            sum(1 for r in g if str(r.get("abertura") or "")[:7] < "2026-07"),
            sum(1 for r in g if str(r.get("abertura") or "")[:7] >= "2026-07"),
        ])
    ws.append(["Total", len(registros),
               sum(1 for r in registros if r.get("cascata") == "SAÍDA"),
               sum(1 for r in registros if r.get("cascata") == "EXCLUÍDA"),
               sum(1 for r in registros if str(r.get("cascata") or "").startswith("RETIDO")),
               sum(1 for r in registros if str(r.get("abertura") or "")[:7] < "2026-07"),
               sum(1 for r in registros if str(r.get("abertura") or "")[:7] >= "2026-07")])
    for c in ws[ws.max_row]:
        c.font = Font(bold=True)
    ws.append([])
    for linha in [
        "Cada SS aparece em uma aba só. Quem fica no indicador é rotulada pelo que foi; quem sai, pelo motivo de sair; quem está retida, pelo que falta.",
        "Queimado e Avariado somados são o indicador do período — as demais abas são o que ficou de fora e por quê.",
        "Ausente da Crítica: o código do transformador não aparece na base de interrupção em papel nenhum.",
        "Fora da janela: o ativo aparece na Crítica, mas a SS não foi aberta durante a ocorrência nem nas 24 horas seguintes.",
        "Retido não é excluído: é caso pendente de prova, e continua na fila.",
        "Julho entra como prévia e não gera expurgo — retém, no máximo.",
        "Leitura ao lado do caso: não recalcula o 1.305 nem o 1.582.",
    ]:
        ws.append([linha])
    ws.column_dimensions["A"].width = 52
    for c in "BCDEFG":
        ws.column_dimensions[c].width = 15

    def aba(nome, dados):
        w = wb.create_sheet(nome[:31])
        w.append([t for t, _ in COLUNAS])
        for c in w[1]:
            c.font = Font(bold=True, color="FFFFFF")
            c.fill = PatternFill("solid", fgColor="1F3864")
            c.alignment = Alignment(wrap_text=True, vertical="center")
        for d in dados:
            w.append([d.get(k) if d.get(k) is not None else "" for _, k in COLUNAS])
        for i, (t, _) in enumerate(COLUNAS, 1):
            w.column_dimensions[get_column_letter(i)].width = min(52, max(12, len(t) + 2))
        w.freeze_panes = "B2"
        if dados:
            w.auto_filter.ref = w.dimensions

    aba("Todas as SS", sorted(registros, key=lambda r: str(r.get("abertura"))))
    for chave in mapa["ordem"]:
        g = grupos.get(chave)
        if g:
            aba(mapa["aba"].get(chave, chave.capitalize()), sorted(g, key=lambda r: str(r.get("abertura"))))

    os.makedirs(os.path.dirname(a.saida), exist_ok=True)
    wb.save(a.saida)

    # A MESMA EXTRAÇÃO NUMA ABA SÓ. Aba por categoria serve para ler; uma tabela única serve
    # para filtrar e para jogar numa dinâmica. As duas saem do mesmo rótulo, então não podem
    # contar histórias diferentes.
    wb2 = openpyxl.Workbook()
    w = wb2.active
    w.title = "Base"
    w.append([t for t, _ in COLUNAS])
    for c in w[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="1F3864")
        c.alignment = Alignment(wrap_text=True, vertical="center")
    for d in sorted(registros, key=lambda r: (r["categoria_extracao"], str(r.get("abertura")))):
        w.append([d.get(k) if d.get(k) is not None else "" for _, k in COLUNAS])
    for i, (t, _) in enumerate(COLUNAS, 1):
        w.column_dimensions[get_column_letter(i)].width = min(52, max(12, len(t) + 2))
    w.freeze_panes = "B2"
    w.auto_filter.ref = w.dimensions
    wb2.save(a.saida_plana)

    print(a.saida)
    print(a.saida_plana)
    for chave in mapa["ordem"]:
        if grupos.get(chave):
            print(f"  {chave}: {len(grupos[chave])}")


if __name__ == "__main__":
    principal()
