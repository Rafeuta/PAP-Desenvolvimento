# PAP-Desenvolvimento
Plataforma web para gestão e recuperação de objetos perdidos e achados numa instituição de ensino. Desenvolvido em HTML, CSS e JavaScript.

# FindIt School – Sistema de Gestão e Recuperação de Objetos Perdidos e Achados

Este projeto simula o desenvolvimento de uma aplicação web para gestão de objetos perdidos numa escola, utilizando GitHub para controlo de versão e colaboração.

## Tecnologias Utilizadas
- Frontend: HTML, CSS, JavaScript
- Base de Dados: SUPABASE(PostgreSQL)
- Alojamento (Hosting): Vercel.
- Controlo de Versões: Git e GitHub.


## Funcionalidades Principais
- **Área Pública / Aluno:** Consulta de catálogo visual, pesquisa com filtros, submissão de pedidos de posse e registo de avisos ("Procura-se").
- **Área de Administração (Funcionários / Secretaria):** Registo de novos itens, gestão do catálogo, análise de pedidos e atualização do estado dos objetos para "Devolvido".

## Objetivo
Reduzir o desperdício e aumentar a taxa de recuperação de pertences, modernizando os processos administrativos da escola.

## Evolução do painel administrativo

A branch `feat/dashboard-profissional` reúne a primeira fase da modernização do painel:
- Indicadores de objetos registados, por devolver, devolvidos e contactos.
- Pesquisa dinâmica nas tabelas de objetos e contactos.
- Filtro de objetos por estado.
- Melhorias responsivas e de acessibilidade nos controlos e modais.
- Proteção inicial contra injeção de HTML ao apresentar dados provenientes da base de dados.
- Envio EmailJS com bloqueio de cliques repetidos e contagem de falhas parciais.

### Configuração e segurança

- A chave Supabase utilizada no browser deve ser exclusivamente a chave publicável (anon/publishable), com políticas RLS corretamente configuradas.
- Nunca colocar a `service_role` key do Supabase no frontend.
- A chave pública do EmailJS é própria para utilização no cliente; limitar os domínios autorizados e configurar limites/anti-abuso no serviço.
- O modo de teste do envio de emails permanece ativo por defeito. Antes de qualquer envio real, validar o template EmailJS, a autorização dos destinatários e os requisitos de privacidade.
- Rever e rodar a chave Web3Forms antiga se ainda estiver ativa, porque estava incluída num ficheiro JavaScript público.
- Confirmar no Supabase as políticas RLS de `objetos`, `contactos_email` e do bucket de armazenamento `objetos`.

### Verificações antes da publicação

1. Testar autenticação, logout e redirecionamento de sessão.
2. Criar, editar, listar, alterar estado e eliminar objetos.
3. Carregar imagens e validar permissões do bucket.
4. Criar, pesquisar e remover contactos.
5. Testar a seleção individual e total de destinatários.
6. Testar envio em modo de teste e confirmar falhas parciais.
7. Verificar os fluxos em ecrãs móveis e desktop.
8. Rever políticas RLS e permissões antes de ativar envios reais.
