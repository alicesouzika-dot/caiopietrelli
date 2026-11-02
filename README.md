# Amigos do Caio — App Mobile (PWA)
### Gabinete do Vereador / Secretaria de Bem-Estar e Proteção Animal — Guapimirim/RJ

Aplicação web progressiva (PWA), instalável e **100% offline-first**, projetada para agentes em campo (feiras de adoção, mutirões de castração e visitas domiciliares) e disparos de campanhas via WhatsApp.

---

## 🚀 Principais Funcionalidades Mobile

1. **Operação 100% Offline-First:**
   - Armazenamento local completo via **Dexie.js** (IndexedDB).
   - Fila de sincronização automática com retry exponencial para áreas de sinal ruim.
   - Sincronização em segundo plano assim que a conectividade for restabelecida.

2. **Cadastro Rápido em Campo (`/cadastro-rapido`):**
   - Captura de foto do pet pela câmera traseira (`capture="environment"`).
   - Compressão e redimensionamento automático no cliente via HTML5 `<canvas>` (max 1280px, ~80% qualidade) economizando pacote de dados 3G/4G.
   - Botão **"Usar minha localização"** com geolocalização GPS precisa (`navigator.geolocation`).

3. **Disparador Multicanal com Tela Cheia:**
   - **Modo Manual (`wa.me` & Web Share API):** confirmação individual com avanço touch e timer opcional.
   - **Modo Automático (Z-API):** envio sequencial com controle de delay anti-ban (2 a 12s) e terminal de logs em tempo real.
   - **Screen Wake Lock API:** impede que a tela do celular apague durante os disparos em lote.

4. **Navegação & Ergonomia Tátil:**
   - Bottom Tab Bar fixa com 5 abas e botão central **"Disparar"** elevado em `#06154E`.
   - Alvos de toque $\ge 44 \times 44\text{px}$, sem dependência de hover.
   - Respeito integral a Safe Area Insets (`env(safe-area-inset-*)`).
   - Busca por voz com transcrição Web Speech API (pt-BR).
   - Swipe actions em cards e mapa interativo de tutores com Leaflet.

5. **Segurança de Dados (LGPD):**
   - Máscara de CPF conforme LGPD (`***.456.789-**`) com opção de revelação por toque.
   - Bloqueio local por **PIN de 4 dígitos** com hash criptográfico SHA-256 (Web Crypto API).
   - Bloqueio automático após 5 minutos em segundo plano e suporte a biometria/Passkey.

---

## 🛠️ Instalação e Execução Local

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento (Porta 3000)
npm run dev

# 3. Compilação de produção
npm run build
```

---

## 🔔 Configuração de Notificações Web Push (VAPID)

Para habilitar notificações push em produção:

1. Gere um par de chaves VAPID no terminal:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Adicione as chaves no arquivo `.env`:
   ```env
   VITE_VAPID_PUBLIC_KEY="SUA_CHAVE_PUBLICA_AQUI"
   VAPID_PRIVATE_KEY="SUA_CHAVE_PRIVADA_AQUI"
   ```
3. A Edge Function `supabase/functions/enviar-push` utilizará a chave privada para assinar o envio para os endpoints registrados na tabela `push_subscriptions`.

---

## 🧪 Como Testar o Modo Offline no Chrome DevTools

1. Abra o DevTools (`F12` ou `Ctrl + Shift + I`).
2. Vá até a aba **Application** (Aplicativo) > **Service Workers**.
3. Marque a caixa de seleção **Offline**.
4. Teste:
   - A barra âmbar informará *"Você está offline. Os dados serão sincronizados automaticamente."*
   - Navegue pelas abas Início, Tutores e Histórico (todos os dados continuam acessíveis).
   - Realize um **Cadastro Rápido**: o registro será salvo no IndexedDB e adicionado à fila local.
   - Desmarque a opção **Offline**: os dados na fila serão enviados automaticamente ao Supabase.

---

## ✅ Checklist Lighthouse PWA

- [x] Manifesto Web válido (`/public/manifest.webmanifest`)
- [x] Service Worker ativo com estratégia de cache offline (`vite-plugin-pwa`)
- [x] Conjunto completo de ícones (192px, 512px, máscara e Apple Touch Icon 180px)
- [x] Meta tag `theme-color` `#06154E` e `viewport-fit=cover`
- [x] Resposta imediata em 200 quando offline (App Shell em cache)
