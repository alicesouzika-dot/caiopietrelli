/**
 * Tela de Autenticação / Login
 * Card único integrando logo oficial, título e formulário de acesso.
 */

import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LoginProps {
  onSucesso: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSucesso }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [esqueciAberto, setEsqueciAberto] = useState(false);
  const [esqueciEnviado, setEsqueciEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro(null);

    const res = await login(email, senha);
    setCarregando(false);

    if (res.ok) {
      onSucesso();
    } else {
      setErro(res.erro || 'Falha ao autenticar.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E9EEF9] via-[#F4F6FB] to-[#E2E8F6] flex items-center justify-center p-4 sm:p-6">
      {/* Retângulo Único envolvendo Logo + Título + Formulário */}
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-[#DCE2F0] overflow-hidden">
        {/* Topo do Card com Fundo Azul Institucional e Imagem do Ícone */}
        <div className="bg-gradient-to-b from-[#06154E] to-[#0A2472] px-8 pt-9 pb-7 text-center text-white relative">
          <div className="mx-auto h-20 w-20 rounded-2xl overflow-hidden shadow-lg ring-4 ring-white/15 bg-[#011751]">
            <img
              src="/icons/icon-512.png"
              alt="Amigos do Caio"
              className="h-full w-full object-cover"
            />
          </div>

          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white">
            Amigos do Caio
          </h2>
          <p className="mt-1 text-xs font-medium text-white/80">
            Painel Admin do Caio Pietrelli
          </p>
        </div>

        {/* Corpo do Card com o Formulário */}
        <div className="p-7 sm:p-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {erro && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800 flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span className="font-medium">{erro}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#0B1020] mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#5A6382]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite seu e-mail"
                  className="w-full rounded-xl border border-[#DCE2F0] bg-[#F8FAFC] pl-10 pr-3.5 py-2.5 text-xs text-[#0B1020] placeholder-[#8A94B0] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#06154E] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#0B1020]">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setEsqueciAberto(true)}
                  className="text-[11px] text-[#0A2472] font-bold hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#5A6382]" />
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#DCE2F0] bg-[#F8FAFC] pl-10 pr-10 py-2.5 text-xs text-[#0B1020] placeholder-[#8A94B0] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#06154E] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-[#5A6382] hover:text-[#06154E] p-0.5"
                  tabIndex={-1}
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#06154E] py-3 px-4 text-xs font-bold text-white hover:bg-[#0A2472] active:scale-99 shadow-md transition-all disabled:opacity-60"
            >
              <span>{carregando ? 'Entrando...' : 'Entrar no Sistema'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Modal Esqueci Minha Senha */}
      {esqueciAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-[#E4E7F0] space-y-4">
            <h3 className="text-sm font-bold text-[#0B1020]">Recuperação de Senha</h3>
            <p className="text-xs text-[#5A6382]">
              Informe seu e-mail cadastrado. Um link seguro será enviado para redefinição de acesso.
            </p>

            {esqueciEnviado ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Link de recuperação enviado com sucesso para seu e-mail.</span>
              </div>
            ) : (
              <input
                type="email"
                defaultValue={email}
                placeholder="Digite seu e-mail"
                className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs"
              />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEsqueciAberto(false);
                  setEsqueciEnviado(false);
                }}
                className="px-3 py-1.5 rounded-lg border border-[#E4E7F0] text-xs text-[#5A6382]"
              >
                Fechar
              </button>
              {!esqueciEnviado && (
                <button
                  type="button"
                  onClick={() => setEsqueciEnviado(true)}
                  className="px-4 py-1.5 rounded-lg bg-[#06154E] text-xs font-bold text-white hover:bg-[#0A2472]"
                >
                  Enviar Instruções
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
