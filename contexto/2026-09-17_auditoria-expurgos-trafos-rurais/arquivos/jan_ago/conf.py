# -*- coding: utf-8 -*-
import json, collections, re, unicodedata, openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
A=[r for r in json.load(open("base_3602.json")) if str(r.get("TIPOSS") or "").strip()]
def S(r,c): return str(r.get(c) or "").strip().upper() or "(vazio)"
def norm(s):
    s=re.sub(r"_x000D_"," ",str(s or ""))
    s=unicodedata.normalize("NFD",s).encode("ascii","ignore").decode().upper()
    return re.sub(r"\s+"," ",s).strip()
CONF={"DESCARGA ATMOSFÉRICA":["DESCARGA","RAIO","QUEIM","EXPLOD","ESTOUR","CURTO"],
 "SOBRECARGA":["SOBRECARGA","NAO SUPORTA","NAO ESTA SUPORTANDO","AUMENTO DE CARGA","CARGA ELEVADA","SOBRECARREG"],
 "VAZAMENTO DE ÓLEO":["VAZAMENTO","VAZANDO","OLEO"],"BUCHA DANIFICADA":["BUCHA"],
 "DETERIORADA":["DETERIOR","PODRE","OXID","CORRO","DANIFICAD"],"FURTADO":["FURT","ROUB","LEVARAM","SUBTRA"],
 "MAL FIXADO(A)/SOLTO(A)":["SOLTO","MAL FIXAD","FROUXO","FIXACAO","DESPRENDID"],
 "POSTE DANIFICADO/QUEBRADO":["POSTE"],"QUEIMADO":["QUEIM","EXPLOD","ESTOUR","CURTO"],
 "COLA E FITA":["COLA","FITA","VEDA","REPARO"],"ABALROADO":["ABALRO","COLIS","VEICUL","BATEU","CAMINHAO","ACIDENTE"],
 "FALTANDO":["FALTA","AUSENT"],"VEGETAÇÃO":["VEGET","ARVORE","GALHO","PODA"],
 "GALHOS EM CONTATO COM OS CONDUTORES":["GALHO","ARVORE","VEGET","PODA"],
 "CORROSÃO / OXIDAÇÃO":["CORRO","OXID","FERRUGEM","DETERIOR"],"BASE DETERIORADA":["BASE","DETERIOR","PODRE"],
 "VANDALISMO":["VANDAL","DEPRED","TIRO","DISPARO","PEDRA"],"OXIDADO / DETERIORADO":["OXID","DETERIOR","CORRO","DANIFICAD"]}
NOTA={"DESCARGA ATMOSFÉRICA":"O texto da SS confirma quase sempre; o da OS quase nunca. A prova está na abertura, não no encerramento.",
"SOBRECARGA":"O único rótulo que o conjunto não sustenta. Em 68 dos 125 sem prova a potência nem mudou.",
"VAZAMENTO DE ÓLEO":"Confirmado pelo par e pelo rótulo da SS (93%).","BUCHA DANIFICADA":"Texto fraco, mas a SS traz o mesmo rótulo em 87%.",
"DETERIORADA":"É defeito de poste, e o par confirma.","FURTADO":"Confirmado.",
"MAL FIXADO(A)/SOLTO(A)":"Nenhum texto usa a palavra, mas a SS traz o mesmo rótulo em 79%. É jumper e aterramento.",
"POSTE DANIFICADO/QUEBRADO":"100%. O rótulo mais fiel da base.","QUEIMADO":"O texto da SS confirma em 95%.",
"COLA E FITA":"Confirmado pelos dois lados.","ABALROADO":"Texto fraco; o rótulo da SS sustenta em 81%.",
"FALTANDO":"Sem prova textual; a SS repete o rótulo em 80%.","VEGETAÇÃO":"Confirmado.",
"GALHOS EM CONTATO COM OS CONDUTORES":"Não sustentado: o serviço descrito é troca de condutor.",
"CORROSÃO / OXIDAÇÃO":"Fraco. O defeito real é a base do poste.","BASE DETERIORADA":"Confirmado.",
"VANDALISMO":"Nenhum texto confirma, mas a SS traz o mesmo rótulo nos 5 casos.",
"OXIDADO / DETERIORADO":"Confirmado. É rede de baixa, não transformador."}
m=collections.defaultdict(list)
for r in A: m[S(r,"DEFEITO")].append(r)
NAVY="1F3864"; borda=Border(*[Side(style="thin",color="D9D9D9")]*4)
wb=openpyxl.Workbook(); ws=wb.active; ws.title="SS mais OS confirmam"
ws.append(["Defeito da OS","SS","Texto da OS","Texto da SS","O conjunto SS+OS","Rótulo da SS igual","Sem prova nenhuma","Leitura"])
for c in ws[1]:
    c.font=Font(bold=True,color="FFFFFF",size=10); c.fill=PatternFill("solid",fgColor=NAVY)
    c.alignment=Alignment(horizontal="center",vertical="center",wrap_text=True)
det=[]
for k,g in sorted(m.items(),key=lambda x:-len(x[1])):
    kws=CONF.get(k)
    if not kws or len(g)<5: continue
    n=len(g); cos=css=cb=ceq=cn=0
    for r in g:
        tos=norm(r.get("DESCRICAO_OS")); tss=norm(r.get("DESCRIPTION_SS"))
        a=any(w in tos for w in kws); b=any(w in tss for w in kws); eq=S(r,"DEFEITO_SS")==k
        cos+=a; css+=b; cb+=(a or b); ceq+=eq; cn+= not(a or b or eq)
        if not(a or b or eq): det.append((k,r))
    ws.append([k,n,"%.0f%%"%(100*cos/n),"%.0f%%"%(100*css/n),"%.0f%%"%(100*cb/n),"%.0f%%"%(100*ceq/n),"%.0f%%"%(100*cn/n),NOTA.get(k,"")])
    p=cb/n
    cor="E2EFDA" if p>=.7 else ("FFF2CC" if p>=.3 else "FCE4E4")
    for i in range(1,9): ws.cell(row=ws.max_row,column=i).fill=PatternFill("solid",fgColor=cor)
for i,w in enumerate((32,7,12,12,15,15,16,58),1): ws.column_dimensions[get_column_letter(i)].width=w
for row in ws.iter_rows(min_row=2):
    for c in row:
        c.border=borda
        c.alignment=Alignment(vertical="center",wrap_text=c.column in (1,8),horizontal="left" if c.column in (1,8) else "center")
    ws.row_dimensions[row[0].row].height=32
ws.freeze_panes="A2"; ws.row_dimensions[1].height=40
w2=wb.create_sheet("Sem prova caso a caso")
w2.append(["Defeito da OS","SS","Tipo","Equipe","Origem SS","Defeito SS","Pot. ret","Pot. inst","Texto da SS","Texto da OS"])
for c in w2[1]:
    c.font=Font(bold=True,color="FFFFFF",size=10); c.fill=PatternFill("solid",fgColor=NAVY)
    c.alignment=Alignment(horizontal="center",vertical="center",wrap_text=True)
for k,r in det:
    w2.append([k,S(r,"NUMERO_SS"),S(r,"TIPOSS"),S(r,"COD_EQUIPE"),S(r,"ORIGEM_SS"),S(r,"DEFEITO_SS"),
               r.get("POTENCIA_RET"),r.get("POTENCIA_INST"),
               re.sub(r"_x000D_"," ",str(r.get("DESCRIPTION_SS") or ""))[:300],
               re.sub(r"_x000D_"," ",str(r.get("DESCRICAO_OS") or ""))[:400]])
for i,w in enumerate((26,22,26,13,20,22,9,9,55,60),1): w2.column_dimensions[get_column_letter(i)].width=w
for row in w2.iter_rows(min_row=2):
    for c in row: c.border=borda; c.alignment=Alignment(vertical="top",wrap_text=c.column in (9,10))
w2.freeze_panes="B2"; w2.auto_filter.ref=w2.dimensions; w2.row_dimensions[1].height=32
w3=wb.create_sheet("Leitura",0)
for t in ["O par SS + OS confirma o defeito da OS?","",
 "Sim, em 73% dos casos — 1.085 de 1.485 SS cujo rótulo permite teste textual.","",
 "A correção importante: a prova está na SS, não na OS.",
 "Descarga atmosférica sai de 38% (só texto da OS) para 94% quando se lê o texto da SS junto.",
 "Queimado sai de 5% para 95%. Furtado, de 46% para 86%. Quem abre a SS descreve o defeito; quem encerra a OS descreve o serviço.","",
 "O único rótulo que o conjunto não sustenta é SOBRECARGA: 179 SS, 125 sem nenhuma prova — nem no texto da OS,",
 "nem no da SS, nem no rótulo da SS. Dessas 125, a origem da SS é QUEIMADO em 77 e a potência instalada é igual à retirada em 68.",
 "Não é sobrecarga nem aumento de potência: é preenchimento automático. Concentra-se em ETO-RD-AR (46), ETO-RD-GU (32) e ETO-RD-AG (26).","",
 "Casos de texto fraco mas rótulo coerente: mal fixado, faltando e vandalismo não aparecem em texto nenhum,",
 "mas a SS traz o mesmo rótulo em 79%, 80% e 100%. São defeitos que ninguém escreve, só marca."]:
    w3.append([t])
w3.cell(row=1,column=1).font=Font(bold=True,size=13,color=NAVY)
w3.column_dimensions["A"].width=122
wb.save("SS_e_OS_confirmam_o_defeito.xlsx"); print("ok, sem prova:",len(det))
