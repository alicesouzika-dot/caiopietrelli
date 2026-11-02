/**
 * Configurações do Sistema e Conexão Z-API
 * Somente Administrador edita. Moderador visualiza em modo somente leitura.
 */

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Radio,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Send,
  ExternalLink,
  ShieldAlert,
  Save,
  Lock,
  Phone,
  RefreshCw,
} from 'lucide-react';
import {
  listarConfiguracoes,
  salvarConfiguracoes,
} from '../lib/storageEngine';
import { checarStatusZApi, dispararMensagemZApi, ZApiStatusResponse } from '../lib/zapi';
import { abrirWhatsAppWeb } from '../lib/wa';
import { formatarTelefoneExibicao, normalizarParaE164, validarTelefoneBR } from '../lib/telefone';
import { useAuth } from '../contexts/AuthContext';

export const Configuracoes: React.FC = () => {
  const { role, usuario } = useAuth();
  const isAdmin = role === 'admin';

  const [configs, setConfigs] = useState(() => listarConfiguracoes());
  const [salvando, setSalvando] = useState(false);
  const [salvoSucesso, setSalvoSucesso] = useState(false);

  // Mascaramento de credenciais com botões de olho
  const [revelarInstanceId, setRevelarInstanceId] = useState(false);
  const [revelarToken, setRevelarToken] = useState(false);
  const [revelarClientToken, setRevelarClientToken] = useState(false);

  // Status de conexão da Z-API
  const [testandoConexao, setTestandoConexao] = useState(false);
  const [statusConexao, setStatusConexao] = useState<ZApiStatusResponse | null>(null);

  // Card de Teste
  const [telefoneTeste, setTelefoneTeste] = useState('21976397273');
  const [mensagemTeste, setMensagemTeste] = useState(
    'Olá! Esta é uma mensagem de teste do sistema Amigos do Caio (Gabinete de Proteção Animal de Guapimirim/RJ).'
  );
  const [resultadoTeste, setResultadoTeste] = useState<string | null>(null);
  const [enviandoTeste, setEnviandoTeste] = useState(false);

  useEffect(() => {
    checarStatusZApi().then(setStatusConexao);
  }, []);

  const handleChange = (chave: string, valor: string) => {
    if (!isAdmin) return;
    setConfigs((prev) => ({ ...prev, [chave]: valor }));
    setSalvoSucesso(false);
  };

  const handleSalvar = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAdmin) return;

    setSalvando(true);
    salvarConfiguracoes(configs, usuario?.id);
    setTimeout(() => {
      setSalvando(false);
      setSalvoSucesso(true);
      setTimeout(() => setSalvoSucesso(false), 3000);
    }, 400);
  };

  const handleTestarConexao = async () => {
    setTestandoConexao(true);
    try {
      const res = await checarStatusZApi();
      setStatusConexao(res);
    } finally {
      setTestandoConexao(false);
    }
  };

  const handleEnviarTesteManual = () => {
    const e164 = normalizarParaE164(telefoneTeste);
    if (!validarTelefoneBR(e164)) {
      alert('Informe um telefone brasileiro válido com DDD.');
      return;
    }
    abrirWhatsAppWeb(e164, mensagemTeste);
    setResultadoTeste('Janela do WhatsApp Web aberta com a mensagem de teste.');
  };

  const handleEnviarTesteZApi = async () => {
    const e164 = normalizarParaE164(telefoneTeste);
    if (!validarTelefoneBR(e164)) {
      alert('Informe um telefone brasileiro válido com DDD.');
      return;
    }

    setEnviandoTeste(true);
    setResultadoTeste(null);
    try {
      const res = await dispararMensagemZApi(e164, mensagemTeste, 1);
      if (res.ok) {
        setResultadoTeste(`✅ Sucesso! Mensagem disparada via Z-API. ID: ${res.messageId}`);
      } else {
        setResultadoTeste(`❌ Erro no envio: ${res.erro}`);
      }
    } finally {
      setEnviandoTeste(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0B1020]">
            Configurações e Integração Z-API
          </h2>
          <p className="text-xs text-[#5A6382]">
            Parâmetros de entrega, credenciais do WhatsApp e delays operacionais
          </p>
        </div>

        {!isAdmin && (
          <div className="flex items-center gap-1.5 text-xs text-[#5A6382] bg-slate-100 px-3 py-1.5 rounded-lg">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <span>Somente administradores podem editar</span>
          </div>
        )}
      </div>

      {/* Alerta de Segurança e Boas Práticas do WhatsApp */}
      <div className="flex items-start gap-3 rounded-xl bg-[#EEF1FA] border border-[#0A2472]/20 p-4 text-xs text-[#06154E]">
        <ShieldAlert className="h-5 w-5 text-[#0A2472] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Aviso de Governança e Proteção contra Bloqueio</p>
          <p className="text-[#5A6382]">
            O modo automático depende da assinatura e plano do Z-API. Mantenha um intervalo de segurança de no mínimo <b>5.000ms (5 segundos)</b> entre envios sucessivos para mitigar riscos de bloqueio temporário pelo WhatsApp.
          </p>
        </div>
      </div>

      <form onSubmit={handleSalvar} className="space-y-6">
        {/* CARD 1: CONEXÃO Z-API */}
        <div className="rounded-xl border border-[#E4E7F0] bg-white p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E4E7F0] pb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0B1020] flex items-center gap-2">
                <Radio className="h-4 w-4 text-[#0A2472]" />
                Credenciais da Instância Z-API
              </h3>
              <p className="text-xs text-[#5A6382]">
                Dados fornecidos no painel oficial do Z-API após a leitura do QR Code
              </p>
            </div>

            {/* Status Visual da Conexão */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestarConexao}
                disabled={testandoConexao}
                className="flex items-center gap-1.5 rounded-lg border border-[#E4E7F0] bg-[#F7F8FC] px-3 py-1.5 text-xs font-semibold text-[#0B1020] hover:bg-white shadow-2xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${testandoConexao ? 'animate-spin' : ''}`} />
                Testar Conexão
              </button>

              {statusConexao?.connected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                  <CheckCircle className="h-3.5 w-3.5" /> Conectado
                </span>
              ) : statusConexao?.session === 'WAITING_QR_CODE' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5" /> Ler QR Code
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  <XCircle className="h-3.5 w-3.5 text-slate-400" /> Desconectado / Homologação
                </span>
              )}
            </div>
          </div>

          {/* Toggle Z-API Ativo */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#F7F8FC] border border-[#E4E7F0]">
            <div>
              <span className="text-xs font-bold text-[#0B1020]">Habilitar Canal Z-API</span>
              <p className="text-[11px] text-[#5A6382]">
                Permite que campanhas escolham o modo de disparo automático
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={configs['zapi_ativo'] === 'true'}
                onChange={(e) => handleChange('zapi_ativo', e.target.checked ? 'true' : 'false')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#06154E]"></div>
            </label>
          </div>

          {/* Inputs de Credenciais Mascarados com Eye */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Instance ID */}
            <div>
              <label className="block font-semibold text-[#0B1020] mb-1">
                ID da Instância (Instance ID)
              </label>
              <div className="relative">
                <input
                  type={revelarInstanceId ? 'text' : 'password'}
                  disabled={!isAdmin}
                  value={configs['zapi_instance_id'] || ''}
                  onChange={(e) => handleChange('zapi_instance_id', e.target.value)}
                  placeholder="Ex: 3B95C...12"
                  className="w-full rounded-lg border border-[#E4E7F0] pr-9 pl-3 py-2 font-mono text-xs text-[#0B1020]"
                />
                <button
                  type="button"
                  onClick={() => setRevelarInstanceId(!revelarInstanceId)}
                  className="absolute right-2.5 top-2.5 text-[#5A6382] hover:text-[#0B1020]"
                >
                  {revelarInstanceId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Token */}
            <div>
              <label className="block font-semibold text-[#0B1020] mb-1">
                Token da Instância
              </label>
              <div className="relative">
                <input
                  type={revelarToken ? 'text' : 'password'}
                  disabled={!isAdmin}
                  value={configs['zapi_token'] || ''}
                  onChange={(e) => handleChange('zapi_token', e.target.value)}
                  placeholder="Ex: 8E7A...3F"
                  className="w-full rounded-lg border border-[#E4E7F0] pr-9 pl-3 py-2 font-mono text-xs text-[#0B1020]"
                />
                <button
                  type="button"
                  onClick={() => setRevelarToken(!revelarToken)}
                  className="absolute right-2.5 top-2.5 text-[#5A6382] hover:text-[#0B1020]"
                >
                  {revelarToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Client Token */}
            <div>
              <label className="block font-semibold text-[#0B1020] mb-1">
                Client Token de Segurança
              </label>
              <div className="relative">
                <input
                  type={revelarClientToken ? 'text' : 'password'}
                  disabled={!isAdmin}
                  value={configs['zapi_client_token'] || ''}
                  onChange={(e) => handleChange('zapi_client_token', e.target.value)}
                  placeholder="Ex: F180...99"
                  className="w-full rounded-lg border border-[#E4E7F0] pr-9 pl-3 py-2 font-mono text-xs text-[#0B1020]"
                />
                <button
                  type="button"
                  onClick={() => setRevelarClientToken(!revelarClientToken)}
                  className="absolute right-2.5 top-2.5 text-[#5A6382] hover:text-[#0B1020]"
                >
                  {revelarClientToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Instruções para ler o QR Code se desconectado */}
          {!statusConexao?.connected && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-[#5A6382] flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#0B1020]">Como conectar o WhatsApp da Secretaria?</p>
                <p className="mt-0.5">
                  Acesse o painel oficial da Z-API, abra o WhatsApp no smartphone institucional do gabinete e faça a leitura do QR Code.
                </p>
              </div>
              <a
                href="https://z-api.io"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded-md bg-white border border-[#E4E7F0] px-3 py-1.5 text-xs font-bold text-[#0A2472] hover:bg-[#EEF1FA] shrink-0"
              >
                Abrir Z-API <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* CARD 2: PARÂMETROS DE DISPARO */}
        <div className="rounded-xl border border-[#E4E7F0] bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#0B1020] flex items-center gap-2 border-b border-[#E4E7F0] pb-3">
            <Settings className="h-4 w-4 text-[#0A2472]" />
            Parâmetros Operacionais de Disparo
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#0B1020] mb-1">
                Delay Entre Envios (ms)
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                value={configs['delay_entre_envios_ms'] || '5000'}
                onChange={(e) => handleChange('delay_entre_envios_ms', e.target.value)}
                className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs font-mono"
              />
              <span className="text-[11px] text-[#5A6382]">Recomendado: 5.000ms</span>
            </div>

            <div>
              <label className="block font-semibold text-[#0B1020] mb-1">
                Delay de "Digitando..." (segundos)
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                value={configs['delay_digitando_s'] || '2'}
                onChange={(e) => handleChange('delay_digitando_s', e.target.value)}
                className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs font-mono"
              />
              <span className="text-[11px] text-[#5A6382]">Simula digitação natural</span>
            </div>

            <div>
              <label className="block font-semibold text-[#0B1020] mb-1">
                Máximo de Tentativas (Retry)
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                value={configs['max_tentativas'] || '3'}
                onChange={(e) => handleChange('max_tentativas', e.target.value)}
                className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs font-mono"
              />
              <span className="text-[11px] text-[#5A6382]">Em erros 429 / 500</span>
            </div>

            <div>
              <label className="block font-semibold text-[#0B1020] mb-1">
                Número Remetente de Referência
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={configs['remetente_numero'] || '5521976397273'}
                onChange={(e) => handleChange('remetente_numero', e.target.value)}
                className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs font-mono"
              />
              <span className="text-[11px] text-[#5A6382]">Ex: 5521976397273</span>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#0B1020] mb-1">
                Assinatura Padrão de Fechamento
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={configs['nome_assinatura'] || 'Equipe Amigos do Caio'}
                onChange={(e) => handleChange('nome_assinatura', e.target.value)}
                className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs"
              />
              <span className="text-[11px] text-[#5A6382]">Substitui a tag &#123;&#123;assinatura&#125;&#125;</span>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E4E7F0]">
              {salvoSucesso && (
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> Configurações salvas!
                </span>
              )}
              <button
                type="submit"
                disabled={salvando}
                className="flex items-center gap-1.5 rounded-lg bg-[#06154E] px-5 py-2 text-xs font-bold text-white hover:bg-[#0A2472]"
              >
                <Save className="h-4 w-4" /> Salvar Configurações
              </button>
            </div>
          )}
        </div>
      </form>

      {/* CARD 3: TESTE DE ENVIO DE MENSAGEM */}
      <div className="rounded-xl border border-[#E4E7F0] bg-white p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-[#0B1020] flex items-center gap-2 border-b border-[#E4E7F0] pb-3">
          <Send className="h-4 w-4 text-[#0A2472]" />
          Laboratório de Teste de Disparo
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-[#0B1020] mb-1">
              Telefone de Teste (com DDD)
            </label>
            <input
              type="text"
              value={telefoneTeste}
              onChange={(e) => setTelefoneTeste(e.target.value)}
              className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs font-mono"
              placeholder="(21) 97639-7273"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-semibold text-[#0B1020] mb-1">
              Mensagem de Teste
            </label>
            <textarea
              rows={2}
              value={mensagemTeste}
              onChange={(e) => setMensagemTeste(e.target.value)}
              className="w-full rounded-lg border border-[#E4E7F0] p-3 text-xs text-[#0B1020]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleEnviarTesteManual}
            className="rounded-lg border border-[#06154E] bg-white px-4 py-2 text-xs font-bold text-[#06154E] hover:bg-[#EEF1FA]"
          >
            Testar Envio Manual (wa.me)
          </button>

          <button
            type="button"
            onClick={handleEnviarTesteZApi}
            disabled={enviandoTeste}
            className="flex items-center gap-1.5 rounded-lg bg-[#06154E] px-4 py-2 text-xs font-bold text-white hover:bg-[#0A2472]"
          >
            {enviandoTeste ? 'Enviando...' : 'Testar Envio Automático (Z-API)'}
          </button>
        </div>

        {resultadoTeste && (
          <div className="rounded-lg bg-[#F7F8FC] border border-[#E4E7F0] p-3 text-xs font-mono text-[#0B1020]">
            {resultadoTeste}
          </div>
        )}
      </div>
    </div>
  );
};
