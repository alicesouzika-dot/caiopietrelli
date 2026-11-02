/**
 * Gestão de Modelos de Mensagem (Templates)
 * Editor com inserção rápida de tags dinâmicas, contador de caracteres e categorização por cores.
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
  X,
} from 'lucide-react';
import {
  listarTemplates,
  salvarTemplate,
  excluirTemplate,
  adicionarAuditLog,
} from '../lib/storageEngine';
import { Template, TemplateCategoria } from '../types/database';
import { VARIAVEIS_DISPONIVEIS, checarTamanhoMensagem } from '../lib/template';
import { useAuth } from '../contexts/AuthContext';

const CATEGORIAS_CONFIG: Record<
  TemplateCategoria,
  { label: string; corTexto: string; corBg: string; corBorda: string }
> = {
  vacinacao: {
    label: 'Vacinação',
    corTexto: 'text-emerald-800',
    corBg: 'bg-emerald-50',
    corBorda: 'border-emerald-200',
  },
  adocao: {
    label: 'Feira de Adoção',
    corTexto: 'text-[#0A2472]',
    corBg: 'bg-[#EEF1FA]',
    corBorda: 'border-[#E4E7F0]',
  },
  evento: {
    label: 'Evento Comunitário',
    corTexto: 'text-purple-800',
    corBg: 'bg-purple-50',
    corBorda: 'border-purple-200',
  },
  castracao: {
    label: 'Mutirão de Castração',
    corTexto: 'text-orange-800',
    corBg: 'bg-orange-50',
    corBorda: 'border-orange-200',
  },
  geral: {
    label: 'Comunicado Geral',
    corTexto: 'text-slate-800',
    corBg: 'bg-slate-100',
    corBorda: 'border-slate-200',
  },
};

export const Templates: React.FC = () => {
  const { role, usuario, temPermissao } = useAuth();
  const podeExcluir = temPermissao('excluirTemplate');

  const [templates, setTemplates] = useState(() => listarTemplates());
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todas');
  const [modalAberto, setModalAberto] = useState(false);
  const [templateEmEdicao, setTemplateEmEdicao] = useState<Partial<Template> | null>(null);
  const [corpoTexto, setCorpoTexto] = useState('');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const recarregar = () => {
    setTemplates(listarTemplates());
  };

  useEffect(() => {
    window.addEventListener('amigos_caio_storage_update', recarregar);
    return () => window.removeEventListener('amigos_caio_storage_update', recarregar);
  }, []);

  const templatesFiltrados = templates.filter((t) =>
    categoriaAtiva === 'todas' ? true : t.categoria === categoriaAtiva
  );

  const abrirCriacao = () => {
    setTemplateEmEdicao({
      categoria: 'vacinacao',
      ativo: true,
      titulo: '',
    });
    setCorpoTexto('');
    setModalAberto(true);
  };

  const abrirEdicao = (tpl: Template) => {
    setTemplateEmEdicao(tpl);
    setCorpoTexto(tpl.corpo);
    setModalAberto(true);
  };

  const handleExcluir = (tpl: Template) => {
    if (!podeExcluir) {
      alert('Apenas administradores podem excluir modelos.');
      return;
    }
    if (confirm(`Excluir o modelo "${tpl.titulo}"?`)) {
      excluirTemplate(tpl.id);
      adicionarAuditLog({
        user_id: usuario?.id,
        user_nome: usuario?.nome,
        acao: 'EXCLUIR_TEMPLATE',
        entidade: 'templates',
        entidade_id: tpl.id,
        detalhes: { titulo: tpl.titulo },
      });
      recarregar();
    }
  };

  const inserirTag = (tag: string) => {
    setCorpoTexto((prev) => prev + (prev.endsWith(' ') || prev.endsWith('\n') ? '' : ' ') + tag);
  };

  const copiarTexto = (id: string, texto: string) => {
    navigator.clipboard.writeText(texto);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const infoTamanho = checarTamanhoMensagem(corpoTexto);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0B1020]">
            Modelos de Mensagem WhatsApp
          </h2>
        </div>

        <button
          onClick={abrirCriacao}
          className="flex items-center gap-1.5 rounded-lg bg-[#06154E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0A2472] shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Novo Modelo
        </button>
      </div>

      {/* Filtro por Categorias (Segmented Buttons) */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white rounded-xl border border-[#E4E7F0] shadow-2xs">
        <button
          onClick={() => setCategoriaAtiva('todas')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            categoriaAtiva === 'todas'
              ? 'bg-[#06154E] text-white shadow-2xs'
              : 'text-[#5A6382] hover:text-[#0B1020] hover:bg-[#F7F8FC]'
          }`}
        >
          Todas ({templates.length})
        </button>
        {Object.entries(CATEGORIAS_CONFIG).map(([key, cfg]) => {
          const count = templates.filter((t) => t.categoria === key).length;
          return (
            <button
              key={key}
              onClick={() => setCategoriaAtiva(key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                categoriaAtiva === key
                  ? 'bg-[#06154E] text-white shadow-2xs'
                  : 'text-[#5A6382] hover:text-[#0B1020] hover:bg-[#F7F8FC]'
              }`}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid de Cards de Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {templatesFiltrados.map((tpl) => {
          const cat = CATEGORIAS_CONFIG[tpl.categoria] || CATEGORIAS_CONFIG.geral;

          return (
            <div
              key={tpl.id}
              className="rounded-xl border border-[#E4E7F0] bg-white p-5 shadow-xs flex flex-col justify-between hover:border-[#0A2472]/30 transition-all"
            >
              <div>
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span
                    className={`inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${cat.corBg} ${cat.corTexto} ${cat.corBorda}`}
                  >
                    {cat.label}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copiarTexto(tpl.id, tpl.corpo)}
                      className="p-1 text-[#5A6382] hover:text-[#06154E]"
                      title="Copiar texto do modelo"
                    >
                      {copiadoId === tpl.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => abrirEdicao(tpl)}
                      className="p-1 text-[#5A6382] hover:text-[#0A2472]"
                      title="Editar modelo"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    {podeExcluir ? (
                      <button
                        onClick={() => handleExcluir(tpl)}
                        className="p-1 text-rose-600 hover:text-rose-800"
                        title="Excluir modelo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span title="Apenas admin pode excluir">
                        <Trash2 className="h-3.5 w-3.5 text-slate-300 opacity-50" />
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-[#0B1020] mb-2">
                  {tpl.titulo}
                </h3>

                {/* Corpo Prévia */}
                <div className="rounded-lg bg-[#F7F8FC] border border-[#E4E7F0] p-3 text-xs text-[#0B1020] whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
                  {tpl.corpo}
                </div>
              </div>

              {/* Rodapé do Card */}
              <div className="mt-4 pt-3 border-t border-[#E4E7F0] flex items-center justify-between text-[11px] text-[#5A6382]">
                <span className="tabular-nums font-mono">{tpl.corpo.length} caracteres</span>
                <span>{new Date(tpl.criado_em).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: CRIAR / EDITAR TEMPLATE */}
      {modalAberto && templateEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-[#E4E7F0] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#E4E7F0] px-6 py-4 bg-[#06154E] text-white">
              <h3 className="text-base font-bold text-white">
                {templateEmEdicao.id ? 'Editar Modelo de Mensagem' : 'Novo Modelo de Mensagem'}
              </h3>
              <button
                onClick={() => setModalAberto(false)}
                className="text-white/70 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const titulo = (form.elements.namedItem('titulo') as HTMLInputElement).value;
                const categoria = (form.elements.namedItem('categoria') as HTMLSelectElement).value as TemplateCategoria;

                if (!titulo.trim() || !corpoTexto.trim()) {
                  alert('Preencha título e corpo da mensagem.');
                  return;
                }

                salvarTemplate({
                  id: templateEmEdicao.id,
                  titulo,
                  categoria,
                  corpo: corpoTexto,
                  ativo: true,
                });

                adicionarAuditLog({
                  user_id: usuario?.id,
                  user_nome: usuario?.nome,
                  acao: templateEmEdicao.id ? 'EDITAR_TEMPLATE' : 'CRIAR_TEMPLATE',
                  entidade: 'templates',
                  entidade_id: templateEmEdicao.id || null,
                  detalhes: { titulo, categoria },
                });

                setModalAberto(false);
                recarregar();
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#0B1020] mb-1">
                    Título do Modelo *
                  </label>
                  <input
                    name="titulo"
                    required
                    defaultValue={templateEmEdicao.titulo || ''}
                    className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs text-[#0B1020] focus:ring-1 focus:ring-[#06154E]"
                    placeholder="Ex: Vacinação Antirrábica no Bairro"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#0B1020] mb-1">
                    Categoria *
                  </label>
                  <select
                    name="categoria"
                    defaultValue={templateEmEdicao.categoria || 'vacinacao'}
                    className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs text-[#0B1020] focus:ring-1 focus:ring-[#06154E]"
                  >
                    <option value="vacinacao">Vacinação</option>
                    <option value="adocao">Feira de Adoção</option>
                    <option value="evento">Evento Comunitário</option>
                    <option value="castracao">Mutirão de Castração</option>
                    <option value="geral">Geral</option>
                  </select>
                </div>
              </div>

              {/* Inserção de Variáveis por Clique */}
              <div>
                <label className="block font-semibold text-[#0B1020] mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#0A2472]" />
                  Inserir Tags Dinâmicas (clique para adicionar no texto):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {VARIAVEIS_DISPONIVEIS.map((v) => (
                    <button
                      type="button"
                      key={v.tag}
                      onClick={() => inserirTag(v.tag)}
                      className="inline-flex items-center gap-1 rounded-md bg-[#EEF1FA] border border-[#E4E7F0] px-2.5 py-1 text-[11px] font-mono font-bold text-[#0A2472] hover:bg-[#0A2472] hover:text-white transition-colors"
                      title={`Exemplo: ${v.exemplo}`}
                    >
                      + {v.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea do Corpo */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-[#0B1020]">
                    Corpo da Mensagem (suporta formatação WhatsApp: *negrito*, _itálico_) *
                  </label>
                  <span
                    className={`font-mono tabular-nums font-semibold text-[11px] ${
                      infoTamanho.critico
                        ? 'text-rose-600'
                        : infoTamanho.alerta
                        ? 'text-amber-600'
                        : 'text-[#5A6382]'
                    }`}
                  >
                    {infoTamanho.caracteres} / 1000 caracteres
                  </span>
                </div>
                <textarea
                  name="corpo"
                  rows={8}
                  required
                  value={corpoTexto}
                  onChange={(e) => setCorpoTexto(e.target.value)}
                  className="w-full rounded-lg border border-[#E4E7F0] p-3 text-xs text-[#0B1020] font-sans focus:ring-1 focus:ring-[#06154E]"
                  placeholder="Escreva a mensagem aqui..."
                />
              </div>

              {/* Aviso de Tamanho */}
              {infoTamanho.alerta && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>{infoTamanho.mensagemAviso}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E4E7F0]">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-4 py-2 rounded-lg border border-[#E4E7F0] text-[#5A6382] font-semibold hover:bg-[#F7F8FC]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#06154E] text-white font-semibold hover:bg-[#0A2472]"
                >
                  Salvar Modelo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
