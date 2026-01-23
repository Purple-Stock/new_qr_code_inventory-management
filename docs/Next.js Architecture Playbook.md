**Next.js Architecture Playbook**

**Executive Summary**

Playbook de arquitetura para Next.js 14+ focado em projetos escaláveis, manutenível e production-ready. Este documento estabelece padrões, convenções e melhores práticas para consistência técnica em seus projetos.

**Versão**: 2.0  
**Atualizado em**: Janeiro 2026  
**Stack**: Next.js 14+, App Router, TypeScript, Server Components

**1\. Estrutura de Diretórios**

**1.1 Estrutura Recomendada (Colocation Strategy)**

projeto-nextjs/  
├── src/  
│ ├── app/ # App Router + Routes  
│ │ ├── (auth)/ # Route group para auth  
│ │ │ ├── login/  
│ │ │ │ ├── page.tsx  
│ │ │ │ ├── \_components/  
│ │ │ │ └── \_utils/  
│ │ │ └── register/  
│ │ ├── (main)/ # Route group para main app  
│ │ │ ├── dashboard/  
│ │ │ │ ├── page.tsx  
│ │ │ │ ├── \_components/  
│ │ │ │ ├── \_hooks/  
│ │ │ │ └── \_services/  
│ │ │ └── projects/  
│ │ ├── api/ # API routes  
│ │ │ ├── auth/  
│ │ │ ├── projects/  
│ │ │ └── \_middleware/  
│ │ ├── layout.tsx # Root layout  
│ │ └── page.tsx # Homepage  
│ ├── components/ # Shared UI components  
│ │ ├── ui/ # Core UI (Button, Input, etc)  
│ │ │ ├── Button.tsx  
│ │ │ ├── Input.tsx  
│ │ │ └── Card.tsx  
│ │ └── features/ # Feature-specific components  
│ │ ├── Header/  
│ │ ├── Sidebar/  
│ │ └── Footer/  
│ ├── hooks/ # Custom React hooks  
│ │ ├── useAuth.ts  
│ │ ├── useForm.ts  
│ │ └── useFetch.ts  
│ ├── lib/ # Utilities e helpers  
│ │ ├── api.ts # API client  
│ │ ├── utils.ts # Helper functions  
│ │ ├── constants.ts # Constantes  
│ │ └── validators.ts # Validações  
│ ├── types/ # TypeScript types  
│ │ ├── index.ts  
│ │ ├── api.ts  
│ │ └── domain.ts  
│ ├── styles/ # Global styles  
│ │ ├── globals.css  
│ │ └── variables.css  
│ ├── middleware.ts # Next.js middleware  
│ ├── context/ # React Context  
│ │ └── AuthContext.tsx  
│ └── services/ # Serviços de domínio  
│ ├── auth.service.ts  
│ └── project.service.ts  
├── public/ # Assets estáticos  
│ └── images/  
├── .env.local # Variáveis de ambiente (local)  
├── .env.example # Template de env vars  
├── next.config.ts # Configuração Next.js  
├── tsconfig.json # TypeScript config  
├── package.json  
└── [README.md](http://README.md)

**1.2 Princípios de Organização**

**✅ DO:**

*   Colocar arquivos \_components, \_hooks, \_utils próximos ao seu contexto
*   Usar route groups (name) para agrupar rotas relacionadas
*   Prefixar com \_ para pastas privadas (não rotas)
*   Manter components shared em src/components
*   Separar UI pura em components/ui de componentes com lógica em components/features

**❌ DON'T:**

*   Colocar tudo em um components monolítico
*   Misturar rotas de diferentes domínios em mesmo nível
*   Criar muitos níveis de profundidade (máx 3-4)
*   Esquecer de namespacing em componentes (<Button /> vs <UIButton />)

**2\. Padrões de Desenvolvimento**

**2.1 Server Components vs Client Components**

**Server Components** (padrão):  
// app/dashboard/page.tsx - Server Component por padrão  
import { getUser } from '@/lib/api'

export default async function Dashboard() {  
const user = await getUser()

return

{[user.name](http://user.name)}

  
}

**Client Components** (quando necessário):  
// app/dashboard/\_components/UserCard.tsx  
'use client'

import { useState } from 'react'

export function UserCard({ user }) {  
const \[isOpen, setIsOpen\] = useState(false)

return (  
<div onClick={() => setIsOpen(!isOpen)}>  
{[user.name](http://user.name)}  
</div>  
)  
}

**Regra de Ouro**: Use Server Components por padrão. Use Client Components apenas para interatividade, hooks ou browser APIs.

**2.2 Server Actions**

// app/dashboard/\_actions/updateProject.ts  
'use server'

import { db } from '@/lib/db'  
import { revalidatePath } from 'next/cache'

export async function updateProject(id: string, data: ProjectData) {  
const project = await db.project.update({  
where: { id },  
data,  
})

revalidatePath('/dashboard/projects')  
return project  
}

**Uso em componente:**  
'use client'

import { updateProject } from './\_actions/updateProject'

export function ProjectForm({ project }) {  
const handleSubmit = async (formData: FormData) => {  
const id = formData.get('id')  
const result = await updateProject(id, {  
name: formData.get('name'),  
})  
}

return ...  
}

**2.3 Data Fetching Patterns**

**Padrão Recomendado com TanStack Query (Client-Side):**  
// app/dashboard/\_hooks/useProjects.ts  
'use client'

import { useQuery } from '@tanstack/react-query'  
import { api } from '@/lib/api'

export function useProjects() {  
return useQuery({  
queryKey: \['projects'\],  
queryFn: () => api.get('/projects'),  
})  
}

**Padrão com Server Components (Server-Side):**  
// app/dashboard/page.tsx  
import { getProjects } from '@/services/project.service'

export default async function Dashboard() {  
const projects = await getProjects()  
return  
}

**Cache Strategy:**  
// app/api/projects/route.ts  
export async function GET(request: Request) {  
const data = await fetchData()

return Response.json(data, {  
headers: {  
'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',  
},  
})  
}

**2.4 Tratamento de Erros**

**Error Boundary:**  
// app/dashboard/error.tsx  
'use client'

export default function ErrorBoundary({  
error,  
reset,  
}: {  
error: Error  
reset: () => void  
}) {  
return (  

**Algo deu errado!**

  
<button onClick={() => reset()}>Tentar novamente</button>

  
)  
}

**API Error Handling:**  
// app/api/projects/route.ts  
export async function GET() {  
try {  
const data = await fetchProjects()  
return Response.json(data)  
} catch (error) {  
console.error('Projects fetch error:', error)  
return Response.json(  
{ error: 'Failed to fetch projects' },  
{ status: 500 }  
)  
}  
}

**3\. TypeScript Configuration**

**3.1 Configuração TSConfig**

{  
"compilerOptions": {  
"target": "ES2020",  
"lib": \["ES2020", "DOM", "DOM.Iterable"\],  
"jsx": "preserve",  
"module": "ESNext",  
"moduleResolution": "bundler",  
"baseUrl": ".",  
"paths": {  
"@/*": \["./src/*"\]  
},  
"strict": true,  
"noImplicitAny": true,  
"strictNullChecks": true,  
"strictFunctionTypes": true,  
"esModuleInterop": true,  
"skipLibCheck": true,  
"forceConsistentCasingInFileNames": true  
},  
"include": \["next-env.d.ts", "**/\*.ts", "**/\*.tsx"\],  
"exclude": \["node\_modules"\]  
}

**3.2 Type Organization**

// src/types/index.ts  
export type User = {  
id: string  
name: string  
email: string  
role: 'admin' | 'user'  
}

export type Project = {  
id: string  
name: string  
ownerId: string  
status: 'active' | 'archived'  
}

// src/types/api.ts  
export type ApiResponse<T> = {  
data: T  
success: boolean  
error?: string  
}

export type PaginatedResponse<T> = ApiResponse<T\[\]> & {  
total: number  
page: number  
limit: number  
}

**4\. Gestão de Estado**

**4.1 React Context (Simples)**

// src/context/AuthContext.tsx  
'use client'

import { createContext, useContext, useState } from 'react'  
import type { User } from '@/types'

type AuthContextType = {  
user: User | null  
setUser: (user: User | null) => void  
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {  
const \[user, setUser\] = useState<User | null>(null)

return (  
<AuthContext.Provider value={{ user, setUser }}>  
{children}  
</AuthContext.Provider>  
)  
}

export function useAuth() {  
const context = useContext(AuthContext)  
if (!context) throw new Error('useAuth must be used within AuthProvider')  
return context  
}

**4.2 TanStack Query (Complexo)**

// app/layout.tsx  
'use client'

import { QueryClientProvider, QueryClient } from '@tanstack/react-query'  
import { ReactNode } from 'react'

const queryClient = new QueryClient({  
defaultOptions: {  
queries: {  
staleTime: 1000 \* 60 \* 5, // 5 minutos  
gcTime: 1000 \* 60 \* 10, // 10 minutos (antigo cacheTime)  
},  
},  
})

export function Providers({ children }: { children: ReactNode }) {  
return (  
  
{children}  
  
)  
}

**5\. Autenticação & Autorização**

**5.1 Middleware Pattern**

// src/middleware.ts  
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {  
const token = request.cookies.get('auth-token')

if (request.nextUrl.pathname.startsWith('/dashboard')) {  
if (!token) {  
return NextResponse.redirect(new URL('/login', request.url))  
}  
}

return NextResponse.next()  
}

export const config = {  
matcher: \['/((?!api|\_next/static|\_next/image|favicon.ico).\*)'\],  
}

**5.2 Protected Routes**

// app/(main)/dashboard/page.tsx  
import { getServerSession } from 'next-auth'  
import { redirect } from 'next/navigation'

export default async function Dashboard() {  
const session = await getServerSession()

if (!session) {  
redirect('/login')  
}

return

Dashboard protegido

  
}

**6\. Performance & Optimization**

**6.1 Image Optimization**

import Image from 'next/image'

export function Hero() {  
return (  
<Image  
src="/hero.jpg"  
alt="Hero"  
width={1200}  
height={400}  
priority // Para LCP images  
quality={75}  
sizes="(max-width: 768px) 100vw, 50vw"  
/>  
)  
}

**6.2 Dynamic Imports**

import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(  
() => import('./HeavyComponent'),  
{  
loading: () =>

Carregando...

,  
ssr: false, // Se não precisa SSR  
}  
)

export function Page() {  
return  
}

**6.3 Font Optimization**

// src/app/layout.tsx  
import { Inter, Roboto\_Mono } from 'next/font/google'

const inter = Inter({ subsets: \['latin'\] })  
const mono = Roboto\_Mono({ subsets: \['latin'\] })

export default function RootLayout({  
children,  
}: {  
children: React.ReactNode  
}) {  
return (  
{children}  
)  
}

**7\. API Routes Best Practices**

**7.1 RESTful API Structure**

// app/api/projects/route.ts  
import { NextRequest, NextResponse } from 'next/server'  
import { validateAuth } from '@/lib/auth'  
import { ProjectService } from '@/services/project.service'

export async function GET(request: NextRequest) {  
try {  
const auth = await validateAuth(request)  
if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const { searchParams } = new URL(request.url)  
const page = searchParams.get('page') || '1'  
  
const projects = await ProjectService.list({  
page: parseInt(page),  
userId: auth.userId,  
})  
  
return NextResponse.json(projects)  

} catch (error) {  
return NextResponse.json({ error: 'Internal error' }, { status: 500 })  
}  
}

export async function POST(request: NextRequest) {  
try {  
const auth = await validateAuth(request)  
if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const body = await request.json()  
const project = await ProjectService.create({  
...body,  
ownerId: auth.userId,  
})  
  
return NextResponse.json(project, { status: 201 })  

} catch (error) {  
return NextResponse.json({ error: 'Invalid request' }, { status: 400 })  
}  
}

**7.2 Route Handlers com Tipagem**

// app/api/projects/\[id\]/route.ts  
import { NextRequest, NextResponse } from 'next/server'

type RouteParams = {  
params: { id: string }  
}

export async function GET(request: NextRequest, { params }: RouteParams) {  
const project = await db.project.findUnique({  
where: { id: [params.id](http://params.id) },  
})

if (!project) {  
return NextResponse.json({ error: 'Not found' }, { status: 404 })  
}

return NextResponse.json(project)  
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {  
const body = await request.json()

const project = await db.project.update({  
where: { id: [params.id](http://params.id) },  
data: body,  
})

return NextResponse.json(project)  
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {  
await db.project.delete({  
where: { id: [params.id](http://params.id) },  
})

return NextResponse.json({ success: true })  
}

**8\. Variáveis de Ambiente**

**8.1 .env Structure**

**.env.example**

NEXT\_PUBLIC\_API\_URL=http://localhost:3000/api  
NEXT\_PUBLIC\_APP\_NAME=MyApp

DATABASE\_URL=postgresql://...  
DATABASE\_PASSWORD=secret

AUTH\_SECRET=your-secret-key  
AUTH\_URL=http://localhost:3000

**API Keys (nunca exponha em .env.example)**

STRIPE\_SECRET\_KEY=sk\_test\_...  
SENDGRID\_API\_KEY=SG...

**8.2 Type-Safe Env Vars**

// src/lib/env.ts  
const schema = {  
NEXT\_PUBLIC\_API\_URL: string,  
DATABASE\_URL: string,  
AUTH\_SECRET: string,  
}

function getEnv(key: keyof typeof schema): string {  
const value = process.env\[key\]  
if (!value) throw new Error(Missing env var: ${key})  
return value  
}

export const env = {  
API\_URL: getEnv('NEXT\_PUBLIC\_API\_URL'),  
DB\_URL: getEnv('DATABASE\_URL'),  
AUTH\_SECRET: getEnv('AUTH\_SECRET'),  
}

**9\. Testing Strategy**

**9.1 Setup Vitest**

// vitest.config.ts  
import { defineConfig } from 'vitest/config'  
import react from '@vitejs/plugin-react'  
import path from 'path'

export default defineConfig({  
plugins: \[react()\],  
test: {  
environment: 'jsdom',  
setupFiles: './src/test/setup.ts',  
},  
resolve: {  
alias: {  
'@': path.resolve(\_\_dirname, './src'),  
},  
},  
})

**9.2 Component Testing**

// src/components/ui/**tests**/Button.test.tsx  
import { describe, it, expect } from 'vitest'  
import { render, screen } from '@testing-library/react'  
import userEvent from '@testing-library/user-event'  
import { Button } from '../Button'

describe('Button', () => {  
it('renders correctly', () => {  
render(Click me)  
expect(screen.getByRole('button')).toHaveTextContent('Click me')  
})

it('handles click events', async () => {  
const user = userEvent.setup()  
const handleClick = vi.fn()

render(<Button onClick={handleClick}>Click</Button>)  
await user.click(screen.getByRole('button'))  
  
expect(handleClick).toHaveBeenCalledOnce()  

})  
})

**10\. Deployment & DevOps**

**10.1 Next.js Config**

// next.config.ts  
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {  
reactStrictMode: true,  
images: {  
domains: \['[cdn.example.com](http://cdn.example.com)'\],  
formats: \['image/avif', 'image/webp'\],  
},  
headers: async () => \[  
{  
source: '/:path\*',  
headers: \[  
{  
key: 'X-Content-Type-Options',  
value: 'nosniff',  
},  
\],  
},  
\],  
redirects: async () => \[  
{  
source: '/old-path',  
destination: '/new-path',  
permanent: true,  
},  
\],  
}

export default nextConfig

**10.2 Docker Setup**

**Dockerfile**

FROM node:20-alpine AS base  
WORKDIR /app

FROM base AS deps  
COPY package\*.json ./  
RUN npm ci

FROM base AS builder  
COPY package\*.json ./  
RUN npm ci  
COPY . .  
RUN npm run build

FROM base  
COPY --from=deps /app/node\_modules ./node\_modules  
COPY --from=builder /app/.next ./.next  
COPY --from=builder /app/public ./public  
COPY package\*.json ./

EXPOSE 3000  
CMD \["npm", "start"\]

**10.3 CI/CD with GitHub Actions**

**.github/workflows/deploy.yml**

name: Deploy  
on:  
push:  
branches: \[main\]

jobs:  
build:  
runs-on: ubuntu-latest  
steps:  
\- uses: actions/checkout@v3  
\- uses: actions/setup-node@v3  
with:  
node-version: '20'  
cache: 'npm'

\- run: npm ci  
\- run: npm run lint  
\- run: npm run test  
\- run: npm run build  
  
\- uses: actions/upload-artifact@v3  
with:  
name: build  
path: .next  

**11\. Dependency Management**

**11.1 Recommended Stack**

**Core:**

*   next: ^14.0.0
*   react: ^18.0.0
*   typescript: ^5.0.0

**Styling:**

*   tailwindcss: ^3.0.0
*   class-variance-authority: Para components variantes
*   clsx: Para classe condicional

**Data:**

*   @tanstack/react-query: Gerenciamento de cache
*   zod: Validação de schema
*   @prisma/client: ORM (se usar)

**Forms:**

*   react-hook-form: Gerenciamento de forms
*   zod: Validação integrada

**Auth:**

*   next-auth: Autenticação

**Utils:**

*   lodash-es: Utilities
*   date-fns: Date manipulation

**12\. Security Checklist**

*   \[ \] ✅ Variáveis sensíveis em .env.local (nunca commit)
*   \[ \] ✅ CORS configurado corretamente
*   \[ \] ✅ Rate limiting em API routes
*   \[ \] ✅ Validação de input com Zod
*   \[ \] ✅ CSRF protection (next-auth)
*   \[ \] ✅ Sanitização de outputs
*   \[ \] ✅ Helmet headers
*   \[ \] ✅ SQL injection prevention (use ORM)
*   \[ \] ✅ XSS protection
*   \[ \] ✅ Secrets not in source code

**13\. Troubleshooting Comum**

**Hydration Mismatch**

// ✅ Correto  
export function ClientComponent() {  
const \[isMounted, setIsMounted\] = useState(false)

useEffect(() => {  
setIsMounted(true)  
}, \[\])

if (!isMounted) return null

return  
}

**Circular Dependencies**

*   Mova tipos compartilhados para src/types
*   Importe específico, não index

**Out of Memory**

*   Reduza maxOldSpaceSize em build
*   Otimize imagens grandes

**14\. Recursos & Documentação**

**Oficial:**

*   [Next.js Docs](https://nextjs.org/docs)
*   [React Docs](https://react.dev)
*   [TypeScript Handbook](https://www.typescriptlang.org/docs/)

**Community:**

*   [Next.js Discord](https://discord.gg/nextjs)
*   [Stack Overflow](https://stackoverflow.com/questions/tagged/next.js)

**15\. Checklist para Novo Projeto**

*   \[ \] Criar repo com create-next-app@latest
*   \[ \] Configurar TypeScript stricto
*   \[ \] Setup ESLint e Prettier
*   \[ \] Adicionar Tailwind CSS
*   \[ \] Criar pasta estrutura em src/
*   \[ \] Setup route groups (auth), (main)
*   \[ \] Configurar .env.example
*   \[ \] Implementar autenticação
*   \[ \] Setup de teste (Vitest + RTL)
*   \[ \] Configurar CI/CD
*   \[ \] Documentar no README

**Conclusão**

Este playbook evolui com o framework. Mantenha pragmatismo: nem todo projeto precisa de todas as patterns. Use como guia, adapte conforme necessário.

**Última atualização**: Janeiro 2026  
**Manutenido por**: Seu time