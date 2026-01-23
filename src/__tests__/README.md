# Testes

Este diretório contém os testes do projeto usando Jest.

## Configuração

Os testes estão configurados para usar:
- **Jest** como framework de testes
- **SQLite em memória** para o banco de dados de teste
- **Next.js** com suporte a API routes

## Executando os Testes

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch

# Executar testes com cobertura
npm run test:coverage
```

## Estrutura

- `__tests__/api/` - Testes das API routes
- `__tests__/helpers/` - Helpers e utilitários para testes

## Banco de Dados de Teste

O banco de dados de teste usa SQLite em memória (`:memory:`), o que significa:
- Cada execução de teste começa com um banco limpo
- As migrações são executadas automaticamente
- Os dados são limpos entre testes usando `beforeEach`

## Exemplo de Teste

```typescript
import { POST } from "@/app/api/auth/signup/route";
import { NextRequest } from "next/server";

describe("/api/auth/signup", () => {
  it("should create a new user successfully", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "test@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.user.email).toBe("test@example.com");
  });
});
```
