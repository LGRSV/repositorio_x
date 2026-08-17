-- A CONFERÊNCIA DE JULHO SAI DO NAVEGADOR E GANHA CHÃO NO BANCO.
--
-- As marcas e anotações da aba "Conferir julho" viviam SÓ no localStorage
-- (julho-conferencia-casos / julho-conferencia-achados). Troca de aparelho,
-- limpeza do navegador, outro celular — e uma noite de conferência sumia.
-- Já aconteceu uma vez; consertar o sintoma não resolve a raiz.
--
-- O desenho copia o de trafo_expurgo, que é o padrão da casa:
--   · APPEND-ONLY: cada ação é uma linha nova. Não existe política de UPDATE
--     nem de DELETE de propósito — o estado é a última linha de cada chave e o
--     histórico é a tabela inteira. "Quem marcou o quê e quando" nunca se perde.
--   · Desmarcar também é linha: marca vazia e nota vazia é a lápide que avisa
--     os outros aparelhos que o registro foi retirado. Apagar a linha apagaria
--     a notícia da retirada.
--   · marcado_em é a hora da AÇÃO (vem do aparelho); registrado_em é a hora da
--     CHEGADA (vem do banco). A regra do +1h existe porque o fuso já enganou
--     esta base uma vez: gravação em UTC três horas no futuro era recusada em
--     silêncio e o site fingia que tinha salvo.
--
-- `tipo` separa as duas coisas que a aba guarda: a marca de um CASO (ss é o
-- número da solicitação) e o veredito de um ACHADO da releitura (ss é o id do
-- achado, A1..A4). Uma tabela só, porque é um fluxo só — o export e a fila de
-- reenvio do site tratam os dois juntos.

create table public.julho_conferencia (
  id bigint generated always as identity primary key,
  tipo text not null default 'caso' check (tipo in ('caso', 'achado')),
  ss text not null check (length(ss) >= 2 and length(ss) <= 40),
  -- casos: confere / nao_confere / duvida / '' (só anotação, ou lápide)
  -- achados: aceito / recusado / depois / '' (lápide)
  marca text not null default '' check (marca in
    ('', 'confere', 'nao_confere', 'duvida', 'aceito', 'recusado', 'depois')),
  nota text not null default '' check (length(nota) <= 4000),
  quem_id text not null,
  quem_nome text not null,
  marcado_em timestamptz not null,
  registrado_em timestamptz not null default now()
);

comment on table public.julho_conferencia is
  'Marcas e anotações da aba Conferir julho. Append-only como trafo_expurgo: '
  'o estado é a última linha por (tipo, ss), o histórico é a tabela inteira. '
  'Não altera o indicador — julho segue prévia até o martelo do dono.';

alter table public.julho_conferencia enable row level security;

create policy le_conferencia on public.julho_conferencia
  for select to anon, authenticated using (true);

-- Só INSERT. A ausência de política de UPDATE/DELETE é o que torna a tabela
-- append-only para a chave publicável do site.
create policy grava_conferencia on public.julho_conferencia
  for insert to anon, authenticated
  with check (
    marcado_em <= now() + interval '1 hour'
    and length(coalesce(quem_id, '')) between 2 and 40
    and length(coalesce(quem_nome, '')) between 2 and 60
  );

-- A view que o site lê: a linha mais recente de cada (tipo, ss).
-- Mesmo DISTINCT ON de trafo_expurgo_atual; o desempate por id cobre duas
-- linhas com o mesmo marcado_em (a mais tarde inserida vence).
create view public.julho_conferencia_atual as
  select distinct on (tipo, ss)
    tipo, ss, marca, nota, quem_id, quem_nome, marcado_em
  from public.julho_conferencia
  order by tipo, ss, marcado_em desc, id desc;
