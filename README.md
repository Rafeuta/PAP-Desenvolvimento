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


## Segunda fase — robustez e gestão de contactos

Na branch `feat/gestao-contactos-seguranca`:
- Validação de fotografias no cliente (JPG, PNG ou WebP, até 5 MB) antes do upload.
- Nomes de ficheiro gerados pela aplicação, sem reutilizar o nome original.
- Limpeza de uploads quando a gravação do registo falha.
- Mensagens de notificações apresentadas como texto, evitando interpretar mensagens externas como HTML.
- Melhor tratamento de erros ao alterar estados e remover objetos/contactos.
- Normalização de emails (espaços removidos e minúsculas) e prevenção de contactos duplicados na interface.
- Remoção do antigo `dashboard-contactos.js`, que não era carregado pelas páginas atuais e continha uma integração Web3Forms obsoleta.

**Nota de segurança:** a remoção de uma chave de um ficheiro não a invalida nem a apaga do histórico Git. Se a chave Web3Forms antiga ainda estiver ativa, deve ser revogada/rodada no serviço. A proteção real dos dados continua a depender das políticas RLS e das permissões do Storage no Supabase.


## Auditoria real Supabase/Vercel — 24-11-2026

A ligação às contas foi confirmada:
- Projeto Supabase `FindIt School` ativo e acessível.
- Projeto Vercel `finditschool` ligado ao repositório GitHub; a pré-visualização da branch ficou com estado `READY`.
- Tabelas encontradas: `objetos`, `contactos_email`, `reclamacoes` e `utilizadores`.
- Bucket `objetos` público para leitura; o limite de tamanho e os tipos MIME não estavam definidos no servidor.

### Problemas encontrados na auditoria
- A tabela `utilizadores` tinha uma política de leitura pública.
- `contactos_email` tinha políticas permissivas que permitiam a qualquer utilizador autenticado gerir contactos, além da política limitada a staff.
- `objetos` tinha políticas de escrita demasiado permissivas para utilizadores autenticados.
- O bucket não tinha limite de tamanho nem lista de tipos MIME.
- A proteção contra palavras-passe comprometidas estava desativada no Supabase Auth.
- Existia uma conta em Supabase Auth, mas ainda não existia qualquer perfil em `public.utilizadores`.

### Antes de ativar a proteção RLS
1. No Supabase, abre Authentication → Users e identifica a conta que deve ser administradora.
2. Copia o respetivo UID e cria o perfil em `public.utilizadores`, atribuindo `admin` apenas à pessoa responsável e `funcionario` aos restantes funcionários. Exemplo para executar no SQL Editor, substituindo o UID:
   `INSERT INTO public.utilizadores (id, email, cargo) SELECT id, email, 'admin' FROM auth.users WHERE id = 'UID_DA_CONTA' ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, cargo = EXCLUDED.cargo;`
3. Revê e aplica manualmente `supabase/security/rls-hardening-review.sql` no SQL Editor.
4. Testa login, catálogo público, criação/edição/remoção de objetos, contactos, reclamações e upload de fotografias com uma conta admin e uma conta funcionário.

O script SQL está apenas preparado no repositório: **não foi aplicado à base de dados de produção**. Esta separação evita bloquear o acesso enquanto não existir um perfil administrativo válido. A proteção contra palavras-passe comprometidas deve ser ativada nas definições de Authentication do Supabase.


## Terceira fase — convites temporários e estabilidade do dashboard

Na branch `feat/convites-funcionarios-dashboard-fix` foram preparadas as seguintes alterações:
- O scroll dos painéis passa a ser controlado por um único contentor com altura limitada ao viewport, evitando o crescimento/overflow anómalo da página.
- A área de administração apresenta uma ferramenta para gerar códigos de convite de funcionário.
- Os convites têm 16 caracteres hexadecimais, são guardados na base de dados apenas como hash SHA-256, expiram ao fim de 3 minutos e só podem ser consumidos uma vez.
- A geração é validada no servidor: apenas um perfil com cargo `admin` pode gerar convites.
- O registo de funcionário envia o hash do convite para o Supabase Auth. Um trigger valida e consome atomicamente o convite e cria o perfil com cargo `funcionario`. Sem convite válido não é atribuído qualquer perfil de acesso.
- A tabela de convites fica num schema privado, sem permissões diretas para os clientes. A limpeza de registos expirados está configurada para execução periódica, se o serviço pg_cron estiver disponível.

### Email de autenticação — Brevo

O Brevo foi escolhido como servidor SMTP para os emails transacionais do Supabase Auth (por exemplo, confirmação de conta e recuperação de palavra-passe). O EmailJS continua reservado às notificações da aplicação. A conta Brevo consultada apresenta um remetente ativo, mas ainda não apresenta domínios autenticados; por isso, a entrega de emails para destinatários externos não deve ser considerada validada. É necessário autenticar um domínio e realizar um teste real de envio.

### Validação pendente desta fase

- Testar o scroll do dashboard em desktop e telemóvel, incluindo páginas longas.
- Testar a geração de convite apenas com uma conta admin.
- Confirmar registo com código válido, rejeição de código expirado e rejeição de reutilização.
- Confirmar que um utilizador sem perfil não acede ao dashboard.
- Confirmar no Supabase se a limpeza automática pg_cron ficou agendada.
- Testar confirmação de email e recuperação de palavra-passe através do SMTP Brevo.
- Rever os avisos de segurança e executar testes de aceitação antes de integrar a branch na produção.

As alterações foram organizadas numa branch de pré-visualização. A existência de commits ou de um deployment de preview não substitui os testes funcionais em browser nem confirma por si só a publicação em produção.


## Estado atualizado — 25-11-2026

### Modo de demonstração de autenticação

Para uma demonstração escolar sem serviço SMTP autenticado, o projeto pode funcionar com a confirmação de email desativada no Supabase:

1. Abrir **Authentication → Sign In / Providers → Email** no dashboard do projeto.
2. Desativar apenas **Confirm email** e guardar.
3. Manter o fornecedor **Email** ativo.

Esta alteração é uma configuração manual do projeto Supabase e não é aplicada por este repositório. Enquanto estiver desligada, o registo não comprova que a pessoa controla o endereço de email. É uma configuração temporária de demonstração, não adequada para uma implementação real na escola. Antes de produção, voltar a ativar a confirmação e configurar SMTP com um domínio autenticado.

O fluxo de convites de funcionários continua separado: o código é gerado pelo servidor, tem validade de 3 minutos e só pode ser utilizado uma vez. A confirmação de email do Supabase não substitui a validação do convite.

### Estado verificado do Supabase

Em 25-11-2026, o projeto FindIt School encontrava-se ativo. Estavam registadas quatro migrations relacionadas com convites de funcionários:

- `staff_registration_invite_codes`
- `staff_invite_trigger_and_expiry_cleanup`
- `increase_staff_invite_entropy`
- `index_staff_invite_foreign_keys`

A auditoria de segurança mais recente assinalou:
- Proteção contra palavras-passe comprometidas desativada.
- A função `public.generate_staff_registration_code()` é `SECURITY DEFINER` e executável por utilizadores autenticados; a função valida internamente se o utilizador tem cargo `admin`, mas o aviso do advisor deve ser revisto.
- A tabela privada `private.staff_registration_codes` tem RLS ativo e não tem políticas. O acesso direto está revogado; confirmar que esta opção corresponde ao desenho pretendido.

A auditoria de desempenho assinalou quatro índices ainda sem utilização observada. Não os remover sem avaliar primeiro o volume e os padrões reais de consulta.

**Importante:** o script `supabase/security/rls-hardening-review.sql` continua a ser uma proposta de revisão/aplicação manual e não deve ser considerado aplicado. Antes de o aplicar, rever as políticas de leitura do catálogo e testar as permissões com contas de aluno, funcionário e administrador. Não assumir que a auditoria de segurança está concluída.

### Estado de publicação e testes

A branch `feat/auth-demo-sem-confirmacao` tem uma pré-visualização Vercel com estado `READY`. Isto confirma que a compilação/publicação da pré-visualização terminou, mas não substitui testes funcionais no browser. A branch ainda não deve ser tratada como produção nem como integrada na branch principal.

Testes funcionais ainda necessários:
- Registo e início de sessão com confirmação de email desligada.
- Recuperação de palavra-passe e entrega real de emails.
- Geração de convite apenas por administrador.
- Utilização de convite válido, expirado e já utilizado.
- Acesso negado ao dashboard para contas sem perfil autorizado.
- Upload e leitura de fotografias com as permissões previstas.
- Verificação das políticas RLS e do bucket Storage.

O Brevo não deve ser descrito como SMTP validado: a conta ainda necessita de domínio autenticado e de um teste real de entrega. O EmailJS mantém-se destinado às notificações da aplicação.
