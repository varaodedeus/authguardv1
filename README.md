# AuthGuard Sistema

Sistema de gerenciamento de licenças e keys para scripts.

## Setup

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Configure as variáveis de ambiente no `.env.local`
4. Deploy na Vercel

## Variáveis de Ambiente

- `MONGODB_URI` - String de conexão do MongoDB
- `JWT_SECRET` - Secret para JWT tokens

## Estrutura

- `/api` - Endpoints da API
- `/lib` - Utilitários e helpers
- `/public` - Arquivos estáticos (HTML, CSS)
