/**
 * Barra lateral de navegação (Sidebar)
 * Paleta Primária: #06154E, Item Ativo: #123A8F com barra lateral branca.
 */

import React from 'react';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  FileText,
  Send,
  History,
  ShieldAlert,
  Settings,
  UserCheck,
  LogOut,
  ChevronRight,
  Shield,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export type PageId =
  | 'dashboard'
  | 'tutores'
  | 'importar'
  | 'templates'
  | 'campanha-nova'
  | 'historico'
  | 'equipe'
  | 'configuracoes'
  | 'auditoria';

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  isOpen?: boolean;
  onClose?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpen,
  onClose,
  mobileOpen,
  onCloseMobile,
}) => {
  const { usuario, role, logout, temPermissao } = useAuth();
  const aberto = isOpen ?? mobileOpen ?? false;
  const fechar = onClose ?? onCloseMobile;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        fechar?.();
      }
    };
    if (aberto) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aberto, fechar]);

  const navItems = [
    {
      id: 'dashboard' as PageId,
      label: 'Dashboard',
      icon: LayoutDashboard,
      visivel: true,
    },
    {
      id: 'tutores' as PageId,
      label: 'Tutores e Pets',
      icon: Users,
      visivel: true,
    },
    {
      id: 'importar' as PageId,
      label: 'Importar Excel',
      icon: FileSpreadsheet,
      visivel: true,
    },
    {
      id: 'templates' as PageId,
      label: 'Modelos de Mensagem',
      icon: FileText,
      visivel: true,
    },
    {
      id: 'campanha-nova' as PageId,
      label: 'Nova Campanha',
      icon: Send,
      visivel: true,
      destaque: true,
    },
    {
      id: 'historico' as PageId,
      label: 'Histórico de Disparos',
      icon: History,
      visivel: true,
    },
    {
      id: 'equipe' as PageId,
      label: 'Equipe e Acessos',
      icon: UserCheck,
      // Critério: Moderador vê como somente leitura ou admin vê tudo
      visivel: temPermissao('verEquipe'),
    },
    {
      id: 'configuracoes' as PageId,
      label: 'Configurações',
      icon: Settings,
      visivel: true,
    },
    {
      id: 'auditoria' as PageId,
      label: 'Log de Auditoria',
      icon: ShieldAlert,
      visivel: role === 'admin', // Apenas Admin
    },
  ];

  return (
    <>
      {/* Backdrop (mobile e desktop) */}
      {aberto && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
          onClick={fechar}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col bg-[#06154E] text-white shadow-2xl transition-transform duration-300 ease-in-out ${
          aberto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Brand Logo & Botão Fechar */}
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0A2472] border border-white/15 text-white shadow-inner">
              {/* Ícone de Pata de Pet Oficial */}
              <svg
                className="h-6 w-6 fill-current text-white"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="7" cy="8.5" r="2.2" />
                <circle cx="17" cy="8.5" r="2.2" />
                <circle cx="10.5" cy="5.5" r="2.2" />
                <circle cx="13.5" cy="5.5" r="2.2" />
                <path d="M12 11c-3.2 0-5.5 2.1-5.5 5.5 0 2.2 2.2 4.5 5.5 4.5s5.5-2.3 5.5-4.5c0-3.4-2.3-5.5-5.5-5.5z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-bold tracking-tight text-white truncate">
                Amigos do Caio
              </h1>
              <p className="text-[11px] font-medium text-white/60 truncate">
                Painel Admin
              </p>
            </div>
          </div>

          <button
            onClick={fechar}
            className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            title="Fechar menu lateral"
            aria-label="Fechar menu lateral"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1">
          {navItems
            .filter((item) => item.visivel)
            .map((item) => {
              const ativo = currentPage === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    fechar?.();
                  }}
                  className={`group relative flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors text-left ${
                    ativo
                      ? 'bg-[#123A8F] text-white shadow-xs font-semibold'
                      : 'text-white/80 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  {/* Barra lateral branca no item ativo */}
                  {ativo && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md bg-white" />
                  )}

                  <Icon
                    className={`h-4.5 w-4.5 shrink-0 transition-transform ${
                      ativo ? 'text-white scale-105' : 'text-white/70 group-hover:text-white'
                    }`}
                  />
                  <span className="truncate flex-1">{item.label}</span>

                  {item.destaque && !ativo && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      Disparar
                    </span>
                  )}
                  {ativo && <ChevronRight className="h-4 w-4 text-white/50 shrink-0" />}
                </button>
              );
            })}
        </nav>

        {/* Sessão do Usuário Logado */}
        <div className="border-t border-white/10 bg-[#05113d] p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-xs font-semibold text-white truncate">{usuario?.nome}</p>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                    role === 'admin'
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                      : 'bg-blue-400/20 text-blue-300 border border-blue-400/30'
                  }`}
                >
                  {role === 'admin' ? 'Admin' : 'Moderador'}
                </span>
              </div>
              <p className="text-[11px] text-white/60 truncate">{usuario?.email}</p>
            </div>
            <button
              onClick={logout}
              title="Encerrar sessão"
              className="p-2 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
