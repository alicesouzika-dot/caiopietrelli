/**
 * Layout Principal do Amigos do Caio
 * Sidebar fixa em #06154E + Header contextual + Viewport de Conteúdo
 */

import React, { useState } from 'react';
import { Sidebar, PageId } from './Sidebar';
import { TopHeader } from './TopHeader';

interface LayoutProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentPage,
  onNavigate,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F7F8FC]">
      {/* Sidebar Lateral em gaveta (oculta por padrão no desktop e mobile) */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Área Central de Conteúdo em tela cheia */}
      <div className="flex flex-1 flex-col min-w-0 w-full">
        <TopHeader
          currentPage={currentPage}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onNavigate={onNavigate}
        />

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
