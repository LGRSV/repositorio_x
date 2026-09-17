# -*- coding: utf-8 -*-
import json, collections, re, datetime
J="/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad/jan_ago/"
d=json.load(open(J+"as_1696.json"))
ssos=json.load(open("ssos.json")); obras=json.load(open("obras.json"))["obras"]
mat=json.load(open("material.json")); tmae=json.load(open("tmae.json")); portrafo=json.load(open("portrafo.json"))
def U(r,c): return str(r.get(c) or "").strip().upper()
def nobra(v):
    s=re.sub(r"\D","",str(v or "")); return s.lstrip("0") or ""
def dt(v):
    v=str(v or "").replace("T"," ").strip()
    for f in ("%d/%m/%Y %H:%M:%S","%d/%m/%Y %H:%M","%Y-%m-%d %H:%M:%S","%Y-%m-%d %H:%M","%d-%m-%Y %H:%M:%S","%d-%m-%Y %H:%M","%Y-%m-%d","%d/%m/%Y","%d-%m-%Y"):
        try: return datetime.datetime.strptime(v[:19],f)
        except: pass
    return None
TRAFO=re.compile(r"^\s*(TRANSF|TRAFO)",re.I)

def linha(r):
    ss=r["ss"]; raw=ssos.get(ss,{})
    ob=nobra(r.get("obra") or raw.get("NUM_OBRA"))
    o=obras.get(ob,{})
    ms=mat.get(ob,[])
    mtrafo=[m for m in ms if TRAFO.search(m.get("descricao") or "")]
    tr=str(r.get("trafo") or "").strip()
    # TMAE: atendimento no ativo dentro de -2d/+7d da abertura
    ab=dt(r.get("abertura")); tm=[]
    for k in (tr, tr.lstrip("0")):
        for a in tmae.get(k,[]):
            o1=dt(a.get("DTA_ORIG_TNT"))
            if ab and o1 and -2 <= (o1-ab).days <= 7: tm.append(a)
        if tm: break
    tm.sort(key=lambda a: dt(a.get("DTA_ORIG_TNT")) or datetime.datetime(1900,1,1))
    t0=tm[0] if tm else {}
    # histórico do ativo na base do ano
    hist=[s for s in portrafo.get(tr,[]) if s and s!=ss]
    outras=[]
    for s in hist:
        x=ssos.get(s,{})
        outras.append("%s (%s)"%(s,str(x.get("DATA_ABERTURA_SS"))[:10]))
    # atraso abertura -> OS
    dias_os=""
    ao=dt(raw.get("DATA_ABERTURA_SS")); fo=dt(raw.get("DATA_TERMINO_SS"))
    if ao and fo: dias_os=round((fo-ao).total_seconds()/86400,1)
    return collections.OrderedDict([
    ("SS",ss),("Tipo da SS",r.get("tipo_ss")),("Trafo",tr),("Abertura",str(r.get("abertura"))[:16]),
    ("Término",str(r.get("termino"))[:16]),("Dias SS",dias_os),("Situação",r.get("situacao")),
    ("Criticidade",r.get("criticidade")),("Esquema",r.get("esquema")),
    ("Origem SS",r.get("origem_ss")),("Defeito SS",r.get("defeito_ss")),("Defeito OS",r.get("defeito_os")),
    ("OS",r.get("os")),("Prefixo da OS",str(r.get("os") or "").split("-")[0]),
    ("Equipe",r.get("equipe")),("Localidade",r.get("localidade")),("Alimentador",r.get("alimentador")),
    ("Rural/Urbano",r.get("rural")),
    ("Obra",ob),("Status da obra",o.get("DSC_STATUS","")),("Ocorrência da obra",o.get("DSC_OCORRENCIA","")),
    ("Descrição da obra",o.get("DESCRICAO_OBRA","")),("Tipo da obra",o.get("TIPO_OBRA","")),
    ("Obra aberta em",o.get("DTH_ABERTURA","")[:10]),("Obra encerrada em",o.get("DTH_ENCERRAMENTO","")[:10]),
    ("Conclusão física",o.get("DATA_CONCLUSAO_FISICA","")[:10]),("Material realizado (R$)",o.get("MT_REALIZADO","")),
    ("Total realizado (R$)",o.get("TOTAL_REALIZADO","")),
    ("Itens de material",len(ms)),("Trafo no material?","SIM" if mtrafo else ("NÃO" if ms else "SEM MATERIAL")),
    ("Material de trafo","; ".join(sorted({m["descricao"].strip() for m in mtrafo}))[:250]),
    ("NS retirado",r.get("ns_ret")),("NS instalado",r.get("ns_inst")),
    ("Pot. retirada",r.get("pot_ret")),("Pot. instalada",r.get("pot_inst")),
    ("Crítica — resultado",r.get("cr")),("Crítica — ocorrência",r.get("cr_oc")),("Crítica — início",r.get("cr_ini")),
    ("Crítica — fim",r.get("cr_fim")),("Crítica — distância",r.get("cr_dist")),("Crítica — papel do ativo",r.get("cr_papel")),
    ("Crítica — causa",r.get("cr_causa")),("Crítica — subcausa",r.get("cr_sub")),("Crítica — clientes",r.get("cr_cli")),
    ("TMAE — no ativo (jan-jun)",len(tmae.get(tr,[]))),("TMAE — na janela da SS",len(tm)),("TMAE — 1ª origem",t0.get("DTA_ORIG_TNT","")),("TMAE — conclusão",t0.get("DTA_CONCL_TNT","")),
    ("TMAE — causa",t0.get("DES_CAUSA_INTER_CAU","")),("TMAE — subcausa",t0.get("DES_SUB_CAUSA_INTER_SCR","")),
    ("TMAE — grupo",t0.get("GRUPO_CAUSA","")),("TMAE — equipe",t0.get("EQUIPE","")),
    ("TMAE — observação",str(t0.get("DES_OBS_EXEC_SERV_TNT",""))[:300]),
    ("Histórico — outras SS no ativo",len(hist)),("Histórico — quais","; ".join(outras)[:200]),
    ("Categoria",r.get("categoria")),("Conta",r.get("conta")),("No Infotrafo",r.get("no_infotrafo")),
    ("Motivo da leitura",r.get("motivo")),
    ("Texto da SS",str(r.get("tss") or "")[:600]),("Texto da OS",str(r.get("tos") or "")[:900]),
    ])

AV=[linha(r) for r in d if U(r,"tipo_ss")=="AVISO DE ANOMALIA"]
SO=[linha(r) for r in d if U(r,"tipo_ss")=="SOLICITAÇÃO DE SERVIÇO"]
json.dump({"aviso":AV,"solicitacao":SO},open("aviso_sol.json","w"),ensure_ascii=False)
print("AVISO",len(AV),"SOL",len(SO))
print("TMAE achou em:",sum(1 for x in AV if x["TMAE — na janela da SS"]>0),"de",len(AV))
print("obra com status:",sum(1 for x in AV if x["Status da obra"]))
print("material:",collections.Counter(x["Trafo no material?"] for x in AV))
