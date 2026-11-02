# Guia de Empacotamento Nativo com Capacitor
### Amigos do Caio — App Mobile para Android (Google Play) e iOS (App Store)

Este documento fornece as instruções completas para empacotar a aplicação web PWA utilizando **Capacitor**, permitindo a geração de binários nativos `.apk`/`.aab` para Android e `.ipa` para iOS.

---

## 1. Pré-Requisitos

- **Node.js** v18+ e **npm**
- **Android Studio** instalado (com Android SDK 33+) para gerar builds Android
- **Xcode** 15+ (macOS) e conta Apple Developer para builds iOS

---

## 2. Instalação do Capacitor

No diretório raiz do projeto, instale os pacotes principais do Capacitor:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
```

Em seguida, inicialize a configuração:

```bash
npx cap init "Amigos do Caio" "br.gov.rj.guapimirim.amigosdocaio" --web-dir "dist"
```

---

## 3. Configuração do `capacitor.config.ts`

Crie ou atualize o arquivo `capacitor.config.ts` na raiz do projeto:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.gov.rj.guapimirim.amigosdocaio',
  appName: 'Amigos do Caio',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#06154E',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#06154E',
      style: 'LIGHT',
    },
  },
};

export default config;
```

---

## 4. Adicionar Plataformas

```bash
# 1. Gerar o build de produção da aplicação web
npm run build

# 2. Adicionar as plataformas nativas
npx cap add android
npx cap add ios
```

---

## 5. Permissões Nativas

### Android (`android/app/src/main/AndroidManifest.xml`)

Adicione as permissões para câmera, geolocalização e manter a tela acesa:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Câmera para foto do pet -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />

    <!-- Geolocalização para localização do tutor -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

    <!-- Conectividade e Wake Lock durante disparos em lote -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
</manifest>
```

### iOS (`ios/App/App/Info.plist`)

Adicione as chaves de descrição de uso das permissões:

```xml
<key>NSCameraUsageDescription</key>
<string>O Amigos do Caio precisa da câmera para fotografar os pets cadastrados em campo.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Utilizamos sua localização para associar o bairro e coordenadas aos tutores atendidos em mutirões.</string>
```

---

## 6. Sincronização e Abertura das IDEs

Após qualquer alteração no código React, execute o fluxo de sincronização:

```bash
# Build e sync
npm run build
npx cap sync

# Abrir no Android Studio
npx cap open android

# Abrir no Xcode (somente macOS)
npx cap open ios
```

---

## 7. Geração de Pacotes de Produção

### Android (Google Play Store)
1. No Android Studio, selecione **Build** > **Generate Signed Bundle / APK**.
2. Escolha **Android App Bundle (.aab)**.
3. Crie ou selecione sua chave de assinatura (Keystore) e gere o arquivo para upload no Google Play Console.

### iOS (Apple App Store)
1. No Xcode, selecione o dispositivo alvo como **Any iOS Device (arm64)**.
2. No menu superior, vá em **Product** > **Archive**.
3. Na janela do Organizer, selecione **Distribute App** e siga o assistente de publicação no App Store Connect.
