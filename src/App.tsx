/**
 * Aplicação Principal: Amigos do Caio — Painel Desktop & App Mobile PWA
 * Exibe automaticamente o Painel Desktop em computadores/notebooks e o App Mobile PWA em celulares,
 * sem botões de simulador/alternância manual.
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/layout/Layout';
import { PageId } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Tutores } from './pages/Tutores';
import { Importar } from './pages/Importar';
import { Templates } from './pages/Templates';
import { NovaCampanha } from './pages/NovaCampanha';
import { Historico } from './pages/Historico';
import { Equipe } from './pages/Equipe';
import { Configuracoes } from './pages/Configuracoes';
import { Auditoria } from './pages/Auditoria';
import { Login } from './pages/Login';
import { Toaster } from 'sonner';

// Componentes Mobile PWA
import { MobileLayout } from './components/layout/MobileLayout';
import { MobileTabId } from './components/layout/BottomTabBar';
import { MobileInicio } from './pages/mobile/MobileInicio';
import { MobileTutores } from './pages/mobile/MobileTutores';
import { MobileDisparar } from './pages/mobile/MobileDisparar';
import { MobileHistorico } from './pages/mobile/MobileHistorico';
import { MobileMais } from './pages/mobile/MobileMais';
import { MobileCadastroRapido } from './pages/mobile/MobileCadastroRapido';
import { MobileInstalar } from './pages/mobile/MobileInstalar';

function detectarDispositivoMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    window.navigator.userAgent
  );
  const isSmallScreen = window.innerWidth <= 768;
  return isStandalone || isMobileUA || isSmallScreen;
}

function AppContent() {
  const { isAutenticado } = useAuth();

  // Detecção automática: Mobile apenas para celulares / telas pequenas, Desktop para computadores/notebooks
  const [modoMobile, setModoMobile] = useState<boolean>(() => detectarDispositivoMobile());

  // Estado do Painel Desktop
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');

  // Estado do App Mobile
  const [mobileTab, setMobileTab] = useState<MobileTabId>('inicio');
  const [mobileSubView, setMobileSubView] = useState<'cadastro-rapido' | 'instalar' | null>(null);
  const [esconderTabBar, setEsconderTabBar] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      setModoMobile(detectarDispositivoMobile());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isAutenticado) {
    return (
      <Login
        onSucesso={() => {
          setCurrentPage('dashboard');
          setMobileTab('inicio');
        }}
      />
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: MODO MOBILE (APENAS CELULAR)
  // ==========================================
  if (modoMobile) {
    if (mobileSubView === 'cadastro-rapido') {
      return (
        <MobileCadastroRapido
          onVoltar={() => setMobileSubView(null)}
          onSucesso={() => {
            setMobileSubView(null);
            setMobileTab('tutores');
          }}
        />
      );
    }

    if (mobileSubView === 'instalar') {
      return <MobileInstalar onVoltar={() => setMobileSubView(null)} />;
    }

    return (
      <div className="relative min-h-screen bg-[#F7F8FC]">
        <MobileLayout
          currentTab={mobileTab}
          onSelectTab={setMobileTab}
          esconderTabBar={esconderTabBar}
        >
          {mobileTab === 'inicio' && (
            <MobileInicio
              onNavigateTab={setMobileTab}
              onAbrirCadastroRapido={() => setMobileSubView('cadastro-rapido')}
              onAbrirMapa={() => setMobileTab('tutores')}
            />
          )}

          {mobileTab === 'tutores' && (
            <MobileTutores
              onAbrirCadastroRapido={() => setMobileSubView('cadastro-rapido')}
            />
          )}

          {mobileTab === 'disparar' && (
            <MobileDisparar
              onVoltarParaInicio={() => setMobileTab('inicio')}
              onSetEsconderTabBar={setEsconderTabBar}
            />
          )}

          {mobileTab === 'historico' && (
            <MobileHistorico
              onNovoDisparo={() => setMobileTab('disparar')}
            />
          )}

          {mobileTab === 'mais' && (
            <MobileMais
              onAbrirInstalar={() => setMobileSubView('instalar')}
            />
          )}
        </MobileLayout>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: MODO DESKTOP (COMPUTADORES E NOTEBOOKS)
  // ==========================================
  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} />}
      {currentPage === 'tutores' && <Tutores />}
      {currentPage === 'importar' && <Importar onNavigate={setCurrentPage} />}
      {currentPage === 'templates' && <Templates />}
      {currentPage === 'campanha-nova' && <NovaCampanha onNavigate={setCurrentPage} />}
      {currentPage === 'historico' && <Historico />}
      {currentPage === 'equipe' && <Equipe />}
      {currentPage === 'configuracoes' && <Configuracoes />}
      {currentPage === 'auditoria' && <Auditoria />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster richColors position="top-right" />
      <AppContent />
    </AuthProvider>
  );
}
