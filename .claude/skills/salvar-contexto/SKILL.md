---
name: salvar-contexto
description: Guardar o contexto da sessão (narrativa, decisões, números, scripts e arquivos do scratchpad) no repositório e no Google Drive antes que o contêiner da sessão feche, e retomar esse contexto numa sessão nova. Use quando o usuário pedir para salvar, guardar, registrar ou não perder o contexto, o progresso, o histórico ou os arquivos da conversa ("salva o contexto", "guarda isso no drive", "não quero perder nada", "vamos fechar por hoje"), quando a sessão estiver longa e perto de compactar, e sempre antes de encerrar um trabalho grande. Também para retomar ("retoma o contexto", "onde paramos", "continua de onde parou").
---

# Salvar contexto antes que o contêiner feche

O contêiner da sessão é descartável: o scratchpad (`/tmp/claude-0/.../scratchpad`) some
quando a sessão fecha ou fica inativa. O que sobrevive é o que foi **empurrado para o
git** e o que foi **subido ao Drive pelo conector**. Esta skill faz os dois, e um hook
faz um snapshot automático (só git) antes de cada compactação e a cada 20 minutos de
trabalho.

## Onde cada coisa vai e por quê

| o quê | destino | motivo |
|---|---|---|
| CONTEXTO.md (narrativa) e inventário | git **e** Drive | é o que uma sessão nova precisa ler primeiro; no Drive o usuário lê pelo celular |
| scripts, JSONs, planilhas e entregas até 10 MB | git (`contexto/<data>_<slug>/arquivos/`) | volume; o git deduplica conteúdo repetido |
| zips, bases brutas acima de 10 MB | só ficam **listados** no inventário | não cabem; o usuário sabe que existiram e reenvia |

O conector do Drive transporta o conteúdo pelo contexto do modelo. Subir binário grande
por ele custa tokens e falha. **Nunca suba xlsx/pptx/zip pelo conector**; suba texto.

## Procedimento — `/salvar-contexto [slug]`

1. **Escreva a narrativa** em `<scratchpad>/CONTEXTO.md` seguindo `references/modelo-contexto.md`.
   Escreva para alguém que não viu a conversa: o que foi pedido, o que está pronto, cada
   decisão com o porquê, os números que já foram verificados (com a fonte), o que ficou
   pendente e o primeiro comando de quem retomar. Erros corrigidos ao longo da sessão
   entram também — evitam repetir o mesmo tropeço.
2. **Rode o snapshot** (copia, inventaria, faz commit e push na branch atual):
   ```bash
   python3 "$CLAUDE_PROJECT_DIR"/.claude/skills/salvar-contexto/scripts/snapshot.py \
     --slug <slug> --contexto <scratchpad>/CONTEXTO.md
   ```
   Se houver pastas grandes que não valem a pena, liste-as em `<scratchpad>/.contextoignore`
   (um padrão por linha) antes de rodar.
3. **Suba ao Drive** com o conector (`mcp__Google_Drive__create_file`):
   - localize a pasta com `search_files`: `title = 'Claude Code - Contextos' and mimeType = 'application/vnd.google-apps.folder'`; se não existir, crie;
   - dentro dela, uma subpasta por repositório (ex.: `repositorio_x`); crie se faltar;
   - suba `CONTEXTO.md` com `contentMimeType: text/markdown`, `disableConversionToGoogleType: true`,
     título `<data>_<slug>_CONTEXTO.md`; suba também `RESUMO.md` do snapshot (curto; o `ARQUIVOS.md` completo fica só no git);
   - se o usuário quiser ler no Google Docs, suba uma segunda cópia com `text/plain` sem desabilitar a conversão.
4. **Verifique**: `search_files` pelo título e `read_file_content`/tamanho retornado; confira
   que o `git log -1` mostra o commit e que `git status` está limpo.
5. **Responda** com: link da pasta no Drive, caminho `contexto/<data>_<slug>/` no repositório,
   quantos arquivos foram copiados e quais ficaram de fora (e por quê).

## Retomar — `/salvar-contexto retomar` ou "onde paramos"

1. `cat contexto/INDICE.md` e leia o `CONTEXTO.md` mais recente inteiro (o hook de início
   de sessão já mostra os primeiros 120 linhas).
2. Se o repositório não estiver na sessão, procure no Drive:
   `title contains 'CONTEXTO' and modifiedTime > '<30 dias atrás>'`, leia o mais recente.
3. Os arquivos estão em `contexto/<pasta>/arquivos/`. Antes de refazer qualquer análise,
   confira em `ARQUIVOS.md` se ela já existe.
4. Bases brutas não copiadas aparecem no inventário com "não — maior que 10 MB": peça ao
   usuário que reenvie só essas.

## Hooks (já configurados em `.claude/settings.json`)

- `SessionStart` → `retomar.sh` mostra o último contexto.
- `PreCompact` → `snapshot.py --auto --motivo compactacao` (antes de perder contexto).
- `Stop` → `snapshot.py --auto --motivo stop`, no máximo a cada 20 min; só faz commit se
  algo mudou. Nunca bloqueia a sessão: qualquer erro sai em silêncio.

Os snapshots automáticos vão sempre para `contexto/_auto/` (uma pasta só, sobrescrita a
cada vez; as versões anteriores ficam no histórico do git). Ela tem um CONTEXTO.md
provisório: a narrativa de verdade está na pasta datada do último `/salvar-contexto`, e
os arquivos em `_auto/arquivos/` são os mais novos.

## Armadilhas já vistas

- O shell **não** tem credencial do Drive: só o conector (tool `mcp__Google_Drive__*`) sobe arquivo.
  Por isso o hook faz git e a parte do Drive é manual.
- `text/plain` sem `disableConversionToGoogleType` vira Google Docs (bom para ler, ruim para
  baixar como .md). Use `text/markdown` + `disableConversionToGoogleType: true` para manter o arquivo.
- O hook de Stop do ambiente remoto reclama de arquivos não commitados; o snapshot já
  commita e faz push, então rode-o **antes** de terminar a resposta.
- Um `CONTEXTO.md` que só diz "trabalhamos nas SS" não serve. Números verificados, com a
  fonte, e a lista de erros corrigidos são o que economiza horas na retomada.

## Relação com a skill `orquestra`

Quando o trabalho foi dividido entre agentes, o plano (`<scratchpad>/orquestra/plano.md`) e
os JSONs de cada agente entram no snapshot como qualquer outro arquivo. Cite no CONTEXTO.md
quais agentes rodaram e o que cada um concluiu: sem isso, a sessão seguinte não sabe que
aquele JSON é resultado conferido e refaz o leque inteiro.
