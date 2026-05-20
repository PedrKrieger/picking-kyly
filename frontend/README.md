# Frontend - Sistema de Picking

Frontend em React com Vite para o sistema de picking por coletor de codigo de barras.

O projeto consome o backend Express em:

```text
http://localhost:3001
```

## Tecnologias

- React
- Vite
- React Router DOM
- Axios
- CSS puro

## Como instalar

Dentro da pasta `frontend`, execute:

```bash
npm install
```

## Configurar ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```env
VITE_API_URL=http://localhost:3001
```

## Como rodar

```bash
npm run dev
```

Por padrao, o Vite abre em:

```text
http://localhost:5173
```

## Rotas do frontend

```text
/coletor
/admin
/admin/caixas
/admin/estoque
/admin/ocorrencias
```

## Fluxo do coletor

1. `/coletor` abre no login quando nao existe usuario salvo.
2. O operador informa codigo do supervisor e codigo do usuario.
3. A tela de papeleta busca a caixa pelo codigo.
4. Ao iniciar a coleta, o sistema salva o `coletaId`.
5. A tela de coleta mostra endereco, produto, cor, tamanho e quantidades.
6. O operador pode bipar peca, pular item, finalizar caixa, salvar parcial ou abrir nova caixa.

Os dados simples de sessao ficam no `localStorage`:

```text
pickingSupervisor
pickingUsuario
pickingCaixa
pickingColetaId
```

## Rotas consumidas do backend

```text
POST /api/auth/login-coletor
GET /api/caixas/papeleta/:codigo
POST /api/coletas/iniciar
GET /api/coletas/:coletaId/proximo-item
POST /api/coletas/bipar-peca
POST /api/coletas/pular-item
POST /api/coletas/finalizar
POST /api/coletas/salvar-parcial
GET /api/admin/dashboard
GET /api/admin/caixas
GET /api/admin/estoque
GET /api/admin/estoque/produto/:produtoId/pecas
GET /api/admin/estoque/peca/:codigo
GET /api/admin/ocorrencias
```

## Observacoes

- Nao cria backend.
- Nao cria banco.
- Nao usa JWT.
- Nao usa TypeScript.
- Nao usa Tailwind.
- O codigo foi organizado de forma simples para apresentacao em trabalho de faculdade.
