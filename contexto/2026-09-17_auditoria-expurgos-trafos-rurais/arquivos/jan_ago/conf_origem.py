# -*- coding: utf-8 -*-
import json, collections, re, unicodedata
rows=json.load(open("base_1671.json"))
MES={"01":"jan","02":"fev","03":"mar","04":"abr","05":"mai","06":"jun","07":"jul","08":"ago","09":"set"}
def mes(v):
    v=str(v or ""); return MES.get(v[5:7],"") if v[4:5]=="-" else MES.get(v[3:5],"")
rows=[r for r in rows if mes(str(r.get("DATA_ABERTURA_SS"))) not in ("set","")]
def S(r,c): return str(r.get(c) or "").strip().upper() or "(vazio)"
def norm(s):
    s=re.sub(r"_x000D_"," ",str(s or ""))
    s=unicodedata.normalize("NFD",s).encode("ascii","ignore").decode().upper()
    return re.sub(r"\s+"," ",s).strip()
REGRAS=[
 ("FURTO",        [r"\bFURT", r"\bROUB", r"LEVARAM O", r"SUBTRA"]),
 ("ABALROAMENTO", [r"ABALRO", r"COLIS", r"BATEU NO POSTE", r"ACIDENTE DE TRANSITO"]),
 ("PREVENTIVO",   [r"PREVENTIV", r"INSPECAO", r"NAO ESTAVA QUEIMADO", r"EQUIPAMENTO NORMAL",
                   r"NAO FOI (NECESSARIA|REALIZADA) A TROCA", r"GARANTIA", r"VIDA UTIL", r"TERMOGRAF",
                   r"(SERVICO|TROCA|SUBSTITUICAO) PROGRAMAD"]),
 ("REMANEJAMENTO",[r"REMANEJ", r"TRANSFERI O TRAFO"]),
 ("TENSÃO/TAPE",  [r"\bTAPE\b", r"NIVEL DE TENSAO", r"TENSAO BAIXA", r"REGULARIZA(CAO|R) (DE )?TENSAO"]),
 ("SOBRECARGA",   [r"SOBRECARGA", r"SOBRECARREG", r"NAO (ESTA )?SUPORTA", r"AUMENTO DE CARGA", r"NAO SUPORTANDO",
                   r"NAO ESTA AGUENTANDO"]),
 ("POSTE/REDE",   [r"POSTE (QUEBRAD|CAIDO|INCLINAD|PODRE|DETERIORAD|DE MADEIRA)", r"SUBSTITUICAO DE UM POSTE",
                   r"CABO (ROMPID|PARTID)", r"JUMPER", r"CONEXAO SOLTA"]),
 ("VEGETAÇÃO",    [r"\bPODA\b", r"ARVORE", r"GALHO", r"VEGETACAO"]),
 ("VAZAMENTO",    [r"VAZAMENTO", r"VAZANDO", r"OLEO NO SOLO"]),
 ("BUCHA",        [r"BUCHA"]),
 ("QUEIMA",       [r"QUEIMAD", r"QUEIMOU", r"EXPLODIU", r"ESTOUROU", r"\bCURTO\b", r"DESCARGA ATMOSF", r"\bRAIO\b"]),
]
def do_texto(t):
    return [n for n,ps in REGRAS if any(re.search(p,t) for p in ps)]
EQ={"QUEIMADO":"QUEIMA","AVARIADO":None,"FURTADO":"FURTO","SOBRECARGA PREVENTIVA":"PREVENTIVO",
    "GARANTIA DE TRAFO":"PREVENTIVO","POSTE":"POSTE/REDE","CABOS MT":"POSTE/REDE","CABOS BT":"POSTE/REDE",
    "BUCHA NEUTRO":"BUCHA"}
AVAR={"VAZAMENTO","BUCHA"}
GEN={"(vazio)","TRANSFORMADOR DE DISTRIBUIÇÃO","OUTROS","EQUIPAMENTO INEXISTENTE","INSPEÇÃO VISUAL"}
def julga(lab,ach):
    if not ach: return "o texto não diz nada"
    if lab in GEN: return "rótulo genérico — o texto diz "+ach[0].lower()
    if lab=="AVARIADO":
        if AVAR & set(ach): return "CONFIRMA"
        if "QUEIMA" in ach: return "DIVERGE — o texto diz queima"
        return "CONTRADIZ — o texto diz "+ach[0].lower()
    if lab=="SOBRECARGA PREVENTIVA":
        if "PREVENTIVO" in ach or "SOBRECARGA" in ach: return "CONFIRMA"
        if "QUEIMA" in ach: return "CONTRADIZ — o texto diz queima"
        return "CONTRADIZ — o texto diz "+ach[0].lower()
    e=EQ.get(lab)
    if e and e in ach: return "CONFIRMA"
    if lab=="QUEIMADO" and ("SOBRECARGA" in ach): return "COMPATÍVEL — sobrecarga que queimou"
    if lab=="QUEIMADO" and (AVAR & set(ach)): return "DIVERGE — o texto diz condição, não queima"
    return "CONTRADIZ — o texto diz "+ach[0].lower()
saida=[]
for r in rows:
    t=norm(r.get("DESCRIPTION_SS"))+" || "+norm(r.get("DESCRICAO_OS"))
    ach=do_texto(t); lab=S(r,"ORIGEM"); lss=S(r,"ORIGEM_SS")
    saida.append({"ss":S(r,"NUMERO_SS"),"tr":S(r,"NUM_TRAFO"),"tp":S(r,"TIPOSS"),"eq":S(r,"COD_EQUIPE"),
      "mes":mes(str(r.get("DATA_ABERTURA_SS"))),"lab":lab,"lss":lss,"texto":", ".join(ach) or "(nada)",
      "v":julga(lab,ach),"v_ss":julga(lss,ach),
      "tss":re.sub(r"_x000D_"," ",str(r.get("DESCRIPTION_SS") or "")),
      "tos":re.sub(r"_x000D_"," ",str(r.get("DESCRICAO_OS") or ""))})
json.dump(saida,open("confronto_origem.json","w"),ensure_ascii=False)
n=len(saida); print("SS:",n)
print("\n### ORIGEM da OS x descrições")
for k,v in collections.Counter(x["v"].split(" — ")[0] for x in saida).most_common():
    print("   %-24s %5d (%4.1f%%)"%(k,v,100*v/n))
print("\n### ORIGEM da SS x descrições")
for k,v in collections.Counter(x["v_ss"].split(" — ")[0] for x in saida).most_common():
    print("   %-24s %5d (%4.1f%%)"%(k,v,100*v/n))
print("\n### matriz — ORIGEM da OS x o que o texto diz")
m=collections.defaultdict(collections.Counter)
for x in saida: m[x["lab"]][x["texto"].split(", ")[0] if x["texto"]!="(nada)" else "(nada)"]+=1
for k in sorted(m,key=lambda k:-sum(m[k].values())):
    print("   %-32s n=%4d | %s"%(k[:32],sum(m[k].values()),", ".join("%s %d"%(a,b) for a,b in m[k].most_common(5))))
print("\n### vereditos por rótulo")
mm=collections.defaultdict(collections.Counter)
for x in saida: mm[x["lab"]][x["v"].split(" — ")[0]]+=1
for k in sorted(mm,key=lambda k:-sum(mm[k].values())):
    print("   %-32s %s"%(k[:32],dict(mm[k])))
