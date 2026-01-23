# Purple Stock - Next.js

Sistema de gerenciamento de inventário construído com Next.js, Tailwind CSS, shadcn/ui, SQLite e Drizzle ORM.

## Tecnologias

- **Next.js 14** - Framework React
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes UI
- **SQLite** - Banco de dados
- **Drizzle ORM** - ORM para TypeScript
- **TypeScript** - Tipagem estática

## Configuração

1. Instale as dependências:
```bash
npm install
```

2. Execute as migrações do banco de dados:
```bash
npm run db:migrate
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O aplicativo estará disponível em [http://localhost:3000](http://localhost:3000)

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm run start` - Inicia o servidor de produção
- `npm run db:migrate` - Executa migrações do banco de dados
- `npm run db:seed` - Popula o banco com dados iniciais (se disponível)

## Estrutura do Projeto

```
next/
├── src/
│   ├── app/         # App Router do Next.js
│   ├── components/  # Componentes React
│   │   └── ui/      # Componentes shadcn/ui
│   ├── db/          # Configuração do banco de dados
│   │   ├── migrations/  # Migrações SQL
│   │   ├── client.ts    # Cliente Drizzle
│   │   └── schema.ts    # Schema do banco
│   └── lib/         # Utilitários
└── public/          # Arquivos estáticos
```
