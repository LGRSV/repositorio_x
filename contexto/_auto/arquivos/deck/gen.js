const pptxgen = require('pptxgenjs');
const P = __dirname + '/unpacked/ppt/media/';
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';            // 13.333 x 7.5
pres.author = 'Squad Equipamentos Especiais';
pres.title  = 'Expurgos de Transformadores — Jan a Ago 2026';

const NAVY='1F1F4C', ORANGE='F37021', TEAL='08A2BB', GREEN='44B986', LIME='8DD645';
const GRAY='5B5B6B', CARD='F4F5F8', LINE='E3E5EC';
const HF='Arial', BF='Calibri';
const BGC={path:P+'image2.png'};

// ---------- helpers ----------
function titulo(s, t, sub){
  s.addText(t,{x:0.55,y:0.34,w:12.2,h:0.62,fontFace:HF,fontSize:30,bold:true,color:NAVY,isTextBox:true,margin:0,valign:'middle'});
  if(sub) s.addText(sub,{x:0.55,y:1.00,w:12.2,h:0.34,fontFace:BF,fontSize:14,color:GRAY,isTextBox:true,margin:0,valign:'middle'});
}
function card(s,x,y,w,h,fill){
  s.addShape(pres.ShapeType.roundRect,{x,y,w,h,rectRadius:0.08,fill:{color:fill||CARD},line:{color:LINE,width:0.75}});
}
function nota(s,txt,y){
  s.addText(txt,{x:0.55,y:y,w:12.2,h:0.5,fontFace:BF,fontSize:12.5,color:GRAY,italic:true,isTextBox:true,margin:0,valign:'top'});
}

// ================= 1. CAPA =================
let s = pres.addSlide();
s.background = {path:P+'image1.png'};
s.addText('Expurgos de Transformadores',{x:8.0,y:3.32,w:4.95,h:0.96,fontFace:HF,fontSize:29,bold:true,color:NAVY,isTextBox:true,margin:0,valign:'top',lineSpacingMultiple:1.0});
s.addText('Janeiro a agosto de 2026',{x:8.0,y:4.34,w:4.95,h:0.34,fontFace:HF,fontSize:16,bold:true,color:TEAL,isTextBox:true,margin:0,valign:'middle'});
s.addText('Squad Equipamentos Especiais',{x:8.0,y:4.74,w:4.95,h:0.3,fontFace:BF,fontSize:11.5,color:GRAY,isTextBox:true,margin:0,valign:'top'});
s.addNotes('Base: 227 SS expurgadas de janeiro a agosto de 2026. Metade ainda depende de análise do COPO.');

// ================= 2. A MENSAGEM =================
s = pres.addSlide(); s.background = BGC;
titulo(s,'Metade dos expurgos ainda não fechou','Das 227 solicitações retiradas do indicador, 112 aguardam explicação do COPO sobre a falta de registro de interrupção.');
const stats=[
  {n:'227',l:'Expurgos no período',d:'janeiro a agosto de 2026',c:NAVY},
  {n:'115',l:'Com decisão fechada',d:'mérito técnico resolvido',c:GREEN},
  {n:'112',l:'Aguardando o COPO',d:'49% do total',c:ORANGE}];
stats.forEach((v,i)=>{
  const x=0.55+i*4.12;
  card(s,x,1.72,3.85,2.32);
  s.addText(v.n,{x:x+0.3,y:1.92,w:3.25,h:1.05,fontFace:HF,fontSize:60,bold:true,color:v.c,isTextBox:true,margin:0,valign:'middle'});
  s.addText(v.l,{x:x+0.3,y:3.02,w:3.25,h:0.34,fontFace:HF,fontSize:14,bold:true,color:NAVY,isTextBox:true,margin:0,valign:'middle'});
  s.addText(v.d,{x:x+0.3,y:3.36,w:3.25,h:0.34,fontFace:BF,fontSize:11.5,color:GRAY,isTextBox:true,margin:0,valign:'top'});
});
card(s,0.55,4.34,12.23,1.62,'FDF1E9');
s.addText('O que separa os dois grupos',{x:0.95,y:4.54,w:11.4,h:0.3,fontFace:HF,fontSize:13,bold:true,color:ORANGE,isTextBox:true,margin:0,valign:'middle'});
s.addText([
 {text:'Os 115 saíram por mérito. ',options:{bold:true,color:NAVY}},
 {text:'Furto, remanejamento, troca preventiva, ausência de documento — o caso está decidido e não volta.',options:{color:GRAY,breakLine:true}},
 {text:'Os 112 saíram por ausência de registro. ',options:{bold:true,color:NAVY}},
 {text:'O texto descreve a falha e em 81 deles a troca está documentada, mas a Crítica não registrou a interrupção — voltam ao indicador se a prova aparecer.',options:{color:GRAY}}
],{x:0.95,y:4.86,w:11.4,h:0.96,fontFace:BF,fontSize:12.5,isTextBox:true,margin:0,valign:'top',lineSpacingMultiple:1.2});
s.addNotes('115 decididos x 112 pendentes. Expurgo por mérito não volta; expurgo por ausência de registro volta se a prova aparecer.');

// ================= 3. AS CINCO MACRO CATEGORIAS =================
s = pres.addSlide(); s.background = BGC;
titulo(s,'Como se dividem os 227 expurgos','Cinco macro categorias. A maior delas é justamente a que ainda não tem resposta.');
s.addChart(pres.ChartType.bar,[{name:'Expurgos',labels:['Não houve troca','Sem documento','Troca sem falha','Causa externa ao transformador','Sem interrupção comprovada'],values:[12,16,38,49,112]}],
 {x:0.5,y:1.62,w:7.5,h:4.35,barDir:'bar',chartColors:[NAVY,LIME,GREEN,TEAL,ORANGE],varyColors:true,
  showValue:true,dataLabelPosition:'outEnd',dataLabelFontFace:HF,dataLabelFontSize:13,dataLabelColor:NAVY,dataLabelFontBold:true,
  catAxisLabelColor:NAVY,catAxisLabelFontFace:BF,catAxisLabelFontSize:11.5,
  valAxisHidden:true,valGridLine:{style:'none'},catGridLine:{style:'none'},showLegend:false,barGapWidthPct:45,
  valAxisMaxVal:130});
card(s,8.35,1.62,4.43,4.35);
s.addText('A leitura',{x:8.7,y:1.86,w:3.75,h:0.3,fontFace:HF,fontSize:14,bold:true,color:ORANGE,isTextBox:true,margin:0,valign:'middle'});
s.addText([
 {text:'“Sem interrupção comprovada” concentra 112 dos 227 — quase metade.',options:{bold:true,color:NAVY,breakLine:true}},
 {text:'Ela reúne dois motivos: 82 SS em que a Crítica não registra defeito no ativo e 30 em que o registro existe, mas fora da janela da SS.',options:{color:GRAY,breakLine:true}},
 {text:'\nAs outras quatro categorias somam 115 e estão encerradas.',options:{bold:true,color:NAVY,breakLine:true}},
 {text:'Nelas o expurgo não depende da base de interrupção: o motivo está no próprio caso — furto, remanejamento, preventivo, falta de documento.',options:{color:GRAY}}
],{x:8.7,y:2.26,w:3.75,h:3.5,fontFace:BF,fontSize:12,isTextBox:true,margin:0,valign:'top',lineSpacingMultiple:1.22});
s.addNotes('112 de 227 na macro categoria pendente. As outras quatro estão fechadas.');

// ================= 4. OS 115 FECHADOS =================
s = pres.addSlide(); s.background = BGC;
titulo(s,'Os 115 expurgos com decisão fechada','Saíram do indicador por mérito próprio. Não dependem da base de interrupção e não retornam.');
const blocos=[
 {t:'Causa externa ao transformador',n:49,c:TEAL,it:['Furto — 36','Abalroamento — 7','Erro de cadastro — 2','Falta de fase — 2','Dano de terceiros e trafo auxiliar — 2']},
 {t:'Troca sem falha',n:38,c:GREEN,it:['Remanejamento — 14','Preventivo — 12','Tape e tensão — 7','Divisão de circuito — 4','Melhoria de posto — 1']},
 {t:'Sem documento',n:16,c:LIME,it:['Sem obra — 9','Obra sem transformador — 3','Sem OS — 3','Obra sem execução — 1']},
 {t:'Não houve troca',n:12,c:NAVY,it:['Sem troca — 11','SS duplicada — 1']}];
blocos.forEach((b,i)=>{
  const linha=Math.floor(i/2), alt=linha===0?2.12:1.84;
  const x=0.55+(i%2)*6.34, y=linha===0?1.62:4.02;
  card(s,x,y,6.06,alt);
  s.addShape(pres.ShapeType.ellipse,{x:x+0.3,y:y+(alt-0.92)/2,w:0.92,h:0.92,fill:{color:b.c}});
  s.addText(String(b.n),{x:x+0.3,y:y+(alt-0.92)/2,w:0.92,h:0.92,fontFace:HF,fontSize:23,bold:true,color:'FFFFFF',align:'center',valign:'middle',isTextBox:true,margin:0});
  s.addText(b.t,{x:x+1.42,y:y+0.28,w:4.4,h:0.34,fontFace:HF,fontSize:14,bold:true,color:NAVY,isTextBox:true,margin:0,valign:'middle'});
  s.addText(b.it.map((t,j)=>({text:t,options:{bullet:true,breakLine:j<b.it.length-1}})),
    {x:x+1.42,y:y+0.64,w:4.4,h:alt-0.78,fontFace:BF,fontSize:11,color:GRAY,isTextBox:true,margin:0,valign:'top',paraSpaceAfter:2});
});
s.addNotes('49 causa externa, 38 troca sem falha, 16 sem documento, 12 não houve troca. Total 115.');

// ================= 5. OS 112 PENDENTES =================
s = pres.addSlide(); s.background = BGC;
titulo(s,'Os 112 que dependem do COPO','Foram expurgados por falta de registro de interrupção — não por descaracterização da falha.');
const dois=[
 {t:'Sem interrupção',n:82,c:ORANGE,d:'A Crítica não registra defeito aberto no ativo em data nenhuma do período. Sem registro, não há evento a medir.'},
 {t:'Fora da janela',n:30,c:'D9541E',d:'A Crítica registra defeito aberto no transformador, mas em data que não cabe na janela da SS.'}];
dois.forEach((b,i)=>{
  const x=0.55+i*6.34;
  card(s,x,1.66,6.06,1.52);
  s.addText(String(b.n),{x:x+0.34,y:1.82,w:1.5,h:0.86,fontFace:HF,fontSize:46,bold:true,color:b.c,isTextBox:true,margin:0,valign:'middle'});
  s.addText(b.t,{x:x+1.94,y:1.82,w:3.9,h:0.34,fontFace:HF,fontSize:15,bold:true,color:NAVY,isTextBox:true,margin:0,valign:'middle'});
  s.addText(b.d,{x:x+1.94,y:2.18,w:3.9,h:0.9,fontFace:BF,fontSize:11.5,color:GRAY,isTextBox:true,margin:0,valign:'top',lineSpacingMultiple:1.16});
});
card(s,0.55,3.42,12.23,2.14,'FDF1E9');
s.addText('O que o campo registrou nesses 112 casos',{x:0.95,y:3.62,w:11.4,h:0.32,fontFace:HF,fontSize:14,bold:true,color:ORANGE,isTextBox:true,margin:0,valign:'middle'});
const tres=[{n:'89',l:'descritos como QUEIMADO'},{n:'23',l:'descritos como AVARIADO'},{n:'31',l:'sem prova de troca'}];
tres.forEach((v,i)=>{
  const x=1.0+i*3.92;
  s.addText(v.n,{x:x,y:4.04,w:1.25,h:0.72,fontFace:HF,fontSize:34,bold:true,color:NAVY,isTextBox:true,margin:0,valign:'middle'});
  s.addText(v.l,{x:x+1.3,y:4.04,w:2.5,h:0.72,fontFace:BF,fontSize:12,color:GRAY,isTextBox:true,margin:0,valign:'middle'});
});
s.addText('Em nenhum dos 112 a leitura do texto aponta causa diferente de falha do próprio transformador.',{x:1.0,y:4.92,w:11.3,h:0.42,fontFace:BF,fontSize:12,italic:true,color:NAVY,isTextBox:true,margin:0,valign:'middle'});
s.addNotes('82 sem interrupção, 30 fora da janela. 89 queimado, 23 avariado. 81 com prova de troca, 31 sem.');

// ================= 6. O NUCLEO =================
s = pres.addSlide(); s.background = BGC;
titulo(s,'O núcleo do problema: 81 casos com troca provada','A série retirada difere da instalada — a substituição está documentada. Falta apenas a interrupção.');
card(s,0.55,1.72,4.5,4.24,'FDF1E9');
s.addText('81',{x:0.9,y:2.46,w:3.8,h:1.5,fontFace:HF,fontSize:96,bold:true,color:ORANGE,isTextBox:true,margin:0,valign:'middle'});
s.addText('dos 112 pendentes têm prova de troca',{x:0.9,y:3.96,w:3.8,h:0.7,fontFace:HF,fontSize:15,bold:true,color:NAVY,isTextBox:true,margin:0,valign:'top',lineSpacingMultiple:1.1});
s.addText('72% do grupo em aberto',{x:0.9,y:4.74,w:3.8,h:0.34,fontFace:BF,fontSize:12.5,color:GRAY,isTextBox:true,margin:0,valign:'top'});
s.addText('Os outros 31 também descrevem falha no texto, mas a troca não está documentada.',{x:0.9,y:5.16,w:3.8,h:0.62,fontFace:BF,fontSize:11,color:GRAY,isTextBox:true,margin:0,valign:'top',lineSpacingMultiple:1.14});
const det=[
 {t:'Por motivo do expurgo',a:'56 sem interrupção',b:'25 fora da janela'},
 {t:'Pelo que o texto descreve',a:'65 queimados',b:'16 avariados'}];
det.forEach((d,i)=>{
  const y=1.72+i*1.42;
  card(s,5.35,y,7.43,1.26);
  s.addText(d.t,{x:5.68,y:y+0.16,w:6.8,h:0.3,fontFace:HF,fontSize:12.5,bold:true,color:NAVY,isTextBox:true,margin:0,valign:'middle'});
  s.addText(d.a,{x:5.68,y:y+0.52,w:3.3,h:0.56,fontFace:HF,fontSize:20,bold:true,color:TEAL,isTextBox:true,margin:0,valign:'middle'});
  s.addText(d.b,{x:9.1,y:y+0.52,w:3.3,h:0.56,fontFace:HF,fontSize:20,bold:true,color:GREEN,isTextBox:true,margin:0,valign:'middle'});
});
card(s,5.35,4.56,7.43,1.4,'FDF1E9');
s.addText('Por que isso importa',{x:5.68,y:4.72,w:6.8,h:0.3,fontFace:HF,fontSize:13,bold:true,color:ORANGE,isTextBox:true,margin:0,valign:'middle'});
s.addText('São 81 transformadores que comprovadamente foram trocados e cujo laudo de campo descreve queima ou avaria. Se a interrupção for localizada, voltam ao indicador — e o indicador do período muda.',
 {x:5.68,y:5.04,w:6.8,h:0.82,fontFace:BF,fontSize:12,color:GRAY,isTextBox:true,margin:0,valign:'top',lineSpacingMultiple:1.16});
s.addNotes('81 de 112 com prova de troca: 56 sem interrupção + 25 fora da janela; 65 queimados + 16 avariados.');

// ================= 7. CONCENTRACAO =================
s = pres.addSlide(); s.background = BGC;
titulo(s,'A pendência está concentrada no início do ano','Janeiro a abril respondem por 90 dos 112 casos em aberto — 80% do total.');
s.addChart([
 {type:pres.ChartType.bar,data:[{name:'Expurgos no mês',labels:['jan','fev','mar','abr','mai','jun','jul','ago'],values:[47,35,34,31,16,28,13,23]}],options:{chartColors:['C9CEDB'],barGapWidthPct:40}},
 {type:pres.ChartType.bar,data:[{name:'Aguardando COPO',labels:['jan','fev','mar','abr','mai','jun','jul','ago'],values:[23,24,24,19,7,9,0,6]}],options:{chartColors:[ORANGE],barGapWidthPct:40}}],
 {x:0.5,y:1.66,w:8.1,h:4.3,barDir:'col',barGrouping:'clustered',
  showValue:true,dataLabelPosition:'outEnd',dataLabelFontFace:HF,dataLabelFontSize:10.5,dataLabelColor:NAVY,
  catAxisLabelColor:NAVY,catAxisLabelFontFace:HF,catAxisLabelFontSize:12,catAxisLabelFontBold:true,
  valAxisHidden:true,valGridLine:{style:'none'},catGridLine:{style:'none'},
  showLegend:true,legendPos:'t',legendFontFace:BF,legendFontSize:11,legendColor:NAVY,valAxisMaxVal:56});
card(s,8.9,1.66,3.88,4.3);
s.addText('O que o gráfico mostra',{x:9.22,y:1.9,w:3.24,h:0.3,fontFace:HF,fontSize:13,bold:true,color:ORANGE,isTextBox:true,margin:0,valign:'middle'});
s.addText([
 {text:'Janeiro a abril: 90 pendentes',options:{bold:true,color:NAVY,breakLine:true}},
 {text:'Em fevereiro e março a pendência alcança 7 de cada 10 expurgos do mês.',options:{color:GRAY,breakLine:true}},
 {text:'\nMaio, junho e agosto: 22 pendentes',options:{bold:true,color:NAVY,breakLine:true}},
 {text:'Um terço dos 67 expurgos desses meses — metade da proporção do primeiro quadrimestre.',options:{color:GRAY,breakLine:true}},
 {text:'\nJulho não entra na comparação',options:{bold:true,color:ORANGE,breakLine:true}},
 {text:'A Crítica do mês se perdeu. Os 13 expurgos foram lidos só pelo texto, sem conferência de interrupção: o zero é ausência de teste, não ausência de caso.',options:{color:GRAY}}
],{x:9.22,y:2.3,w:3.24,h:3.5,fontFace:BF,fontSize:11.5,isTextBox:true,margin:0,valign:'top',lineSpacingMultiple:1.2});
s.addNotes('jan 23/47, fev 24/35, mar 24/34, abr 19/31, mai 7/16, jun 9/28, ago 6/23. Julho 0/13 porque a Crítica de julho se perdeu e a conferência de interrupção não rodou — não comparar.');

// ================= 8. O PEDIDO =================
s = pres.addSlide(); s.background = BGC;
titulo(s,'O que precisamos do COPO','Três respostas fecham os 112 casos e encerram o ciclo de janeiro a agosto.');
const asks=[
 {n:'1',c:ORANGE,t:'Confirmar as 82 ausências',d:'Para cada SS em que a Crítica não registra defeito no ativo, dizer se houve interrupção não registrada ou se o evento realmente não existiu. É o maior bloco e destrava 56 casos com troca provada.'},
 {n:'2',c:TEAL,t:'Avaliar as 30 fora da janela',d:'A interrupção existe, mas em data que não cabe na janela da SS. Verificar se a janela deve ser ajustada ou se o vínculo entre a ocorrência e a solicitação é outro.'},
 {n:'3',c:GREEN,t:'Priorizar janeiro a abril',d:'Concentram 90 dos 112 casos. Fechar esses quatro meses resolve 80% da pendência e permite congelar o resultado do primeiro quadrimestre.'}];
asks.forEach((a,i)=>{
  const y=1.66+i*1.46;
  card(s,0.55,y,12.23,1.3);
  s.addShape(pres.ShapeType.ellipse,{x:0.92,y:y+0.3,w:0.7,h:0.7,fill:{color:a.c}});
  s.addText(a.n,{x:0.92,y:y+0.3,w:0.7,h:0.7,fontFace:HF,fontSize:20,bold:true,color:'FFFFFF',align:'center',valign:'middle',isTextBox:true,margin:0});
  s.addText(a.t,{x:1.9,y:y+0.22,w:10.5,h:0.34,fontFace:HF,fontSize:14.5,bold:true,color:NAVY,isTextBox:true,margin:0,valign:'middle'});
  s.addText(a.d,{x:1.9,y:y+0.58,w:10.5,h:0.62,fontFace:BF,fontSize:11.5,color:GRAY,isTextBox:true,margin:0,valign:'top',lineSpacingMultiple:1.14});
});
s.addText('Enquanto as três respostas não chegam, os 112 permanecem retidos — fora do indicador, mas reversíveis.',
 {x:0.55,y:6.06,w:12.23,h:0.36,fontFace:BF,fontSize:12,italic:true,color:NAVY,isTextBox:true,margin:0,valign:'middle'});
s.addNotes('Três pedidos: confirmar as 82 ausências, avaliar as 30 fora da janela, priorizar jan-abr.');

// ================= 9. FECHAMENTO =================
s = pres.addSlide(); s.background = {path:P+'image3.png'};
s.addText('Obrigado',{x:0.9,y:0.85,w:11.5,h:0.8,fontFace:HF,fontSize:40,bold:true,color:NAVY,isTextBox:true,margin:0,valign:'middle'});
s.addText('Squad Equipamentos Especiais  ·  Expurgos de janeiro a agosto de 2026',{x:0.9,y:1.68,w:11.5,h:0.4,fontFace:BF,fontSize:14,color:GRAY,isTextBox:true,margin:0,valign:'middle'});
s.addNotes('Fechamento.');

pres.writeFile({fileName: __dirname+'/out/Expurgos_Jan_Ago_2026.pptx'}).then(f=>console.log('gerado:',f));
