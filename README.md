# Grudado Tasks

App interno de gestão de demandas dos times da Grudado em Você. Organização única
(~15 pessoas, times de 2 a 4), estrutura de times dentro da empresa.

FastAPI + React, banco Postgres, deploy em VPS com Docker Compose.

---

## Estado atual

Fase 0 (fundação) concluída. Times e tarefas entram nas fases seguintes.

| Fase | Escopo | Situação |
| --- | --- | --- |
| 0 | Fundação: domínio, auth, contrato de tipos, CI, deploy | ✅ pronta |
| 1 | Feature 1 — criação de times, membros e RBAC | pendente |
| 2 | Feature 2 — tarefas, board kanban, lista, tempo real | pendente |
| 3 | Google SSO em produção e deploy no VPS | pendente |
| 4 | Feature 3 — workflows que distribuem subtarefas | futuro |

## Rodando localmente

```bash
cp backend/.env.example backend/.env
docker compose up
```

- Interface: <http://localhost:5173>
- API e documentação: <http://localhost:8000/docs>

O `AUTH_PROVIDER=dev` do Compose entra sem credencial do Google: a tela de login
leva a um seletor onde se escolhe qualquer e-mail. **O primeiro usuário a entrar
vira admin da organização** — é o que resolve o problema do ovo e da galinha, já
que sem admin ninguém poderia criar o primeiro time.

Trocar de usuário nessa tela é a forma mais rápida de conferir regra de permissão.

### Sem Docker

```bash
cd backend && python -m venv .venv && .venv/Scripts/pip install -e ".[dev]"
.venv/Scripts/alembic upgrade head          # exige um Postgres acessível
.venv/Scripts/uvicorn app.main:app --reload

cd frontend && npm install && npm run dev
```

## Verificação

```bash
# Backend
cd backend
.venv/Scripts/ruff check . && .venv/Scripts/mypy app tests && .venv/Scripts/pytest -q

# Frontend
cd frontend
npm run lint && npm run typecheck && npm test && npm run build
```

Os testes de domínio não tocam banco nem rede — rodam em centésimos de segundo,
que é justamente o retorno de manter as regras isoladas.

---

## Decisões de arquitetura

### Domínio isolado de framework

`backend/app/domain/` não importa FastAPI nem SQLAlchemy. São funções de entrada
para saída, e é onde vivem as duas regras que mais importam:

- **Prazo no primeiro engajamento** (`task_rules.py`) — a tarefa pode nascer sem
  prazo, mas ao sair de `a_fazer` o prazo passa a ser obrigatório. Não existe
  estado de aceite: a tarefa nasce ativa, e este é o único momento em que dá para
  cobrar o prazo de quem assumiu.
- **Permissões** (`permissions.py`) — recebem um retrato do usuário
  (`ContextoDeAcesso`) e respondem sim ou não, o que permite cobrir a matriz
  inteira com testes de tabela.

A tradução de erro de negócio para status HTTP acontece num lugar só:
os exception handlers em `app/main.py`.

### Tarefa de time tem progresso único compartilhado

Tarefa sem responsável designado pertence ao time inteiro, com **um status só**
que qualquer membro altera. Não há progresso por pessoa.

O custo dessa escolha — não saber quem fez o quê — é pago pelo **log de
atividade**, não por estado no schema.

### Hierarquia de tarefas já no modelo

A feature 3 (workflows que distribuem subtarefas) é a última da fila, mas
`tasks.parent_id` entra desde o início. Modelar isso depois significaria migração
de schema mais refactor de toda query, serializer e tela de tarefa. Antecipar
custa uma coluna.

### Tipos do frontend gerados do backend

O custo conhecido de separar backend Python e frontend TypeScript é tipo
duplicado que sai de sincronia. Aqui isso não acontece:

```
FastAPI → openapi.json → openapi-typescript → src/types/api.d.ts
```

O job `contrato` do CI regenera e falha se o resultado divergir do commitado.
Mudança de schema no Pydantic vira erro de build no frontend, não bug em produção.

Para atualizar depois de mexer na API:

```bash
python backend/scripts/export_openapi.py
cd frontend && npm run gen:api
```

### Autenticação atrás de uma interface

`IdentityProvider` tem duas implementações que passam pelo **mesmo fluxo de
redirecionamento**:

- `DevProvider` — entra como qualquer e-mail, sem verificar nada
- `GoogleOIDCProvider` — Authorization Code Flow com PKCE

Manter o dev com o formato do real é proposital: o caminho exercitado todo dia é
o mesmo que roda em produção, então o fluxo de login não estreia no deploy.

**`Settings` recusa o boot com `AUTH_PROVIDER=dev` e `ENVIRONMENT=prod`.** Um app
que não sobe é melhor que um app que sobe autenticando qualquer um.

#### A barreira de domínio

`valida_claims_do_id_token` é pura, e por isso a restrição de domínio é testável
sem rede e sem mock — ver `tests/domain/test_google_claims.py`.

O consent screen "Internal" do Google Cloud restringe quem consegue consentir,
mas é configuração de console: pode mudar, e o app não tem como saber. A
verificação da claim `hd` roda no servidor a cada login e não depende de nada
externo. É a única que não pode ser contornada.

### Tempo real: limitação assumida

O hub de WebSocket é in-memory, então **não faz broadcast entre múltiplos workers
uvicorn**. Por isso o Dockerfile fixa `--workers 1`.

Para ~15 pessoas, um worker sobra. O hub fica atrás de uma interface para que
Redis pub/sub entre sem tocar nos serviços, caso um dia precise escalar.

É escolha, não descuido — e subir para 2 workers quebraria a atualização ao vivo
do board.

### Preparado para multi-tenant, sem pagar por isso agora

Não há `organization_id` no schema. O acesso a dados passa por uma camada com
escopo, então introduzir multi-tenant no futuro é uma coluna e um filtro, não uma
reescrita.

---

## Segurança

- Sessão em cookie `HttpOnly`, `Secure` em produção, `SameSite=Lax`
- Estado do OAuth em cookie assinado e efêmero (10 min), sem estado no servidor
- `state` conferido com `secrets.compare_digest` contra CSRF no login
- Algoritmo de verificação do ID token fixado em `RS256` (evita confusão de algoritmo)
- Postgres sem porta publicada em produção — alcançável só pela rede interna do Compose
- Processo do backend roda como usuário não-root no container

### Advisory aberto e conhecido

`npm audit` acusa **GHSA-qwww-vcr4-c8h2** (react-router, severidade alta) em todas
as versões 7.12+ — não há correção publicada na linha 7.x, e não existe 8.x.

**Não se aplica a este app.** A falha é específica de *RSC mode* (React Server
Components); aqui o frontend é uma SPA Vite puro, sem RSC e sem server actions —
o caminho vulnerável não existe no bundle.

Voltar para a 7.11.0 significaria abrir mão de sete versões de correções para
silenciar um alerta inalcançável. Por isso o CI falha apenas em `critical`.
Reavaliar quando a 8.3+ sair.

---

## Estrutura

```
backend/app/
  domain/          regras puras — sem FastAPI, sem SQLAlchemy, sem I/O
  db/              models e sessão
  schemas/         contratos Pydantic da API
  services/        orquestração entre domínio e banco
  auth/            IdentityProvider, providers e sessão
  api/v1/          rotas HTTP e dependências
  realtime/        hub de WebSocket (fase 2)

frontend/src/
  app/             router, providers, layout
  features/        auth, teams, tasks — cada uma com api, hooks e componentes
  lib/             cliente HTTP e cliente WebSocket
  types/api.d.ts   gerado do OpenAPI — não editar à mão
```

## Deploy

```bash
cp deploy/.env.example deploy/.env    # preencher no VPS
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
```

Caddy termina o TLS (Let's Encrypt automático), serve o frontend estático e faz
proxy de `/api` e `/ws` para o backend — tudo no mesmo host, o que mantém o cookie
de sessão same-origin e dispensa CORS em produção.

A redirect URI cadastrada no Google Cloud Console precisa ser exatamente
`https://<DOMINIO>/api/v1/auth/callback`.
