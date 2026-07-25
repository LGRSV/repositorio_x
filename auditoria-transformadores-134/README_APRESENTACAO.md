# Transforma — apresentação da Base 134

Protótipo funcional para demonstração ao supervisor. Contém os 134 casos,
Análise de SS, Análise por OS, New Base, dashboards, mapa municipal,
histórico local e solicitação de expurgo com justificativa obrigatória.

## Como abrir

É necessário ter Node.js 22 ou superior instalado.

- macOS: execute `iniciar_mac.command`.
- Windows: execute `iniciar_windows.bat`.
- Manualmente: rode `npm install`, depois `npm run dev`, e abra
  `http://localhost:3000`.

## Credenciais de demonstração

| Usuário | Senha | Papel |
|---|---|---|
| `matheus.alves` | `Supervisor@134` | Supervisor |
| `joao.antonio` | `Dev@134` | Desenvolvedor |
| `mateus.gracia` | `Engenharia@134` | Engenheiro |
| `andressa` | `Analise@134` | Analista |
| `ronnald` | `Tecnico@134` | Técnico terceiro |
| `gustavo` | `Tecnico@134` | Técnico terceiro |

Todos os perfis podem analisar, comentar e solicitar expurgo. Somente
Mateus Gracia visualiza as ações de aprovação e rejeição oficial.

## Limites desta apresentação

- Login e histórico são locais e demonstrativos.
- As coordenadas representam o centro do município, não o ponto exato do ativo.
- A versão definitiva precisará de autenticação segura, banco de dados e
  latitude/longitude dos transformadores.
