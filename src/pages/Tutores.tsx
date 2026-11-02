/**
 * Tela de Gestão de Tutores e Pets
 * Tabela paginada, filtros avançados, máscara de CPF com reveal, drawer de detalhes e exportação CSV.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Eye,
  EyeOff,
  Filter,
  Download,
  Trash2,
  Edit,
  Phone,
  MapPin,
  HeartHandshake,
  X,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  Shield,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  listarTutores,
  salvarTutor,
  excluirTutor,
  salvarPet,
  excluirPet,
  listarEnvios,
  adicionarAuditLog,
} from '../lib/storageEngine';
import { Tutor, Pet, PetSexo } from '../types/database';
import { mascararCPF, formatarCPF, validarCPF, limparCPF } from '../lib/cpf';
import { formatarTelefoneExibicao, normalizarParaE164, validarTelefoneBR } from '../lib/telefone';
import { useAuth } from '../contexts/AuthContext';

export const Tutores: React.FC = () => {
  const { role, usuario, temPermissao } = useAuth();
  const podeExcluir = temPermissao('excluirTutor');

  // Estado da lista
  const [tutores, setTutores] = useState(() => listarTutores());
  const [busca, setBusca] = useState('');
  const [filtroBairro, setFiltroBairro] = useState<string>('todos');
  const [filtroEspecie, setFiltroEspecie] = useState<string>('todos');
  const [filtroSexo, setFiltroSexo] = useState<string>('todos');
  const [filtroAtivo, setFiltroAtivo] = useState<string>('todos');

  // Controle de reveal de CPF por ID
  const [revelarCpfs, setRevelarCpfs] = useState<Record<string, boolean>>({});

  // Drawer de Detalhes
  const [tutorSelecionado, setTutorSelecionado] = useState<(Tutor & { pets: Pet[] }) | null>(null);

  // Modais de Criação e Edição
  const [modalTutorAberto, setModalTutorAberto] = useState(false);
  const [tutorEmEdicao, setTutorEmEdicao] = useState<Partial<Tutor> | null>(null);

  const [modalPetAberto, setModalPetAberto] = useState(false);
  const [petEmEdicao, setPetEmEdicao] = useState<Partial<Pet> | null>(null);

  // Paginação
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 8;

  const recarregar = () => {
    const lista = listarTutores();
    setTutores(lista);
    setTutorSelecionado((prev) =>
      prev ? lista.find((t) => t.id === prev.id) || null : null
    );
  };

  useEffect(() => {
    window.addEventListener('amigos_caio_storage_update', recarregar);
    return () => window.removeEventListener('amigos_caio_storage_update', recarregar);
  }, []);

  // Lista única de bairros para o filtro
  const bairrosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    tutores.forEach((t) => {
      if (t.bairro) set.add(t.bairro.trim());
    });
    return Array.from(set).sort();
  }, [tutores]);

  // Filtragem e Ordenação Alfabética (A-Z)
  const tutoresFiltrados = useMemo(() => {
    const norm = (str: string | null | undefined) =>
      String(str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const q = norm(busca);
    const qDigitos = limparCPF(busca);

    return tutores
      .filter((t) => {
        // 1. Busca textual (nome do tutor, CPF, telefone, bairro ou pet)
        if (q) {
          const matchNome = norm(t.nome_completo).includes(q);
          const matchBairro = norm(t.bairro).includes(q);
          const matchCpfTexto = String(t.cpf || '').toLowerCase().includes(q);
          const matchCpfDigitos = qDigitos.length > 0 && limparCPF(t.cpf).includes(qDigitos);
          const matchTelTexto =
            String(t.telefone_e164 || '').includes(q) ||
            String(t.telefone_original || '').toLowerCase().includes(q);
          const matchTelDigitos =
            qDigitos.length > 0 &&
            (limparCPF(t.telefone_e164).includes(qDigitos) ||
              limparCPF(t.telefone_original).includes(qDigitos));
          const matchPet = t.pets?.some(
            (p) =>
              norm(p.nome).includes(q) ||
              norm(p.raca).includes(q) ||
              norm(p.especie).includes(q)
          );

          if (
            !matchNome &&
            !matchBairro &&
            !matchCpfTexto &&
            !matchCpfDigitos &&
            !matchTelTexto &&
            !matchTelDigitos &&
            !matchPet
          ) {
            return false;
          }
        }

        // 2. Filtro de Bairro
        if (filtroBairro !== 'todos' && t.bairro !== filtroBairro) {
          return false;
        }

        // 3. Filtro de Ativo
        if (filtroAtivo === 'ativos' && !t.ativo) return false;
        if (filtroAtivo === 'inativos' && t.ativo) return false;

        // 4. Filtro de Espécie do Pet
        if (filtroEspecie !== 'todos') {
          const temEspecie = t.pets?.some(
            (p) => norm(p.especie) === norm(filtroEspecie)
          );
          if (!temEspecie) return false;
        }

        // 5. Filtro de Sexo do Pet
        if (filtroSexo !== 'todos') {
          const temSexo = t.pets?.some((p) => p.sexo === filtroSexo);
          if (!temSexo) return false;
        }

        return true;
      })
      .sort((a, b) =>
        (a.nome_completo || '').trim().localeCompare((b.nome_completo || '').trim(), 'pt-BR', {
          sensitivity: 'base',
        })
      );
  }, [tutores, busca, filtroBairro, filtroEspecie, filtroSexo, filtroAtivo]);

  // Paginação
  const totalPaginas = Math.ceil(tutoresFiltrados.length / itensPorPagina) || 1;
  const paginados = useMemo(() => {
    const inicio = (pagina - 1) * itensPorPagina;
    return tutoresFiltrados.slice(inicio, inicio + itensPorPagina);
  }, [tutoresFiltrados, pagina]);

  const alternarRevelarCpf = (id: string) => {
    setRevelarCpfs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExcluirTutor = (tutor: Tutor) => {
    if (!podeExcluir) {
      alert('Apenas administradores podem excluir tutores do sistema.');
      return;
    }
    if (confirm(`Tem certeza que deseja excluir o tutor ${tutor.nome_completo} e todos os seus pets?`)) {
      excluirTutor(tutor.id);
      adicionarAuditLog({
        user_id: usuario?.id,
        user_nome: usuario?.nome,
        acao: 'EXCLUIR_TUTOR',
        entidade: 'tutores',
        entidade_id: tutor.id,
        detalhes: { nome: tutor.nome_completo, cpf: tutor.cpf },
      });
      if (tutorSelecionado?.id === tutor.id) {
        setTutorSelecionado(null);
      }
      recarregar();
    }
  };

  const handleToggleAtivo = (tutor: Tutor) => {
    salvarTutor({ ...tutor, ativo: !tutor.ativo });
    recarregar();
  };

  const exportarCSV = () => {
    const dados = tutoresFiltrados.map((t) => ({
      'ID': t.id,
      'Nome Completo': t.nome_completo,
      'CPF': formatarCPF(t.cpf),
      'Telefone (E.164)': t.telefone_e164,
      'Telefone Formatado': formatarTelefoneExibicao(t.telefone_e164),
      'Bairro': t.bairro || '',
      'Status': t.ativo ? 'Ativo' : 'Inativo',
      'Total de Pets': t.pets?.length || 0,
      'Nomes dos Pets': t.pets?.map((p) => `${p.nome} (${p.especie || 'Pet'})`).join('; ') || '',
      'Cadastrado Em': new Date(t.criado_em).toLocaleDateString('pt-BR'),
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tutores_guapimirim_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header com Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0B1020]">
            Base de dados de tutores de Guapimirim
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportarCSV}
            className="flex items-center gap-1.5 rounded-lg border border-[#E4E7F0] bg-white px-3.5 py-2 text-xs font-semibold text-[#0B1020] hover:bg-[#F7F8FC] shadow-2xs transition-colors"
          >
            <Download className="h-4 w-4 text-[#5A6382]" />
            Exportar CSV
          </button>
          <button
            onClick={() => {
              setTutorEmEdicao({ ativo: true, bairro: 'Centro' });
              setModalTutorAberto(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-[#06154E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0A2472] shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Tutor
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="rounded-xl border border-[#E4E7F0] bg-white p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Busca Textual */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#5A6382]" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF, telefone ou pet..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
              className="w-full rounded-lg border border-[#E4E7F0] bg-[#F7F8FC] pl-9 pr-4 py-2 text-xs text-[#0B1020] placeholder-[#5A6382] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#06154E]"
            />
          </div>

          {/* Filtro Bairro */}
          <div className="w-full md:w-48">
            <select
              value={filtroBairro}
              onChange={(e) => {
                setFiltroBairro(e.target.value);
                setPagina(1);
              }}
              className="w-full rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs text-[#0B1020] focus:outline-hidden focus:ring-1 focus:ring-[#06154E]"
            >
              <option value="todos">Todos os bairros</option>
              {bairrosDisponiveis.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Filtro Espécie */}
          <div className="w-full md:w-36">
            <select
              value={filtroEspecie}
              onChange={(e) => {
                setFiltroEspecie(e.target.value);
                setPagina(1);
              }}
              className="w-full rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs text-[#0B1020] focus:outline-hidden focus:ring-1 focus:ring-[#06154E]"
            >
              <option value="todos">Espécie: Todas</option>
              <option value="cão">Cães</option>
              <option value="gato">Gatos</option>
            </select>
          </div>

          {/* Filtro Sexo */}
          <div className="w-full md:w-36">
            <select
              value={filtroSexo}
              onChange={(e) => {
                setFiltroSexo(e.target.value);
                setPagina(1);
              }}
              className="w-full rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs text-[#0B1020] focus:outline-hidden focus:ring-1 focus:ring-[#06154E]"
            >
              <option value="todos">Sexo: Todos</option>
              <option value="Macho">Machos</option>
              <option value="Fêmea">Fêmeas</option>
            </select>
          </div>

          {/* Filtro Status */}
          <div className="w-full md:w-32">
            <select
              value={filtroAtivo}
              onChange={(e) => {
                setFiltroAtivo(e.target.value);
                setPagina(1);
              }}
              className="w-full rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs text-[#0B1020] focus:outline-hidden focus:ring-1 focus:ring-[#06154E]"
            >
              <option value="todos">Status: Todos</option>
              <option value="ativos">Apenas Ativos</option>
              <option value="inativos">Inativos</option>
            </select>
          </div>
        </div>

        {/* Linha de contagem filtrada */}
        <div className="flex items-center justify-between text-[11px] text-[#5A6382] pt-1 border-t border-[#E4E7F0]">
          <span>
            Mostrando <b>{tutoresFiltrados.length}</b> de {tutores.length} tutores cadastrados
          </span>
          {(busca || filtroBairro !== 'todos' || filtroEspecie !== 'todos' || filtroSexo !== 'todos' || filtroAtivo !== 'todos') && (
            <button
              onClick={() => {
                setBusca('');
                setFiltroBairro('todos');
                setFiltroEspecie('todos');
                setFiltroSexo('todos');
                setFiltroAtivo('todos');
              }}
              className="text-[#0A2472] font-semibold hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Tutores */}
      <div className="rounded-xl border border-[#E4E7F0] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F8FC] border-b border-[#E4E7F0] text-[#5A6382] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Tutor / Contato</th>
                <th className="px-5 py-3.5">CPF (LGPD)</th>
                <th className="px-5 py-3.5">Bairro</th>
                <th className="px-5 py-3.5">Pets Vinculados</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E7F0]">
              {paginados.map((t) => {
                const cpfRevelado = Boolean(revelarCpfs[t.id]);
                const cpfExibicao = cpfRevelado ? formatarCPF(t.cpf) : mascararCPF(t.cpf);

                return (
                  <tr
                    key={t.id}
                    onClick={() => setTutorSelecionado(t)}
                    className="hover:bg-[#F7F8FC] cursor-pointer transition-colors"
                  >
                    {/* Nome & Telefone */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-[#0B1020] text-sm">
                        {t.nome_completo}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#5A6382] mt-0.5 font-mono">
                        <Phone className="h-3 w-3 text-[#0A2472]" />
                        {formatarTelefoneExibicao(t.telefone_e164)}
                      </div>
                    </td>

                    {/* CPF com Reveal Button */}
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#0B1020]">
                          {cpfExibicao}
                        </span>
                        <button
                          onClick={() => alternarRevelarCpf(t.id)}
                          className="text-[#5A6382] hover:text-[#06154E] p-1 rounded-sm"
                          title={cpfRevelado ? 'Ocultar CPF' : 'Revelar CPF completo'}
                        >
                          {cpfRevelado ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>

                    {/* Bairro */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-[#0B1020]">
                        <MapPin className="h-3.5 w-3.5 text-[#5A6382]" />
                        <span>{t.bairro || 'Guapimirim'}</span>
                      </div>
                    </td>

                    {/* Pets */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {t.pets && t.pets.length > 0 ? (
                          t.pets.map((p) => (
                            <span
                              key={p.id}
                              className="inline-flex items-center gap-1 rounded-md bg-[#EEF1FA] border border-[#E4E7F0] px-2 py-0.5 text-[11px] font-medium text-[#0A2472]"
                            >
                              <HeartHandshake className="h-3 w-3" />
                              {p.nome} <span className="text-[#5A6382]">({p.especie || 'Pet'})</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-[#5A6382] italic">
                            Nenhum pet cadastrado
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleAtivo(t)}
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-colors ${
                          t.ativo
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                        title="Clique para alternar status ativo/inativo"
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${t.ativo ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                        {t.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>

                    {/* Ações */}
                    <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setTutorEmEdicao(t);
                            setModalTutorAberto(true);
                          }}
                          className="p-1.5 rounded-md text-[#5A6382] hover:bg-[#EEF1FA] hover:text-[#0A2472] transition-colors"
                          title="Editar tutor"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => {
                            setPetEmEdicao({ tutor_id: t.id, especie: 'Cão', sexo: 'Macho' });
                            setModalPetAberto(true);
                          }}
                          className="p-1.5 rounded-md text-[#5A6382] hover:bg-[#EEF1FA] hover:text-[#0A2472] transition-colors"
                          title="Adicionar pet a este tutor"
                        >
                          <Plus className="h-4 w-4" />
                        </button>

                        {/* Botão de Excluir: apenas Admin (Moderador vê desabilitado com tooltip) */}
                        {podeExcluir ? (
                          <button
                            onClick={() => handleExcluirTutor(t)}
                            className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Excluir tutor"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            disabled
                            className="p-1.5 rounded-md text-slate-300 cursor-not-allowed opacity-50"
                            title="Apenas administradores podem excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-xs text-[#5A6382]">
                    Nenhum tutor encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé de Paginação */}
        <div className="flex items-center justify-between border-t border-[#E4E7F0] px-5 py-3 text-xs text-[#5A6382]">
          <span>
            Página {pagina} de {totalPaginas}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="rounded-md border border-[#E4E7F0] px-2.5 py-1 font-medium disabled:opacity-40 hover:bg-[#F7F8FC]"
            >
              Anterior
            </button>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="rounded-md border border-[#E4E7F0] px-2.5 py-1 font-medium disabled:opacity-40 hover:bg-[#F7F8FC]"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {/* DRAWER LATERAL DE DETALHES DO TUTOR */}
      {tutorSelecionado && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setTutorSelecionado(null)}
          />
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="w-screen max-w-md bg-white shadow-xl flex flex-col">
              {/* Top Drawer */}
              <div className="flex items-center justify-between border-b border-[#E4E7F0] px-6 py-4 bg-[#06154E] text-white">
                <div>
                  <h3 className="text-base font-bold text-white truncate">
                    {tutorSelecionado.nome_completo}
                  </h3>
                  <p className="text-xs text-white/70">
                    Bairro {tutorSelecionado.bairro || 'Centro'} · Guapimirim
                  </p>
                </div>
                <button
                  onClick={() => setTutorSelecionado(null)}
                  className="rounded-md p-1.5 text-white/70 hover:text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Corpo Drawer */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Cartão de Informações Básicas */}
                <div className="rounded-xl border border-[#E4E7F0] bg-[#F7F8FC] p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A6382]">
                    Dados Pessoais
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[#5A6382]">CPF Oficial:</span>
                      <p className="font-mono font-semibold text-[#0B1020]">
                        {formatarCPF(tutorSelecionado.cpf)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#5A6382]">Telefone:</span>
                      <p className="font-mono font-semibold text-[#0B1020]">
                        {formatarTelefoneExibicao(tutorSelecionado.telefone_e164)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#5A6382]">Bairro:</span>
                      <p className="font-semibold text-[#0B1020]">
                        {tutorSelecionado.bairro || 'Guapimirim'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#5A6382]">Status:</span>
                      <p className="font-semibold text-[#0B1020]">
                        {tutorSelecionado.ativo ? 'Ativo no sistema' : 'Inativo'}
                      </p>
                    </div>
                  </div>
                  {tutorSelecionado.observacoes && (
                    <div className="pt-2 border-t border-[#E4E7F0] text-xs">
                      <span className="text-[#5A6382]">Observações:</span>
                      <p className="text-[#0B1020] mt-0.5">{tutorSelecionado.observacoes}</p>
                    </div>
                  )}
                </div>

                {/* Lista de Pets com Ação de Adicionar Pet */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A6382]">
                      Pets Registrados ({tutorSelecionado.pets?.length || 0})
                    </h4>
                    <button
                      onClick={() => {
                        setPetEmEdicao({
                          tutor_id: tutorSelecionado.id,
                          especie: 'Cão',
                          sexo: 'Macho',
                        });
                        setModalPetAberto(true);
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-[#0A2472] hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar Pet
                    </button>
                  </div>

                  <div className="space-y-2">
                    {tutorSelecionado.pets?.map((pet) => (
                      <div
                        key={pet.id}
                        className="flex items-center justify-between rounded-lg border border-[#E4E7F0] bg-white p-3 shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#0B1020]">{pet.nome}</span>
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#EEF1FA] text-[#0A2472]">
                              {pet.especie || 'Pet'}
                            </span>
                          </div>
                          <p className="text-xs text-[#5A6382] mt-0.5">
                            {pet.raca || 'Sem raça definida'} · {pet.sexo} · {pet.idade || 'Idade n/i'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setPetEmEdicao(pet);
                              setModalPetAberto(true);
                            }}
                            className="p-1 text-[#5A6382] hover:text-[#0A2472]"
                            title="Editar pet"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          {podeExcluir ? (
                            <button
                              onClick={() => {
                                if (confirm(`Remover o pet ${pet.nome}?`)) {
                                  excluirPet(pet.id);
                                  recarregar();
                                }
                              }}
                              className="p-1 text-rose-600 hover:text-rose-800"
                              title="Remover pet"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span title="Apenas admin pode remover">
                              <Trash2 className="h-3.5 w-3.5 text-slate-300 opacity-50" />
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!tutorSelecionado.pets || tutorSelecionado.pets.length === 0) && (
                      <p className="text-xs text-[#5A6382] italic py-2">
                        Nenhum pet cadastrado para este tutor.
                      </p>
                    )}
                  </div>
                </div>

                {/* Histórico de Mensagens Disparadas para este Tutor */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A6382] mb-3">
                    Histórico de Mensagens WhatsApp
                  </h4>
                  {(() => {
                    const enviosTutor = listarEnvios().filter((e) => e.tutor_id === tutorSelecionado.id);
                    if (enviosTutor.length === 0) {
                      return (
                        <p className="text-xs text-[#5A6382] italic">
                          Nenhuma mensagem disparada para este tutor ainda.
                        </p>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        {enviosTutor.map((env) => (
                          <div
                            key={env.id}
                            className="rounded-lg border border-[#E4E7F0] bg-[#F7F8FC] p-3 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-full ${
                                  env.status === 'enviado'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : env.status === 'erro'
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {env.status === 'enviado' ? (
                                  <CheckCircle className="h-3 w-3" />
                                ) : env.status === 'erro' ? (
                                  <AlertCircle className="h-3 w-3" />
                                ) : (
                                  <Clock className="h-3 w-3" />
                                )}
                                {env.status.toUpperCase()} ({env.metodo})
                              </span>
                              <span className="text-[#5A6382] tabular-nums text-[11px]">
                                {new Date(env.criado_em).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <p className="text-[#0B1020] line-clamp-3 bg-white p-2 rounded-md border border-[#E4E7F0]">
                              {env.mensagem_final}
                            </p>
                            {env.erro && (
                              <p className="text-rose-600 text-[11px] font-medium">
                                Erro: {env.erro}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR TUTOR */}
      {modalTutorAberto && tutorEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[#E4E7F0] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#E4E7F0] px-6 py-4 bg-[#06154E] text-white">
              <h3 className="text-base font-bold text-white">
                {tutorEmEdicao.id ? 'Editar Tutor' : 'Cadastrar Novo Tutor'}
              </h3>
              <button
                onClick={() => setModalTutorAberto(false)}
                className="text-white/70 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const nome = (form.elements.namedItem('nome_completo') as HTMLInputElement).value;
                const cpf = (form.elements.namedItem('cpf') as HTMLInputElement).value;
                const tel = (form.elements.namedItem('telefone') as HTMLInputElement).value;
                const bairro = (form.elements.namedItem('bairro') as HTMLInputElement).value;
                const obs = (form.elements.namedItem('observacoes') as HTMLTextAreaElement).value;

                const telE164 = normalizarParaE164(tel);

                salvarTutor({
                  id: tutorEmEdicao.id,
                  nome_completo: nome,
                  cpf,
                  telefone_original: tel,
                  telefone_e164: telE164,
                  bairro,
                  observacoes: obs,
                  ativo: tutorEmEdicao.ativo ?? true,
                });

                adicionarAuditLog({
                  user_id: usuario?.id,
                  user_nome: usuario?.nome,
                  acao: tutorEmEdicao.id ? 'EDITAR_TUTOR' : 'CRIAR_TUTOR',
                  entidade: 'tutores',
                  entidade_id: tutorEmEdicao.id || null,
                  detalhes: { nome, cpf: limparCPF(cpf) },
                });

                setModalTutorAberto(false);
                recarregar();
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#0B1020] mb-1">
                  Nome Completo *
                </label>
                <input
                  name="nome_completo"
                  required
                  defaultValue={tutorEmEdicao.nome_completo || ''}
                  className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs text-[#0B1020] focus:ring-1 focus:ring-[#06154E]"
                  placeholder="Ex: Mariana Santos Silva"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0B1020] mb-1">
                    CPF (11 dígitos)
                  </label>
                  <input
                    name="cpf"
                    defaultValue={tutorEmEdicao.cpf ? formatarCPF(tutorEmEdicao.cpf) : ''}
                    className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs font-mono text-[#0B1020] focus:ring-1 focus:ring-[#06154E]"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#0B1020] mb-1">
                    Telefone WhatsApp
                  </label>
                  <input
                    name="telefone"
                    defaultValue={tutorEmEdicao.telefone_e164 ? formatarTelefoneExibicao(tutorEmEdicao.telefone_e164) : ''}
                    className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs font-mono text-[#0B1020] focus:ring-1 focus:ring-[#06154E]"
                    placeholder="(21) 98765-4321"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0B1020] mb-1">
                  Bairro em Guapimirim
                </label>
                <input
                  name="bairro"
                  defaultValue={tutorEmEdicao.bairro || 'Centro'}
                  className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs text-[#0B1020] focus:ring-1 focus:ring-[#06154E]"
                  placeholder="Ex: Centro, Bananal, Caneca Fina, Parada Modelo..."
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0B1020] mb-1">
                  Observações
                </label>
                <textarea
                  name="observacoes"
                  rows={2}
                  defaultValue={tutorEmEdicao.observacoes || ''}
                  className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs text-[#0B1020] focus:ring-1 focus:ring-[#06154E]"
                  placeholder="Informações adicionais do tutor ou restrições de contato..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E4E7F0]">
                <button
                  type="button"
                  onClick={() => setModalTutorAberto(false)}
                  className="px-4 py-2 rounded-lg border border-[#E4E7F0] text-[#5A6382] font-semibold hover:bg-[#F7F8FC]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#06154E] text-white font-semibold hover:bg-[#0A2472]"
                >
                  Salvar Tutor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR / EDITAR PET */}
      {modalPetAberto && petEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[#E4E7F0] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#E4E7F0] px-6 py-4 bg-[#06154E] text-white">
              <h3 className="text-base font-bold text-white">
                {petEmEdicao.id ? 'Editar Pet' : 'Registrar Novo Pet'}
              </h3>
              <button
                onClick={() => setModalPetAberto(false)}
                className="text-white/70 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const nome = (form.elements.namedItem('nome') as HTMLInputElement).value;
                const especie = (form.elements.namedItem('especie') as HTMLSelectElement).value;
                const sexo = (form.elements.namedItem('sexo') as HTMLSelectElement).value as PetSexo;
                const idade = (form.elements.namedItem('idade') as HTMLInputElement).value;
                const raca = (form.elements.namedItem('raca') as HTMLInputElement).value;

                salvarPet({
                  id: petEmEdicao.id,
                  tutor_id: petEmEdicao.tutor_id!,
                  nome,
                  especie,
                  sexo,
                  idade,
                  raca,
                });

                setModalPetAberto(false);
                recarregar();
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#0B1020] mb-1">
                  Nome do Pet *
                </label>
                <input
                  name="nome"
                  required
                  defaultValue={petEmEdicao.nome || ''}
                  className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs text-[#0B1020] focus:ring-1 focus:ring-[#06154E]"
                  placeholder="Ex: Thor, Mel, Bob..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0B1020] mb-1">
                    Espécie *
                  </label>
                  <select
                    name="especie"
                    defaultValue={petEmEdicao.especie || 'Cão'}
                    className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs text-[#0B1020] focus:ring-1 focus:ring-[#06154E]"
                  >
                    <option value="Cão">Cão</option>
                    <option value="Gato">Gato</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#0B1020] mb-1">
                    Sexo *
                  </label>
                  <select
                    name="sexo"
                    defaultValue={petEmEdicao.sexo || 'Macho'}
                    className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs text-[#0B1020] focus:ring-1 focus:ring-[#06154E]"
                  >
                    <option value="Macho">Macho</option>
                    <option value="Fêmea">Fêmea</option>
                    <option value="Não informado">Não informado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0B1020] mb-1">
                    Raça
                  </label>
                  <input
                    name="raca"
                    defaultValue={petEmEdicao.raca || ''}
                    className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs text-[#0B1020] focus:ring-1 focus:ring-[#06154E]"
                    placeholder="Ex: Vira-lata (SRD), Poodle..."
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#0B1020] mb-1">
                    Idade aproximada
                  </label>
                  <input
                    name="idade"
                    defaultValue={petEmEdicao.idade || ''}
                    className="w-full rounded-lg border border-[#E4E7F0] px-3 py-2 text-xs text-[#0B1020] focus:ring-1 focus:ring-[#06154E]"
                    placeholder="Ex: 2 anos, 8 meses..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E4E7F0]">
                <button
                  type="button"
                  onClick={() => setModalPetAberto(false)}
                  className="px-4 py-2 rounded-lg border border-[#E4E7F0] text-[#5A6382] font-semibold hover:bg-[#F7F8FC]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#06154E] text-white font-semibold hover:bg-[#0A2472]"
                >
                  Salvar Pet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
