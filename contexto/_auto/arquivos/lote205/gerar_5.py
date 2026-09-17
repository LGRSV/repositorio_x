# -*- coding: utf-8 -*-
import json, os
BASE = "/tmp/claude-0/-home-user/74dc9c64-5026-54ee-a81e-173d2f38a735/scratchpad/lote205"
OUT = os.path.join(BASE, "saida_5.json")

def w(rows):
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)

R = []

def add(ss, trafo, cl, dec, conf, just, ev, div):
    R.append({"ss": ss, "trafo": trafo, "classificacao": cl, "decisao": dec,
              "confianca": conf, "justificativa": just, "evidencia": ev[:200],
              "diverge_do_site": div})

# ---- bloco 1 (casos 0-19) ----
add("ETO-RD-AG 00009/2026","5700328119","PREVENTIVO/PROGRAMADO","EXPURGAR","media",
    "SS e OS pedem apenas aumento de potência de 5 para 15 kVA, sem declaração de queima e sem qualquer interrupção na Crítica.",
    "Enviarequipe da manutenção para substiyuir trafo de 5 kva por um de 15 kva , na 13,8 kv Acesso bom", False)

add("ETO-RD-AG 00026/2026","5713185081","AVARIADO","MANTER","media",
    "Falta de fase interna é falha do próprio enrolamento e a OS foi aberta como substituição de trafo queimado; o aumento de potência foi consequência, não a causa.",
    "OS PARA SUBSTITUICAO DE TRAFO QUEIMADO / TR 5713185081 FALTANDO FASE INTERNA, SAINDO SOMENTE FASE B", True)

add("ETO-RD-GU 00069/2026","5701000052","QUEIMADO","MANTER","alta",
    "Interrupção casada no próprio trafo com causa TRANSFORMADOR e troca física comprovada por série e tombamento.",
    "causa TRANSFORMADOR / subcausa QUEIMADO POR SOBRECARGA; SEGUE SS PARA TROCA DE TRAFO QUEIMADO", False)

add("ETO-RD-GU 00095/2026","5701544032","QUEIMADO","MANTER","alta",
    "Texto declara trafo e para-raio queimados e a Crítica casou pelo trafo com subcausa de queima por descarga.",
    "TRAFO 5701544032 QUEIMADO DE 15 KVA ... PARA RAIO QUEIMADO; subcausa QUEIMADO POR DESCARGA ATMOSFERICA", False)

add("ETO-RD-AG 00096/2026","5720013039","AVARIADO","MANTER","alta",
    "Vazamento de óleo confirmado no formulário de campo com interrupção casada no próprio trafo por tanque deteriorado.",
    "trafo 5720013039 queimado; subcausa VAZAMENTO DE OLEO / TANQUE DETERIORADO; EQUIPAMENTO_APRESENTA_VAZAMENTO_DE_OLEO: Sim", False)

add("ETO-RD-AR 00181/2026","5703422004","QUEIMADO","MANTER","alta",
    "Trafo queimado com vazamento, 48 clientes interrompidos e casamento pelo próprio trafo com troca comprovada.",
    "trafo queimado 5703422004 com vazamentoi de oleo e jumper danificado; subcausa QUEIMADO POR DESCARGA ATMOSFERICA", False)

add("ETO-RD-GU 00148/2026","5710316076","QUEIMADO","MANTER","alta",
    "Solicitante e Crítica convergem em queima do transformador, com série retirada e instalada preenchidas.",
    "transformador e para raio queimado; causa TRANSFORMADOR / QUEIMADO POR DESCARGA ATMOSFERICA", False)

add("ETO-RD-AR 00209/2026","5700777016","ABALROAMENTO","EXPURGAR","alta",
    "Serviço é troca de poste inclinado e do vão de cabo, com motivo de campo declarado abalroado e sem interrupção pelo trafo.",
    "TROCA DO POSTE ID 63250681E DO TRAFO ... POSTE INCLINADO; PROVÁVEL_MOTIVO_DO_DEFEITO: ABALROADO", False)

add("ETO-RD-DP 00093/2026","5764816091","AUXILIAR DE RELIGADOR","EXPURGAR","alta",
    "O próprio texto identifica o equipamento como transformador auxiliar de religador, que não é unidade de distribuição.",
    "o trafo AUXILIAR DO RELIGADOR  5764816091 de 15kVA na tensão 19.9kV e para raio estão queimados", False)

add("ENC-RD-PS 00200/2026","5700020008","AVARIADO","MANTER","alta",
    "Bucha secundária danificada é avaria do próprio equipamento, com interrupção casada pelo trafo e troca comprovada.",
    "SUBSTITUIR TRAFO 5700020008 BUCHA SECUNDARIA DANIFICADA NA RDR DE MIRA NORTE", False)

add("DG-RD-PO 00181/2026","5709780026","QUEIMADO","MANTER","alta",
    "Substituição emergencial de trafo queimado, com interrupção casada pelo trafo e série retirada e instalada registradas.",
    "Segue SS para substituiçaõ de trafo queiamdo ... equipe leve fou um dia antes subst o trafo porem o mesmo estava com defeito", False)

add("ENC-RD-PS 00230/2026","5701302085","QUEIMADO","MANTER","alta",
    "Texto de SS e observação da Crítica declaram o mesmo trafo queimado, com casamento na janela e troca física.",
    "TRAFO QUEIMADO 5701302085 15kva 19,9kv acesso caminhonete", False)

add("ETO-RD-AR 00315/2026","5702058004","AVARIADO","MANTER","media",
    "Falta de fase interna no secundário e vazamento nas três buchas são avaria do próprio trafo, confirmada pelo executante e pela troca com série nos dois lados.",
    "TRANSFORMADO COM VAZAMENTO DE OLHO NA BUCHA SEGUNDARI NAS FASE A,B,C SERA NECESARIO TROCA DOBMESMO", True)

add("ETO-RD-GU 00232/2026","5700075036","QUEIMADO","MANTER","media",
    "A OS registra transformador retirado e instalado de 75 kVA e o campo traz série e tombamento dos dois lados, contradizendo o gatilho de obra sem transformador; 100 clientes interrompidos.",
    "TRANSFORMADOR INSTALADO:  75 KVA / TRANSFORMADOR RETIRADO: 75 KVA; NS_RETIRADO 10021 / NS_INSTALADO 334046", True)

add("DG-RD-PO 00205/2026","5710033043","QUEIMADO","MANTER","alta",
    "Trafo queimado somado a poste deteriorado, com interrupção casada no próprio trafo e troca comprovada.",
    "substituição de trafo queimado e poste danificado rdr silvanopolis", False)

add("ETO-RD-DP 00132/2026","5710013050","QUEIMADO","MANTER","alta",
    "Trafo e para-raios queimados constatados em campo, casamento pelo trafo e transformador efetivamente substituído.",
    "FOI CONSTATAO TRAFO 5710013050 15KVA 19,9KV E PARA-RAIOS QUEIMADOS; TRANSFORMADOR SUBSTITUIDO PELA META", False)

add("ETO-RD-GR 00278/2026","5700216064","AVARIADO","MANTER","media",
    "Bucha danificada declarada na SS e na OS, com o dono já tendo mandado tratar como avaria; a ocorrência da base está fora da janela mas é no mesmo trafo.",
    "trafo 5700216064 com bucha danificada 15KVA 34,5KV para raio bom acesso livre", False)

add("ETO-RD-GR 00279/2026","5710240111","QUEIMADO","MANTER","alta",
    "Bucha secundária danificada na SS e queima registrada na Crítica do próprio trafo dentro da janela.",
    "Trafo com bucha secundaria danificada 5710240111; obs da Crítica: trafo queimado, aberto nota", False)

add("DG-RD-PO 00233/2026","5702646001","QUEIMADO","MANTER","media",
    "Solicitante e executante declaram substituição de trafo queimado e o campo traz série retirada e instalada; a ausência na base de interrupção não descaracteriza a queima.",
    "segue nota trafo queimado de 45kVA paraio bom; substituição de trafo queimado rdu porto", True)

add("ETO-RD-AR 00425/2026","5700402060","MELHORIA DE POSTO","EXPURGAR","alta",
    "SS aberta como melhoria de posto de transformação e assim já classificada pelo dono, sem qualquer interrupção associada.",
    "realizar melhoria de ateramento; tipo_ss MELHORIA POSTO DE TRANSFORMAÇÃO", False)

w(R)
print("parcial 1:", len(R))

# ---- bloco 2 (casos 20-40) ----
add("ETO-RD-AG 00265/2026","5700326045","QUEIMADO","MANTER","alta",
    "Texto de SS e OS declaram o trafo queimado e a Crítica casou no próprio equipamento com subcausa de queima.",
    "5700326045 queimado pot 15kva tensão 19,9kv para-raio bom; causa TRANSFORMADOR / QUEIMADO POR DESCARGA ATMOSFERICA", False)

add("ETO-RD-AG 00271/2026","5700726039","QUEIMADO","MANTER","alta",
    "OS aberta para substituição de trafo queimado com casamento pelo trafo e dados completos do retirado e do instalado.",
    "OS PARA SUBSTITUICAO DE TRAFO QUEIMADO / 5700726039 queimado para raio bom", False)

add("ETO-RD-GU 00334/2026","5701076032","QUEIMADO","MANTER","alta",
    "Substituição de transformador queimado confirmada em campo, com interrupção casada no próprio trafo.",
    "segue nota para substituiçao de transformador queimado asseço livre; QUEIMADO POR DESCARGA ATMOSFERICA", False)

add("ETO-RD-AR 00500/2026","5720044025","MELHORIA DE POSTO","EXPURGAR","alta",
    "SS de melhoria de posto de transformação, já classificada assim pelo dono, com a ocorrência da base 73 h fora da janela.",
    "REALIZAR MELHORIA ATERRAMENTO; tipo_ss MELHORIA POSTO DE TRANSFORMAÇÃO", False)

add("ETO-RD-AG 00343/2026","5702090039","REMANEJAMENTO","EXPURGAR","alta",
    "O serviço é remanejamento com correção de erro de cadastro de potência, não falha do equipamento.",
    "Enviar equipe de manutenção para REMANEJAR trafo 5702090039 - de 25KVA-19.9KV POR TRAFO DE 15KVA-19.9KV", False)

add("ETO-RD-AR 00595/2026","5701428077","MELHORIA DE POSTO","EXPURGAR","alta",
    "Melhoria em posto de transformação com acerto de cadastro de potência, sem declaração de defeito no equipamento.",
    "Melhoria em posto transformação 5701428077; OBS. TRAFO RETIRADO ... ERRO DE CADASTRO", False)

add("ETO-RD-AR 00603/2026","5710227004","QUEIMADO","MANTER","alta",
    "Trafo e para-raio queimados declarados na SS, com interrupção casada pelo trafo e troca comprovada por série.",
    "5710227004 QUEIMADO POT 15 KVA 19,9KV ACESSO BOM PARA-RAIO QUEIMADO", False)

add("ETO-RD-GU 00429/2026","5710235032","ABALROAMENTO","EXPURGAR","media",
    "O motivo de campo é abalroado e a interrupção veio pelo poste de AT quebrado, ou seja, o dano nasceu fora do transformador.",
    "poste quebrado id 42840335 10/300; PROVÁVEL_MOTIVO_DO_DEFEITO: ABALROADO; causa POSTE DE AT / QUEBRADO", False)

add("ETO-RD-AR 00690/2026","5766930077","PREVENTIVO/PROGRAMADO","EXPURGAR","baixa",
    "Vazamento no comutador achado em inspeção, sem nenhuma interrupção no ativo, segue o mesmo critério que o dono aplicou ao caso de Palmas; falta a definição formal se vazamento sem interrupção conta como avaria.",
    "Favor enviar manutenção para verificar trafo com vazamento de oleo no comutador de TAP", False)

add("DOLP-RD-PA 00488/2026","5731651122","PREVENTIVO/PROGRAMADO","EXPURGAR","media",
    "Troca antecipada por vazamento detectado pelo COCM antes de qualquer falha, exatamente como o dono já mandou tratar este caso.",
    "Topologia 31651 substituir Trafo devido esta com vazamento de óleo", False)

add("ETO-RD-AR 00766/2026","5710054159","MELHORIA DE POSTO","EXPURGAR","alta",
    "SS de melhoria de posto de transformação já classificada pelo dono, com ocorrência da base 19 h fora da janela.",
    "fazer melhoria posto de tranformaçao no trafo  5710054159", False)

add("ETO-RD-GR 00507/2026","5752935111","QUEIMADO","MANTER","alta",
    "Trafo urbano de 112,5 kVA queimado com 16 clientes interrompidos e troca comprovada por série e tombamento.",
    "TROCA DE TRAFO QUEIMADO 5752935111 ETO-RD-GR 507/2026 ZONA URBANA - PEQUIZEIRO", False)

add("ETO-RD-AG 00510/2026","5720022127","QUEIMADO","MANTER","alta",
    "Trafo constatado queimado em campo com interrupção casada no próprio equipamento; o dono já classificou como queimado.",
    "Constatado trafo 5720022127 de 15kVA na 19.9kV queimado; para-raios bom", False)

add("ETO-RD-AG 00545/2026","5700724045","PREVENTIVO/PROGRAMADO","EXPURGAR","baixa",
    "Vazamento constatado em anomalia, sem defeito aberto no trafo na Crítica (causa foi nível de tensão em ramal); mesmo critério do vazamento antecipado, mas a natureza é discutível.",
    "segue trafo 5700724045 com vazamento de oleo pot. 25 kva tensão 19,9kv; causa NIVEL DE TENSAO / REGULARIZADO-PROBLEMA EM RAMAL DE SERVIÇO", False)

add("ETO-RD-AG 00574/2026","5700269132","QUEIMADO","MANTER","alta",
    "Trafo e para-raio queimados, interrupção casada no próprio trafo e troca física registrada.",
    "TRAFO 5700269132 DE 10KVA A 19.9KV E PQRQ RAIO QUEIMADO", False)

add("ENC-RD-PS 00582/2026","5710170055","QUEIMADO","MANTER","alta",
    "Queima confirmada pela Crítica no próprio trafo e a OS traz série e tombamento do retirado e do instalado, suprindo a prova de troca que faltava no export de material.",
    "trafo 5710170055 queimado; TRAFO RETIRADO Nº DE SÉRIE 183092 / TRAFO INSTALADO Nº DE SÉRIE 182684", False)

add("ETO-RD-AR 01028/2026","5755060004","MELHORIA DE POSTO","EXPURGAR","alta",
    "SS de melhoria no posto de transformação, classificada assim pelo dono, com a única ocorrência 2.277 h fora da janela.",
    "FAZER MELHORIA NO POSTO DE TRANSFORMAÇAO NO TRAFO 5755060004", False)

add("ETO-RD-GU 00685/2026","5700858029","ABALROAMENTO","EXPURGAR","alta",
    "Poste abalroado derrubou o conjunto; Crítica, campo e o dono convergem em abalroamento.",
    "Foi constatado poste 10/300  abalroado , ID 56140072 e Trafo 5700858029 Danificado", False)

add("ETO-RD-AG 00702/2026","5710461039","ABALROAMENTO","EXPURGAR","media",
    "SS gravada como abalroado e OS troca 45 m de vão de multiplex entre dois postes, com a Crítica atribuindo curto na RD; o dono já classificou como abalroado.",
    "OBS; SUBST 01 VÃO DE 45MT DE CABO 35MM MULTIPLEX BIFASICO ... ENTRE OS PORTES ID-67020878 AO POSTE ID-45121584; subcausa QUEIMADO POR CURTO NA RD", False)

add("ETO-RD-AR 01112/2026","5700129193","MELHORIA DE POSTO","EXPURGAR","media",
    "SS de melhoria de aterramento, classificada assim pelo dono; a ocorrência de queima da base está 91 h fora da janela e não foi o motivo da SS.",
    "FAZER MELHORIA DE ATERRAMENTO NO POSTO DE TRANFORMAÇAO NO TRAFO", False)

add("DG-RD-PO 00482/2026","5711214001","AVARIADO","MANTER","media",
    "Defeito no tap interno e problema de tensão são falha do próprio transformador, e a OS fecha como substituição de trafo queimado com série retirada e instalada preenchidas.",
    "SS PARA TROCAR TRAFO 5711214001 COM PROBLEMA DE TENSÃO E O TAP INTERNO; substituição de trafo queimado rdr porto", False)

w(R)
print("total:", len(R))
