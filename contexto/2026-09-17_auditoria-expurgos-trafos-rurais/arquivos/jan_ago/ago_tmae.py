# -*- coding: utf-8 -*-
import csv, json, collections, datetime, re
csv.field_size_limit(10**8)
F="/root/.claude/uploads/74dc9c64-5026-54ee-a81e-173d2f38a735/adbbe69d-TMAE_082026_1.txt"
def dt(v):
    v=str(v or "").replace("T"," ").strip()
    for f in ("%d-%m-%Y %H:%M:%S","%d-%m-%Y %H:%M","%d/%m/%Y %H:%M:%S","%d/%m/%Y %H:%M","%Y-%m-%d %H:%M:%S","%Y-%m-%d %H:%M","%d/%m/%y"):
        try: return datetime.datetime.strptime(v[:19],f)
        except: pass
tm=collections.defaultdict(list)
n=0
with open(F,encoding="latin-1",newline="") as fh:
    for r in csv.DictReader(fh,delimiter=";"):
        n+=1
        for c in ("COD_ELE_REDE_TNT","COD_INS_TRF_TNT"):
            v=str(r.get(c) or "").strip()
            if v and v not in ("0","TR","CH","DJ",""): tm[v].append(r)
print("linhas TMAE ago:",n,"| ativos:",len(tm))
d=json.load(open("as_1696.json"))
def U(r,c): return str(r.get(c) or "").strip().upper()
AGO=[r for r in d if str(r.get("mes"))=="2026-08"]
print("SS de agosto no universo:",len(AGO))
com=0; det=[]
for r in AGO:
    t=str(r.get("trafo") or "").strip(); d0=dt(r.get("abertura"))
    cands=tm.get(t,[]) or tm.get("03"+t[-8:],[])
    dentro=[]
    for a in cands:
        o=dt(a.get("DTA_ORIG_TNT"))
        if d0 and o and -2 <= (o-d0).days <= 7: dentro.append((o,a))
    dentro.sort(key=lambda x:x[0])
    if dentro: com+=1
    a=dentro[0][1] if dentro else {}
    det.append({"ss":r["ss"],"trafo":t,"cat":U(r,"categoria"),"conta":U(r,"conta"),
      "no_ativo":len(cands),"na_janela":len(dentro),
      "causa":a.get("DES_CAUSA_INTER_CAU",""),"sub":a.get("DES_SUB_CAUSA_INTER_SCR",""),
      "grupo":a.get("GRUPO_CAUSA",""),"orig":a.get("DES_ORIG_ORI",""),
      "concl":a.get("COD_TIPO_CONCL_TNT",""),"equipe":a.get("EQUIPE",""),
      "dta":a.get("DTA_ORIG_TNT",""),"obs":str(a.get("DES_OBS_EXEC_SERV_TNT",""))[:300]})
json.dump(det,open("agosto_tmae.json","w"),ensure_ascii=False)
print("com atendimento na janela: %d de %d (%.0f%%)"%(com,len(AGO),100*com/len(AGO)))
print("sem atendimento nenhum no ativo:",sum(1 for x in det if x["no_ativo"]==0))
print("\ncausas do TMAE de agosto (nas que casaram):")
for k,v in collections.Counter(x["causa"] for x in det if x["causa"]).most_common(10): print("   %3d %s"%(v,k))
print("\nsubcausas:")
for k,v in collections.Counter(x["sub"] for x in det if x["sub"]).most_common(10): print("   %3d %s"%(v,k))
print("\nsem atendimento na janela x categoria:")
for k,v in collections.Counter(x["cat"] for x in det if x["na_janela"]==0).most_common(12): print("   %3d %s"%(v,k))
