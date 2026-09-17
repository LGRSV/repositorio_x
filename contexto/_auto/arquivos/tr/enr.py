import openpyxl, json, gzip, re, datetime, collections, warnings; warnings.filterwarnings('ignore')
U='/root/.claude/uploads/74dc9c64-5026-54ee-a81e-173d2f38a735/'
B='/home/user/repositorio_x/auditoria-transformadores-134/'
def nz(v):
    if v in (None,''): return ''
    s=str(v).strip()
    if s.endswith('.0'): s=s[:-2]
    return s.lstrip('0') or '0'
def g(r,i): return r[i] if i<len(r) else None
def d(v): return v.date().isoformat() if isinstance(v,datetime.datetime) else (str(v).strip() if v not in (None,'') else '')
def load(path,aba):
    w=openpyxl.load_workbook(path,read_only=True); s=w[aba]; i=s.iter_rows(values_only=True)
    h=[' '.join(str(x).split()) if x is not None else '' for x in next(i)]
    rows=[r for r in i]; w.close(); return h,{k:j for j,k in enumerate(h)},rows

# ---- alvo
h0,I0,r0=load(U+'ec33c0b4-analise_trafos_rurais_1125_e_150.xlsx','Trafos 112,5 e 150 rural')
alvo=[]
for r in r0:
    if not any(v not in (None,'') for v in r): continue
    cods=re.findall(r'\d{10}',str(g(r,4) or ''))
    alvo.append({'ss':str(g(r,11) or '').strip(),'trafo':cods[0] if cods else '','trafo2':cods[1] if len(cods)>1 else '',
      'alim':g(r,0),'loc':g(r,1),'polo':g(r,2),'reg':g(r,3),'pot_info':g(r,5),'pot_fis':g(r,6),'pot_ts':g(r,7),
      'cl_info':g(r,8),'cl_fis':g(r,9),'cl_ts':g(r,10),'os_orig':g(r,17),'obra_orig':g(r,26)})
print('alvo:',len(alvo))

# ---- base de SS/OS mais nova
hS,IS,rS=load(U+'8cfc359b-Trafo.xlsx','BASE_SS_OS')
ss2row={str(g(r,IS['NUMERO_SS']) or '').strip():r for r in rS}
# ---- OS_STATUS por elemento
hO,IO,rO=load(U+'da2484db-OS_STATUS_2026.xlsx','Dados')
por_elem=collections.defaultdict(list)
for r in rO:
    e=nz(g(r,IO['ELEMENTO']))
    if e: por_elem[e].append(r)
# ---- AIC
hA,IA,rA=load('/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad/AIC_2026_12-09.xlsx','Export')
aic={nz(g(r,IA['NUM_OBRA'])):r for r in rA if nz(g(r,IA['NUM_OBRA']))}
# ---- FIS
fis=json.load(gzip.open(B+'dados/fis-2026-07-energisa.json.gz'))
# ---- material
hM,IM,rM=load(B+'public/bases/Base_Material.xlsx','Material da obra')
mat=collections.defaultdict(list)
for r in rM: mat[nz(g(r,IM['num_obra']))].append(r)
# ---- expurgos
hE,IE,rE=load(U+'2a6cebeb-Base_de_Expurgos_jan_ago_3_2.xlsx','Expurgos')
exp={str(g(r,IE['SS']) or '').strip():r for r in rE}

CAMPO=[('SS','ss'),('Transformador','trafo'),('2º código no arquivo','trafo2'),
 ('Alimentador','alim'),('Localidade','loc'),('Polo','polo'),('Regional','reg')]
S=[('OS','NUMERO_OS'),('Obra','NUM_OBRA'),('Esquema de serviço','ESQUEMA'),('Situação da SS','SITUACAO_SS'),
   ('Criticidade','CRITICIDADE_SS'),('Abertura da SS','DATA_ABERTURA_SS'),('Término da SS','DATA_TERMINO_SS'),
   ('Limite da SS','DATA_LIMITE_SS'),('Origem da SS','ORIGEM_SS'),('Defeito da SS','DEFEITO_SS'),
   ('Origem da OS','ORIGEM'),('Defeito da OS','DEFEITO'),('Equipe','COD_EQUIPE'),('Solicitante','SOLICITANTE'),
   ('Clientes','QTD_CLIENTES'),('Rural/urbano','RURA_URBANO'),('Tipo da SS','TIPOSS'),('Nº interrupção','NUM_INT'),
   ('Coord X','COORD_X'),('Coord Y','COORD_Y')]
T=[('Série retirada','NS_RETIRADO'),('Série instalada','NS_INSTALADO'),('Tombamento retirado','TOMBAMENTO_RETIRADO'),
   ('Tombamento instalado','TOMBAMENTO_INSTALADO'),('Fabricante retirado','FABRICANTE_RETIRADO'),
   ('Fabricante instalado','FABRICANTE_INSTALADO'),('Fabricação retirado','DATA_FABRICACAO_RETIRADO'),
   ('Fabricação instalado','DATA_FABRICACAO_INSTALADO'),('Potência retirada','POTENCIA_RET'),('Potência instalada','POTENCIA_INST'),
   ('Retirado é reformado','TRANSFORMADOR_RETIRADO_É_REFORMADO'),('Instalado é reformado','TRAFO_INSTALADO_É_REFORMADO'),
   ('Reformadora instalado','REFORMADORA_INSTALADO'),('Reformadora desativado','REFORMADORA_DESAT')]
C=[('Provável motivo do defeito','PROVÁVEL_MOTIVO_DO_DEFEITO'),('Aterramento ligado ao tanque','ATERRAMENTO_ESTA_CONECTADO_AO_TANQUE_DO_TRAFO'),
   ('Vazamento de óleo','EQUIPAMENTO_APRESENTA_VAZAMENTO_DE_OLEO'),('Vegetação na rede','EXISTE_VEGETAÇÃO_TOCANDO_A_REDE_BT_OU_MT'),
   ('Fez melhoria de aterramento','FEZ_MELHORIA_DE_ATERRAMENTO'),('Instalou espaçador','INSTALOU_ALGUM_ESPAÇADOR'),
   ('Para-raios instalado','PARA_RAIOS_INSTALADO_SUBSTITUIDO'),('Elo instalado','QUAL_ELO_INSTALADO_NO_LOCAL'),
   ('Tipo de barramento','TIPO_DE_BARRAMENTO'),('Cola e fita','FEITO_COLA_E_FITA'),
   ('Aterr. antes X1','MEDIÇÃO_DE_ATERRAMENTO_ANTES_X1'),('Aterr. antes X2','MEDIÇÃO_DE_ATERRAMENTO_ANTES_X2'),('Aterr. antes X3','MEDIÇÃO_DE_ATERRAMENTO_ANTES_X3'),
   ('Aterr. depois X1','MEDIÇÃO_DE_ATERRAMENTO_X1'),('Aterr. depois X2','MEDIÇÃO_DE_ATERRAMENTO_X2'),('Aterr. depois X3','MEDIÇÃO_DE_ATERRAMENTO_X3')]
FI=[('FIS potência nominal','POTENCIA_NOMINAL'),('FIS fabricante','FABRICANTE'),('FIS série','NUMERO_SERIE'),
    ('FIS tombamento','TOMBAMENTO'),('FIS fabricação','DATA_FABRICACAO'),('FIS proprietário','PROPRIETARIO'),
    ('FIS fases','QTDFASES'),('FIS tipo de proteção','TIPO_PROTECAO'),('FIS elo lado carga','CAP_ELO_FUSIVEL_CARGA'),
    ('FIS spec','SPEC_NAME'),('FIS circuito','CIRCUITO'),('FIS município','DESC_MUNICIPIO'),('FIS latitude','LAT'),('FIS longitude','LONG')]
AI=[('Obra status','DSC_STATUS'),('Obra status AIC','STATUS AIC'),('Obra AIC','AIC'),('Obra projeto SIGCO','NUM_PROJETO_SIGCO'),
    ('Obra tipo','TIPO_OBRA'),('Obra descrição','DESCRICAO_OBRA'),('Obra abertura','DTH_ABERTURA'),
    ('Obra conclusão física','DATA_CONCLUSAO_FISICA'),('Obra encerramento','DTH_ENCERRAMENTO'),
    ('Obra orçado','VAL_TOTAL_ORCADO'),('Obra realizado','TOTAL_REALIZADO'),('Obra empreiteira','EMPREITEIRA_PROJETO'),('Obra regional','REGIONAL')]

out=[]
for a in alvo:
    L={}; [L.__setitem__(n,a.get(k,'')) for n,k in CAMPO]
    L['Potência Infotrafo']=a['pot_info']; L['Potência FIS (arquivo)']=a['pot_fis']; L['Potência TS']=a['pot_ts']
    L['Clientes Infotrafo']=a['cl_info']; L['Clientes FIS (arquivo)']=a['cl_fis']; L['Clientes TS']=a['cl_ts']
    r=ss2row.get(a['ss'])
    L['Achada na base de SS/OS de 10/09']='sim' if r else 'não'
    for n,c in S+T+C: L[n]=d(g(r,IS[c])) if r and c in IS else ''
    L['Texto da SS']=' '.join(str(g(r,IS['DESCRIPTION_SS']) or '').split())[:900] if r else ''
    L['Texto da OS']=' '.join(str(g(r,IS['DESCRICAO_OS']) or '').split())[:900] if r else ''
    # FIS
    f=fis.get(a['trafo'])
    L['Achado no cadastro FIS']='sim' if f else 'não'
    for n,c in FI: L[n]=(f or {}).get(c,'')
    # OS_STATUS por elemento
    lst=por_elem.get(nz(a['trafo']),[])
    sub=[x for x in lst if 'SUBSTITUI' in str(g(x,IO['DESCESQUEMA']) or '').upper()]
    pick=sub[0] if sub else (lst[0] if lst else None)
    L['OS no OS_STATUS (total do ativo)']=len(lst)
    L['OS_STATUS nº']=d(g(pick,IO['NUMERO_OS'])) if pick else ''
    L['OS_STATUS esquema']=d(g(pick,IO['DESCESQUEMA'])) if pick else ''
    L['OS_STATUS situação']=d(g(pick,IO['SITUACAO'])) if pick else ''
    L['OS_STATUS criação']=d(g(pick,IO['DATA_CRIACAO'])) if pick else ''
    L['OS_STATUS início exec.']=d(g(pick,IO['INICIO_EXEC'])) if pick else ''
    L['OS_STATUS fim exec.']=d(g(pick,IO['FIM_EXEC'])) if pick else ''
    L['OS_STATUS equipe executora']=d(g(pick,IO['EQUIPE_EXECUTORA'])) if pick else ''
    L['OS_STATUS origem exec.']=d(g(pick,IO['ORIGEM_EXEC'])) if pick else ''
    L['OS_STATUS impedimento']=d(g(pick,IO['IMPEDIMENTO'])) if pick else ''
    L['OS_STATUS obra']=d(g(pick,IO['NUM_OBRA'])) if pick else ''
    # AIC
    ob=nz(L.get('Obra') or a['obra_orig'])
    ar=aic.get(ob)
    L['Obra achada no AIC de 12/09']='sim' if ar else ('não' if ob else '')
    for n,c in AI: L[n]=d(g(ar,IA[c])) if ar and c in IA else ''
    # material
    mm=mat.get(ob,[])
    L['Itens de material na obra']=len(mm)
    tr=[x for x in mm if 'TRANSFORMADOR' in str(g(x,IM['descricao']) or '').upper()]
    L['Transformador no material']='sim' if tr else ('não' if mm else '')
    L['Material — transformador']=' | '.join(f"{g(x,IM['descricao'])} (prev {g(x,IM['qtdprevista'])}, real {g(x,IM['qtdrealizada'])})" for x in tr)[:400]
    # expurgo
    e=exp.get(a['ss'])
    L['Está na base de expurgos']='sim' if e else 'não'
    L['Expurgo — macro categoria']=d(g(e,IE['Macro categoria'])) if e else ''
    L['Expurgo — motivo']=d(g(e,IE['Motivo'])) if e else ''
    L['Expurgo — categoria pelo texto']=d(g(e,IE['Categoria pelo texto'])) if e else ''
    L['Expurgo — por que saiu']=' '.join(str(g(e,IE['Por que saiu']) or '').split())[:500] if e else ''
    out.append(L)

json.dump(out,open('consolidado.json','w'),ensure_ascii=False,default=str)
print('colunas geradas:',len(out[0]))
print('\nCOBERTURA:')
for k in ['Achada na base de SS/OS de 10/09','Achado no cadastro FIS','Obra achada no AIC de 12/09','Está na base de expurgos','Transformador no material']:
    print(f'  {k:38s}',dict(collections.Counter(str(o[k]) for o in out)))
