# Amostra — 30 SS conferidas nos arquivos brutos

Método da conferência (independente do script, código separado):
para cada SS, `grep -a -F` do código nos seis `Critica-CHEIO_0[1-6]-2026.txt`; guardo só as linhas
em que o código bate **exatamente** numa das três colunas de ativo (`COD_ELE_PROBLEMA`,
`COD_ELE_INTERROMPIDO`, `COD_ELE_FECHADO`); para cada `NUM_SEQ_OPER_INIC_HDE` encontrado, faço um
**segundo** grep pela sequência para pegar **todos** os passos dela e monto a janela
`[min(DTA_ABERT), max(DTA_FECH)]`; casa se `(ini − 1 h) ≤ abertura ≤ (fim + 24 h)`. A chave gêmea
só é procurada quando o trafo não aparece em passo nenhum. Julho é conferido contra
`public/julho-2026.json` (a Crítica bruta do mês não existe).

> Armadilha encontrada na própria conferência: `grep` sem `-a` devolve **zero linhas** nesses
> arquivos ("binary file matches"), porque são latin-1 num locale UTF-8. Quem conferir à mão sem
> `-a` (ou `LC_ALL=C`) vai concluir "não existe na Crítica" para todo mundo.

Estratificação: as **6** `CASOU PELA CHAVE GÊMEA` (todas), 3 `CHAVE GÊMEA FORA DA JANELA`,
8 `CASOU PELO TRAFO`, 6 `TRAFO FORA DA JANELA`, 4 `AUSENTE`, 2 de julho e 1 não conferível.
Sorteio com semente fixa (`random.seed(20260902)`). Evidência bruta completa em
`agente_B/verificacao_bruta.txt`.

Resultados do script = versão atual (`agente_B/repro_atual.xlsx`).

| # | SS | Trafo | Resultado do script | Ocorrência / janela | Papel | Dist. (h) | Meu veredito | Bate | Observação |
|---:|---|---|---|---|---|---:|---|:--:|---|
| 1 | ENC-RD-PS 00259/2026 | 5700191054 | CASOU PELA CHAVE GÊMEA | 20264132739596 · 19/02 09:57→22/02 07:41 (2 passos) | fechado+interrompido+problema | — | CASOU PELA CHAVE GÊMEA | S | trafo com 0 ocorrências; chave `0300191054` com 1, dentro. Causa POSTE DE AT |
| 2 | ETO-RD-GU 00429/2026 | 5710235032 | CASOU PELA CHAVE GÊMEA | 20264257975458 · 06/04 02:01→06/04 23:17 | interrompido | — | CASOU PELA CHAVE GÊMEA | S | papel só `interrompido` confirmado no bruto |
| 3 | ENC-RD-PS 00561/2026 | 5710247085 | CASOU PELA CHAVE GÊMEA | 20264477882406 · 03/06 12:27→07/06 04:08 | fechado+interrompido+problema | — | CASOU PELA CHAVE GÊMEA | S | — |
| 4 | DOLP-RD-PA 00003/2026 | 5700121151 | CASOU PELA CHAVE GÊMEA | 20264062540292 · 02/01 15:31→05/01 16:27 | fechado+interrompido+problema | — | CASOU PELA CHAVE GÊMEA | S | SS abriu 15:28, 3 min **antes** do início — casa pela tolerância de 1 h. Borda exercitada e correta |
| 5 | ETO-RD-AR 00423/2026 | 5703829004 | CASOU PELA CHAVE GÊMEA | 20264161013301 · 04/03 12:22→05/03 16:34 (2 passos) | fechado+interrompido+problema | — | CASOU PELA CHAVE GÊMEA | S | — |
| 6 | DOLP-RD-PA 00122/2026 | 5710169006 | CASOU PELA CHAVE GÊMEA | 20264097204789 · 24/01 20:49→26/01 19:25 (3 passos) | fechado | — | CASOU PELA CHAVE GÊMEA | S | a chave tem **2** ocorrências; a escolhida é a que casa. `n_chave=2` confere |
| 7 | ETO-RD-AG 00065/2026 | 5710047039 | CHAVE GÊMEA FORA DA JANELA | 20264105122300 · 28/01 14:38→28/01 17:50 | fechado+interrompido+problema | 288,1 | CHAVE GÊMEA FORA DA JANELA | S | distância à **ocorrência**; à janela são 287,1 h (defeito A-6) |
| 8 | DOLP-RD-PA 00550/2026 | 5701477122 | CHAVE GÊMEA FORA DA JANELA | 20264387262514 · 12/05 09:40→12/05 12:11 | fechado+interrompido+problema | 22,4 | CHAVE GÊMEA FORA DA JANELA | S | SS abriu 22,4 h **antes** do início ⇒ 21,4 h da janela. Perto, mas fora |
| 9 | ETO-RD-GU 00487/2026 | 5710512097 | CHAVE GÊMEA FORA DA JANELA | 20264412837750 · 19/05 10:47→19/05 12:10 | fechado+interrompido+problema | 688,4 | CHAVE GÊMEA FORA DA JANELA | S | ocorrência quase 1 mês depois da SS |
| 10 | ETO-RD-AR 00727/2026 | 5700956193 | CASOU PELO TRAFO | 20264309979092 · 20/04 19:03→22/04 17:00 (2 passos) | fechado+interrompido+problema | — | CASOU PELO TRAFO | S | causa TRANSFORMADOR / QUEIMADO POR DESCARGA ATMOSFERICA |
| 11 | ETO-RD-GU 00316/2026 | 5709639032 | CASOU PELO TRAFO | 20264172649239 · 11/03 11:27→12/03 15:02 (2 passos) | fechado+interrompido+problema | — | CASOU PELO TRAFO | S | 2 ocorrências do trafo; a de janeiro fica a 1.112,7 h. Escolha certa |
| 12 | ETO-RD-GR 00322/2026 | 5710108154 | CASOU PELO TRAFO | 20264168767306 · 09/03 14:31→10/03 14:36 (2 passos) | fechado+interrompido+problema | — | CASOU PELO TRAFO | S | 2 ocorrências; a de abril fica a 761,7 h |
| 13 | ENC-RD-AR 00008/2026 | 5763737265 | CASOU PELO TRAFO | 20264350820773 · 01/05 08:03→02/05 16:00 (2 passos) | fechado+interrompido+problema | — | CASOU PELO TRAFO | S | — |
| 14 | ETO-RD-PA 00298/2026 | 5700071015 | CASOU PELO TRAFO | 20264392533181 · 12/05 17:11→13/05 10:59 | fechado+interrompido+problema | — | CASOU PELO TRAFO | S | — |
| 15 | ENC-RD-PS 00319/2026 | 5710502007 | CASOU PELO TRAFO | 20264166516134 · 07/03 15:57→08/03 16:21 | fechado+interrompido+problema | — | CASOU PELO TRAFO | S | SS abriu 16:26, **5 min depois** do fim — casa pela cauda de 24 h. Borda exercitada e correta |
| 16 | ETO-RD-GR 00218/2026 | 5700952113 | CASOU PELO TRAFO | 20264123976007 · 11/02 08:42→12/02 13:36 (2 passos) | fechado+interrompido+problema | — | CASOU PELO TRAFO | S | 2 ocorrências; a de janeiro a 672,8 h |
| 17 | ETO-RD-GR 00366/2026 | 5700121011 | CASOU PELO TRAFO | 20264191720127 · 22/03 15:45→23/03 12:41 | fechado+interrompido+problema | — | CASOU PELO TRAFO | S | SS abriu 1 min depois do início |
| 18 | ETO-RD-GR 00205/2026 | 5700299024 | TRAFO FORA DA JANELA | 20264121629809 · 09/02 15:48→09/02 17:29 | fechado+interrompido+problema | 29 | TRAFO FORA DA JANELA | S | SS 29 h **antes** da ocorrência ⇒ 28 h da janela. Rótulo da coluna errado (A-6) |
| 19 | ETO-RD-AR 00668/2026 | 5700026004 | TRAFO FORA DA JANELA | 20264173806480 · 12/03 08:50→12/03 12:46 | fechado+interrompido | 726,1 | TRAFO FORA DA JANELA | S | 3 ocorrências (2.233,0 / 1.856,9 / 726,1 h). Reportou a mais próxima — certo |
| 20 | ETO-CADTOC 00111/2026 | 5700080152 | TRAFO FORA DA JANELA | 20264180719522 · 16/03 06:59→16/03 17:09 | fechado+interrompido+problema | 1.272,3 | TRAFO FORA DA JANELA | S | 2 ocorrências; reportou a mais próxima |
| 21 | ETO-RD-GR 00637/2026 | 5713251009 | TRAFO FORA DA JANELA | 20264543567796 · 22/06 16:35→22/06 17:06 | fechado+interrompido+problema | 2,3 | TRAFO FORA DA JANELA | S | **SS aberta 2,3 h ANTES do início** ⇒ 1,3 h fora da tolerância de 1 h. Correto pela regra, mas é candidato a revisão manual |
| 22 | ETO-RD-PS 00247/2026 | 5702498013 | TRAFO FORA DA JANELA | 20264448250235 · 27/05 14:58→27/05 16:23 | fechado+interrompido+problema | 124,6 | TRAFO FORA DA JANELA | S | ocorrência 5 dias depois da SS |
| 23 | ETO-RD-DP 00286/2026 | 5700040005 | TRAFO FORA DA JANELA | 20264247039186 · 01/04 17:29→01/04 19:35 | fechado+interrompido+problema | 648,8 | TRAFO FORA DA JANELA | S | causa CAUSADA POR TERCEIROS |
| 24 | ETO-RD-PA 00085/2026 | 5700375092 | AUSENTE — nem trafo nem chave | — | — | — | AUSENTE — nem trafo nem chave | S | 0 linhas para `5700375092` e para `0300375092` nos 6 arquivos |
| 25 | ETO-RD-GU 00484/2026 | 5700277097 | AUSENTE — nem trafo nem chave | — | — | — | AUSENTE — nem trafo nem chave | S | 0 linhas para trafo e chave |
| 26 | DOLP-RD-PA 00084/2026 | 5710823122 | AUSENTE — nem trafo nem chave | — | — | — | AUSENTE — nem trafo nem chave | S | 0 linhas para trafo e chave |
| 27 | ETO-RD-GU 00073/2026 | 5701108076 | AUSENTE — nem trafo nem chave | — | — | — | AUSENTE — nem trafo nem chave | S | 0 linhas para trafo e chave |
| 28 | DOLP-RD-PA 00713/2026 | 5364882001 | CASOU PELO TRAFO (julho, via site) | — · 02/07 08:55→04/07 12:38 | problema+interrompido+fechado | — | CASOU PELO TRAFO | S | bate com `julho-2026.json` (`critica: SIM`, `na_janela: true`, `delta_inicio_h: 8.5`). Papel **fora de ordem alfabética** — defeito A-5. Prefixo 53 |
| 29 | ETO-COPC 00048/2026 | 5700003070 | AUSENTE pelo trafo — chave gêmea não conferível | — | — | — | AUSENTE (pelo trafo, sem conferir a chave) | S | `julho-2026.json` traz `critica: AUSENTE`, 0 ocorrências. Rótulo honesto: a chave gêmea de fato não pode ser testada sem a Crítica bruta de julho |
| 30 | ETO-RD-GR 00746/2026 | 5700056009 | SEM CRÍTICA — não conferível | — | — | — | não conferível | S | abertura 22/07, fora da Crítica carregada e fora do `julho-2026.json`. **Na planilha entregue de 03:10 esta linha dizia `AUSENTE — nem trafo nem chave`** — conclusão falsa que a correção do ramo de julho eliminou |

## Placar

**30 de 30 batem (S). 0 divergências de classificação.**

Detalhamento: 27 conferidas contra a Crítica bruta (jan–jun) reproduzem o resultado, a ocorrência
escolhida, o papel do ativo e a distância exatamente; 3 de julho batem com a extração por SS do
`julho-2026.json`, que é a única fonte disponível para o mês.

## O que a amostra confirmou além do placar

- **A borda da janela está certa nos dois lados.** Casos 4 (SS 3 min antes do início, casou),
  15 (SS 5 min depois do fim, casou), 21 (SS 2,3 h antes do início, não casou) e 8 (22,4 h antes,
  não casou) exercitam as duas pontas: `−1 h` e `+24 h` funcionam como especificado.
- **A escolha da ocorrência acertou nos 6 casos multi-ocorrência da amostra** (11, 12, 16, 19, 20,
  6) — o que é consistente com o defeito A-3 ser minoritário (39 escolhas subótimas em 94 casos
  com mais de uma ocorrência **dentro** da janela; nos casos "fora da janela" a escolha do mínimo
  funciona corretamente).
- **A regra da chave gêmea foi respeitada em todos os 18 casos existentes**: as 6+12 linhas de
  chave têm `Ocorrências do trafo na Crítica = 0`, ou seja, a chave só foi procurada com o trafo
  realmente ausente das três colunas.
- **A distância exibida é à ocorrência, não à janela** (casos 7, 18, 21) — defeito A-6 confirmado
  na amostra.
- **O papel do ativo sai em ordem diferente em julho** (caso 28) — defeito A-5 confirmado na amostra.
