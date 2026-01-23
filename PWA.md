# PWA Configuration - Purple Stock

Este projeto está configurado como uma Progressive Web App (PWA).

## Recursos Implementados

### ✅ Manifest.json
- Configurado em `/public/manifest.json`
- Define nome, ícones, tema e comportamento da aplicação
- Suporta shortcuts para acesso rápido a Items e Locations

### ✅ Service Worker
- Localizado em `/public/sw.js`
- Cache de assets estáticos
- Suporte offline básico
- Atualização automática a cada hora

### ✅ Meta Tags
- Configuradas no `layout.tsx`
- Suporte para iOS (Apple Web App)
- Suporte para Android (Chrome)
- Theme color: #6B21A8 (Roxo)

### ✅ Ícones
Os seguintes ícones são necessários na pasta `/public`:
- `favicon.ico` (16x16, 32x32)
- `favicon-16x16.png`
- `favicon-32x32.png`
- `apple-touch-icon.png` (180x180)
- `android-chrome-192x192.png`
- `android-chrome-512x512.png`
- `icon.png` (512x512)
- `icon.svg`

## Como Testar

### 1. Build e Start
```bash
npm run build
npm start
```

### 2. Testar no Chrome DevTools
1. Abra DevTools (F12)
2. Vá em "Application" > "Service Workers"
3. Verifique se o service worker está registrado
4. Vá em "Application" > "Manifest"
5. Verifique se o manifest está carregado corretamente

### 3. Instalar no Dispositivo
- **Android/Chrome**: Ao abrir o site, aparecerá um banner "Adicionar à tela inicial"
- **iOS/Safari**: Compartilhar > Adicionar à Tela de Início

### 4. Testar Offline
1. Abra DevTools > Network
2. Marque "Offline"
3. Recarregue a página
4. A página deve continuar funcionando (com cache)

## Funcionalidades PWA

- ✅ Instalável (Add to Home Screen)
- ✅ Funciona offline (com cache)
- ✅ Ícone na tela inicial
- ✅ Tema roxo personalizado
- ✅ Modo standalone (sem barra do navegador)
- ✅ Shortcuts para Items e Locations

## Próximos Passos (Opcional)

1. **Notificações Push**: Implementar notificações para atualizações de estoque
2. **Background Sync**: Sincronizar dados quando voltar online
3. **Share Target**: Permitir compartilhar dados com o app
4. **File Handler**: Abrir arquivos CSV diretamente no app

## Troubleshooting

### Service Worker não registra
- Verifique se está usando HTTPS (ou localhost)
- Verifique o console do navegador para erros
- Limpe o cache do navegador

### Manifest não aparece
- Verifique se `/public/manifest.json` existe
- Verifique se o link está no `<head>` do layout
- Use Chrome DevTools > Application > Manifest

### Ícones não aparecem
- Verifique se os arquivos existem em `/public`
- Verifique os tamanhos dos ícones (devem ser exatos)
- Use formatos PNG ou ICO
