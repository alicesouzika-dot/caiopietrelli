/**
 * Bottom Tab Bar Fixa Mobile
 * 5 Abas com botão central "Disparar" elevado em #06154E
 */

import React from 'react';
import { Home, Users, Send, History, MoreHorizontal } from 'lucide-react';
import { hapticTouch } from '../../lib/haptics';

export type MobileTabId = 'inicio' | 'tutores' | 'disparar' | 'historico' | 'mais';

interface BottomTabBarProps {
  currentTab: MobileTabId;
  onSelectTab: (tab: MobileTabId) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'inicio' as MobileTabId, label: 'Início', icon: Home },
    { id: 'tutores' as MobileTabId, label: 'Tutores', icon: Users },
    { id: 'disparar' as MobileTabId, label: 'Disparar', icon: Send, central: true },
    { id: 'historico' as MobileTabId, label: 'Histórico', icon: History },
    { id: 'mais' as MobileTabId, label: 'Mais', icon: MoreHorizontal },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E4E7F0] pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
      role="navigation"
      aria-label="Navegação inferior"
    >
      <div className="grid grid-cols-5 items-center h-16 max-w-md mx-auto relative px-1">
        {tabs.map((tab) => {
          const ativo = currentTab === tab.id;
          const Icon = tab.icon;

          if (tab.central) {
            return (
              <div
                key={tab.id}
                className="relative flex flex-col items-center justify-center w-full h-full"
              >
                {/* Botão Central Elevado Sobressaindo ~12px */}
                <button
                  type="button"
                  onClick={() => {
                    hapticTouch();
                    onSelectTab('disparar');
                  }}
                  className={`-top-5 absolute flex h-14 w-14 items-center justify-center rounded-full bg-[#06154E] text-white shadow-lg border-4 border-white active:scale-95 transition-transform ${
                    ativo ? 'ring-2 ring-[#0A2472]' : ''
                  }`}
                  aria-label="Iniciar novo disparo"
                >
                  <Send className="h-6 w-6 text-white ml-0.5" />
                </button>
                <span className="text-[11px] font-bold text-[#06154E] mt-8 pt-0.5">
                  {tab.label}
                </span>
              </div>
            );
          }

          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => {
                hapticTouch();
                onSelectTab(tab.id);
              }}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors active:scale-95 ${
                ativo ? 'text-[#06154E]' : 'text-[#5A6382] hover:text-[#0B1020]'
              }`}
            >
              <Icon className={`h-5 w-5 ${ativo ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
              <span className={`text-[11px] mt-1 ${ativo ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
