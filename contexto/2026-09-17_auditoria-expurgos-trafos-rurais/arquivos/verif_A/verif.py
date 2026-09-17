import re, json, glob, os, collections, datetime as dt
import openpyxl
BASE='/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad'
OUT=BASE+'/verif_A'
def pdate(s):
    s=s.strip()
    if not s: return None
    for fmt in ('%d/%m/%Y %H:%M:%S','%d/%m/%Y %H:%M','%d/%m/%Y'):
        try: return dt.datetime.strptime(s,fmt)
        except ValueError: pass
    return 'BAD:'+s
# ---- load critica
rows=[]; problems=collections.Counter(); baddates=[]
for f in sorted(glob.glob(BASE+'/crit/Critica-CHEIO_0[1-6]-2026.txt')):
    fn=os.path.basename(f)
    with open(f,encoding='latin-1',newline='') as fh:
        raw=fh.read()
    lines=raw.split('\n')
    if lines and lines[-1]=='': lines.pop()
    hdr=[h.strip().lstrip('﻿') for h in lines[0].rstrip('\r').split(';')]
    idx={h:i for i,h in enumerate(hdr)}
    nh=len(hdr); iobs=idx['OBSERVACAO']; assert iobs==nh-1
    for ln,line in enumerate(lines[1:],start=2):
        line=line.rstrip('\r')
        p=line.split(';')
        if len(p)<nh:
            problems[(fn,'short',len(p))]+=1; continue
        if len(p)>nh:
            problems[(fn,'long')]+=1
            p=p[:nh-1]+[';'.join(p[nh-1:])]
        g=lambda k:p[idx[k]].strip()
        da=pdate(g('DTA_ABERT')); df=pdate(g('DTA_FECH'))
        for d in (da,df):
            if isinstance(d,str): baddates.append((fn,ln,d))
        rows.append(dict(file=fn,line=ln,occ=g('NUM_SEQ_OPER_INIC_HDE'),da=da if not isinstance(da,str) else None,
            df=df if not isinstance(df,str) else None,prob=g('COD_ELE_PROBLEMA'),inter=g('COD_ELE_INTERROMPIDO'),
            fech=g('COD_ELE_FECHADO'),obs=p[iobs]))
print('rows',len(rows),'problems',dict(problems),'baddates',len(baddates),baddates[:5])
# occurrences
occ=collections.defaultdict(list)
for r in rows: occ[r['occ']].append(r)
occwin={}
for k,rs in occ.items():
    das=[r['da'] for r in rs if r['da']]; dfs=[r['df'] for r in rs if r['df']]
    occwin[k]=(min(das) if das else None, max(dfs) if dfs else None, len(rs), sorted({r['file'] for r in rs}))
multi=sum(1 for k,v in occwin.items() if len(v[3])>1)
print('occurrences',len(occ),'spanning >1 file',multi)
# ---- load cases
wb=openpyxl.load_workbook(BASE+'/SS_x_Critica_trafo_e_chave_2026.xlsx',read_only=True,data_only=True)
cases=[]
for sn in ('Ausentes','Fora da janela'):
    ws=wb[sn]; it=ws.iter_rows(values_only=True); hdr=next(it); h={c:i for i,c in enumerate(hdr)}
    for r in it:
        if r[h['SS']] is None: continue
        cases.append(dict(grupo=sn,ss=str(r[h['SS']]).strip(),trafo=str(r[h['Transformador']]).strip(),ab=r[h['Abertura da SS']]))
print('cases',len(cases),collections.Counter(c['grupo'] for c in cases))
assert all(isinstance(c['ab'],dt.datetime) for c in cases), [c for c in cases if not isinstance(c['ab'],dt.datetime)]
assert all(re.fullmatch(r'\d{10}',c['trafo']) for c in cases)
# ---- search
achados=[]; resumo=[]
for c in cases:
    t=c['trafo']; last8=t[-8:]
    m=re.search(r'(\d{1,6})/2026\s*$',c['ss']); ssnum=int(m.group(1))
    pats=[('10 dígitos',re.compile(re.escape(t))),
          ('8 dígitos finais',re.compile(r'(?<!\d)\d{0,2}'+last8+r'(?!\d)')),
          ('nº da SS',re.compile(r'(?<!\d)0*%d/2026(?!\d)'%ssnum))]
    hits=[]  # per row
    for r in rows:
        o=r['obs']; found=[]
        for name,pat in pats:
            mm=pat.search(o)
            if mm: found.append((name,mm))
        if not found: continue
        ini,fim,npas,files=occwin[r['occ']]
        inwin=None
        if ini and fim:
            inwin = (ini-dt.timedelta(hours=1)) <= c['ab'] <= (fim+dt.timedelta(hours=24))
        elif ini:
            inwin = (ini-dt.timedelta(hours=1)) <= c['ab']  # fim ausente
        mm=found[0][1]; s=max(0,mm.start()-60); e=min(len(o),mm.end()+60)
        hits.append(dict(SS=c['ss'],Grupo=c['grupo'],Transformador=t,Abertura=c['ab'].isoformat(sep=' '),Ocorrencia=r['occ'],Arquivo=r['file'],Linha=r['line'],
            Inicio=ini.isoformat(sep=' ') if ini else None,Fim=fim.isoformat(sep=' ') if fim else None,Passos=npas,
            Como=' + '.join(n for n,_ in found),NaJanela=('SIM' if inwin else 'NÃO') if inwin is not None else 'SEM DATA',
            Prob=r['prob'],Inter=r['inter'],Fech=r['fech'],Trecho=o[s:e]))
    achados+=hits
    occs_in={h['Ocorrencia'] for h in hits if h['NaJanela']=='SIM'}
    if occs_in: v='MENCIONADO NA JANELA'
    elif hits: v='MENCIONADO FORA DA JANELA'
    else: v='NÃO MENCIONADO'
    resumo.append(dict(SS=c['ss'],Grupo=c['grupo'],Transformador=t,Veredito=v,Mencoes=len(hits),NaJanela=len([h for h in hits if h['NaJanela']=='SIM']),
        Ocorrencias=sorted({h['Ocorrencia'] for h in hits})))
json.dump(dict(achados=achados,resumo=resumo,problems={str(k):v for k,v in problems.items()},baddates=baddates),open(OUT+'/verif_A_result.json','w',encoding='utf-8'),ensure_ascii=False,indent=1,default=str)
# ---- compare with JSON
J=json.load(open(BASE+'/Ausentes_na_Observacao_da_Critica.json',encoding='utf-8'))
jres={r['SS']:r for r in J['resumo']}
mine={r['SS']:r for r in resumo}
print('SS sets equal:',set(jres)==set(mine), len(set(jres)^set(mine)))
tab=collections.Counter(); tabj=collections.Counter()
for ss,r in mine.items(): tab[(r['Grupo'],r['Veredito'])]+=1
for ss,r in jres.items(): tabj[(r['Grupo'],r['Veredito'])]+=1
print('\n%-16s %-28s %6s %6s'%('Grupo','Veredito','MEU','JSON'))
for k in sorted(set(tab)|set(tabj)): print('%-16s %-28s %6d %6d'%(k[0],k[1],tab[k],tabj[k]))
print('\nDIVERGÊNCIAS DE VEREDITO:')
for ss in sorted(mine):
    if mine[ss]['Veredito']!=jres[ss]['Veredito']:
        print(ss, 'MEU=',mine[ss]['Veredito'],'JSON=',jres[ss]['Veredito'])
# compare mentions at (SS, ocorrencia, linha/passo) level -> (SS,occ) sets
jm=collections.defaultdict(list)
for a in J['achados']: jm[(a['SS'],str(a['Ocorrência']))].append(a)
mm_=collections.defaultdict(list)
for a in achados: mm_[(a['SS'],a['Ocorrencia'])].append(a)
only_me=set(mm_)-set(jm); only_j=set(jm)-set(mm_)
print('\nmenções (SS,occ): meu',len(mm_),'json',len(jm),'só meu',len(only_me),'só json',len(only_j))
for k in sorted(only_me): print(' SÓ MEU',k,mm_[k][0]['Como'],mm_[k][0]['NaJanela'],mm_[k][0]['Inicio'],mm_[k][0]['Fim'],'|',mm_[k][0]['Trecho'][:150])
for k in sorted(only_j): print(' SÓ JSON',k,jm[k][0].get('Como apareceu'),jm[k][0].get('Na janela'),'|',jm[k][0].get('Trecho da observação','')[:150])
# per-hit count and window flag comparison
print('\nachados: meu',len(achados),'json',len(J['achados']))
diffwin=[]
for k in set(mm_)&set(jm):
    a=mm_[k][0]; b=jm[k][0]
    if a['NaJanela']!=b['Na janela'] or a['Inicio']!=b['Início da ocorrência'] or a['Fim']!=b['Fim da ocorrência'] or len(mm_[k])!=len(jm[k]):
        diffwin.append((k,a['NaJanela'],b['Na janela'],a['Inicio'],b['Início da ocorrência'],a['Fim'],b['Fim da ocorrência'],len(mm_[k]),len(jm[k])))
print('divergências janela/datas/nº passos por (SS,occ):',len(diffwin))
for d in diffwin: print(' ',d)
