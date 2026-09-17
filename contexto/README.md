# contexto/

Snapshots do trabalho de cada sessão do Claude Code, para nada se perder quando o
contêiner fecha. Gerados pela skill `salvar-contexto` (`.claude/skills/salvar-contexto`).

- `INDICE.md` — lista as pastas, a mais recente primeiro.
- `<data>_<slug>/CONTEXTO.md` — a narrativa: pedidos, estado, decisões, números, erros, pendências, como retomar.
- `<data>_<slug>/RESUMO.md` — por pasta, e a lista do que não foi copiado.
- `<data>_<slug>/ARQUIVOS.md` e `inventario.json` — tudo que existia no scratchpad, copiado ou não.
- `<data>_<slug>/arquivos/` — cópias dos arquivos até 10 MB (limite de 120 MB por snapshot).

Pastas `auto-stop` e `auto-compactacao` são snapshots automáticos dos hooks; a narrativa
completa está na pasta com slug manual do mesmo dia. Uma cópia do CONTEXTO.md de cada
sessão também vai para o Google Drive, pasta "Claude Code - Contextos".
