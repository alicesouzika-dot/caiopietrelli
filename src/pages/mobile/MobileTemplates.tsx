/**
 * Gestão Mobile de Modelos de Mensagem WhatsApp (Templates)
 * Permite adicionar, editar, copiar e apagar mensagens prontas diretamente no celular,
 * com sincronização imediata no Dexie (offline), localStorage e Supabase.
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  Sparkles,
  AlertTriangle,
  FileText,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  listarTemplates,
  salvarTemplate,
  excluirTemplate,
  adicionarAuditLog,
} from '../../lib/storageEngine';
import { db } from '../../lib/db';
import { Template, TemplateCategoria } from '../../types/database';
import { VARIAVEIS_DISPONIVEIS, checarTamanhoMensagem } from '../../lib/template';
import { useAuth } from '../../contexts/AuthContext';
import { hapticTouch, hapticSuccess } from '../../lib/haptics';

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

interface MobileTemplatesProps {
  onVoltar: () => void;
}

export const MobileTemplates: React.FC<MobileTemplatesProps> = ({ onVoltar }) => {
  const { usuario } = useAuth();

  const [templates, setTemplates] = useState<Template[]>(() => listarTemplates());
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todas');
  const [modalAberto, setModalAberto] = useState(false);
  const [templateEmEdicao, setTemplateEmEdicao] = useState<Partial<Template> | null>(null);
  const [tituloInput, setTituloInput] = useState('');
  const [categoriaInput, setCategoriaInput] = useState<TemplateCategoria>('vacinacao');
  const [corpoTexto, setCorpoTexto] = useState('');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [templateParaExcluir, setTemplateParaExcluir] = useState<Template | null>(null);

  const recarregar = async () => {
    const listaStorage = listarTemplates();
    if (listaStorage.length > 0) {
      setTemplates(listaStorage);
    } else {
      const listaDexie = await db.templates.toArray();
      setTemplates(listaDexie);
    }
  };

  useEffect(() => {
    recarregar();
    window.addEventListener('amigos_caio_storage_update', recarregar);
    window.addEventListener('amigos_caio_sync_completed', recarregar);
    return () => {
      window.removeEventListener('amigos_caio_storage_update', recarregar);
      window.removeEventListener('amigos_caio_sync_completed', recarregar);
    };
  }, []);

  const templatesFiltrados = templates.filter((t) =>
    categoriaAtiva === 'todas' ? true : t.categoria === categoriaAtiva
  );

  const abrirCriacao = () => {
    hapticTouch();
    setTemplateEmEdicao({
      categoria: 'vacinacao',
      ativo: true,
      titulo: '',
    });
    setTituloInput('');
    setCategoriaInput('vacinacao');
    setCorpoTexto('');
    setModalAberto(true);
  };

  const abrirEdicao = (tpl: Template) => {
    hapticTouch();
    setTemplateEmEdicao(tpl);
    setTituloInput(tpl.titulo || '');
    setCategoriaInput((tpl.categoria as TemplateCategoria) || 'geral');
    setCorpoTexto(tpl.corpo || '');
    setModalAberto(true);
  };

  const confirmarExclusao = (tpl: Template) => {
    hapticTouch();
    setTemplateParaExcluir(tpl);
  };

  const executarExclusao = () => {
    if (!templateParaExcluir) return;
    hapticTouch();
    excluirTemplate(templateParaExcluir.id);
    adicionarAuditLog({
      user_id: usuario?.id,
      user_nome: usuario?.nome,
      acao: 'EXCLUIR_TEMPLATE',
      entidade: 'templates',
      entidade_id: templateParaExcluir.id,
      detalhes: { titulo: templateParaExcluir.titulo },
    });
    hapticSuccess();
    toast.success('Modelo de mensagem excluído!');
    setTemplateParaExcluir(null);
    recarregar();
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    hapticTouch();

    if (!tituloInput.trim() || !corpoTexto.trim()) {
      toast.error('Preencha o título e o texto da mensagem.');
      return;
    }

    const editando = Boolean(templateEmEdicao?.id);

    salvarTemplate({
      id: templateEmEdicao?.id,
      titulo: tituloInput.trim(),
      categoria: categoriaInput,
      corpo: corpoTexto,
      ativo: true,
    });

    adicionarAuditLog({
      user_id: usuario?.id,
      user_nome: usuario?.nome,
      acao: editando ? 'EDITAR_TEMPLATE' : 'CRIAR_TEMPLATE',
      entidade: 'templates',
      entidade_id: templateEmEdicao?.id || null,
      detalhes: { titulo: tituloInput.trim(), categoria: categoriaInput },
    });

    hapticSuccess();
    toast.success(editando ? 'Modelo atualizado com sucesso!' : 'Novo modelo criado com sucesso!');
    setModalAberto(false);
    recarregar();
  };

  const inserirTag = (tag: string) => {
    hapticTouch();
    setCorpoTexto((prev) => prev + (prev.endsWith(' ') || prev.endsWith('\n') || !prev ? '' : ' ') + tag);
  };

  const copiarTexto = (id: string, texto: string) => {
    hapticTouch();
    navigator.clipboard.writeText(texto);
    setCopiadoId(id);
    toast.success('Mensagem copiada!');
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const infoTamanho = checarTamanhoMensagem(corpoTexto);

  return (
    <div className="min-h-screen bg-[#F7F8FC] pb-24 select-none">
      {/* Header Fixo */}
      <header className="sticky top-0 z-40 bg-[#06154E] text-white pt-[env(safe-area-inset-top,0px)] shadow-md">
        <div className="flex items-center justify-between h-14 px-4 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => {
              hapticTouch();
              onVoltar();
            }}
            className="flex items-center gap-1.5 text-white/90 p-2 -ml-2 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Voltar</span>
          </button>
          <h1 className="text-sm font-bold truncate px-2">Modelos de Mensagem WhatsApp</h1>
          <button
            type="button"
            onClick={abrirCriacao}
            className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs active:scale-95 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Novo</span>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Filtro de Categorias em Select */}
        <div>
          <select
            value={categoriaAtiva}
            onChange={(e) => {
              hapticTouch();
              setCategoriaAtiva(e.target.value);
            }}
            className="w-full rounded-xl border border-[#E4E7F0] bg-white px-3.5 py-2.5 text-xs font-bold text-[#0B1020] shadow-2xs focus:ring-2 focus:ring-[#06154E] focus:outline-none"
          >
            <option value="todas">Todas as Categorias ({templates.length})</option>
            {Object.entries(CATEGORIAS_CONFIG).map(([key, cfg]) => {
              const count = templates.filter((t) => t.categoria === key).length;
              return (
                <option key={key} value={key}>
                  {cfg.label} ({count})
                </option>
              );
            })}
          </select>
        </div>

        {/* Lista de Cards de Modelos */}
        <div className="space-y-3">
          {templatesFiltrados.map((tpl) => {
            const cat = CATEGORIAS_CONFIG[tpl.categoria] || CATEGORIAS_CONFIG.geral;

            return (
              <div
                key={tpl.id}
                className="rounded-2xl border border-[#E4E7F0] bg-white p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${cat.corBg} ${cat.corTexto} ${cat.corBorda}`}
                  >
                    {cat.label}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => copiarTexto(tpl.id, tpl.corpo)}
                      className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#F7F8FC] text-[#5A6382] active:scale-95"
                      title="Copiar mensagem"
                    >
                      {copiadoId === tpl.id ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirEdicao(tpl)}
                      className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-50 text-[#0A2472] active:scale-95"
                      title="Editar modelo"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmarExclusao(tpl)}
                      className="flex items-center justify-center h-8 w-8 rounded-lg bg-rose-50 text-rose-600 active:scale-95"
                      title="Apagar modelo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#0B1020]">{tpl.titulo}</h3>
                  <div className="mt-2 rounded-xl bg-[#F7F8FC] border border-[#E4E7F0] p-3 text-xs text-[#0B1020] whitespace-pre-wrap font-sans leading-relaxed">
                    {tpl.corpo}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E4E7F0] flex items-center justify-between text-[11px] text-[#5A6382]">
                  <span className="font-mono tabular-nums">{tpl.corpo.length} caracteres</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => abrirEdicao(tpl)}
                      className="font-bold text-[#0A2472]"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmarExclusao(tpl)}
                      className="font-bold text-rose-600"
                    >
                      Apagar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {templatesFiltrados.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#E4E7F0] bg-white p-8 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF1FA] text-[#0A2472]">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0B1020]">Nenhum modelo encontrado</p>
                <p className="text-xs text-[#5A6382] mt-0.5">
                  Toque no botão abaixo para criar uma nova mensagem pronta.
                </p>
              </div>
              <button
                type="button"
                onClick={abrirCriacao}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#06154E] px-4 py-2.5 text-xs font-bold text-white shadow-xs active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Criar Modelo de Mensagem</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Modal Criar / Editar Modelo */}
      {modalAberto && templateEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-[#E4E7F0] flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E4E7F0] px-5 py-4 bg-[#06154E] text-white rounded-t-3xl">
              <h3 className="text-sm font-bold text-white">
                {templateEmEdicao.id ? 'Editar Modelo de Mensagem' : 'Novo Modelo de Mensagem'}
              </h3>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#0B1020] mb-1">
                  Título do Modelo *
                </label>
                <input
                  type="text"
                  required
                  value={tituloInput}
                  onChange={(e) => setTituloInput(e.target.value)}
                  className="w-full rounded-xl border border-[#E4E7F0] px-3.5 py-2.5 text-xs text-[#0B1020] focus:ring-2 focus:ring-[#06154E]"
                  placeholder="Ex: Mutirão de Castração no Bairro"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0B1020] mb-1">
                  Categoria *
                </label>
                <select
                  value={categoriaInput}
                  onChange={(e) => setCategoriaInput(e.target.value as TemplateCategoria)}
                  className="w-full rounded-xl border border-[#E4E7F0] px-3.5 py-2.5 text-xs text-[#0B1020] bg-white focus:ring-2 focus:ring-[#06154E]"
                >
                  <option value="vacinacao">Vacinação</option>
                  <option value="adocao">Feira de Adoção</option>
                  <option value="castracao">Mutirão de Castração</option>
                  <option value="evento">Evento Comunitário</option>
                  <option value="geral">Comunicado Geral</option>
                </select>
              </div>

              {/* Variáveis Dinâmicas */}
              <div>
                <label className="flex items-center gap-1.5 font-bold text-[#0B1020] mb-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#0A2472]" />
                  <span>Toque para inserir variáveis na mensagem:</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {VARIAVEIS_DISPONIVEIS.map((v) => (
                    <button
                      type="button"
                      key={v.tag}
                      onClick={() => inserirTag(v.tag)}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#EEF1FA] border border-[#E4E7F0] px-2.5 py-1.5 text-[11px] font-mono font-bold text-[#0A2472] active:bg-[#0A2472] active:text-white"
                    >
                      + {v.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Corpo da Mensagem */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[#0B1020]">
                    Texto da Mensagem *
                  </label>
                  <span
                    className={`font-mono tabular-nums font-bold text-[11px] ${
                      infoTamanho.critico
                        ? 'text-rose-600'
                        : infoTamanho.alerta
                        ? 'text-amber-600'
                        : 'text-[#5A6382]'
                    }`}
                  >
                    {infoTamanho.caracteres} / 1000
                  </span>
                </div>
                <textarea
                  rows={7}
                  required
                  value={corpoTexto}
                  onChange={(e) => setCorpoTexto(e.target.value)}
                  className="w-full rounded-xl border border-[#E4E7F0] p-3 text-xs text-[#0B1020] font-sans leading-relaxed focus:ring-2 focus:ring-[#06154E]"
                  placeholder="Digite a mensagem pronta aqui... Use *negrito* ou _itálico_ se desejar."
                />
              </div>

              {infoTamanho.alerta && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>{infoTamanho.mensagemAviso}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="w-full rounded-xl border border-[#E4E7F0] py-3 text-xs font-bold text-[#5A6382] active:bg-[#F7F8FC]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#06154E] py-3 text-xs font-bold text-white shadow-sm active:scale-98"
                >
                  Salvar Modelo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {templateParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-[#E4E7F0] space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0B1020]">Apagar Modelo?</h3>
                <p className="text-xs text-[#5A6382]">Esta ação removerá a mensagem pronta.</p>
              </div>
            </div>

            <div className="rounded-xl bg-[#F7F8FC] border border-[#E4E7F0] p-3 text-xs font-bold text-[#0B1020]">
              {templateParaExcluir.titulo}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setTemplateParaExcluir(null)}
                className="w-full rounded-xl border border-[#E4E7F0] py-2.5 text-xs font-bold text-[#5A6382]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executarExclusao}
                className="w-full rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-sm active:scale-98"
              >
                Sim, Apagar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

