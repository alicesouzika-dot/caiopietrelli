/**
 * Cabeçalho Superior (Top Bar)
 * Contrato de 3 zonas: Breadcrumb / Informações do Remetente Institucional / Ações Rápidas
 */

import React from 'react';
import { Menu, Send } from 'lucide-react';
import { PageId } from './Sidebar';

interface TopHeaderProps {
  currentPage: PageId;
  onOpenMobile?: () => void;
  onToggleSidebar?: () => void;
  onNavigate: (page: PageId) => void;
}

const TITULOS_PAGINAS: Record<PageId, { secao: string; titulo: string }> = {
  dashboard: { secao: 'Visão Geral', titulo: 'Painel de Indicadores' },
  tutores: { secao: 'Cadastros', titulo: 'Base de dados de tutores de Guapimirim' },
  importar: { secao: 'Integração', titulo: 'Importador de Planilha Excel' },
  templates: { secao: 'Comunicação', titulo: 'Modelos de Mensagem WhatsApp' },
  'campanha-nova': { secao: 'Disparos', titulo: 'Assistente de Nova Campanha' },
  historico: { secao: 'Comunicação', titulo: 'Histórico e Relatório de Envios' },
  equipe: { secao: 'Administração', titulo: 'Equipe e Gestão de Acessos' },
  configuracoes: { secao: 'Sistema', titulo: 'Configurações de Disparo e Z-API' },
  auditoria: { secao: 'Segurança', titulo: 'Trilha de Auditoria do Sistema' },
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentPage,
  onOpenMobile,
  onToggleSidebar,
  onNavigate,
}) => {
  const meta = TITULOS_PAGINAS[currentPage] || { secao: 'Painel', titulo: 'Amigos do Caio' };
  const handleToggle = onToggleSidebar || onOpenMobile;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#E4E7F0] bg-white px-4 md:px-8">
      {/* Zona 1: Toggle do Menu + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          className="flex items-center gap-2 rounded-lg border border-[#E4E7F0] bg-[#F7F8FC] px-2.5 py-1.5 text-xs font-semibold text-[#06154E] hover:bg-[#EEF1FA] hover:border-[#0A2472]/30 transition-all cursor-pointer shadow-2xs"
          aria-label="Abrir menu de navegação"
          title="Abrir menu de navegação"
        >
          <Menu className="h-4 w-4 text-[#06154E]" />
          <span className="font-semibold text-[#06154E]">Menu</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-[#5A6382]">
          <span>{meta.secao}</span>
          <span className="text-[#E4E7F0]">/</span>
          <span className="font-semibold text-[#0B1020]">{meta.titulo}</span>
        </div>
      </div>

      {/* Zona 2: Botões de Ação Rápida (Importar Planilha & Nova Campanha) */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => onNavigate('importar')}
          className="rounded-lg border border-[#E4E7F0] bg-[#F7F8FC] hover:bg-[#EEF1FA] px-3.5 py-2 text-xs font-semibold text-[#06154E] transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
        >
          Importar Planilha
        </button>
        <button
          onClick={() => onNavigate('campanha-nova')}
          className="flex items-center gap-2 rounded-lg bg-[#06154E] hover:bg-[#0A2472] px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors whitespace-nowrap cursor-pointer"
        >
          <Send className="h-3.5 w-3.5 text-white" />
          Nova Campanha
        </button>
      </div>
    </header>
  );
};
