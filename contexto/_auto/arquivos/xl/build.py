import openpyxl, copy, warnings; warnings.filterwarnings('ignore')
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter as gl
from openpyxl.pivot.table import FieldItem, RowColField
warnings.filterwarnings('ignore')

NAVY='1F1F4C'; ORANGE='F37021'; ZEBRA='F2F2F2'; GRID='D9D9D9'; GRAYT='595959'
F='Calibri'
HDR=Font(name=F,size=11,bold=True,color='FFFFFF')
FILLH=PatternFill('solid',fgColor=NAVY)
FILLZ=PatternFill('solid',fgColor=ZEBRA)
FILLO=PatternFill('solid',fgColor='FDF1E9')
B=Side(style='thin',color=GRID); BOX=Border(left=B,right=B,top=B,bottom=B)
TIT=Font(name=F,size=16,bold=True,color=NAVY)
SUB=Font(name=F,size=10,color=GRAYT)
H2=Font(name=F,size=12,bold=True,color=NAVY)
NORM=Font(name=F,size=11)
BOLD=Font(name=F,size=11,bold=True)
ITAL=Font(name=F,size=10,italic=True,color=GRAYT)

wb=openpyxl.load_workbook('base.xlsx')
src=wb['Planilha1']._pivots[0]; cache=src.cache
cache.refreshOnLoad=True
N=228  # ultima linha de dados em Expurgos
E=lambda col: f"Expurgos!${col}$2:${col}${N}"

def titulo(ws,t,s=None):
    ws['A1']=t; ws['A1'].font=TIT
    if s: ws['A2']=s; ws['A2'].font=SUB
    ws.row_dimensions[1].height=22
def cab(ws,row,cols,larg=None):
    for j,c in enumerate(cols,1):
        cel=ws.cell(row,j,c); cel.font=HDR; cel.fill=FILLH; cel.border=BOX
        cel.alignment=Alignment(vertical='center',wrap_text=True)
    ws.row_dimensions[row].height=20
    if larg:
        for j,w in enumerate(larg,1): ws.column_dimensions[gl(j)].width=w
def linha(ws,row,vals,zebra=False,bold=False,fmt=None):
    for j,v in enumerate(vals,1):
        cel=ws.cell(row,j,v); cel.font=BOLD if bold else NORM; cel.border=BOX
        if zebra: cel.fill=FILLZ
        if j>1: cel.alignment=Alignment(horizontal='right')
        if fmt and j in fmt: cel.number_format=fmt[j]

# ================= 1. LEITURA =================
ws=wb.create_sheet('Leitura',0)
titulo(ws,'Expurgos de transformadores — janeiro a agosto de 2026',
       'Como a base foi montada, o que cada termo significa e onde estão as dinâmicas.')
ws.column_dimensions['A'].width=34; ws.column_dimensions['B'].width=104
r=4
def bloco(tit,itens):
    global r
    ws.cell(r,1,tit).font=H2; r+=1
    for a,b in itens:
        ws.cell(r,1,a).font=BOLD
        ws.cell(r,1).alignment=Alignment(vertical='top',wrap_text=True)
        c=ws.cell(r,2,b); c.font=NORM; c.alignment=Alignment(vertical='top',wrap_text=True)
        ws.row_dimensions[r].height=max(15,14*(1+len(b)//118)); r+=1
    r+=1

bloco('1. Como a base foi extraída',[
 ('Código operativo','Somente os que começam com 42, 52, 53 ou 57 — a faixa de transformador de distribuição.'),
 ('Status da SS','Pendente e Atendida.'),
 ('Esquema de serviço','MC - Substituição de transformador.'),
 ('Tipo de SS','FORMS, AVISO DE ANOMALIA e SOLICITAÇÃO DE SERVIÇO.'),
 ('Período','Aberturas de janeiro a agosto de 2026.'),
 ('Resultado','Deste recorte saíram 227 solicitações expurgadas, que são as linhas da aba Expurgos.'),
])
bloco('2. O que é expurgo',[
 ('Definição','SS que saiu do indicador de transformadores queimados. Cada linha traz o motivo, a categoria apurada na leitura caso a caso e o texto integral da SS e da OS.'),
 ('Dois grupos','115 saíram por mérito próprio e estão encerrados. 112 saíram porque a interrupção não fecha na Crítica e dependem de resposta do COPO — podem voltar ao indicador.'),
])
bloco('3. Glossário dos termos usados',[
 ('Sem interrupção registrada','A Crítica não tem nenhuma interrupção neste transformador em data alguma do período.'),
 ('Fora da janela de 24 h','A interrupção existe na Crítica, mas não cai na janela de 24 horas em torno da SS.'),
 ('Troca comprovada pela série','O número de série do transformador retirado é diferente do instalado — a substituição de fato ocorreu.'),
 ('Obra não comprova a troca','A obra, onde o material trocado é registrado, não foi gerada, não executou nada, ou foi encerrada sem transformador no material.'),
 ('Trocado, mas sem falha','A troca ocorreu e está documentada, mas por decisão de capacidade ou de rede: remanejamento, preventivo, ajuste de tensão.'),
 ('Não houve troca nenhuma','O registro diz que nada foi substituído: SS de construção, desativação de posto, ou segunda SS do mesmo evento.'),
 ('Causa externa ao transformador','A reposição não foi por defeito do equipamento: furto, colisão, terceiros, ou o código nem é de transformador de distribuição.'),
])
bloco('4. Onde estão as dinâmicas',[
 ('Din Categoria','Contagem por macro categoria — as cinco famílias de expurgo.'),
 ('Din Motivo','Macro categoria aberta por motivo — os 19 motivos registrados.'),
 ('Din Texto x Motivo','Categoria pelo texto da SS aberta por motivo — a visão dos 172 com texto de queima ou avaria.'),
 ('Planilha1','As duas dinâmicas que já vinham na base, preservadas como estavam.'),
 ('Atualizar','As dinâmicas são atualizadas ao abrir. Para forçar: clique com o botão direito sobre a tabela e escolha Atualizar.'),
])
bloco('5. Ressalvas',[
 ('Julho','A Crítica de julho se perdeu. Os 13 expurgos do mês foram lidos só pelo texto, sem conferência de interrupção — o mês não é comparável aos demais.'),
 ('Fonte da categoria','191 categorias vieram prontas da esteira das 1.582; 36 foram lidas caso a caso no período de janeiro a agosto.'),
])

# ================= 2. RESUMO =================
ws=wb.create_sheet('Resumo',1)
titulo(ws,'Resumo dos 227 expurgos','Todos os números saem por fórmula da aba Expurgos — mudou a base, muda aqui.')
larg=[40,12,10,14,14]
cab(ws,4,['Situação','SS','%','',''],larg)
ws['A3']='Visão geral'; ws['A3'].font=H2
dados=[('Com decisão fechada — não retornam ao indicador',f'=227-B6'),
       ('Aguardando o COPO — interrupção não fecha na Crítica',f'=COUNTIFS({E("D")},"Sem interrupção")+COUNTIFS({E("D")},"Fora da janela")')]
for i,(a,b) in enumerate(dados):
    linha(ws,5+i,[a,b,f'=B{5+i}/$B$7'],zebra=(i%2==1),fmt={3:'0%'})
linha(ws,7,['Total',f'=COUNTA({E("A")})','=B7/B7'],bold=True,fmt={3:'0%'})
ws['A9']='Por macro categoria'; ws['A9'].font=H2
cab(ws,10,['Macro categoria','SS','%','',''])
macros=['Sem interrupção comprovada','Causa externa ao transformador','Troca sem falha','Sem documento','Não houve troca']
rot={'Sem interrupção comprovada':'Sem interrupção ou fora da janela','Sem documento':'Obra não comprova a troca',
     'Troca sem falha':'Trocado, mas sem falha','Não houve troca':'Não houve troca nenhuma'}
for i,m in enumerate(macros):
    linha(ws,11+i,[rot.get(m,m),f'=COUNTIFS({E("C")},"{m}")',f'=B{11+i}/$B$16'],zebra=(i%2==1),fmt={3:'0%'})
linha(ws,16,['Total',f'=SUM(B11:B15)','=B16/B16'],bold=True,fmt={3:'0%'})
ws['A18']='Os 172 com texto de queima ou avaria'; ws['A18'].font=H2
cab(ws,19,['Recorte','SS','%','',''])
f172=f'(COUNTIFS({E("F")},"QUEIMADO")+COUNTIFS({E("F")},"AVARIADO"))'
pend=f'(COUNTIFS({E("F")},"QUEIMADO",{E("D")},"Sem interrupção")+COUNTIFS({E("F")},"QUEIMADO",{E("D")},"Fora da janela")+COUNTIFS({E("F")},"AVARIADO",{E("D")},"Sem interrupção")+COUNTIFS({E("F")},"AVARIADO",{E("D")},"Fora da janela"))'
linha(ws,20,['Param na Crítica: sem interrupção ou fora da janela',f'={pend}',f'=B20/$B$22'],fmt={3:'0%'})
linha(ws,21,['Saíram por motivo apurado na leitura',f'=B22-B20',f'=B21/$B$22'],zebra=True,fmt={3:'0%'})
linha(ws,22,['Total com texto de queima ou avaria',f'={f172}','=B22/B22'],bold=True,fmt={3:'0%'})
ws['A24']='Por mês'; ws['A24'].font=H2
cab(ws,25,['Mês','Expurgos no mês','Aguardando o COPO','% do mês',''])
meses=['jan','fev','mar','abr','mai','jun','jul','ago']
for i,m in enumerate(meses):
    rr=26+i
    linha(ws,rr,[m,f'=COUNTIFS({E("B")},"{m}")',
        f'=COUNTIFS({E("B")},"{m}",{E("D")},"Sem interrupção")+COUNTIFS({E("B")},"{m}",{E("D")},"Fora da janela")',
        f'=IF(B{rr}=0,0,C{rr}/B{rr})'],zebra=(i%2==1),fmt={4:'0%'})
linha(ws,34,['Total','=SUM(B26:B33)','=SUM(C26:C33)','=C34/B34'],bold=True,fmt={4:'0%'})
ws['A35']='Julho não é comparável: a Crítica do mês se perdeu e a conferência de interrupção não rodou.'
ws['A35'].font=ITAL
ws['A37']='Prova de troca dentro dos 112 pendentes'; ws['A37'].font=H2
cab(ws,38,['Situação','SS','%','',''])
p112=f'COUNTIFS({E("D")},"Sem interrupção",{E("U")},"sim")+COUNTIFS({E("D")},"Fora da janela",{E("U")},"sim")'
linha(ws,39,['Troca comprovada pela série',f'={p112}',f'=B39/$B$41'],fmt={3:'0%'})
linha(ws,40,['Sem comprovação pela série','=B41-B39',f'=B40/$B$41'],zebra=True,fmt={3:'0%'})
linha(ws,41,['Total pendente',f'=B6','=B41/B41'],bold=True,fmt={3:'0%'})

# ================= 3. DINAMICAS =================
def vals(i):
    si=cache.cacheFields[i].sharedItems
    return [getattr(x,'v',None) for x in (si._fields or [])]
def novo(nome,campos,ref):
    p=copy.deepcopy(src); p.name=nome; p.cache=cache
    p.location.ref=ref; p.location.firstHeaderRow=1; p.location.firstDataRow=1; p.location.firstDataCol=len(campos)
    for f in p.pivotFields: f.axis=None; f.items=[]; f.showAll=False
    for c in campos:
        pf=p.pivotFields[c]; pf.axis='axisRow'; pf.showAll=False
        pf.items=[FieldItem(x=k,t='data') for k in range(len(vals(c)))]+[FieldItem(t='default')]
    p.rowFields=[RowColField(x=c) for c in campos]
    p.rowItems=[]; p.colItems=[]; p.colFields=[]
    return p

for nome,campos,ref,tit,sub,larg in [
 ('DinCategoria',[2],'A4:B10','Din Categoria','Contagem de SS por macro categoria. Arraste outros campos na lista à direita para explorar.',[38,16]),
 ('DinMotivo',[2,3],'A4:B30','Din Motivo','Macro categoria aberta por motivo registrado na leitura caso a caso.',[42,16]),
 ('DinTextoMotivo',[5,3],'A4:B45','Din Texto x Motivo','Categoria pelo texto da SS aberta por motivo — é aqui que se lê a visão dos 172 com texto de queima ou avaria.',[42,16]),
]:
    w=wb.create_sheet(tit)
    titulo(w,tit.replace('Din ','Dinâmica: '),sub)
    for j,x in enumerate(larg,1): w.column_dimensions[gl(j)].width=x
    w.add_pivot(novo(nome,campos,ref))

ordem=['Leitura','Resumo','Din Categoria','Din Motivo','Din Texto x Motivo','Planilha1','Detalhes1','Detalhes2','Expurgos']
wb._sheets=[wb[n] for n in ordem if n in wb.sheetnames]+[s for s in wb._sheets if s.title not in ordem]
for n in ['Leitura','Resumo','Din Categoria','Din Motivo','Din Texto x Motivo']:
    wb[n].sheet_view.showGridLines=False
wb.active=0
wb.save('Expurgos_Jan_Ago_2026.xlsx')
print('salvo')
