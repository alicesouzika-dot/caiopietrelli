/**
 * Gestão de Equipe e Controle de Acesso (RBAC)
 * Admin tem controle total (convidar, editar, trocar papel, ativar/desativar, excluir). Moderador tem visualização somente leitura.
 */

import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Shield,
  Trash2,
  Mail,
  X,
  Lock,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  listarPerfis,
  criarPerfil,
  atualizarPerfil,
  excluirPerfil,
  adicionarAuditLog,
} from '../lib/storageEngine';
import { Profile, UserRole } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

export const Equipe: React.FC = () => {
  const { role, usuario } = useAuth();
  const isAdmin = role === 'admin';

  const [perfis, setPerfis] = useState(() => listarPerfis());
  const [modalConvidarAberto, setModalConvidarAberto] = useState(false);
  const [perfilEditando, setPerfilEditando] = useState<Profile | null>(null);

  const recarregar = () => {
    setPerfis(listarPerfis());
  };

  useEffect(() => {
    window.addEventListener('amigos_caio_storage_update', recarregar);
    return () => window.removeEventListener('amigos_caio_storage_update', recarregar);
  }, []);

  const handleTrocarRole = (perfil: Profile, novaRole: UserRole) => {
    if (!isAdmin) return;

    const adminsAtivos = perfis.filter((p) => p.role === 'admin' && p.ativo);
    if (perfil.id === usuario?.id && novaRole !== 'admin' && adminsAtivos.length <= 1) {
      toast.error('Você não pode alterar seu próprio papel sendo o único administrador ativo do sistema.');
      return;
    }

    atualizarPerfil(perfil.id, { role: novaRole });
    adicionarAuditLog({
      user_id: usuario?.id,
      user_nome: usuario?.nome,
      acao: 'ALTERAR_PAPEL_USUARIO',
      entidade: 'profiles',
      entidade_id: perfil.id,
      detalhes: { de: perfil.role, para: novaRole, email: perfil.email },
    });
    toast.success(`Papel de ${perfil.nome} atualizado para ${novaRole === 'admin' ? 'Administrador' : 'Moderador'}.`);
    recarregar();
  };

  const handleToggleAtivo = (perfil: Profile) => {
    if (!isAdmin) return;

    const adminsAtivos = perfis.filter((p) => p.role === 'admin' && p.ativo);
    if (perfil.id === usuario?.id && perfil.ativo && adminsAtivos.length <= 1) {
      toast.error('Você não pode desativar seu próprio usuário sendo o único administrador.');
      return;
    }

    const novoStatus = !perfil.ativo;
    atualizarPerfil(perfil.id, { ativo: novoStatus });
    adicionarAuditLog({
      user_id: usuario?.id,
      user_nome: usuario?.nome,
      acao: novoStatus ? 'ATIVAR_USUARIO' : 'DESATIVAR_USUARIO',
      entidade: 'profiles',
      entidade_id: perfil.id,
      detalhes: { email: perfil.email },
    });
    toast.success(`Usuário ${perfil.nome} ${novoStatus ? 'ativado' : 'desativado'}.`);
    recarregar();
  };

  const handleExcluirUsuario = (perfil: Profile) => {
    if (!isAdmin) return;

    const adminsAtivos = perfis.filter((p) => p.role === 'admin');
    if (perfil.id === usuario?.id) {
      toast.error('Você não pode excluir sua própria conta.');
      return;
    }
    if (perfil.role === 'admin' && adminsAtivos.length <= 1) {
      toast.error('Não é possível excluir o único administrador do sistema.');
      return;
    }

    if (confirm(`Tem certeza que deseja excluir o usuário ${perfil.nome}?`)) {
      excluirPerfil(perfil.id);
      adicionarAuditLog({
        user_id: usuario?.id,
        user_nome: usuario?.nome,
        acao: 'EXCLUIR_USUARIO',
        entidade: 'profiles',
        entidade_id: perfil.id,
        detalhes: { nome: perfil.nome, email: perfil.email },
      });
      toast.success(`Usuário ${perfil.nome} excluído com sucesso.`);
      recarregar();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0B1020]">
            Equipe e Controle de Acessos
          </h2>
          <p className="text-xs text-[#5A6382]">
            Gerenciamento de membros do gabinete, papéis administrativos e permissões
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={() => setModalConvidarAberto(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#06154E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0A2472] shadow-xs"
          >
            <UserPlus className="h-4 w-4" /> Convidar Membro
          </button>
        ) : (
          <div className="flex items-center gap-1 text-xs text-[#5A6382] bg-slate-100 px-3 py-1.5 rounded-lg">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <span>Modo Somente Leitura (Apenas Admin)</span>
          </div>
        )}
      </div>

      {/* Tabela de Membros */}
      <div className="rounded-xl border border-[#E4E7F0] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F8FC] border-b border-[#E4E7F0] text-[#5A6382] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-3.5">Nome e E-mail</th>
                <th className="px-6 py-3.5">Função</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Último Acesso</th>
                <th className="px-6 py-3.5">Cadastrado Em</th>
                <th className="px-6 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E7F0]">
              {perfis.map((p) => {
                const isEu = p.id === usuario?.id;

                return (
                  <tr key={p.id} className="hover:bg-[#F7F8FC] transition-colors">
                    {/* Nome & E-mail */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#0B1020]">{p.nome}</span>
                        {isEu && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-slate-200 text-slate-700">
                            Você
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#5A6382] flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3 text-[#0A2472]" /> {p.email}
                      </div>
                    </td>

                    {/* Papel */}
                    <td className="px-6 py-4">
                      {isAdmin ? (
                        <select
                          value={p.role}
                          onChange={(e) => handleTrocarRole(p, e.target.value as UserRole)}
                          className="rounded-lg border border-[#E4E7F0] bg-white px-2.5 py-1 text-xs font-semibold focus:ring-1 focus:ring-[#06154E]"
                        >
                          <option value="admin">Administrador</option>
                          <option value="moderador">Moderador</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-[11px] px-2.5 py-1 rounded-full ${
                            p.role === 'admin'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          <Shield className="h-3 w-3" />
                          {p.role === 'admin' ? 'Administrador' : 'Moderador'}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {isAdmin ? (
                        <button
                          onClick={() => handleToggleAtivo(p)}
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                            p.ativo
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                          }`}
                          title="Clique para alternar status ativo/inativo"
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${p.ativo ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                          {p.ativo ? 'Ativo' : 'Desativado'}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                            p.ativo ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                          }`}
                        >
                          {p.ativo ? 'Ativo' : 'Desativado'}
                        </span>
                      )}
                    </td>

                    {/* Último Acesso */}
                    <td className="px-6 py-4 text-[#5A6382] tabular-nums">
                      {p.ultimo_acesso ? new Date(p.ultimo_acesso).toLocaleString('pt-BR') : 'Nunca'}
                    </td>

                    {/* Data Criação */}
                    <td className="px-6 py-4 text-[#5A6382] tabular-nums">
                      {new Date(p.criado_em).toLocaleDateString('pt-BR')}
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4 text-right">
                      {isAdmin ? (
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPerfilEditando(p)}
                            className="p-1.5 text-[#0A2472] hover:bg-[#EEF1FA] rounded-md transition-colors"
                            title="Editar usuário"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {!isEu && (
                            <button
                              onClick={() => handleExcluirUsuario(p)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Excluir membro da equipe"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-300 italic">---</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: EDITAR USUÁRIO */}
      {perfilEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[#E4E7F0] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#E4E7F0] px-6 py-4 bg-[#06154E] text-white">
              <h3 className="text-base font-bold text-white">Editar Membro da Equipe</h3>
              <button
                onClick={() => setPerfilEditando(null)}
                className="text-white/70 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const nome = (form.elements.namedItem('nome') as HTMLInputElement).value.trim();
                const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
                const senha = (form.elements.namedItem('senha') as HTMLInputElement).value.trim();
                const novoRole = (form.elements.namedItem('role') as HTMLSelectElement).value as UserRole;
                const novoAtivo = (form.elements.namedItem('ativo') as HTMLSelectElement).value === 'true';

                const adminsAtivos = perfis.filter((p) => p.role === 'admin' && p.ativo);
                if (
                  perfilEditando.id === usuario?.id &&
                  (novoRole !== 'admin' || !novoAtivo) &&
                  adminsAtivos.length <= 1
                ) {
                  toast.error(
                    'Você não pode remover privilégio de administrador ou desativar sua conta sendo o único administrador ativo.'
                  );
                  return;
                }

                const updates: Partial<Profile> = {
                  nome,
                  email,
                  role: novoRole,
                  ativo: novoAtivo,
                };
                if (senha) {
                  updates.senha = senha;
                }

                atualizarPerfil(perfilEditando.id, updates);

                adicionarAuditLog({
                  user_id: usuario?.id,
                  user_nome: usuario?.nome,
                  acao: 'EDITAR_USUARIO',
                  entidade: 'profiles',
                  entidade_id: perfilEditando.id,
                  detalhes: {
                    antes: {
                      nome: perfilEditando.nome,
                      email: perfilEditando.email,
                      role: perfilEditando.role,
                      ativo: perfilEditando.ativo,
                    },
                    depois: { nome, email, role: novoRole, ativo: novoAtivo, senhaAlterada: Boolean(senha) },
                  },
                });

                toast.success('Dados do usuário atualizados com sucesso!');
                setPerfilEditando(null);
                recarregar();
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#0B1020] mb-1">
                  Nome Completo *
                </label>
                <input
                  name="nome"
                  required
                  defaultValue={perfilEditando.nome}
                  placeholder="Ex: Dra. Mariana Veterinária"
                  className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0B1020] mb-1">
                  E-mail de Acesso *
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={perfilEditando.email}
                  placeholder="nome@guapimirim.rj.gov.br"
                  className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0B1020] mb-1">
                  Senha de Acesso (deixe em branco para manter a atual)
                </label>
                <input
                  name="senha"
                  type="text"
                  defaultValue={perfilEditando.senha || ''}
                  placeholder="Nova senha de login"
                  className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0B1020] mb-1">
                  Função *
                </label>
                <select
                  name="role"
                  defaultValue={perfilEditando.role}
                  className="w-full rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs"
                >
                  <option value="moderador">Moderador (tutores, templates e disparos)</option>
                  <option value="admin">Administrador (acesso irrestrito e configurações)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#0B1020] mb-1">
                  Status da Conta *
                </label>
                <select
                  name="ativo"
                  defaultValue={perfilEditando.ativo ? 'true' : 'false'}
                  className="w-full rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs"
                >
                  <option value="true">Ativo (Acesso Liberado)</option>
                  <option value="false">Desativado (Acesso Bloqueado)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E4E7F0]">
                <button
                  type="button"
                  onClick={() => setPerfilEditando(null)}
                  className="px-4 py-2 rounded-lg border border-[#E4E7F0] text-[#5A6382] font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#06154E] text-white font-semibold hover:bg-[#0A2472]"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONVIDAR USUÁRIO */}
      {modalConvidarAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[#E4E7F0] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#E4E7F0] px-6 py-4 bg-[#06154E] text-white">
              <h3 className="text-base font-bold text-white">Convidar Membro para a Equipe</h3>
              <button
                onClick={() => setModalConvidarAberto(false)}
                className="text-white/70 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const nome = (form.elements.namedItem('nome') as HTMLInputElement).value.trim();
                const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
                const senha = (form.elements.namedItem('senha') as HTMLInputElement).value.trim();
                const novoRole = (form.elements.namedItem('role') as HTMLSelectElement).value as UserRole;

                criarPerfil({
                  nome,
                  email,
                  senha: senha || 'Souzik@8451',
                  role: novoRole,
                  ativo: true,
                });

                adicionarAuditLog({
                  user_id: usuario?.id,
                  user_nome: usuario?.nome,
                  acao: 'CRIAR_USUARIO',
                  entidade: 'profiles',
                  entidade_id: null,
                  detalhes: { nome, email, role: novoRole },
                });

                toast.success(`Membro ${nome} adicionado à equipe!`);
                setModalConvidarAberto(false);
                recarregar();
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#0B1020] mb-1">
                  Nome Completo *
                </label>
                <input
                  name="nome"
                  required
                  placeholder="Ex: Dra. Mariana Veterinária"
                  className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0B1020] mb-1">
                  E-mail de Acesso *
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="nome@guapimirim.rj.gov.br"
                  className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0B1020] mb-1">
                  Senha de Acesso *
                </label>
                <input
                  name="senha"
                  type="text"
                  required
                  defaultValue="Souzik@8451"
                  placeholder="Informe a senha de acesso"
                  className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0B1020] mb-1">
                  Função *
                </label>
                <select
                  name="role"
                  defaultValue="moderador"
                  className="w-full rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs"
                >
                  <option value="moderador">Moderador (tutores, templates e disparos)</option>
                  <option value="admin">Administrador (acesso irrestrito e configurações)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E4E7F0]">
                <button
                  type="button"
                  onClick={() => setModalConvidarAberto(false)}
                  className="px-4 py-2 rounded-lg border border-[#E4E7F0] text-[#5A6382] font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#06154E] text-white font-semibold hover:bg-[#0A2472]"
                >
                  Adicionar Membro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
