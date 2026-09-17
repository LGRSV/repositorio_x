# -*- coding: utf-8 -*-
import json, collections, re, unicodedata
rows=json.load(open("base_1671.json"))
MES={"01":"jan","02":"fev","03":"mar","04":"abr","05":"mai","06":"jun","07":"jul","08":"ago","09":"set"}
def mes(v):
    v=str(v or ""); return MES.get(v[5:7],"") if v[4:5]=="-" else MES.get(v[3:5],"")
rows=[r for r in rows if mes(str(r.get("DATA_ABERTURA_SS")))not in("set","")]
def S(r,c): return str(r.get(c) or "").strip().upper() or "(vazio)"
def norm(s):
    s=re.sub(r"_x000D_"," ",str(s or ""))
    s=unicodedata.normalize("NFD",s).encode("ascii","ignore").decode().upper()
    return re.sub(r"\s+"," ",s).strip()
# o que o TEXTO diz, em ordem de prioridade
REGRAS=[
 ("FURTO",          [r"\bFURT", r"\bROUB", r"LEVARAM O", r"SUBTRA"]),
 ("ABALROAMENTO",   [r"ABALRO", r"COLIS", r"VEICULO BATEU", r"CAMINHAO BATEU", r"ACIDENTE DE TRANSITO"]),
 ("VEGETAÇÃO",      [r"\bPODA\b", r"ARVORE", r"GALHO", r"VEGETACAO"]),
 ("POSTE/REDE",     [r"POSTE (QUEBRAD|CAIDO|INCLINAD|PODRE|DETERIORAD|DE MADEIRA)", r"SUBSTITUICAO DE UM POSTE",
                     r"CABO (ROMPID|PARTID)", r"JUMPER", r"CONEXAO SOLTA"]),
 ("VAZAMENTO",      [r"VAZAMENTO", r"VAZANDO", r"OLEO NO SOLO"]),
 ("BUCHA",          [r"BUCHA"]),
 ("SOBRECARGA",     [r"SOBRECARGA", r"SOBRECARREG", r"NAO (ESTA )?SUPORTA", r"AUMENTO DE CARGA", r"CARGA ELEVADA",
                     r"NAO SUPORTANDO"]),
 ("DESCARGA/RAIO",  [r"DESCARGA ATMOSF", r"\bRAIO\b(?!.{0,12}(BOM|QUEIMADO))", r"CAIU UM RAIO", r"DESCARGA"]),
 ("QUEIMA",         [r"QUEIMAD", r"QUEIMOU", r"EXPLODIU", r"ESTOUROU", r"\bCURTO\b"]),
 ("PREVENTIVO",     [r"PREVENTIV", r"PROGRAMAD", r"INSPECAO", r"NAO ESTAVA QUEIMADO", r"EQUIPAMENTO NORMAL"]),
 ("REMANEJAMENTO",  [r"REMANEJ", r"TRANSFERI"]),
 ("TENSÃO/TAPE",    [r"\bTAPE\b", r"NIVEL DE TENSAO", r"TENSAO BAIXA", r"REGULARIZA(CAO|R) (DE )?TENSAO"]),
]
def do_texto(t):
    achados=[]
    for nome,pats in REGRAS:
        if any(re.search(p,t) for p in pats): achados.append(nome)
    return achados
# rótulo -> o nome equivalente no texto
EQUIV={"DESCARGA ATMOSFÉRICA":"DESCARGA/RAIO","SOBRECARGA":"SOBRECARGA","VAZAMENTO DE ÓLEO":"VAZAMENTO",
 "BUCHA DANIFICADA":"BUCHA","FURTADO":"FURTO","ABALROADO":"ABALROAMENTO","VEGETAÇÃO":"VEGETAÇÃO",
 "QUEIMADO":"QUEIMA","DETERIORADA":"POSTE/REDE","POSTE DANIFICADO/QUEBRADO":"POSTE/REDE",
 "COLA E FITA":"VAZAMENTO","MAL FIXADO(A)/SOLTO(A)":"POSTE/REDE","BASE DETERIORADA":"POSTE/REDE",
 "CORROSÃO / OXIDAÇÃO":"POSTE/REDE","OXIDADO / DETERIORADO":"POSTE/REDE","VANDALISMO":"FURTO",
 "GALHOS EM CONTATO COM OS CONDUTORES":"VEGETAÇÃO","FALTANDO":None,"NÃO IDENTIFICADO":None,"(vazio)":None}

FAM={"QUEIMA":"queima","DESCARGA/RAIO":"queima","SOBRECARGA":"queima",
     "VAZAMENTO":"condicao","BUCHA":"condicao",
     "FURTO":"externo","ABALROAMENTO":"externo","POSTE/REDE":"externo","VEGETAÇÃO":"externo",
     "PREVENTIVO":"sem falha","REMANEJAMENTO":"sem falha","TENSÃO/TAPE":"sem falha"}
FAM_LAB={"DESCARGA ATMOSFÉRICA":"queima","SOBRECARGA":"queima","QUEIMADO":"queima",
 "VAZAMENTO DE ÓLEO":"condicao","BUCHA DANIFICADA":"condicao","COLA E FITA":"condicao",
 "FURTADO":"externo","ABALROADO":"externo","VANDALISMO":"externo","VEGETAÇÃO":"externo",
 "GALHOS EM CONTATO COM OS CONDUTORES":"externo","POSTE DANIFICADO/QUEBRADO":"externo",
 "DETERIORADA":"externo","BASE DETERIORADA":"externo","CORROSÃO / OXIDAÇÃO":"externo",
 "OXIDADO / DETERIORADO":"externo","MAL FIXADO(A)/SOLTO(A)":"externo"}
def julga2(lab,ach):
    eq=EQUIV.get(lab,"__?__")
    if not ach: return "o texto não diz nada"
    if eq and eq!="__?__" and eq in ach: return "CONFIRMA"
    fl=FAM_LAB.get(lab)
    fams={FAM.get(a) for a in ach}
    if fl is None: 
        return "rótulo genérico — o texto diz "+ach[0].lower()
    if fl in fams: return "COMPATÍVEL — mesma família"
    return "CONTRADIZ — o texto diz "+ach[0].lower()

saida=[]
for r in rows:
    t=norm(r.get("DESCRIPTION_SS"))+" || "+norm(r.get("DESCRICAO_OS"))
    ach=do_texto(t)
    for campo,rot in (("DEFEITO_SS","SS"),("DEFEITO","OS")):
        pass
    lab_os=S(r,"DEFEITO"); lab_ss=S(r,"DEFEITO_SS")
    def julga(lab):
        eq=EQUIV.get(lab,"__?__")
        if eq is None: return "rótulo genérico"
        if eq=="__?__": return "rótulo sem equivalente"
        if not ach: return "texto não diz nada"
        if eq in ach: return "CONFIRMA"
        return "CONTRADIZ"
    saida.append({"ss":S(r,"NUMERO_SS"),"tr":S(r,"NUM_TRAFO"),"tp":S(r,"TIPOSS"),"eq":S(r,"COD_EQUIPE"),
      "mes":mes(str(r.get("DATA_ABERTURA_SS"))),
      "lab_ss":lab_ss,"lab_os":lab_os,"texto":", ".join(ach) or "(nada)",
      "v_ss":julga2(lab_ss,ach),"v_os":julga2(lab_os,ach),
      "tss":re.sub(r"_x000D_"," ",str(r.get("DESCRIPTION_SS") or "")),
      "tos":re.sub(r"_x000D_"," ",str(r.get("DESCRICAO_OS") or ""))})
json.dump(saida,open("confronto.json","w"),ensure_ascii=False)
n=len(saida); print("SS:",n)
def resumo(c,nome):
    print("\n### %s x descrições"%nome)
    cc=collections.Counter(x[c].split(" — ")[0] for x in saida)
    for k,v in cc.most_common(): print("   %-30s %5d  (%4.1f%%)"%(k,v,100*v/n))
    return cc
resumo("v_os","DEFEITO da OS"); resumo("v_ss","DEFEITO da SS")
print("\n### contradições do DEFEITO da OS, por rótulo")
for k,v in collections.Counter(x["lab_os"]+"  ->  "+x["v_os"].split("diz ")[-1] for x in saida if x["v_os"].startswith("CONTRADIZ")).most_common(12):
    print("   %4d  %s"%(v,k))
print("\n### matriz — DEFEITO da OS (linha) x o que o texto diz (coluna)")
m=collections.defaultdict(collections.Counter)
for x in saida: m[x["lab_os"]][x["texto"].split(", ")[0] if x["texto"]!="(nada)" else "(nada)"]+=1
for k in sorted(m,key=lambda k:-sum(m[k].values())):
    tot=sum(m[k].values())
    if tot<8: continue
    print("   %-26s n=%4d | %s"%(k[:26],tot,", ".join("%s %d"%(a,b) for a,b in m[k].most_common(5))))
