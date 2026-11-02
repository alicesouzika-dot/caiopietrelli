/**
 * Importador de Planilha Excel (SheetJS)
 * Wizard em 4 etapas: Upload -> Mapeamento -> Validação/Prévia -> Confirmação com Deduplicação e Auditoria
 */

import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Download,
  Check,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import {
  lerArquivoExcel,
  autoDetectarColunas,
  validarLinhasExcel,
  ColunaMapeada,
  ResultadoValidacao,
  baixarRelatorioErrosCSV,
  baixarPlanilhaModeloExemplo,
} from '../lib/excel';
import {
  listarTutores,
  importarLoteTutoresEPets,
  adicionarAuditLog,
} from '../lib/storageEngine';
import { formatarCPF } from '../lib/cpf';
import { formatarTelefoneExibicao } from '../lib/telefone';
import { useAuth } from '../contexts/AuthContext';
import { PageId } from '../components/layout/Sidebar';

interface ImportarProps {
  onNavigate: (page: PageId) => void;
}

export const Importar: React.FC<ImportarProps> = ({ onNavigate }) => {
  const { usuario } = useAuth();

  // Etapa atual (1 a 4)
  const [etapa, setEtapa] = useState<1 | 2 | 3 | 4>(1);

  // Arquivo carregado
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [cabecalhos, setCabecalhos] = useState<string[]>([]);
  const [linhasBrutas, setLinhasBrutas] = useState<Record<string, any>[]>([]);

  // Mapeamento de colunas
  const [mapeamento, setMapeamento] = useState<ColunaMapeada>({
    nomeCompleto: '',
    cpf: '',
    telefone: '',
    bairro: '',
    nomePet: '',
    sexoPet: '',
    idadePet: '',
    especiePet: '',
    racaPet: '',
  });

  // Resultado da validação
  const [resultado, setResultado] = useState<ResultadoValidacao | null>(null);

  // Progresso de importação
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resumoFinal, setResumoFinal] = useState<{
    criados: number;
    atualizados: number;
    petsAdicionados: number;
    ignorados: number;
  } | null>(null);

  // Handlers
  const processarArquivo = async (file: File) => {
    try {
      setArquivo(file);
      const { cabecalhos: cabs, linhas } = await lerArquivoExcel(file);
      setCabecalhos(cabs);
      setLinhasBrutas(linhas);

      // Auto detecção
      const detectado = autoDetectarColunas(cabs);
      setMapeamento(detectado);
      setEtapa(2);
    } catch (err: any) {
      alert('Erro ao ler a planilha: ' + (err.message || 'Arquivo corrompido ou formato inválido'));
    }
  };

  const handleValidarMapeamento = () => {
    if (!mapeamento.nomeCompleto) {
      alert('Selecione pelo menos a coluna de Nome do Tutor.');
      return;
    }
    const tutoresAtuais = listarTutores();
    const res = validarLinhasExcel(linhasBrutas, mapeamento, tutoresAtuais);
    setResultado(res);
    setEtapa(3);
  };

  const handleExecutarImportacao = async () => {
    if (!resultado) return;

    setProcessando(true);
    setProgresso(5);

    const linhasValidasOuDuplicadas = resultado.linhas.filter(
      (l) => l.status === 'valida' || l.status === 'duplicada'
    );

    const ignorados = resultado.totalInvalidas;

    const { criados, atualizados, petsAdicionados } = await importarLoteTutoresEPets(
      linhasValidasOuDuplicadas,
      (pct) => setProgresso(pct)
    );

    // Registra na auditoria
    adicionarAuditLog({
      user_id: usuario?.id,
      user_nome: usuario?.nome,
      acao: 'IMPORTAR_EXCEL',
      entidade: 'tutores',
      entidade_id: null,
      detalhes: {
        arquivo: arquivo?.name,
        total_lidas: resultado.totalLidas,
        criados,
        atualizados,
        pets_adicionados: petsAdicionados,
        ignorados,
      },
    });

    setResumoFinal({ criados, atualizados, petsAdicionados, ignorados });
    setProcessando(false);
    setEtapa(4);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0B1020]">
            Importador de Planilha Excel
          </h2>
          <p className="text-xs text-[#5A6382]">
            Carregue planilhas de cadastros, feiras e mutirões com deduplicação por CPF
          </p>
        </div>

        <button
          onClick={baixarPlanilhaModeloExemplo}
          className="flex items-center gap-1.5 rounded-lg border border-[#0A2472] bg-[#EEF1FA] px-3.5 py-2 text-xs font-semibold text-[#0A2472] hover:bg-[#e1e6f7] transition-colors"
        >
          <Download className="h-4 w-4" />
          Baixar Planilha Modelo (.xlsx)
        </button>
      </div>

      {/* Indicador de Passos do Wizard (Zero-Pill Discipline) */}
      <div className="rounded-xl border border-[#E4E7F0] bg-white p-4 shadow-2xs">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {[
            { num: 1, label: 'Upload do Arquivo' },
            { num: 2, label: 'Mapeamento' },
            { num: 3, label: 'Validação e Prévia' },
            { num: 4, label: 'Confirmação' },
          ].map((step) => {
            const ativo = etapa === step.num;
            const concluido = etapa > step.num;

            return (
              <div
                key={step.num}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors ${
                  ativo
                    ? 'bg-[#EEF1FA] text-[#06154E] font-bold'
                    : concluido
                    ? 'text-emerald-700'
                    : 'text-[#5A6382]'
                }`}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    ativo
                      ? 'bg-[#06154E] text-white'
                      : concluido
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-[#5A6382]'
                  }`}
                >
                  {concluido ? <Check className="h-3.5 w-3.5" /> : step.num}
                </div>
                <span className="text-[11px] truncate w-full">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ETAPA 1: UPLOAD */}
      {etapa === 1 && (
        <div className="rounded-2xl border border-dashed border-[#E4E7F0] bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EEF1FA] text-[#0A2472] mb-4">
            <UploadCloud className="h-8 w-8" />
          </div>

          <h3 className="text-base font-bold text-[#0B1020]">
            Arraste e solte sua planilha aqui
          </h3>
          <p className="text-xs text-[#5A6382] mt-1 max-w-md mx-auto">
            Formatos aceitos: <b>.xlsx</b>, <b>.xls</b> e <b>.csv</b>. O sistema detectará automaticamente as colunas de tutor, CPF, telefone e dados do pet.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <label className="cursor-pointer rounded-lg bg-[#06154E] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#0A2472] shadow-xs transition-colors">
              Selecionar Arquivo no Computador
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processarArquivo(file);
                }}
              />
            </label>

            <button
              onClick={baixarPlanilhaModeloExemplo}
              className="rounded-lg border border-[#E4E7F0] px-4 py-2.5 text-xs font-semibold text-[#0B1020] hover:bg-[#F7F8FC]"
            >
              Baixar Modelo Pré-Preenchido
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 2: MAPEAMENTO DE COLUNAS */}
      {etapa === 2 && (
        <div className="rounded-xl border border-[#E4E7F0] bg-white p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#E4E7F0]">
            <div>
              <h3 className="text-sm font-bold text-[#0B1020]">
                Mapeamento de Colunas da Planilha
              </h3>
              <p className="text-xs text-[#5A6382]">
                Arquivo: <b>{arquivo?.name}</b> ({linhasBrutas.length} linhas detectadas)
              </p>
            </div>
            <button
              onClick={() => setEtapa(1)}
              className="flex items-center gap-1 text-xs text-[#5A6382] hover:text-[#0B1020]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Trocar arquivo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Nome Completo */}
            <div>
              <label className="block font-semibold text-[#0B1020] mb-1">
                Nome do Tutor *
              </label>
              <select
                value={mapeamento.nomeCompleto}
                onChange={(e) => setMapeamento({ ...mapeamento, nomeCompleto: e.target.value })}
                className="w-full rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs"
              >
                <option value="">-- Selecione a coluna --</option>
                {cabecalhos.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* CPF */}
            <div>
              <label className="block font-semibold text-[#0B1020] mb-1">
                CPF do Tutor *
              </label>
              <select
                value={mapeamento.cpf}
                onChange={(e) => setMapeamento({ ...mapeamento, cpf: e.target.value })}
                className="w-full rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs"
              >
                <option value="">-- Selecione a coluna --</option>
                {cabecalhos.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Telefone */}
            <div>
              <label className="block font-semibold text-[#0B1020] mb-1">
                Número de Telefone / WhatsApp *
              </label>
              <select
                value={mapeamento.telefone}
                onChange={(e) => setMapeamento({ ...mapeamento, telefone: e.target.value })}
                className="w-full rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs"
              >
                <option value="">-- Selecione a coluna --</option>
                {cabecalhos.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Bairro */}
            <div>
              <label className="block font-semibold text-[#0B1020] mb-1">
                Bairro (Guapimirim)
              </label>
              <select
                value={mapeamento.bairro}
                onChange={(e) => setMapeamento({ ...mapeamento, bairro: e.target.value })}
                className="w-full rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs"
              >
                <option value="">-- Ignorar ou não informado --</option>
                {cabecalhos.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Nome do Pet */}
            <div>
              <label className="block font-semibold text-[#0B1020] mb-1">
                Nome do Pet
              </label>
              <select
                value={mapeamento.nomePet}
                onChange={(e) => setMapeamento({ ...mapeamento, nomePet: e.target.value })}
                className="w-full rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs"
              >
                <option value="">-- Ignorar ou sem pet --</option>
                {cabecalhos.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Espécie */}
            <div>
              <label className="block font-semibold text-[#0B1020] mb-1">
                Espécie (Cão / Gato)
              </label>
              <select
                value={mapeamento.especiePet}
                onChange={(e) => setMapeamento({ ...mapeamento, especiePet: e.target.value })}
                className="w-full rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs"
              >
                <option value="">-- Padrão: Cão --</option>
                {cabecalhos.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Sexo */}
            <div>
              <label className="block font-semibold text-[#0B1020] mb-1">
                Sexo do Pet
              </label>
              <select
                value={mapeamento.sexoPet}
                onChange={(e) => setMapeamento({ ...mapeamento, sexoPet: e.target.value })}
                className="w-full rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs"
              >
                <option value="">-- Padrão: Não informado --</option>
                {cabecalhos.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Idade */}
            <div>
              <label className="block font-semibold text-[#0B1020] mb-1">
                Idade do Pet
              </label>
              <select
                value={mapeamento.idadePet}
                onChange={(e) => setMapeamento({ ...mapeamento, idadePet: e.target.value })}
                className="w-full rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs"
              >
                <option value="">-- Opcional --</option>
                {cabecalhos.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Raça */}
            <div>
              <label className="block font-semibold text-[#0B1020] mb-1">
                Raça do Pet
              </label>
              <select
                value={mapeamento.racaPet}
                onChange={(e) => setMapeamento({ ...mapeamento, racaPet: e.target.value })}
                className="w-full rounded-lg border border-[#E4E7F0] bg-white px-3 py-2 text-xs"
              >
                <option value="">-- Opcional --</option>
                {cabecalhos.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E4E7F0]">
            <button
              onClick={() => setEtapa(1)}
              className="rounded-lg border border-[#E4E7F0] px-4 py-2 text-xs font-semibold text-[#5A6382]"
            >
              Voltar
            </button>
            <button
              onClick={handleValidarMapeamento}
              className="flex items-center gap-1.5 rounded-lg bg-[#06154E] px-5 py-2 text-xs font-bold text-white hover:bg-[#0A2472]"
            >
              Validar Planilha <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 3: VALIDAÇÃO E PRÉVIA */}
      {etapa === 3 && resultado && (
        <div className="space-y-6">
          {/* Cards de Contagem */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[#E4E7F0] bg-white p-4">
              <span className="text-xs text-[#5A6382]">Total de Linhas</span>
              <p className="text-2xl font-bold font-mono text-[#0B1020] tabular-nums mt-1">
                {resultado.totalLidas}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-1 text-xs text-emerald-800 font-semibold">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Válidas (Novos)
              </div>
              <p className="text-2xl font-bold font-mono text-emerald-700 tabular-nums mt-1">
                {resultado.totalValidas}
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <div className="flex items-center gap-1 text-xs text-amber-800 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Duplicadas (Adiciona Pet)
              </div>
              <p className="text-2xl font-bold font-mono text-amber-700 tabular-nums mt-1">
                {resultado.totalDuplicadas}
              </p>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
              <div className="flex items-center gap-1 text-xs text-rose-800 font-semibold">
                <XCircle className="h-3.5 w-3.5 text-rose-600" /> Inválidas (Rejeitadas)
              </div>
              <p className="text-2xl font-bold font-mono text-rose-700 tabular-nums mt-1">
                {resultado.totalInvalidas}
              </p>
            </div>
          </div>

          {/* Botão de download do relatório de erros se houver inválidas */}
          {resultado.totalInvalidas > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                <span>
                  Foram encontradas <b>{resultado.totalInvalidas} linhas com erros</b> (CPF inválido, telefone ausente ou dados incompletos). Elas serão ignoradas na importação.
                </span>
              </div>
              <button
                onClick={() =>
                  baixarRelatorioErrosCSV(resultado.linhas.filter((l) => l.status === 'invalida'))
                }
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 font-bold text-white hover:bg-rose-700 shrink-0"
              >
                <Download className="h-3.5 w-3.5" /> Baixar Relatório de Erros (.csv)
              </button>
            </div>
          )}

          {/* Tabela de Prévia Linha a Linha */}
          <div className="rounded-xl border border-[#E4E7F0] bg-white shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E4E7F0] bg-[#F7F8FC]">
              <h4 className="text-xs font-bold text-[#0B1020]">
                Prévia da Validação (Primeiras linhas da planilha)
              </h4>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8FC] border-b border-[#E4E7F0] text-[#5A6382] font-semibold text-[11px]">
                  <tr>
                    <th className="px-4 py-2.5">Linha</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Tutor</th>
                    <th className="px-4 py-2.5">CPF</th>
                    <th className="px-4 py-2.5">Telefone</th>
                    <th className="px-4 py-2.5">Pet & Espécie</th>
                    <th className="px-4 py-2.5">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7F0]">
                  {resultado.linhas.slice(0, 100).map((l) => (
                    <tr key={l.indiceLinha} className="hover:bg-[#F7F8FC]">
                      <td className="px-4 py-2.5 font-mono text-[#5A6382]">
                        #{l.indiceLinha}
                      </td>
                      <td className="px-4 py-2.5">
                        {l.status === 'valida' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            <CheckCircle className="h-3 w-3" /> Válida
                          </span>
                        )}
                        {l.status === 'duplicada' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                            <AlertTriangle className="h-3 w-3" /> Duplicada
                          </span>
                        )}
                        {l.status === 'invalida' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">
                            <XCircle className="h-3 w-3" /> Inválida
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-[#0B1020]">
                        {l.nomeCompleto || '---'}
                      </td>
                      <td className="px-4 py-2.5 font-mono">
                        {l.cpfLimpo ? formatarCPF(l.cpfLimpo) : <span className="text-[#5A6382] italic font-sans">Em branco</span>}
                      </td>
                      <td className="px-4 py-2.5 font-mono">
                        {l.telefoneE164 ? formatarTelefoneExibicao(l.telefoneE164) : <span className="text-[#5A6382] italic font-sans">Em branco</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {l.nomePet ? `${l.nomePet} (${l.especiePet})` : <span className="text-[#5A6382] italic">Sem pet</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {l.status === 'valida' && (
                          <span className="text-emerald-700 text-[11px]">Novo tutor e pet prontos para importar</span>
                        )}
                        {l.status === 'duplicada' && (
                          <span className="text-amber-700 text-[11px]">Tutor já existente → vincula/atualiza pet</span>
                        )}
                        {l.status === 'invalida' && (
                          <span className="text-rose-600 font-semibold text-[11px]">
                            {l.erros.join(', ')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#E4E7F0]">
            <button
              onClick={() => setEtapa(2)}
              className="rounded-lg border border-[#E4E7F0] px-4 py-2 text-xs font-semibold text-[#5A6382]"
            >
              Voltar ao Mapeamento
            </button>

            <button
              onClick={handleExecutarImportacao}
              disabled={processando || resultado.totalValidas + resultado.totalDuplicadas === 0}
              className="flex items-center gap-2 rounded-lg bg-[#06154E] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#0A2472] disabled:opacity-50"
            >
              {processando ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Importando ({progresso}%)...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Confirmar e Gravar no Banco ({resultado.totalValidas + resultado.totalDuplicadas} registros)
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 4: CONFIRMAÇÃO E RESUMO FINAL */}
      {etapa === 4 && resumoFinal && (
        <div className="rounded-2xl border border-[#E4E7F0] bg-white p-8 text-center shadow-xs space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <FileCheck className="h-8 w-8" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-[#0B1020]">
              Importação Concluída com Sucesso!
            </h3>
            <p className="text-xs text-[#5A6382] mt-1">
              Os dados foram processados e persistidos na base de tutores de Guapimirim.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto text-left">
            <div className="rounded-xl border border-[#E4E7F0] bg-[#F7F8FC] p-4">
              <span className="text-xs text-[#5A6382]">Novos Tutores</span>
              <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
                +{resumoFinal.criados}
              </p>
            </div>
            <div className="rounded-xl border border-[#E4E7F0] bg-[#F7F8FC] p-4">
              <span className="text-xs text-[#5A6382]">Tutores Atualizados</span>
              <p className="text-xl font-bold font-mono text-blue-700 mt-1">
                {resumoFinal.atualizados}
              </p>
            </div>
            <div className="rounded-xl border border-[#E4E7F0] bg-[#F7F8FC] p-4">
              <span className="text-xs text-[#5A6382]">Pets Adicionados</span>
              <p className="text-xl font-bold font-mono text-pink-700 mt-1">
                +{resumoFinal.petsAdicionados}
              </p>
            </div>
            <div className="rounded-xl border border-[#E4E7F0] bg-[#F7F8FC] p-4">
              <span className="text-xs text-[#5A6382]">Linhas Ignoradas</span>
              <p className="text-xl font-bold font-mono text-[#5A6382] mt-1">
                {resumoFinal.ignorados}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-[#E4E7F0]">
            <button
              onClick={() => onNavigate('tutores')}
              className="rounded-lg bg-[#06154E] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0A2472]"
            >
              Ver Lista de Tutores e Pets
            </button>
            <button
              onClick={() => onNavigate('campanha-nova')}
              className="rounded-lg bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-800"
            >
              Disparar Campanha WhatsApp
            </button>
            <button
              onClick={() => {
                setArquivo(null);
                setLinhasBrutas([]);
                setResultado(null);
                setEtapa(1);
              }}
              className="rounded-lg border border-[#E4E7F0] px-4 py-2.5 text-xs font-semibold text-[#5A6382] hover:bg-[#F7F8FC]"
            >
              Importar Outra Planilha
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
