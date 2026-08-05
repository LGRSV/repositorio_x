#!/usr/bin/env python3
"""Converte um .docx desta pasta em PDF, sem LibreOffice.

Por que existe: o container onde a auditoria roda tem uma instalação de LibreOffice sem o módulo
do Writer — soffice abre e responde "source file could not be loaded" para qualquer arquivo, .docx
ou .txt. Sem Writer não há filtro de importação, e o caminho normal docx → pdf não existe aqui.

O que este script faz: lê o word/document.xml do próprio .docx já gerado, monta um HTML com a
mesma sequência de blocos e manda o Chromium imprimir. O PDF sai do MESMO arquivo que vai para o
site — não de uma segunda escrita do manual —, então os dois nunca divergem de conteúdo. O que
muda é só a paginação, que é do Chromium e não do Word.

O sumário do .docx é um campo que só o Word preenche. No PDF ele é remontado aqui a partir dos
próprios títulos, sem número de página: página é coisa de paginador, e inventar uma seria mentir.

Uso:  python3 scripts/docx_para_pdf.py public/manuais/Manual_de_Regras_....docx
"""
import html
import os
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"

CSS = """
@page { size: A4; margin: 22mm 20mm 18mm 20mm; }
body { font-family: Georgia, "DejaVu Serif", serif; color: #222; font-size: 10.5pt; line-height: 1.5; }
p { margin: 0 0 6pt; text-align: justify; }
b { color: #1f2a37; }
h1 { font-size: 17pt; font-weight: normal; color: #1f2a37; margin: 20pt 0 8pt;
     padding-bottom: 4pt; border-bottom: 1px solid #d8d5cf; page-break-after: avoid; }
h2 { font-size: 12.5pt; font-weight: bold; color: #a52a34; margin: 14pt 0 5pt; page-break-after: avoid; }
h1 + p, h2 + p { page-break-before: avoid; }
ul { margin: 0 0 8pt 0; padding-left: 16pt; }
li { margin: 0 0 4pt; }
table { border-collapse: collapse; width: 100%; margin: 8pt 0 10pt; font-size: 9.5pt;
        page-break-inside: avoid; }
table.longa { page-break-inside: auto; }
table.longa thead { display: table-header-group; }
table.longa tr { page-break-inside: avoid; }
th { background: #1f2a37; color: #fff; text-align: left; font-weight: bold; padding: 4pt 6pt; }
td { padding: 4pt 6pt; border-bottom: 1px solid #e6e3dd; }
th.dir, td.dir { text-align: right; }
.nota { border-left: 3px solid #a52a34; padding: 2pt 0 2pt 9pt; margin: 8pt 0 12pt;
        color: #5b6577; font-style: italic; font-size: 10pt; text-align: left; }
.quebra { page-break-before: always; }
.capa { page-break-after: always; padding-top: 40mm; }
.capa .chapeu { letter-spacing: .18em; font-size: 10pt; font-weight: bold; color: #a52a34; }
.capa .titulo { font-size: 34pt; color: #1f2a37; line-height: 1.1; margin: 8pt 0 0; }
.capa .linha { font-size: 14pt; color: #5b6577; margin: 4pt 0 16pt; }
.capa hr { border: 0; border-top: 1px solid #d8d5cf; margin: 0 0 12pt; }
.grande { font-size: 18pt; color: #1f2a37; margin: 0 0 10pt; }
.sumario { list-style: none; padding: 0; }
.sumario li { margin: 0 0 5pt; color: #1f2a37; }
.sumario li.n2 { padding-left: 14pt; color: #5b6577; font-size: 9.5pt; }
"""


def txt(no):
    return "".join(t.text or "" for t in no.iter(W + "t"))


def estilo(p):
    s = p.find(f"{W}pPr/{W}pStyle")
    return s.get(W + "val") if s is not None else ""


def corridos(p):
    """Devolve o parágrafo como HTML, preservando negrito e itálico dos runs."""
    fora = []
    for r in p.findall(W + "r"):
        t = "".join(x.text or "" for x in r.findall(W + "t"))
        if not t:
            continue
        pr = r.find(W + "rPr")
        neg = pr is not None and pr.find(W + "b") is not None
        ita = pr is not None and pr.find(W + "i") is not None
        h = html.escape(t)
        if neg:
            h = f"<b>{h}</b>"
        if ita:
            h = f"<i>{h}</i>"
        fora.append(h)
    return "".join(fora)


def tem_quebra(p):
    return any(b.get(W + "type") == "page" for b in p.iter(W + "br"))


def tem_borda_esq(p):
    return p.find(f"{W}pPr/{W}pBdr/{W}left") is not None


def tabela_html(tbl):
    """A tabela sai com a largura das colunas e o alinhamento que estão no próprio .docx."""
    linhas = [[tc for tc in tr.findall(W + "tc")] for tr in tbl.findall(W + "tr")]
    if not linhas:
        return ""
    larg = [int(g.get(W + "w")) for g in tbl.findall(f"{W}tblGrid/{W}gridCol")]
    total = sum(larg) or 1
    col = "".join(f'<col style="width:{100 * w / total:.1f}%">' for w in larg)

    def cel(tc):
        # o recuo das linhas de detalhe é feito com espaço no .docx; em HTML ele some
        v = txt(tc)
        return "&nbsp;" * (len(v) - len(v.lstrip())) + html.escape(v.strip())

    def dir_da(tc):
        j = tc.find(f"{W}p/{W}pPr/{W}jc")
        return " class=dir" if j is not None and j.get(W + "val") == "right" else ""

    cab = "".join(f"<th{dir_da(tc)}>{cel(tc)}</th>" for tc in linhas[0])
    corpo = "".join(
        "<tr>" + "".join(f"<td{dir_da(tc)}>{cel(tc)}</td>" for tc in l) + "</tr>"
        for l in linhas[1:])
    cls = " class=longa" if len(linhas) > 9 else ""
    return f"<table{cls}><colgroup>{col}</colgroup><thead><tr>{cab}</tr></thead><tbody>{corpo}</tbody></table>"


def monta(docx):
    z = zipfile.ZipFile(docx)
    corpo = ET.fromstring(z.read("word/document.xml")).find(W + "body")
    blocos, titulos, lista, capa = [], [], [], []
    dentro_capa = True

    def fecha_lista():
        if lista:
            blocos.append("<ul>" + "".join(f"<li>{x}</li>" for x in lista) + "</ul>")
            lista.clear()

    for el in corpo:
        if el.tag == W + "tbl":
            fecha_lista()
            blocos.append(tabela_html(el))
            continue
        if el.tag == W + "sdt":  # é aqui que o campo do sumário mora
            fecha_lista()
            blocos.append("@SUMARIO@")
            continue
        if el.tag != W + "p":
            continue
        est = estilo(el)
        conteudo = corridos(el)
        if tem_quebra(el):
            fecha_lista()
            if dentro_capa:
                dentro_capa = False
            else:
                blocos.append('<div class="quebra"></div>')
            if not conteudo:
                continue
        if not conteudo:
            continue
        if est in ("Heading1", "Heading2"):
            fecha_lista()
            nivel = 1 if est == "Heading1" else 2
            titulos.append((nivel, conteudo))
            blocos.append(f"<h{nivel}>{conteudo}</h{nivel}>")
        elif est == "ListParagraph":
            lista.append(conteudo)
        elif dentro_capa:
            capa.append((tem_borda_esq(el), conteudo))
        else:
            fecha_lista()
            sz = el.find(f"{W}r/{W}rPr/{W}sz")
            grande = sz is not None and int(sz.get(W + "val")) >= 32
            cls = ' class="nota"' if tem_borda_esq(el) else (' class="grande"' if grande else "")
            blocos.append(f"<p{cls}>{conteudo}</p>")
    fecha_lista()

    # a capa: os três primeiros parágrafos são chapéu, título e linha de apoio
    ch = [c for _, c in capa]
    cabeca = ['<div class="capa">']
    if len(ch) >= 3:
        cabeca += [f'<div class="chapeu">{ch[0]}</div>', f'<div class="titulo">{ch[1]}</div>',
                   f'<div class="linha">{ch[2]}</div>', "<hr>"]
        resto = capa[3:]
    else:
        resto = capa
    for borda, c in resto:
        cabeca.append(f'<p class="nota">{c}</p>' if borda else f"<p>{c}</p>")
    cabeca.append("</div>")

    sumario = '<ul class="sumario">' + "".join(
        f'<li class="n{n}">{t}</li>' for n, t in titulos) + "</ul>"
    miolo = "\n".join(blocos).replace("@SUMARIO@", sumario)
    titulo = html.escape(os.path.basename(docx).rsplit(".", 1)[0].replace("_", " "))
    return (f"<!doctype html><html lang=pt-BR><meta charset=utf-8><title>{titulo}</title>"
            f"<style>{CSS}</style>{''.join(cabeca)}{miolo}</html>")


def main(argv):
    if not argv:
        print(__doc__.strip().splitlines()[-1])
        return 2
    docx = os.path.abspath(argv[0])
    pdf = docx.rsplit(".", 1)[0] + ".pdf"
    htm = docx.rsplit(".", 1)[0] + ".html"
    with open(htm, "w", encoding="utf-8") as fh:
        fh.write(monta(docx))
    perfil = os.path.join(os.path.dirname(pdf), ".chrome-perfil")
    r = subprocess.run(
        [CHROME, "--headless", "--disable-gpu", "--no-sandbox", f"--user-data-dir={perfil}",
         "--no-pdf-header-footer", f"--print-to-pdf={pdf}", "file://" + htm],
        capture_output=True, text=True)
    subprocess.run(["rm", "-rf", perfil], check=False)
    os.remove(htm)
    if not os.path.exists(pdf):
        print(r.stderr[-1500:])
        return 1
    print(pdf)
    print(f"  {os.path.getsize(pdf) // 1024} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
