# repository_x

Site auto-hospedado para enviar arquivos **HTML**, gerar um **link único** e exigir uma **senha de acesso** antes da visualização ou download.

## O que ele entrega

- Upload exclusivo de `.html` e `.htm` com limite configurável.
- Link privado no formato `https://seu-dominio/s/identificador`.
- Senha definida pelo uploader ou gerada automaticamente pelo sistema.
- Senhas guardadas com **hash scrypt**; o banco não armazena a senha visível.
- Tela de senha, limitação simples de tentativas (5 falhas bloqueiam o navegador por 5 minutos) e sessão de acesso temporária.
- Visualizador em `iframe sandbox`: o HTML enviado não recebe os cookies do `repository_x`.
- Download disponível somente depois da senha correta.
- Banco SQLite e uploads persistidos no diretório `data/`.

> O projeto aceita apenas um arquivo HTML por link. Arquivos referenciados localmente (imagens, CSS ou JavaScript em pastas separadas) não acompanham o upload. Para um HTML que precisa de recursos externos, use URLs HTTPS no próprio arquivo ou incorpore-os no documento.

## Como rodar com Docker

1. Copie o arquivo de variáveis:

```bash
cp .env.example .env
```

2. Edite `.env` e troque `ADMIN_UPLOAD_PASSWORD` por uma senha forte e exclusiva.

3. Suba o serviço:

```bash
docker compose up -d --build
```

4. Abra `http://localhost:8080`.

Para testar, envie qualquer arquivo `.html` próprio na página inicial, preencha a senha administrativa e deixe a senha de acesso vazia. O site mostrará o link e uma senha aleatória após criar o compartilhamento.

## Publicação em domínio público

Para o link funcionar fora da sua rede, o app precisa ficar em uma hospedagem que execute Docker/Python — por exemplo, VPS, Render, Railway, Fly.io ou um servidor com Caddy/Nginx.

Quando publicar:

1. Aponte um domínio/subdomínio para o servidor, por exemplo `arquivos.seudominio.com`.
2. Coloque um proxy reverso com HTTPS na frente do container.
3. Configure no `.env`:

```env
PUBLIC_BASE_URL=https://arquivos.seudominio.com
COOKIE_SECURE=true
```

4. Reinicie o container:

```bash
docker compose up -d --build
```

O `PUBLIC_BASE_URL` garante que os links gerados usem o domínio público, mesmo que o container esteja atrás do proxy.

## Executar sem Docker

O projeto usa somente a biblioteca padrão do Python 3.11+:

```bash
export ADMIN_UPLOAD_PASSWORD='uma-senha-administrativa-forte'
python3 app.py
```

No Windows PowerShell:

```powershell
$env:ADMIN_UPLOAD_PASSWORD='uma-senha-administrativa-forte'
python app.py
```

## Estrutura de dados

```text
repository_x/
├── app.py                 # aplicação web completa
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── data/
│   ├── repository_x.sqlite3  # criado na primeira execução
│   └── uploads/              # HTMLs enviados
```

## Segurança e limites

- Não use este projeto como proteção para documentos altamente sigilosos sem controles adicionais, auditoria, backups e HTTPS.
- O visualizador permite scripts do próprio HTML para que páginas interativas funcionem, mas isola o documento em sandbox e bloqueia `fetch`/conexões de rede via `connect-src 'none'`.
- O upload é protegido por `ADMIN_UPLOAD_PASSWORD`; mantenha esta senha fora de mensagens e repositórios públicos.
- Faça backup periódico de `data/repository_x.sqlite3` e da pasta `data/uploads/`.
- O app não depende de GitHub Pages. GitHub Pages é estático e não consegue validar senhas nem impedir acesso direto aos arquivos de forma segura.
