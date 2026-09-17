"""As 252 SS fora do Infotrafo — base e uma aba por categoria."""
import collections, datetime as dt, json, os
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

SC = os.path.dirname(os.path.abspath(__file__))
L = json.load(open(os.path.join(SC, "as_161.json"), encoding="utf-8"))
ORDEM = ["QUEIMADO", "AVARIADO", "FURTO", "ABALROAMENTO", "REMANEJAMENTO",
         "PREVENTIVO/PROGRAMADO", "TAPE/REGULARIZAÇÃO DE TENSÃO", "DIVISÃO DE CIRCUITO",
         "FALTA DE FASE", "AUXILIAR DE RELIGADOR", "SEM TROCA (não substituído)",
         "AUSENTE DA CRÍTICA", "FORA DA JANELA DA CRÍTICA", "SEM OBRA — passados 60 dias",
         "SEM OS E SEM OBRA", "OBRA SEM EXECUÇÃO", "OBRA SEM TRANSFORMADOR NO MATERIAL",
         "RETIDO — SEM PROVA DE TROCA", "AVALIAR COM O MATHEUS"]
ABA = {"TAPE/REGULARIZAÇÃO DE TENSÃO": "Tape e tensão", "SEM TROCA (não substituído)": "Sem troca",
       "AUSENTE DA CRÍTICA": "Ausente da Crítica", "FORA DA JANELA DA CRÍTICA": "Fora da janela",
       "SEM OBRA — passados 60 dias": "Sem obra 60 dias", "SEM OS E SEM OBRA": "Sem OS e sem obra",
       "OBRA SEM EXECUÇÃO": "Obra sem execução", "OBRA SEM TRANSFORMADOR NO MATERIAL": "Obra sem trafo",
       "RETIDO — SEM PROVA DE TROCA": "Retido sem prova", "AVALIAR COM O MATHEUS": "Avaliar com Matheus",
       "PREVENTIVO/PROGRAMADO": "Preventivo", "DIVISÃO DE CIRCUITO": "Divisão de circuito",
       "AUXILIAR DE RELIGADOR": "Auxiliar de religador", "FALTA DE FASE": "Falta de fase"}

COLS = [("Categoria", "categoria"), ("Conta no indicador", "_conta"),
        ("SS", "ss"), ("OS", "os"), ("Obra", "obra"), ("Trafo", "trafo"),
        ("Abertura", "abertura"), ("Mês", "_mes"), ("Localidade", "localidade"),
        ("Equipe", "equipe"), ("Tipo da SS", "tipo_ss"), ("Origem da SS", "origem_ss"),
        ("Defeito da SS", "defeito_ss"), ("Situação", "situacao"),
        ("kVA retirado", "pot_ret"), ("kVA instalado", "pot_inst"),
        ("De onde vem a análise", "origem_da_analise"), ("Confiança", "confianca"),
        ("Prova de troca", "prova_de_troca"), ("Motivo", "motivo"), ("Evidência", "evidencia"),
        ("Crítica · resultado", "_cr"), ("Crítica · causa", "_cc"), ("Crítica · subcausa", "_cs"),
        ("Crítica · clientes", "_ccl"), ("Crítica · observação", "_cobs"),
        ("Texto da SS", "texto_ss"), ("Texto da OS", "texto_os")]

for l in L:
    l["_conta"] = "SIM" if l["conta_no_indicador"] else "não"
    l["_mes"] = str(l["abertura"])[:7]
    c = l.get("critica") or {}
    l["_cr"], l["_cc"], l["_cs"] = c.get("resultado", ""), c.get("causa", ""), c.get("subcausa", "")
    l["_ccl"], l["_cobs"] = c.get("clientes", ""), c.get("obs", "")

wb = openpyxl.Workbook()
ws = wb.active; ws.title = "Resumo"
ws.append(["As 161 SS de substituição de transformador que ficaram fora do Infotrafo"])
ws["A1"].font = Font(bold=True, size=13)
ws.append([f"Janeiro a agosto de 2026 · gerado em {dt.datetime.now():%d/%m/%Y %H:%M}"])
ws.append([])
ws.append(["Categoria", "SS", "Conta no indicador"])
for c in ws[4]: c.font = Font(bold=True)
g = collections.defaultdict(list)
for l in L: g[l["categoria"]].append(l)
for k in ORDEM:
    if g.get(k):
        ws.append([k, len(g[k]), "SIM" if k in ("QUEIMADO", "AVARIADO") else "não"])
ws.append(["Total", len(L), f"{sum(1 for l in L if l['conta_no_indicador'])} contam"])
for c in ws[ws.max_row]: c.font = Font(bold=True)
ws.append([])
ws.append(["Mês", "SS", "Queimado", "Avariado", "Contam"])
for c in ws[ws.max_row]: c.font = Font(bold=True)
for m in sorted({l["_mes"] for l in L}):
    gg = [l for l in L if l["_mes"] == m]
    ws.append([m, len(gg), sum(1 for l in gg if l["categoria"] == "QUEIMADO"),
               sum(1 for l in gg if l["categoria"] == "AVARIADO"),
               sum(1 for l in gg if l["conta_no_indicador"])])
ws.append([])
for t in ["Universo: 1.605 SS com tipo FORMS SUBST DE TRANSFORMADOR abertas de janeiro a agosto de 2026, na aba BASE_SS_OS.",
          "Infotrafo: 1.444 SS, todas dentro dessas 1.605. Sobram 161 fora.",
          "Das 161, 131 já tinham análise no site (janeiro a julho) e a categoria foi aproveitada sem reanálise.",
          "As outras 30 foram lidas caso a caso: texto da SS, texto da OS, formulário de campo e busca na Crítica.",
          "A Crítica bruta de julho está perdida: 14 SS de julho foram julgadas só por texto e campo, sem conferência na base de interrupção.",
          "Ausente da Crítica e Fora da janela não são prova de que não houve falha — são falta de registro.",
          "Leitura ao lado do caso: não recalcula o 1.305 nem o 1.582."]:
    ws.append([t])
ws.column_dimensions["A"].width = 46
for c in "BCDE": ws.column_dimensions[c].width = 18


def aba(nome, dados):
    w = wb.create_sheet(nome[:31])
    w.append([t for t, _ in COLS])
    for c in w[1]:
        c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor="1F3864")
        c.alignment = Alignment(wrap_text=True, vertical="center")
    for d in dados: w.append([d.get(k) if d.get(k) is not None else "" for _, k in COLS])
    for i, (t, _) in enumerate(COLS, 1):
        w.column_dimensions[get_column_letter(i)].width = min(52, max(12, len(t) + 2))
    w.freeze_panes = "C2"
    if dados: w.auto_filter.ref = w.dimensions


aba("Base — as 161", L)
aba("Contam no indicador", [l for l in L if l["conta_no_indicador"]])
for k in ORDEM:
    if g.get(k): aba(ABA.get(k, k.capitalize()), g[k])
saida = os.path.join(SC, "As_161_fora_do_Infotrafo.xlsx")
wb.save(saida)
print(saida, len(L))
