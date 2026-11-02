/**
 * Matriz de Permissões e RBAC (Role-Based Access Control)
 * Sistema: Amigos do Caio
 */

import { UserRole } from '../types/database';

export interface Permissoes {
  verDashboard: boolean;
  verTutores: boolean;
  criarEditarTutor: boolean;
  excluirTutor: boolean;
  importarExcel: boolean;
  verTemplates: boolean;
  criarEditarTemplate: boolean;
  excluirTemplate: boolean;
  criarDispararCampanha: boolean;
  cancelarExcluirCampanha: boolean;
  verHistorico: boolean;
  exportarCsv: boolean;
  gerenciarEquipe: boolean; // alterar papel, convidar, ativar/desativar
  verEquipe: boolean;
  editarConfiguracoes: boolean;
  verConfiguracoes: boolean;
  verAuditoria: boolean;
}

export const PERMISSOES_POR_PAPEL: Record<UserRole, Permissoes> = {
  admin: {
    verDashboard: true,
    verTutores: true,
    criarEditarTutor: true,
    excluirTutor: true,
    importarExcel: true,
    verTemplates: true,
    criarEditarTemplate: true,
    excluirTemplate: true,
    criarDispararCampanha: true,
    cancelarExcluirCampanha: true,
    verHistorico: true,
    exportarCsv: true,
    gerenciarEquipe: true,
    verEquipe: true,
    editarConfiguracoes: true,
    verConfiguracoes: true,
    verAuditoria: true,
  },
  moderador: {
    verDashboard: true,
    verTutores: true,
    criarEditarTutor: true,
    excluirTutor: false, // Moderador NÃO pode excluir
    importarExcel: true,
    verTemplates: true,
    criarEditarTemplate: true,
    excluirTemplate: false, // Moderador NÃO pode excluir
    criarDispararCampanha: true,
    cancelarExcluirCampanha: false,
    verHistorico: true,
    exportarCsv: true,
    gerenciarEquipe: false, // Somente leitura ou bloqueado
    verEquipe: true,
    editarConfiguracoes: false, // Somente leitura
    verConfiguracoes: true,
    verAuditoria: false, // Audit log apenas admin
  },
};

/**
 * Retorna se o usuário com dado papel possui a permissão requerida
 */
export function temPermissao(role: UserRole | undefined, acao: keyof Permissoes): boolean {
  if (!role) return false;
  return Boolean(PERMISSOES_POR_PAPEL[role]?.[acao]);
}
