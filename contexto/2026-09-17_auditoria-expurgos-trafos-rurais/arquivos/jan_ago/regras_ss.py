# -*- coding: utf-8 -*-
import json, collections, re, unicodedata
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
exec(open("so_ss.py").read().split("acerto = collections")[0])

VERDE="E2EFDA"; AMAR="FFF2CC"; VERM="FCE4E4"; AZUL="1F3864"
borda = Border(*[Side(style="thin", color="BFBFBF")]*4)

DECIDE = [
 ("DÁ PARA DECIDIR SÓ COM A SS", None, None, None),
 ("FURTO",
  "Origem da SS = FURTADO, ou defeito = FURTADO/VANDALISMO, ou o texto traz “furtado”, “roubado”, “levaram o trafo”.",
  "Sim", "35 de 36"),
 ("ABALROAMENTO",
  "Defeito da SS = ABALROADO, ou o texto traz “abalroamento”, “colisão”, “veículo bateu no poste”.",
  "Sim", "7 de 7"),
 ("AVARIADO",
  "Origem da SS = AVARIADO. Normalmente com defeito VAZAMENTO DE ÓLEO, BUCHA DANIFICADA ou DETERIORADA.",
  "Quase sempre", "81 de 109"),
 ("QUEIMADO",
  "Origem da SS = QUEIMADO. É o padrão: 1.426 das 1.696 SS entram assim.",
  "Quase sempre", "1.258 de 1.316"),
 ("REMANEJAMENTO",
  "Só quando o texto escreve “remanejamento” / “remanejar”. Não existe origem própria para isso.",
  "Às vezes", "4 de 14"),
 ("DIVISÃO DE CIRCUITO",
  "Só quando o texto escreve “divisão de circuito”.",
  "Às vezes", "2 de 4"),
 ("PREVENTIVO/PROGRAMADO",
  "Origem SOBRECARGA PREVENTIVA ou GARANTIA DE TRAFO, ou o texto traz “preventiva”, “programada”. Cuidado: quase sempre a SS de preventivo real entra como QUEIMADO.",
  "Pouco confiável", "2 de 12"),
 ("POSTE/REDE",
  "Origem da SS = POSTE ou CABOS BT.",
  "Sim, mas raro", "0 casos no período"),

 ("A SS NÃO ENXERGA — SÓ APARECE EM OUTRO DOCUMENTO", None, None, None),
 ("AUSENTE DA CRÍTICA",
  "Depende de cruzar o transformador com a base da Crítica. A SS não guarda interrupção.",
  "Não", "0 de 76"),
 ("FORA DA JANELA DA CRÍTICA",
  "Depende da hora de início e fim da ocorrência na Crítica.",
  "Não", "0 de 31"),
 ("RETIDO — SEM PROVA DE TROCA",
  "Depende de número de série retirado/instalado e do material da obra.",
  "Não", "0 de 21"),
 ("RETIDO — SEM INTERRUPÇÃO NA JANELA",
  "Depende da Crítica.",
  "Não", "0 de 15"),
 ("RETIDO — RESSALVA DA INTERRUPÇÃO",
  "Depende da causa e do papel do ativo na Crítica.",
  "Não", "0 de 2"),
 ("SEM OBRA — PASSADOS 60 DIAS",
  "Depende de existir obra vinculada e da data de hoje.",
  "Não", "0 de 14"),
 ("SEM OS E SEM OBRA",
  "Depende de existir OS e obra.",
  "Não", "0 de 6"),
 ("OBRA SEM TRANSFORMADOR NO MATERIAL",
  "Depende da lista de material da obra.",
  "Não", "0 de 3"),
 ("OBRA SEM EXECUÇÃO",
  "Depende da situação da obra.",
  "Não", "0 de 1"),
 ("SEM TROCA (NÃO SUBSTITUÍDO)",
  "Quem diz que não trocou é a conclusão da OS. A SS foi aberta como queimado.",
  "Não", "0 de 11"),
 ("TAPE/REGULARIZAÇÃO DE TENSÃO",
  "A SS entra como avariado ou queimado; quem revela o ajuste de tensão é a OS.",
  "Não", "0 de 7"),
 ("FALTA DE FASE",
  "A SS entra como avariado; quem revela é a OS.",
  "Não", "0 de 2"),
 ("ERRO DE CADASTRO — NÃO É TRANSFORMADOR",
  "Depende de conferir o ativo no cadastro / na OS.",
  "Não", "0 de 2"),
 ("SUBSTITUIÇÃO DE CHAVE FUSÍVEL",
  "Depende da OS.",
  "Não", "0 de 1"),
 ("AUXILIAR DE RELIGADOR",
  "Depende do cadastro do ativo.",
  "Não", "0 de 1"),
 ("MELHORIA DE POSTO",
  "Depende da OS / obra.",
  "Não", "0 de 1"),
 ("DANO DE TERCEIROS",
  "Depende da OS. A SS costuma entrar como furto ou queimado.",
  "Não", "0 de 1"),
 ("SS DUPLICADA",
  "Depende de cruzar as SS entre si e com a ocorrência.",
  "Não", "0 de 1"),
]

wb = Workbook(); ws = wb.active; ws.title = "Regras só pela SS"
ws.append(["Categoria", "Como reconhecer lendo só a SS", "Dá para decidir?", "Acerto no período"])
for c in ws[1]:
    c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor=AZUL)
    c.alignment = Alignment(horizontal="center", vertical="center")

linha = 1; bloco = None
for cat, como, da, ac in DECIDE:
    linha += 1
    if como is None:
        bloco = cat
        ws.append([cat, "", "", ""])
        ws.merge_cells(start_row=linha, start_column=1, end_row=linha, end_column=4)
        cel = ws.cell(row=linha, column=1)
        cel.font = Font(bold=True, color="FFFFFF"); cel.fill = PatternFill("solid", fgColor="4472C4")
        ws.row_dimensions[linha].height = 22
        continue
    ws.append([cat, como, da, ac])
    cor = VERM if bloco.startswith("A SS NÃO") else (VERDE if da.startswith(("Sim","Quase")) else AMAR)
    for col in range(1, 5):
        cl = ws.cell(row=linha, column=col)
        cl.fill = PatternFill("solid", fgColor=cor); cl.border = borda
        cl.alignment = Alignment(vertical="top", wrap_text=True,
                                 horizontal="center" if col >= 3 else "left")
    ws.cell(row=linha, column=1).font = Font(bold=True, size=10)
    ws.row_dimensions[linha].height = 40
for col, w in zip("ABCD", (38, 92, 18, 20)):
    ws.column_dimensions[col].width = w
ws.freeze_panes = "A2"

# aba Teste
w2 = wb.create_sheet("Teste nas 1.696")
w2.append(["Categoria final (leitura completa)", "SS", "Acertadas só pela SS", "O que a SS sozinha diria"])
for c in w2[1]:
    c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor=AZUL)
mat = collections.defaultdict(collections.Counter)
for r in d:
    mat[(r.get("categoria") or "").strip().upper()][so_pela_ss(r)] += 1
for real, c in sorted(mat.items(), key=lambda x: -sum(x[1].values())):
    tot = sum(c.values()); ok = sum(v for k, v in c.items() if n(k) == n(real))
    w2.append([real, tot, ok, ", ".join("%s (%d)" % (k, v) for k, v in c.most_common(3))])
for r in range(2, w2.max_row + 1):
    w2.cell(row=r, column=1).font = Font(bold=True, size=10)
    for col in range(1, 5):
        w2.cell(row=r, column=col).alignment = Alignment(vertical="top", wrap_text=(col == 4),
            horizontal="center" if col in (2, 3) else "left")
for col, w in zip("ABCD", (38, 10, 20, 70)):
    w2.column_dimensions[col].width = w

# aba Resumo
w3 = wb.create_sheet("Resumo")
conta_real = sum(1 for r in d if (r.get("categoria") or "").strip().upper() in ("QUEIMADO", "AVARIADO"))
conta_ss = sum(1 for r in d if so_pela_ss(r) in ("QUEIMADO", "AVARIADO"))
ok = sum(1 for r in d if n(so_pela_ss(r)) == n((r.get("categoria") or "").strip().upper()))
for a, b in [("Universo jan–ago/2026", len(d)),
             ("Categoria certa lendo só a SS", "%d (%.0f%%)" % (ok, 100*ok/len(d))),
             ("", ""),
             ("Contam no indicador — leitura completa", conta_real),
             ("Contariam — lendo só a SS", conta_ss),
             ("Diferença (SS sozinha infla o número em)", conta_ss - conta_real),
             ("", ""),
             ("Expurgos que a SS não consegue enxergar", 190)]:
    w3.append([a, b])
for r in range(1, w3.max_row + 1):
    w3.cell(row=r, column=1).font = Font(bold=True)
w3.column_dimensions["A"].width = 45; w3.column_dimensions["B"].width = 16

wb.save("Regras_Somente_pela_SS.xlsx")
print("ok", ok, conta_real, conta_ss)
