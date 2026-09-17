import json, openpyxl, collections, warnings; warnings.filterwarnings('ignore')
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter as gl
out=json.load(open('consolidado.json'))
cols=list(out[0].keys())

GRUPOS=[
 ('Identificação (do seu arquivo)','1F1F4C',['SS','Transformador','2º código no arquivo','Alimentador','Localidade','Polo','Regional',
   'Potência Infotrafo','Potência FIS (arquivo)','Potência TS','Clientes Infotrafo','Clientes FIS (arquivo)','Clientes TS']),
 ('Base de SS/OS de 10/09','1F6F8C',['Achada na base de SS/OS de 10/09','OS','Obra','Esquema de serviço','Situação da SS','Criticidade',
   'Abertura da SS','Término da SS','Limite da SS','Origem da SS','Defeito da SS','Origem da OS','Defeito da OS','Equipe','Solicitante',
   'Clientes','Rural/urbano','Tipo da SS','Nº interrupção','Coord X','Coord Y']),
 ('Transformador retirado e instalado','2E7D5B',['Série retirada','Série instalada','Tombamento retirado','Tombamento instalado',
   'Fabricante retirado','Fabricante instalado','Fabricação retirado','Fabricação instalado','Potência retirada','Potência instalada',
   'Retirado é reformado','Instalado é reformado','Reformadora instalado','Reformadora desativado']),
 ('Formulário de campo do executante','6B7A3A',['Provável motivo do defeito','Aterramento ligado ao tanque','Vazamento de óleo','Vegetação na rede',
   'Fez melhoria de aterramento','Instalou espaçador','Para-raios instalado','Elo instalado','Tipo de barramento','Cola e fita',
   'Aterr. antes X1','Aterr. antes X2','Aterr. antes X3','Aterr. depois X1','Aterr. depois X2','Aterr. depois X3']),
 ('Cadastro FIS de julho/2026','8A5A2B',['Achado no cadastro FIS','FIS potência nominal','FIS fabricante','FIS série','FIS tombamento',
   'FIS fabricação','FIS proprietário','FIS fases','FIS tipo de proteção','FIS elo lado carga','FIS spec','FIS circuito','FIS município',
   'FIS latitude','FIS longitude']),
 ('OS_STATUS 2026 (pelo código do ativo)','6A4C93',['OS no OS_STATUS (total do ativo)','OS_STATUS nº','OS_STATUS esquema','OS_STATUS situação',
   'OS_STATUS criação','OS_STATUS início exec.','OS_STATUS fim exec.','OS_STATUS equipe executora','OS_STATUS origem exec.',
   'OS_STATUS impedimento','OS_STATUS obra']),
 ('Obra no AIC de 12/09','B5651D',['Obra achada no AIC de 12/09','Obra status','Obra status AIC','Obra AIC','Obra projeto SIGCO','Obra tipo',
   'Obra descrição','Obra abertura','Obra conclusão física','Obra encerramento','Obra orçado','Obra realizado','Obra empreiteira','Obra regional']),
 ('Material da obra','7A5C1E',['Itens de material na obra','Transformador no material','Material — transformador']),
 ('Base de expurgos jan–ago','8C2F39',['Está na base de expurgos','Expurgo — macro categoria','Expurgo — motivo','Expurgo — categoria pelo texto','Expurgo — por que saiu']),
 ('Textos integrais','404040',['Texto da SS','Texto da OS']),
]
ordem=[c for _,_,cs in GRUPOS for c in cs]
faltam=[c for c in cols if c not in ordem]
assert not faltam, faltam

F='Calibri'; GRID='D9D9D9'
B=Side(style='thin',color=GRID); BOX=Border(left=B,right=B,top=B,bottom=B)
wb=openpyxl.Workbook(); ws=wb.active; ws.title='Consolidado'
j=1
for nome,cor,cs in GRUPOS:
    ws.cell(1,j,nome).fill=PatternFill('solid',fgColor=cor)
    ws.cell(1,j).font=Font(name=F,size=10,bold=True,color='FFFFFF')
    ws.cell(1,j).alignment=Alignment(horizontal='center',vertical='center')
    if len(cs)>1: ws.merge_cells(start_row=1,start_column=j,end_row=1,end_column=j+len(cs)-1)
    for c in cs:
        cel=ws.cell(2,j,c); cel.fill=PatternFill('solid',fgColor=cor)
        cel.font=Font(name=F,size=9.5,bold=True,color='FFFFFF')
        cel.alignment=Alignment(vertical='center',wrap_text=True); cel.border=BOX
        w=14
        if c in ('Texto da SS','Texto da OS','Expurgo — por que saiu','Obra descrição','Material — transformador','Provável motivo do defeito','FIS spec'): w=46
        elif c in ('SS','Transformador','OS','Localidade','Esquema de serviço','OS_STATUS esquema','Obra tipo'): w=22
        ws.column_dimensions[gl(j)].width=w
        j+=1
ws.row_dimensions[1].height=18; ws.row_dimensions[2].height=40
for i,o in enumerate(out):
    r=i+3
    for j,c in enumerate(ordem,1):
        v=o.get(c,'')
        cel=ws.cell(r,j,v if v!='' else None)
        cel.font=Font(name=F,size=10); cel.border=BOX
        cel.alignment=Alignment(vertical='top',wrap_text=(c in ('Texto da SS','Texto da OS','Expurgo — por que saiu','Obra descrição','Material — transformador')))
        if i%2==1: cel.fill=PatternFill('solid',fgColor='F7F8FA')
    ws.row_dimensions[r].height=30
ws.freeze_panes='C3'
ws.auto_filter.ref=f'A2:{gl(len(ordem))}{len(out)+2}'

# ---- Leitura
lt=wb.create_sheet('Leitura')
lt.column_dimensions['A'].width=34; lt.column_dimensions['B'].width=104
lt['A1']='Levantamento dos 16 transformadores rurais de 112,5 e 150 kVA'
lt['A1'].font=Font(name=F,size=15,bold=True,color='1F1F4C')
lt['A2']='Tudo que as bases disponíveis têm sobre essas SS, uma coluna por informação.'
lt['A2'].font=Font(name=F,size=10,color='595959')
r=4
def bl(t,its):
    global r
    lt.cell(r,1,t).font=Font(name=F,size=12,bold=True,color='1F1F4C'); r+=1
    for a,b in its:
        lt.cell(r,1,a).font=Font(name=F,size=11,bold=True)
        lt.cell(r,1).alignment=Alignment(vertical='top',wrap_text=True)
        c=lt.cell(r,2,b); c.font=Font(name=F,size=11); c.alignment=Alignment(vertical='top',wrap_text=True)
        lt.row_dimensions[r].height=max(15,14*(1+len(b)//118)); r+=1
    r+=1
ach=lambda k,v: sum(1 for o in out if str(o[k])==v)
bl('Fontes cruzadas',[
 ('Base de SS/OS de 10/09','Trafo.xlsx, aba BASE_SS_OS — 3.601 SS de transformador, aberturas de 01/01 a 09/09/2026, 65 colunas. É a fonte mais rica: traz OS, obra, séries retirada e instalada, potências, e o formulário preenchido pelo executante em campo.'),
 ('Cadastro FIS de julho/2026','92.424 transformadores da Energisa por código operativo — potência nominal, fabricante, série, tombamento, proprietário, elo, coordenada.'),
 ('OS_STATUS 2026','78.840 ordens de serviço do ano. O cruzamento aqui é pelo código do ativo (coluna ELEMENTO), não pelo número da OS, porque o formato do número difere entre as bases.'),
 ('AIC de 12/09','11.323 obras — status, status contábil AIC, projeto SIGCO, tipo, datas e valores orçado e realizado.'),
 ('Material da obra','15.568 itens de material por obra, usado para verificar se há transformador baixado.'),
 ('Base de expurgos jan–ago','As 227 SS expurgadas do indicador, para sinalizar se alguma destas 16 saiu e por quê.'),
])
bl('O que foi encontrado',[
 ('Na base de SS/OS',f"{ach('Achada na base de SS/OS de 10/09','sim')} das 16 SS. É de onde vêm OS, obra, séries, potências e o formulário de campo."),
 ('No cadastro FIS',f"{ach('Achado no cadastro FIS','sim')} dos 16 transformadores. Serve para conferir a potência declarada contra a cadastrada."),
 ('No AIC',f"{ach('Obra achada no AIC de 12/09','sim')} das obras vinculadas, com status contábil e valores."),
 ('Na base de expurgos',f"{ach('Está na base de expurgos','sim')} das 16. As demais seguem no indicador."),
 ('No material da obra',f"Nenhuma obra apresenta transformador baixado no export de material que temos. O export cobre o universo da auditoria das 1.510, e estas SS rurais estão fora dele — a ausência é de extração, não prova de que não houve troca."),
])
bl('Como ler',[
 ('Cores do cabeçalho','Cada bloco de colunas tem a cor da fonte de onde veio o dado. A primeira faixa é o que já estava no seu arquivo.'),
 ('Coluna "Achada..."','Em cada bloco, a primeira coluna diz se a chave foi encontrada naquela base. Vazio na linha significa que a base não tem o campo, não que o valor seja zero.'),
 ('Potências','Há quatro medidas de potência: Infotrafo, FIS e TS vieram do seu arquivo; "Potência retirada" e "Potência instalada" vêm do formulário de campo, e é a comparação entre elas que mostra se houve mudança de capacidade.'),
 ('Séries','Série retirada diferente da instalada é a prova documental de que a troca ocorreu.'),
])
wb.save('Trafos_rurais_112_150_levantamento.xlsx')
print('salvo | colunas:',len(ordem),'| linhas:',len(out))
