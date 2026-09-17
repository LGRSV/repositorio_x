#!/bin/bash
# SessionStart: mostra ao Claude o último contexto salvo, para a sessão nova
# começar sabendo onde a anterior parou. Saída em stdout vira contexto.
raiz="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
[ -d "$raiz/contexto" ] || exit 0
ultimo=$(ls -1d "$raiz"/contexto/20*/ 2>/dev/null | sort | tail -1)
[ -n "$ultimo" ] || exit 0
echo "== Último contexto salvo: contexto/$(basename "$ultimo") =="
echo "Índice completo em contexto/INDICE.md. Se o pedido continuar um trabalho anterior, leia o CONTEXTO.md inteiro e a pasta arquivos/ antes de refazer qualquer coisa."
echo
sed -n '1,120p' "$ultimo/CONTEXTO.md" 2>/dev/null
exit 0
