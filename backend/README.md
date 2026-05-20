# Backend - Sistema de Picking por Coletor

Backend didatico em Node.js com Express para um sistema de picking por coletor de codigo de barras.

O operador informa o codigo do supervisor e do usuario, abre uma caixa pela papeleta, inicia a coleta, bipa as pecas uma por uma e pode finalizar ou salvar a caixa como parcial.

## Tecnologias

- Node.js
- Express
- PostgreSQL/Supabase
- pg
- cors
- dotenv

## Estrutura

```text
backend/
  src/
    config/
      database.js
    controllers/
      authController.js
      caixaController.js
      coletaController.js
      adminController.js
    routes/
      authRoutes.js
      caixaRoutes.js
      coletaRoutes.js
      adminRoutes.js
    services/
      coletaService.js
    app.js
    server.js
  .env.example
  package.json
  README.md
```

## Como rodar

1. Instale as dependencias:

```bash
npm install
```

2. Crie o arquivo `.env` baseado no `.env.example`:

```env
PORT=3001
DATABASE_URL=postgresql://usuario:senha@host:5432/postgres
```

3. Inicie o servidor:

```bash
npm start
```

Para desenvolvimento com reinicio automatico:

```bash
npm run dev
```

A API ficara disponivel em:

```text
http://localhost:3001
```

## Rotas

### Autenticacao do coletor

`POST /api/auth/login-coletor`

```json
{
  "codigoSupervisor": "SUP001",
  "codigoUsuario": "USR001"
}
```

Retorna o supervisor e o usuario ativos encontrados pelos codigos de barras.

### Buscar caixa por papeleta

`GET /api/caixas/papeleta/:codigo`

Retorna os dados da caixa e os itens ordenados por `ordem_coleta`, com produto e endereco de picking.

### Iniciar coleta

`POST /api/coletas/iniciar`

```json
{
  "caixaId": 1,
  "usuarioId": 1,
  "supervisorId": 1
}
```

Cria uma coleta `ABERTA` e atualiza a caixa para `EM_COLETA`. Se ja existir coleta aberta para a caixa, retorna a existente.

### Proximo item

`GET /api/coletas/:coletaId/proximo-item`

Retorna o proximo item ainda nao totalmente coletado, considerando status `PENDENTE`, `EM_COLETA` ou `PARCIAL`.

### Bipar peca

`POST /api/coletas/bipar-peca`

```json
{
  "coletaId": 1,
  "codigoPeca": "PEC1000079001"
}
```

Valida se a peca existe, se esta `DISPONIVEL`, se pertence ao SKU do proximo item e se ainda existe quantidade pendente. Em caso de sucesso, atualiza a quantidade coletada, marca a peca como `COLETADA` e registra a bipagem.

### Pular item

`POST /api/coletas/pular-item`

```json
{
  "coletaId": 1,
  "caixaItemId": 1,
  "motivo": "Falta de peca no endereco"
}
```

Marca o item como `PULADO`, cria uma ocorrencia `FALTA_ESTOQUE`, registra a acao em `coleta_itens` e retorna o proximo item.

### Finalizar coleta

`POST /api/coletas/finalizar`

```json
{
  "coletaId": 1
}
```

Se todos os itens estiverem `COLETADO`, atualiza coleta e caixa para `FINALIZADA`. Caso contrario, atualiza para `PARCIAL`.

### Salvar parcial

`POST /api/coletas/salvar-parcial`

```json
{
  "coletaId": 1,
  "observacao": "Coleta interrompida por falta de pecas"
}
```

Atualiza a coleta e a caixa para `PARCIAL`.

### Dashboard administrativo

`GET /api/admin/dashboard`

Retorna total de caixas por status, total de pecas coletadas e total de ocorrencias.

### Listar caixas

`GET /api/admin/caixas`

Lista caixas com status, pedido, cliente, quantidade de itens e percentual de progresso.

### Listar ocorrencias

`GET /api/admin/ocorrencias`

Lista ocorrencias com dados da caixa, produto e usuario.

### Controle de estoque

`GET /api/admin/estoque`

Lista o estoque disponivel agrupado por produto. Aceita filtro opcional `busca` e considera apenas pecas com status `DISPONIVEL`.

`GET /api/admin/estoque/produto/:produtoId/pecas`

Lista as pecas disponiveis de um produto. Aceita filtro opcional `busca`.

`GET /api/admin/estoque/peca/:codigo`

Consulta qualquer peca pelo codigo de barras unico ou secundario. Quando a peca foi coletada, tambem retorna dados da coleta, caixa, usuario e data da bipagem.

## Status usados

Caixas:

```text
AGUARDANDO, EM_COLETA, FINALIZADA, PARCIAL, CANCELADA
```

Itens da caixa:

```text
PENDENTE, EM_COLETA, COLETADO, PARCIAL, PULADO
```

Pecas:

```text
DISPONIVEL, COLETADA, DIVERGENTE, BLOQUEADA
```

Coletas:

```text
ABERTA, FINALIZADA, PARCIAL, INTERROMPIDA
```

Resultado da bipagem:

```text
SUCESSO, SKU_INVALIDO, PECA_SEM_SALDO, QUANTIDADE_EXCEDIDA, ITEM_PULADO
```

## Observacoes

- Nao usa ORM.
- Nao usa Prisma.
- Nao cria tabelas.
- Nao usa JWT neste momento.
- O login do coletor e feito apenas por codigo de barras.
- As operacoes principais de coleta usam transacao para manter os dados consistentes.
