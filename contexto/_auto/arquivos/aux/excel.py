# -*- coding: utf-8 -*-
import json, collections, datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
J="/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad/jan_ago/"
dd=json.load(open("aviso_sol.json")); d=json.load(open(J+"as_1696.json"))
portrafo=json.load(open("portrafo.json"))
def U(r,c): return str(r.get(c) or "").strip().upper()
NAVY="1F3864"; AZUL="4472C4"
borda=Border(*[Side(style="thin",color="D9D9D9")]*4)
wb=openpyxl.Workbook()

def aba(nome,linhas):
    ws=wb.create_sheet(nome)
    if not linhas: return ws
    cols=list(linhas[0].keys())
    ws.append(cols)
    for c in ws[1]:
        c.font=Font(bold=True,color="FFFFFF",size=10); c.fill=PatternFill("solid",fgColor=NAVY)
        c.alignment=Alignment(horizontal="center",vertical="center",wrap_text=True)
    for r in linhas:
        ws.append([r.get(c) for c in cols])
    for i,c in enumerate(cols,1):
        L=get_column_letter(i)
        ws.column_dimensions[L].width = 60 if "Texto" in c else (30 if ("observação" in c or "Descrição" in c or "Material de trafo" in c or "quais" in c) else max(11,min(20,len(c)+4)))
    for row in ws.iter_rows(min_row=2):
        for c in row:
            c.alignment=Alignment(vertical="top",wrap_text=False); c.border=borda
    ws.freeze_panes="B2"; ws.auto_filter.ref=ws.dimensions
    ws.row_dimensions[1].height=34
    return ws

aba("AVISO DE ANOMALIA",dd["aviso"])
aba("SOLICITACAO DE SERVICO",dd["solicitacao"])

# ---- padrões
G={"AVISO DE ANOMALIA":[r for r in d if U(r,"tipo_ss")=="AVISO DE ANOMALIA"],
   "SOLICITAÇÃO DE SERVIÇO":[r for r in d if U(r,"tipo_ss")=="SOLICITAÇÃO DE SERVIÇO"],
   "FORMS SUBST DE TRANSFORMADOR":[r for r in d if U(r,"tipo_ss")=="FORMS SUBST DE TRANSFORMADOR"]}
def limpo(v):
    s=str(v or "").strip().upper(); return "" if s in ("","0","00","N/A","NA","NONE","-") else s
def dtp(v):
    v=str(v or "").replace("T"," ")
    for f in ("%Y-%m-%d %H:%M","%Y-%m-%d %H:%M:%S","%d/%m/%Y %H:%M:%S"):
        try: return datetime.datetime.strptime(v[:len("2026-01-01 00:00")] if f=="%Y-%m-%d %H:%M" else v[:19],f)
        except: pass
def med(g):
    ds=[]
    for r in g:
        a,b=dtp(r.get("abertura")),dtp(r.get("termino"))
        if a and b and b>=a: ds.append((b-a).days)
    ds.sort(); return ds[len(ds)//2] if ds else ""
def pct(g,f): return "%.0f%%"%(100*sum(1 for r in g if f(r))/len(g))
def top(g,c,n=3):
    return ", ".join("%s (%d)"%(k[:24].title(),v) for k,v in collections.Counter(U(r,c) or "(vazio)" for r in g).most_common(n))
def hist(g):
    hs=[len([s for s in portrafo.get(str(r.get('trafo') or '').strip(),[]) if s!=r['ss']]) for r in g]
    return "%.0f%%"%(100*sum(1 for x in hs if x>0)/len(hs))
linhas=[
 ("Quantidade de SS",lambda g:len(g)),
 ("Entraram no Infotrafo",lambda g:pct(g,lambda r:U(r,"no_infotrafo")=="SIM")),
 ("Contam no indicador",lambda g:pct(g,lambda r:U(r,"conta")=="SIM")),
 ("Criticidade emergencial",lambda g:pct(g,lambda r:U(r,"criticidade")=="EMERGENCIAL")),
 ("Duração mediana da SS (dias)",med),
 ("Tem OS",lambda g:pct(g,lambda r:limpo(r.get("os")))),
 ("Tem obra",lambda g:pct(g,lambda r:limpo(r.get("obra")))),
 ("NS retirado preenchido",lambda g:pct(g,lambda r:limpo(r.get("ns_ret")))),
 ("NS instalado preenchido",lambda g:pct(g,lambda r:limpo(r.get("ns_inst")))),
 ("Ativo com outra SS em 2026",hist),
 ("Origem da SS mais comum",lambda g:top(g,"origem_ss")),
 ("Defeito da SS mais comum",lambda g:top(g,"defeito_ss")),
 ("Categoria mais comum",lambda g:top(g,"categoria")),
 ("Equipe que mais abre",lambda g:top(g,"equipe",3)),
]
ws=wb.create_sheet("Padroes")
ws.append(["Indicador","Aviso de anomalia","Solicitação de serviço","Forms subst. de transformador"])
for c in ws[1]:
    c.font=Font(bold=True,color="FFFFFF"); c.fill=PatternFill("solid",fgColor=NAVY)
    c.alignment=Alignment(horizontal="center",vertical="center",wrap_text=True)
for nome,f in linhas:
    ws.append([nome]+[f(G[k]) for k in ("AVISO DE ANOMALIA","SOLICITAÇÃO DE SERVIÇO","FORMS SUBST DE TRANSFORMADOR")])
for r in ws.iter_rows(min_row=2):
    r[0].font=Font(bold=True,size=10)
    for c in r: c.alignment=Alignment(vertical="top",wrap_text=True); c.border=borda
for L,w in zip("ABCD",(32,34,34,40)): ws.column_dimensions[L].width=w
ws.row_dimensions[1].height=32

# equipe
ws2=wb.create_sheet("Por equipe")
tot=collections.Counter(U(r,"equipe") for r in d)
av=collections.Counter(U(r,"equipe") for r in G["AVISO DE ANOMALIA"])
so=collections.Counter(U(r,"equipe") for r in G["SOLICITAÇÃO DE SERVIÇO"])
ws2.append(["Equipe","SS no universo","Aviso de anomalia","Solicitação de serviço","Fora do Infotrafo por tipo","% da produção da equipe"])
for c in ws2[1]:
    c.font=Font(bold=True,color="FFFFFF"); c.fill=PatternFill("solid",fgColor=NAVY); c.alignment=Alignment(wrap_text=True,horizontal="center")
for k in sorted(tot,key=lambda k:-(av[k]+so[k])):
    n=av[k]+so[k]
    if n==0 and tot[k]<20: continue
    ws2.append([k,tot[k],av[k],so[k],n,round(100*n/tot[k],1)])
    if n/tot[k]>0.15:
        for i in range(1,7): ws2.cell(row=ws2.max_row,column=i).fill=PatternFill("solid",fgColor="FCE4E4")
for L,w in zip("ABCDEF",(16,16,20,22,24,22)): ws2.column_dimensions[L].width=w
ws2.row_dimensions[1].height=30; ws2.freeze_panes="A2"

# leitura
ws3=wb.create_sheet("Leitura",0)
ws3.append(["O que esta planilha responde"])
ws3["A1"].font=Font(bold=True,size=14,color=NAVY)
txt=[
 "",
 "As 104 SS do universo de jan–ago/2026 que NÃO foram abertas como FORMS SUBST DE TRANSFORMADOR: 92 avisos de anomalia e 12 solicitações de serviço.",
 "Nenhuma delas entrou no Infotrafo. São 104 das 252 que ficaram fora.",
 "",
 "Cada linha traz a SS, a OS, a obra (status, datas e valor realizado), o material da obra (se saiu transformador),",
 "o resultado na Crítica (ocorrência, janela, papel do ativo, causa, clientes), o atendimento no TMAE e o histórico do ativo.",
 "",
 "O QUE ENCONTREI",
 "",
 "1. Aviso de anomalia é o fluxo do defeito lento, não da queima.",
 "   Vazamento de óleo é o defeito de 38% dos avisos, contra 9% nas FORMS. Sobrecarga preventiva é a origem de 28% deles,",
 "   contra praticamente zero nas FORMS. O trafo ainda está de pé, alguém viu o problema e abriu aviso.",
 "",
 "2. A falha é real, mesmo assim.",
 "   85,9% dos avisos casaram com uma interrupção na Crítica — a mesma taxa das FORMS que também ficaram fora (85,1%).",
 "   Não é SS inventada: o transformador interrompeu. Só não foi registrado no Infotrafo.",
 "",
 "3. Uma equipe concentra o problema.",
 "   ETO-RD-AG abriu 44 dos 92 avisos e 8 das 12 solicitações. São 52 SS de um total de 140 que a equipe abriu:",
 "   31% da produção dela some do Infotrafo. A segunda colocada, ETO-RD-AR, fica em 7,8%. As demais abaixo de 5%.",
 "",
 "4. Solicitação de serviço nasce em ativo que já teve SS.",
 "   58% das solicitações são em transformador que já tinha outra SS em 2026, contra 17% nas FORMS.",
 "   É o fluxo de quem volta ao mesmo posto — reincidência ou serviço que ficou pela metade.",
 "",
 "5. O registro de campo é mais fraco.",
 "   NS retirado preenchido em 70% dos avisos contra 90% nas FORMS. Obra em 91% contra 98,5%.",
 "   Sem o formulário, a prova de troca depende do texto da OS.",
 "",
 "6. Onde NÃO achei padrão.",
 "   O órgão que cria a OS não distingue nada: 55% dos avisos têm OS de sigla diferente da SS, exatamente como nas FORMS (55,8%).",
 "   Mês também não: os avisos se distribuem de 7 a 16 por mês, sem concentração.",
 "",
 "O QUE FALTA",
 "",
 "A base de OS Status não pôde ser lida — 52,9 MB no Drive, acima do limite de 10 MB do conector.",
 "Com ela dá para responder se a OS do aviso nasce com tipo, programação ou conclusão diferente, que é onde o padrão",
 "provavelmente termina de fechar. O TMAE disponível cobre só jan–jun/2026, então 34 dos 92 avisos têm atendimento casado.",
]
for t in txt: ws3.append([t])
for i in range(1,len(txt)+2):
    c=ws3.cell(row=i,column=1)
    if c.value and (c.value.startswith(("1.","2.","3.","4.","5.","6.")) or c.value.isupper()):
        c.font=Font(bold=True,size=11,color=AZUL if c.value[0].isdigit() else NAVY)
ws3.column_dimensions["A"].width=125
del wb["Sheet"]
wb.save(J+"Aviso_e_Solicitacao_completo.xlsx")
print("ok")
