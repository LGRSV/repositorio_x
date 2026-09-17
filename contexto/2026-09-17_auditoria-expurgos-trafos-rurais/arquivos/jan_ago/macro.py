# -*- coding: utf-8 -*-
import json, collections
L=json.load(open("base_expurgos.json"))
MACRO={
 "furto":"Causa externa ao transformador","abalroamento":"Causa externa ao transformador",
 "terceiros":"Causa externa ao transformador","falta_fase":"Causa externa ao transformador",
 "erro_cadastro":"Causa externa ao transformador","auxiliar":"Causa externa ao transformador",
 "preventivo":"Troca sem falha","remanejamento":"Troca sem falha","tap":"Troca sem falha",
 "divisao":"Troca sem falha","melhoria":"Troca sem falha",
 "sem_troca":"Não houve troca","duplicada":"Não houve troca",
 "sem_interrupcao":"Sem interrupção comprovada","fora_da_janela":"Sem interrupção comprovada",
 "ressalva_da_interrupcao":"Sem interrupção comprovada",
 "sem_obra":"Sem documento","sem_os":"Sem documento","obra_sem_transformador":"Sem documento",
 "obra_sem_execucao":"Sem documento",
 "sem_prova_de_troca":"Em aberto","inconclusivo":"Em aberto","avaliar_matheus":"Em aberto"}
ROTULO={"furto":"Furto","abalroamento":"Abalroamento","terceiros":"Dano de terceiros","falta_fase":"Falta de fase",
 "erro_cadastro":"Erro de cadastro","auxiliar":"Trafo auxiliar","preventivo":"Preventivo","remanejamento":"Remanejamento",
 "tap":"Tape / tensão","divisao":"Divisão de circuito","melhoria":"Melhoria de posto","sem_troca":"Sem troca",
 "duplicada":"SS duplicada","sem_interrupcao":"Sem interrupção","fora_da_janela":"Fora da janela",
 "ressalva_da_interrupcao":"Ressalva da interrupção","sem_obra":"Sem obra","sem_os":"Sem OS",
 "obra_sem_transformador":"Obra sem transformador","obra_sem_execucao":"Obra sem execução",
 "sem_prova_de_troca":"Sem prova de troca","inconclusivo":"Inconclusivo","avaliar_matheus":"Avaliar com o Matheus"}
for x in L:
    if x["gatilho"] in ("inconclusivo","avaliar_matheus"): x["resultado"]="RETIDO"
    x["macro"]=MACRO.get(x["gatilho"],"Outro")
    x["rotulo"]=ROTULO.get(x["gatilho"],x["gatilho"])
c=collections.Counter(x["resultado"] for x in L)
print("EXPURGO",c["EXPURGO"],"| RETIDO",c["RETIDO"],"| TOTAL",len(L))
print()
m=collections.defaultdict(collections.Counter)
for x in L: m[x["macro"]][x["resultado"]]+=1
ORD=["Sem interrupção comprovada","Causa externa ao transformador","Troca sem falha","Em aberto","Sem documento","Não houve troca"]
print("%-34s %8s %8s %8s"%("macro categoria","expurgo","retido","total"))
for k in ORD:
    print("%-34s %8d %8d %8d"%(k,m[k]["EXPURGO"],m[k]["RETIDO"],sum(m[k].values())))
print("%-34s %8d %8d %8d"%("TOTAL",c["EXPURGO"],c["RETIDO"],len(L)))
print("\ndetalhe:")
for k in ORD:
    print("  "+k)
    for g,v in collections.Counter(x["rotulo"] for x in L if x["macro"]==k).most_common():
        print("     %-28s %4d"%(g,v))
json.dump(L,open("base_expurgos.json","w"),ensure_ascii=False)
