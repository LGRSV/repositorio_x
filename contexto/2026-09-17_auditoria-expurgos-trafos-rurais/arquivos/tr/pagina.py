import json, re, html, datetime, collections
d=json.load(open('dossie.json'))
def clean(t): return re.sub(r'\s+',' ',(t or '').replace('_x000D_',' ')).strip()
def br(s): return html.escape(s or '')
MES={'01':'jan','02':'fev','03':'mar','04':'abr','05':'mai','06':'jun','07':'jul','08':'ago'}
for o in d:
    o['texto_ss']=clean(o['texto_ss']); o['texto_os']=clean(o['texto_os'])
    o['mes']=MES.get((o['abertura'] or '')[5:7],'')
d=sorted(d,key=lambda o:o['abertura'] or '9')
# resumo
sub=collections.Counter(o['oc_sub'] for o in d if o['oc_sub'])
camp=collections.Counter(o['motivo_campo'] for o in d if o['motivo_campo'])
meses=collections.Counter(o['mes'] for o in d if o['mes'])
noprazo=[o for o in d if o['h_prazo'] is not None and o['h_prazo']>=0]
atraso=[o for o in d if o['h_prazo'] is not None and o['h_prazo']<0]
semdado=[o for o in d if o['h_prazo'] is None]
RAIO=sum(1 for o in d if 'DESCARGA' in (o['oc_sub'] or '')) 
X0,X1=-60.0,110.0
def px(h): return max(0.0,min(100.0,(h-X0)/(X1-X0)*100))
def dtbr(s):
    if not s: return '—'
    try: return datetime.datetime.strptime(s[:16],'%Y-%m-%d %H:%M').strftime('%d/%m %H:%M')
    except: return s
def num(v):
    s=str(v or '').replace('.',',')
    return s if s not in ('','None') else '—'

cards=[]
for o in d:
    ab=o['abertura']; oc_h=o['h_oc_ss']
    seg=''
    if o['oc_ini'] and oc_h is not None and oc_h>-100:
        ini=-oc_h
        try: fim=ini+float(o['oc_dur'] or 0)
        except: fim=ini
        a,b=px(ini),px(fim)
        seg=f'<div class="seg" style="left:{a:.2f}%;width:{max(b-a,0.8):.2f}%" title="Interrupção {dtbr(o["oc_ini"])} → {dtbr(o["oc_fim"])}"></div>'
    elif o['oc_ini'] and oc_h is not None:
        seg='<div class="seg off" style="left:0;width:2%" title="Ocorrência fora da escala"></div>'
    tm=''
    if o['h_atend'] is not None:
        late=o['h_prazo'] is not None and o['h_prazo']<0
        tm=f'<div class="mk fim {"late" if late else "ok"}" style="left:{px(o["h_atend"]):.2f}%" title="SS terminada"></div>'
    concorda=None
    if o['oc_sub'] and o['motivo_campo']:
        A='DESCARGA' in o['oc_sub']; B='DESCARGA' in o['motivo_campo']
        concorda = (A==B) and o['motivo_campo']!='NÃO IDENTIFICADO'
    pot=''
    if o['pot_ret'] and o['pot_inst']:
        r,i=o['pot_ret'],o['pot_inst']
        cls='same' if r==i else ('up' if i>r else 'down')
        arw='=' if r==i else ('↑' if i>r else '↓')
        pot=f'<span class="pot {cls}">{r:g} → {i:g} kVA {arw}</span>'
    chips=[]
    for lab,val in [('Para-raios',o['para_raios']),('Elo',o['elo']),('Vazamento',o['vazamento']),
                    ('Vegetação',o['vegetacao']),('Melhoria aterr.',o['melhoria_at'])]:
        if val: chips.append(f'<span class="chip"><b>{br(lab)}</b>{br(val)}</span>')
    at=[x for x in o['at'] if x not in ('','None','0')]
    if at: chips.append(f'<span class="chip"><b>Aterramento Ω</b>{br(" · ".join(num(x) for x in at))}</span>')
    prazo_txt='—'
    if o['h_prazo'] is not None:
        prazo_txt=(f'{abs(o["h_prazo"]):.0f} h de folga' if o['h_prazo']>=0 else f'{abs(o["h_prazo"]):.0f} h de atraso')
    cards.append(f'''
<article class="card">
 <header class="ch">
  <div class="cid"><span class="mes">{br(o['mes'])}</span><h3>{br(o['trafo'])}</h3>{pot}</div>
  <div class="cmeta"><span class="ss">{br(o['ss'])}</span><span>{br(o['loc'])} · {br(o['reg'])}</span><span>{br(o['clientes'] or '0')} clientes</span></div>
 </header>
 <div class="why">
  <div class="wcol surge">
   <span class="wlab">Crítica registrou</span>
   <strong>{br(o['oc_sub'] or 'sem interrupção registrada')}</strong>
   <span class="wsub">{br(o['oc_causa'] or '—')}{(' · '+str(o['oc_cons'])+' consumidores') if o['oc_cons'] else ''}</span>
  </div>
  <div class="wjoin">{'=' if concorda else ('≠' if concorda is False else '?')}</div>
  <div class="wcol burn">
   <span class="wlab">Campo apontou</span>
   <strong>{br(o['motivo_campo'] or 'não preenchido')}</strong>
   <span class="wsub">{br(o['texto_ss'][:90]+'…' if len(o['texto_ss'])>90 else o['texto_ss'])}</span>
  </div>
 </div>
 <div class="tl">
  <div class="track">{seg}<div class="mk ss" style="left:{px(0):.2f}%" title="SS aberta"></div><div class="mk lim" style="left:{px(72):.2f}%" title="Prazo 72 h"></div>{tm}</div>
  <div class="tlab"><span>interrupção</span><span>SS aberta {dtbr(o['abertura'])}</span><span>prazo 72 h</span></div>
 </div>
 <div class="facts">
  <div><span>Atendimento</span><b>{(f"{o['h_atend']:.0f} h" if o['h_atend'] is not None else '—')}</b></div>
  <div><span>Prazo</span><b class="{'late' if (o['h_prazo'] is not None and o['h_prazo']<0) else 'ok'}">{prazo_txt}</b></div>
  <div><span>Interrupção</span><b>{num(o['oc_dur'])+' h' if o['oc_dur'] else '—'}</b></div>
  <div><span>Série</span><b>{br(o['ns_ret'] or '—')} → {br(o['ns_inst'] or '—')}</b></div>
 </div>
 <div class="chips">{''.join(chips)}</div>
 <details><summary>Texto da SS e da OS</summary>
  <p><b>SS</b> {br(o['texto_ss'] or '—')}</p><p><b>OS</b> {br(o['texto_os'] or '—')}</p>
  <p class="src">OS {br(o['os'] or '—')} · Obra {br(o['obra'] or '—')}{' · ocorrência '+br(o['oc_num']) if o['oc_num'] else ''}</p>
 </details>
</article>''')

def barras(c,cor):
    mx=max(c.values()) if c else 1
    return ''.join(f'<li><span class="bl">{br(k.title())}</span><span class="bt"><i style="width:{v/mx*100:.0f}%;background:{cor}"></i></span><span class="bn">{v}</span></li>' for k,v in c.most_common())

HTML=f'''<title>Por que queimaram</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{{--ground:#EDEFF3;--surf:#FFF;--surf2:#F6F7FA;--ink:#161A22;--mut:#636B7C;--line:#D6DAE3;
--burn:#A8430F;--surge:#31457F;--ok:#1D6B45;--late:#992A38;--burn-w:#F3E5DC;--surge-w:#E2E7F3;}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--ground:#10131A;--surf:#181C25;--surf2:#1E232D;--ink:#E7EAF0;--mut:#98A1B2;--line:#272D39;--burn:#E08050;--surge:#8CA0DF;--ok:#4CA87A;--late:#D9788A;--burn-w:#2A1D16;--surge-w:#1B2130;}}}}
:root[data-theme="dark"]{{--ground:#10131A;--surf:#181C25;--surf2:#1E232D;--ink:#E7EAF0;--mut:#98A1B2;--line:#272D39;--burn:#E08050;--surge:#8CA0DF;--ok:#4CA87A;--late:#D9788A;--burn-w:#2A1D16;--surge-w:#1B2130;}}
*{{box-sizing:border-box}}
body{{background:var(--ground);color:var(--ink);font:400 15px/1.55 "IBM Plex Sans",system-ui,sans-serif;margin:0}}
.wrap{{max-width:1080px;margin:0 auto;padding-inline:20px;padding-block:40px 64px}}
h1{{font:700 clamp(30px,5vw,46px)/1.05 Archivo,system-ui,sans-serif;letter-spacing:-.02em;margin:0 0 10px;text-wrap:balance}}
.lede{{color:var(--mut);max-width:62ch;margin:0 0 6px;font-size:16px}}
.src0{{color:var(--mut);font:400 12px/1.5 "IBM Plex Mono",monospace;margin:14px 0 0}}
h2{{font:600 13px/1 "IBM Plex Sans",sans-serif;letter-spacing:.09em;text-transform:uppercase;color:var(--mut);margin:44px 0 14px}}
.sum{{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:16px}}
.box{{background:var(--surf);border:1px solid var(--line);border-radius:10px;padding:18px 18px 16px}}
.box h3{{font:600 14px/1.3 "IBM Plex Sans",sans-serif;margin:0 0 12px}}
.box ul{{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}}
.box li{{display:grid;grid-template-columns:1fr 84px 26px;align-items:center;gap:9px;font-size:13px}}
.bl{{color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
.bt{{height:7px;background:var(--surf2);border-radius:4px;overflow:hidden}}
.bt i{{display:block;height:100%;border-radius:4px}}
.bn{{font-family:"IBM Plex Mono",monospace;font-size:12px;text-align:right;color:var(--mut);font-variant-numeric:tabular-nums}}
.big{{font:700 42px/1 Archivo,sans-serif;font-variant-numeric:tabular-nums}}
.big span{{font:400 14px/1 "IBM Plex Sans",sans-serif;color:var(--mut)}}
.grid{{display:flex;flex-direction:column;gap:14px;margin-top:14px}}
.card{{background:var(--surf);border:1px solid var(--line);border-radius:12px;padding:18px}}
.ch{{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:baseline;justify-content:space-between;margin-bottom:14px}}
.cid{{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}}
.cid h3{{font:600 20px/1.1 "IBM Plex Mono",monospace;margin:0;letter-spacing:-.01em}}
.mes{{font:500 11px/1 "IBM Plex Mono",monospace;text-transform:uppercase;letter-spacing:.08em;color:var(--mut);border:1px solid var(--line);border-radius:4px;padding:4px 6px}}
.pot{{font:500 12px/1 "IBM Plex Mono",monospace;padding:4px 7px;border-radius:5px;background:var(--surf2);color:var(--mut)}}
.pot.up{{color:var(--burn);background:var(--burn-w)}} .pot.down{{color:var(--surge);background:var(--surge-w)}}
.cmeta{{display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:var(--mut)}}
.cmeta .ss{{font-family:"IBM Plex Mono",monospace;color:var(--ink)}}
.why{{display:grid;grid-template-columns:1fr 34px 1fr;gap:10px;align-items:stretch;margin-bottom:16px}}
.wcol{{background:var(--surf2);border-radius:9px;padding:12px 13px;display:flex;flex-direction:column;gap:3px;min-width:0}}
.wcol.surge{{border-left:3px solid var(--surge)}} .wcol.burn{{border-left:3px solid var(--burn)}}
.wlab{{font:500 10.5px/1 "IBM Plex Sans",sans-serif;letter-spacing:.09em;text-transform:uppercase;color:var(--mut)}}
.wcol strong{{font:600 14.5px/1.3 "IBM Plex Sans",sans-serif}}
.wsub{{font-size:12px;color:var(--mut);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}}
.wjoin{{display:grid;place-items:center;font:600 19px/1 "IBM Plex Mono",monospace;color:var(--mut)}}
.tl{{margin:4px 0 14px}}
.track{{position:relative;height:26px;background:var(--surf2);border-radius:6px}}
.seg{{position:absolute;top:7px;height:12px;background:var(--surge);border-radius:3px;opacity:.85}}
.seg.off{{background:repeating-linear-gradient(45deg,var(--surge),var(--surge) 3px,transparent 3px,transparent 6px)}}
.mk{{position:absolute;top:0;width:2px;height:26px;border-radius:2px}}
.mk.ss{{background:var(--burn)}} .mk.lim{{background:var(--mut);opacity:.55}}
.mk.fim{{width:9px;height:9px;border-radius:50%;top:8.5px;margin-left:-4px}}
.mk.fim.ok{{background:var(--ok)}} .mk.fim.late{{background:var(--late)}}
.tlab{{display:flex;justify-content:space-between;font:400 11px/1.4 "IBM Plex Mono",monospace;color:var(--mut);margin-top:5px;gap:8px}}
.facts{{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:12px 0;margin-bottom:12px}}
.facts div{{display:flex;flex-direction:column;gap:2px;min-width:0}}
.facts span{{font:500 10.5px/1 "IBM Plex Sans",sans-serif;letter-spacing:.07em;text-transform:uppercase;color:var(--mut)}}
.facts b{{font:500 13.5px/1.3 "IBM Plex Mono",monospace;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}}
.facts b.late{{color:var(--late)}} .facts b.ok{{color:var(--ok)}}
.chips{{display:flex;flex-wrap:wrap;gap:6px}}
.chip{{font:400 11.5px/1 "IBM Plex Mono",monospace;background:var(--surf2);border-radius:5px;padding:6px 8px;color:var(--ink);display:flex;gap:6px}}
.chip b{{color:var(--mut);font-weight:500}}
details{{margin-top:12px}}
summary{{cursor:pointer;font:500 12.5px/1 "IBM Plex Sans",sans-serif;color:var(--mut);padding:6px 0}}
summary:focus-visible{{outline:2px solid var(--burn);outline-offset:2px}}
details p{{font-size:13px;color:var(--ink);margin:8px 0;line-height:1.5}}
details p b{{color:var(--mut);font-weight:500;margin-right:6px}}
.src{{font-family:"IBM Plex Mono",monospace;font-size:11.5px;color:var(--mut)}}
.note{{background:var(--burn-w);border-radius:9px;padding:14px 16px;font-size:13.5px;margin-top:14px;color:var(--ink)}}
.note b{{color:var(--burn)}}
@media(max-width:560px){{.why{{grid-template-columns:1fr}}.wjoin{{height:18px}}}}
</style>
<div class="wrap">
<h1>Por que queimaram</h1>
<p class="lede">Dezesseis transformadores rurais de 112,5 e 150 kVA substituídos entre janeiro e agosto de 2026. Para cada um: o que a Crítica registrou como causa, o que a equipe encontrou em campo, e quanto tempo separou a interrupção do atendimento.</p>
<p class="src0">Base de SS/OS 10-09-2026 · fluxo-1582 · passos-critica · cadastro FIS 07-2026</p>

<h2>Por que queimou</h2>
<div class="sum">
 <div class="box"><h3>Subcausa registrada na Crítica</h3><ul>{barras(sub,'var(--surge)')}</ul></div>
 <div class="box"><h3>Provável motivo apontado em campo</h3><ul>{barras(camp,'var(--burn)')}</ul></div>
 <div class="box"><h3>Descarga atmosférica</h3>
   <p class="big">{RAIO}<span> das 12 com interrupção registrada</span></p>
   <p style="font-size:13px;color:var(--mut);margin:10px 0 0">É a subcausa dominante. O campo confirma descarga em 5 casos, aponta sobrecarga em 3 e deixa <b>não identificado</b> em 6 — quase metade dos laudos não fecha uma causa.</p>
 </div>
</div>

<h2>Quando queimou</h2>
<div class="sum">
 <div class="box"><h3>Mês de abertura da SS</h3><ul>{barras(meses,'var(--burn)')}</ul></div>
 <div class="box"><h3>Prazo de 72 horas</h3>
   <p class="big">{len(noprazo)}<span> de {len(noprazo)+len(atraso)} dentro do prazo</span></p>
   <p style="font-size:13px;color:var(--mut);margin:10px 0 0">Todas as SS têm limite de 72 h a partir da abertura. A folga média é de <b>55 h</b>. Um único caso estourou.</p>
 </div>
 <div class="box"><h3>O caso fora do prazo</h3>
   <p style="font:600 15px/1.3 'IBM Plex Mono',monospace;margin:0 0 6px">ETO-RD-DP 00011/2026</p>
   <p style="font-size:13px;color:var(--mut);margin:0">Almas, 02/01. Falha de bucha de AT, interrupção de 42 h. O atendimento levou <b style="color:var(--late)">100 h</b> — 28 h além do limite. É também o único que trocou 150 kVA por 75 kVA.</p>
 </div>
</div>
<div class="note"><b>Duas inconsistências de data.</b> Em <code>ETO-RD-GU 00061/2026</code> a ocorrência casada é de 30/04 enquanto a SS é de 13/01 — três meses e meio de distância, o que indica vínculo errado. Em <code>ETO-RD-GR 00405/2026</code> a SS abriu 5 h <i>antes</i> da interrupção registrada. Ambas merecem conferência antes de usar a causa.</div>

<h2>Caso a caso, em ordem cronológica</h2>
<div class="grid">{''.join(cards)}</div>
<p class="src0" style="margin-top:32px">Linha do tempo em escala comum: de 60 h antes da abertura da SS a 110 h depois. Barra azul = interrupção na Crítica · traço laranja = SS aberta · traço cinza = prazo de 72 h · ponto = conclusão.</p>
</div>'''
open('pagina.html','w').write(HTML)
print('gerado. tamanho %.0f KB'%(len(HTML)/1024))
print('atraso:',[o['ss'] for o in atraso],'| no prazo:',len(noprazo),'| sem dado:',[o['ss'] for o in semdado])
print('folga media: %.0f h'%(sum(o['h_prazo'] for o in noprazo)/len(noprazo)))
