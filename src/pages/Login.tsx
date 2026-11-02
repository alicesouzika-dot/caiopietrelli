/**
 * Tela de Autenticação / Login
 * E-mail + Senha e recuperação de senha.
 */

import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LoginProps {
  onSucesso: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSucesso }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
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
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo Institucional */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#06154E] text-white shadow-md">
          <svg
            className="h-8 w-8 fill-current text-white"
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

        <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-[#0B1020]">
          Amigos do Caio
        </h2>
        <p className="mt-1 text-xs text-[#5A6382]">
          Painel Admin do Caio Pietrelli
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#E4E7F0] rounded-2xl sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {erro && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#0B1020] mb-1">
                E-mail institucional
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#5A6382]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@guapimirim.rj.gov.br"
                  className="w-full rounded-lg border border-[#E4E7F0] pl-9 pr-3 py-2 text-xs text-[#0B1020] focus:ring-1 focus:ring-[#06154E]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#0B1020]">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setEsqueciAberto(true)}
                  className="text-[11px] text-[#0A2472] font-semibold hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#5A6382]" />
                <input
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-[#E4E7F0] pl-9 pr-3 py-2 text-xs text-[#0B1020] focus:ring-1 focus:ring-[#06154E]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#06154E] py-2.5 px-4 text-xs font-bold text-white hover:bg-[#0A2472] shadow-xs transition-colors"
            >
              {carregando ? 'Entrando...' : 'Entrar no Sistema'}
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
                <span>Link de recuperação enviado com sucesso para seu e-mail institucional.</span>
              </div>
            ) : (
              <input
                type="email"
                defaultValue={email}
                placeholder="seu-email@guapimirim.rj.gov.br"
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
