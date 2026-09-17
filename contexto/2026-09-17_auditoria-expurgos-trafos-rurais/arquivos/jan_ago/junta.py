# -*- coding: utf-8 -*-
import json, collections, datetime, re
A=[r for r in json.load(open("base_3602.json")) if str(r.get("TIPOSS") or "").strip()]
CR=json.load(open("crit_alvo.json"))
TM=json.load(open("/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad/aux/tmae.json"))
def dt(v):
    v=str(v or "").replace("T"," ").strip()
    for f in ("%d/%m/%Y %H:%M:%S","%d/%m/%Y %H:%M","%Y-%m-%d %H:%M:%S","%Y-%m-%d %H:%M","%d-%m-%Y %H:%M:%S","%d-%m-%Y %H:%M","%Y-%m-%d","%d/%m/%Y"):
        try: return datetime.datetime.strptime(v[:19],f)
        except: pass
# ocorrências: janela do primeiro DTA_ABERT ao último DTA_FECH
OC=[]
for seq,linhas in CR.items():
    ab=[dt(x["DTA_ABERT"]) for x in linhas if dt(x["DTA_ABERT"])]
    fe=[dt(x["DTA_FECH"]) for x in linhas if dt(x["DTA_FECH"])]
    if not ab: continue
    ini=min(ab); fim=max(fe) if fe else ini
    ativos=collections.defaultdict(set)   # ativo -> papéis
    for x in linhas:
        for c,p in (("COD_ELE_PROBLEMA","problema"),("COD_ELE_INTERROMPIDO","interrompido"),("COD_ELE_FECHADO","fechado")):
            v=x.get(c,"").strip()
            if v: ativos[v].add(p)
    base=linhas[0]
    OC.append({"seq":seq,"ini":ini,"fim":fim,"ativos":ativos,
               "causa":base["DES_CAUSA_INTER_CAU"],"sub":base["DES_SUB_CAUSA_INTER_SCR"],
               "grupo":base["GRUPO_CAUSA"],"orig":base["DES_ORIG_ORI"],
               "cli":base["QTD_CONS_INTER_FAT"],"obs":base["OBSERVACAO"],"arq":base["_arq"]})
porativo=collections.defaultdict(list)
for o in OC:
    for a in o["ativos"]: porativo[a].append(o)
print("ocorrências:",len(OC),"| ativos indexados:",len(porativo))
def casa(tr,d0):
    if not d0: return None,None
    cands=porativo.get(tr,[]) or porativo.get("03"+tr[-8:],[])
    melhor=None; papel=None
    for o in cands:
        if o["ini"]-datetime.timedelta(hours=1) <= d0 <= o["fim"]+datetime.timedelta(hours=24):
            if melhor is None or o["ini"]>melhor["ini"]:
                melhor=o; papel=", ".join(sorted(o["ativos"].get(tr) or o["ativos"].get("03"+tr[-8:],set())))
    return melhor,papel
saida=[]
for r in A:
    tr=str(r.get("NUM_TRAFO") or "").strip(); d0=dt(r.get("DATA_ABERTURA_SS"))
    o,papel=casa(tr,d0)
    tm=[]
    for k in (tr,"03"+tr[-8:] if len(tr)>=8 else tr):
        for a in TM.get(k,[]):
            t0=dt(a.get("DTA_ORIG_TNT"))
            if d0 and t0 and -2 <= (t0-d0).days <= 7: tm.append((t0,a))
        if tm: break
    tm.sort(key=lambda x:x[0]); t0=tm[0][1] if tm else {}
    saida.append({"ss":str(r.get("NUMERO_SS") or "").strip(),"tr":tr,
      "cr_causa":(o or {}).get("causa",""),"cr_sub":(o or {}).get("sub",""),"cr_grupo":(o or {}).get("grupo",""),
      "cr_orig":(o or {}).get("orig",""),"cr_papel":papel or "","cr_ini":str((o or {}).get("ini","")),
      "cr_cli":(o or {}).get("cli",""),"cr_obs":(o or {}).get("obs",""),"cr_arq":(o or {}).get("arq",""),
      "tm_causa":t0.get("DES_CAUSA_INTER_CAU",""),"tm_sub":t0.get("DES_SUB_CAUSA_INTER_SCR",""),
      "tm_grupo":t0.get("GRUPO_CAUSA",""),"tm_obs":str(t0.get("DES_OBS_EXEC_SERV_TNT",""))[:250],
      "tm_data":t0.get("DTA_ORIG_TNT",""),"tm_n":len(tm)})
json.dump(saida,open("cr_tm_por_ss.json","w"),ensure_ascii=False)
n=len(saida)
print("com causa na Crítica: %d (%.0f%%)"%(sum(1 for x in saida if x["cr_causa"]),100*sum(1 for x in saida if x["cr_causa"])/n))
print("com causa no TMAE:    %d (%.0f%%)"%(sum(1 for x in saida if x["tm_causa"]),100*sum(1 for x in saida if x["tm_causa"])/n))
print("\ncausas da Crítica:",collections.Counter(x["cr_causa"] for x in saida if x["cr_causa"]).most_common(10))
print("\nsubcausas da Crítica:",collections.Counter(x["cr_sub"] for x in saida if x["cr_sub"]).most_common(10))
print("\ncausas do TMAE:",collections.Counter(x["tm_causa"] for x in saida if x["tm_causa"]).most_common(10))
