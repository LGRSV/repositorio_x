# -*- coding: utf-8 -*-
import csv, json, glob, collections, os
csv.field_size_limit(10**8)
A=[r for r in json.load(open("base_3602.json")) if str(r.get("TIPOSS") or "").strip()]
alvo={str(r.get("NUM_TRAFO") or "").strip() for r in A if str(r.get("NUM_TRAFO") or "").strip()}
gemea={"03"+t[-8:] for t in alvo if len(t)>=8}
print("trafos alvo:",len(alvo))
COLS=["DTA_ABERT","DTA_FECH","NUM_SEQ_OPER_INIC_HDE","COD_ELE_PROBLEMA","COD_ELE_INTERROMPIDO","COD_ELE_FECHADO",
      "DES_CAUSA_INTER_CAU","DES_SUB_CAUSA_INTER_SCR","GRUPO_CAUSA","QTD_CONS_INTER_FAT","OBSERVACAO","DES_ORIG_ORI"]
out=collections.defaultdict(list)
for f in sorted(glob.glob("crit/Critica-CHEIO_*.txt")):
    n=0
    with open(f,encoding="latin-1",newline="") as fh:
        rd=csv.DictReader(fh,delimiter=";")
        for row in rd:
            ats=[str(row.get(c) or "").strip() for c in ("COD_ELE_PROBLEMA","COD_ELE_INTERROMPIDO","COD_ELE_FECHADO")]
            hit=[a for a in ats if a and (a in alvo or a in gemea)]
            if not hit: continue
            seq=str(row.get("NUM_SEQ_OPER_INIC_HDE") or "").strip()
            d={c:str(row.get(c) or "").strip() for c in COLS}
            d["OBSERVACAO"]=d["OBSERVACAO"][:200]
            d["_arq"]=os.path.basename(f)[-11:-4]
            out[seq].append(d); n+=1
    print("  %s -> %d linhas"%(os.path.basename(f),n))
json.dump(out,open("crit_alvo.json","w"),ensure_ascii=False)
print("ocorrências:",len(out))
