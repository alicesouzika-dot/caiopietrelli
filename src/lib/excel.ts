/**
 * Leitor e validador inteligente de planilhas Excel/CSV com SheetJS (xlsx)
 * Suporta planilhas simples e planilhas de mutirão/castração com múltiplas tabelas lado a lado ou blocos semanais,
 * telefones sem DDD (assume DDD 21 de Guapimirim/RJ) e campos em branco para edição posterior.
 */

import * as XLSX from 'xlsx';
import { limparCPF, formatarCPF } from './cpf';
import { normalizarParaE164 } from './telefone';
import { Tutor } from '../types/database';

export interface ColunaMapeada {
  nomeCompleto: string;
  cpf: string;
  telefone: string;
  bairro: string;
  nomePet: string;
  sexoPet: string;
  idadePet: string;
  especiePet: string;
  racaPet: string;
}

export interface LinhaValidada {
  indiceLinha: number;
  dadosOriginais: Record<string, any>;
  nomeCompleto: string;
  cpfLimpo: string;
  cpfFormatado: string;
  telefoneE164: string;
  telefoneOriginal: string;
  bairro: string;
  nomePet: string;
  sexoPet: 'Macho' | 'Fêmea' | 'Não informado';
  idadePet: string;
  especiePet: string;
  racaPet: string;
  status: 'valida' | 'duplicada' | 'invalida';
  erros: string[];
}

export interface ResultadoValidacao {
  linhas: LinhaValidada[];
  totalLidas: number;
  totalValidas: number;
  totalDuplicadas: number;
  totalInvalidas: number;
}

function normStr(val: any): string {
  return String(val ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Normaliza o sexo do pet para os valores permitidos no banco: 'Macho' | 'Fêmea' | 'Não informado'
 */
export function normalizarSexoPet(
  sexoInput: string | undefined,
  categoriaFallback?: string
): 'Macho' | 'Fêmea' | 'Não informado' {
  const s = normStr(sexoInput);
  if (s === 'm' || s.startsWith('macho')) return 'Macho';
  if (s === 'f' || s.startsWith('femea')) return 'Fêmea';

  const cat = normStr(categoriaFallback);
  if (cat.includes('macho') || cat === 'gato' || cat === 'cao') return 'Macho';
  if (cat.includes('gata') || cat.includes('cadela') || cat.includes('femea')) return 'Fêmea';

  return 'Não informado';
}

/**
 * Normaliza a espécie do pet ('FEL' -> 'Gato', 'CAN' -> 'Cão', 'GATA' -> 'Gato', 'CADELA' -> 'Cão')
 */
export function normalizarEspeciePet(
  especieInput: string | undefined,
  categoriaFallback?: string,
  racaInput?: string
): string {
  const e = normStr(especieInput);
  if (e.startsWith('fel') || e.includes('gat')) return 'Gato';
  if (e.startsWith('can') || e.includes('cao') || e.includes('cachorr') || e.includes('cadel')) {
    return 'Cão';
  }

  const cat = normStr(categoriaFallback);
  if (cat.includes('gat') || cat.startsWith('fel')) return 'Gato';
  if (cat.includes('cadel') || cat.includes('cao') || cat.startsWith('can')) return 'Cão';

  const raca = normStr(racaInput);
  if (raca === 'pcb' || raca === 'pcl') return 'Gato';

  if (especieInput && especieInput.trim() && normStr(especieInput) !== '*') {
    return especieInput.trim();
  }
  return 'Cão';
}

/**
 * Auto-detecta os cabeçalhos das colunas com base em sinônimos comuns
 */
export function autoDetectarColunas(cabecalhos: string[]): ColunaMapeada {
  const cabNorm = cabecalhos.map((c) => ({ original: c, normalizado: normStr(c) }));

  const achar = (criterios: string[]): string => {
    for (const crit of criterios) {
      const matchExato = cabNorm.find((item) => item.normalizado === crit);
      if (matchExato) return matchExato.original;
      const matchParcial = cabNorm.find((item) => item.normalizado.includes(crit));
      if (matchParcial) return matchParcial.original;
    }
    return '';
  };

  return {
    nomeCompleto: achar(['nome completo', 'nome tutor', 'nome do tutor', 'tutor', 'nome', 'proprietario', 'responsavel']),
    cpf: achar(['cpf', 'documento', 'doc']),
    telefone: achar(['telefone', 'celular', 'whatsapp', 'zap', 'fone', 'contato', 'tel']),
    bairro: achar(['bairro', 'localidade', 'comunidade', 'regiao', 'endereco']),
    nomePet: achar(['animal', 'nome pet', 'nome do pet', 'pet', 'nome do animal']),
    sexoPet: achar(['sexo', 'genero']),
    idadePet: achar(['idade', 'faixa etaria', 'tempo']),
    especiePet: achar(['especie', 'tipo']),
    racaPet: achar(['raca', 'srd']),
  };
}

interface BlocoColunas {
  colCategoria?: number;
  mapaColunas: Record<string, number>; // Nome padronizado da coluna -> índice na linha
}

const NOMES_PADRAO_CABECALHO: { padrao: string; sin: string[] }[] = [
  { padrao: 'NOME COMPLETO', sin: ['nome completo', 'nome do tutor', 'nome tutor', 'tutor', 'nome'] },
  { padrao: 'CPF', sin: ['cpf', 'documento', 'doc'] },
  { padrao: 'TELEFONE', sin: ['telefone', 'celular', 'whatsapp', 'zap', 'fone', 'contato', 'tel'] },
  { padrao: 'BAIRRO', sin: ['bairro', 'localidade', 'comunidade', 'regiao'] },
  { padrao: 'ANIMAL', sin: ['animal', 'nome do pet', 'nome pet', 'pet', 'nome do animal'] },
  { padrao: 'SEXO', sin: ['sexo', 'genero'] },
  { padrao: 'IDADE', sin: ['idade', 'faixa etaria'] },
  { padrao: 'ESPÉCIE', sin: ['especie', 'tipo'] },
  { padrao: 'RAÇA', sin: ['raca', 'srd'] },
  { padrao: 'PESO', sin: ['peso'] },
];

function identificarPadraoCabecalho(celula: any): string | null {
  const n = normStr(celula);
  if (!n) return null;
  for (const item of NOMES_PADRAO_CABECALHO) {
    if (item.sin.some((s) => n === s || n.includes(s))) {
      return item.padrao;
    }
  }
  return null;
}

/**
 * Verifica se uma linha da matriz é uma linha de cabeçalho (ex: *, NOME COMPLETO, CPF, TELEFONE...)
 * e retorna os blocos horizontais detectados (suporta 1 ou mais tabelas lado a lado na mesma aba).
 */
function detectarBlocosDeCabecalhoNaLinha(row: any[]): BlocoColunas[] | null {
  const indicesNome: number[] = [];
  let totalColunasReconhecidas = 0;

  row.forEach((cell, idx) => {
    const padrao = identificarPadraoCabecalho(cell);
    if (padrao) {
      totalColunasReconhecidas++;
      if (padrao === 'NOME COMPLETO') {
        indicesNome.push(idx);
      }
    }
  });

  // É uma linha de cabeçalho se tiver pelo menos 2 colunas reconhecidas e pelo menos 1 coluna de Nome
  if (totalColunasReconhecidas < 2 || indicesNome.length === 0) {
    return null;
  }

  const blocos: BlocoColunas[] = [];

  for (let b = 0; b < indicesNome.length; b++) {
    const colNome = indicesNome[b];
    const startCol = colNome > 0 && normStr(row[colNome - 1]) === '*' ? colNome - 1 : colNome;
    const endCol =
      b + 1 < indicesNome.length
        ? (normStr(row[indicesNome[b + 1] - 1]) === '*' ? indicesNome[b + 1] - 2 : indicesNome[b + 1] - 1)
        : row.length - 1;

    const mapaColunas: Record<string, number> = {};
    let colCategoria: number | undefined = undefined;

    if (colNome > 0 && (normStr(row[colNome - 1]) === '*' || normStr(row[colNome - 1]) === '')) {
      colCategoria = colNome - 1;
    }

    for (let c = startCol; c <= endCol; c++) {
      const padrao = identificarPadraoCabecalho(row[c]);
      if (padrao && mapaColunas[padrao] === undefined) {
        mapaColunas[padrao] = c;
      } else if (String(row[c] ?? '').trim() && c !== colCategoria) {
        const chaveCustom = String(row[c]).trim();
        if (mapaColunas[chaveCustom] === undefined) {
          mapaColunas[chaveCustom] = c;
        }
      }
    }

    blocos.push({ colCategoria, mapaColunas });
  }

  return blocos;
}

function isNomeDescartavel(nome: string): boolean {
  const n = normStr(nome);
  if (!n) return true;
  if (n === '*' || n === '-' || n === '--' || n === '---') return true;
  if (n === 'ocupado' || n === 'vago' || n === 'cancelado' || n === 'livre') return true;
  if (n === 'nome completo' || n === 'nome' || n === 'tutor' || n === 'nome do tutor') return true;
  if (
    /^(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/.test(
      n
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Lê o arquivo Excel/CSV (todas as abas e blocos lado a lado/verticais) e retorna cabeçalhos limpos e linhas prontas
 */
export async function lerArquivoExcel(file: File): Promise<{
  cabecalhos: string[];
  linhas: Record<string, any>[];
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const linhasExtraidas: Record<string, any>[] = [];
  const cabecalhosSet = new Set<string>();

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const matriz = XLSX.utils.sheet_to_json<any[]>(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (!matriz || matriz.length === 0) continue;

    let blocosAtivos: BlocoColunas[] | null = null;

    for (let r = 0; r < matriz.length; r++) {
      const row = matriz[r];
      if (!Array.isArray(row)) continue;

      // Verifica se esta linha é um cabeçalho (inicial ou repetido no meio da planilha)
      const novosBlocos = detectarBlocosDeCabecalhoNaLinha(row);
      if (novosBlocos) {
        blocosAtivos = novosBlocos;
        novosBlocos.forEach((b) => {
          Object.keys(b.mapaColunas).forEach((k) => cabecalhosSet.add(k));
        });
        continue;
      }

      if (!blocosAtivos) continue;

      // Extrai os dados de cada bloco (ex: tabela da esquerda e tabela da direita)
      for (const bloco of blocosAtivos) {
        const reg: Record<string, any> = {};
        let possuiAlgumDado = false;

        const categoriaSlot =
          bloco.colCategoria !== undefined ? String(row[bloco.colCategoria] ?? '').trim() : '';

        for (const [nomeColuna, colIdx] of Object.entries(bloco.mapaColunas)) {
          const val = String(row[colIdx] ?? '').trim();
          reg[nomeColuna] = val;
          if (val) possuiAlgumDado = true;
        }

        if (!possuiAlgumDado) continue;

        let nomeTutor = String(reg['NOME COMPLETO'] ?? '').trim();
        let cpf = String(reg['CPF'] ?? '').trim();
        let telefone = String(reg['TELEFONE'] ?? '').trim();
        let animal = String(reg['ANIMAL'] ?? '').trim();

        // Trata caso em que o nome do pet foi digitado junto com o telefone na mesma célula (ex: "997640253 LUPITA")
        if (!animal && telefone) {
          const matchTelEPet = telefone.match(/^([\d\s().+-]{8,})\s+([A-Za-zÀ-ÿ]{2,}.*)$/);
          if (matchTelEPet) {
            const possivelPalavra = normStr(matchTelEPet[2]);
            if (!['zap', 'whatsapp', 'tel', 'celular', 'fixo', 'recado'].includes(possivelPalavra)) {
              telefone = matchTelEPet[1].trim();
              animal = matchTelEPet[2].trim();
              reg['TELEFONE'] = telefone;
              reg['ANIMAL'] = animal;
            }
          }
        }

        // Ignora linhas que são apenas slots vazios de agenda (ex: GATA,,,,,,,,, ou CADELA,OCUPADO,,,,,,,,)
        if (isNomeDescartavel(nomeTutor)) {
          const temCpfOuTelOuAnimal = Boolean(limparCPF(cpf) || normalizarParaE164(telefone) || animal);
          if (!temCpfOuTelOuAnimal || normStr(nomeTutor) === 'ocupado') {
            continue;
          }
          nomeTutor = '';
          reg['NOME COMPLETO'] = '';
        }

        // Normaliza Espécie e Sexo aproveitando a coluna '*' (GATA / CADELA / MACHO) quando disponível
        reg['ESPÉCIE'] = normalizarEspeciePet(reg['ESPÉCIE'], categoriaSlot, reg['RAÇA']);
        reg['SEXO'] = normalizarSexoPet(reg['SEXO'], categoriaSlot);

        linhasExtraidas.push(reg);
      }
    }

    // Fallback caso a planilha não tenha cabeçalhos padrões reconhecidos na varredura de blocos
    if (linhasExtraidas.length === 0 && matriz.length > 1) {
      const dadosFallback = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
        defval: '',
      });
      if (dadosFallback.length > 0) {
        Object.keys(dadosFallback[0]).forEach((k) => cabecalhosSet.add(k));
        linhasExtraidas.push(...dadosFallback);
      }
    }
  }

  return {
    cabecalhos: Array.from(cabecalhosSet),
    linhas: linhasExtraidas,
  };
}

/**
 * Valida linha a linha de forma flexível:
 * - Aceita telefones sem DDD (adiciona DDD 21 automaticamente) ou em branco
 * - Aceita CPF ausente ou incompleto para posterior edição junto ao tutor
 * - Ignora campos vazios sem rejeitar o cadastro
 */
export function validarLinhasExcel(
  linhasBrutas: Record<string, any>[],
  mapeamento: ColunaMapeada,
  tutoresExistentes: Tutor[]
): ResultadoValidacao {
  const cpfsCadastrados = new Set(
    tutoresExistentes.map((t) => limparCPF(t.cpf)).filter((c) => c.length > 0)
  );
  const nomesCadastrados = new Set(
    tutoresExistentes.map((t) => normStr(t.nome_completo)).filter((n) => n.length > 0)
  );

  const cpfsNaPlanilha = new Set<string>();
  const nomesNaPlanilha = new Set<string>();

  const linhasValidadas: LinhaValidada[] = [];

  linhasBrutas.forEach((linha, idx) => {
    const erros: string[] = [];
    const nomeCompletoBruto = mapeamento.nomeCompleto
      ? String(linha[mapeamento.nomeCompleto] || '').trim()
      : '';
    const cpfBruto = mapeamento.cpf ? String(linha[mapeamento.cpf] || '').trim() : '';
    const telBruto = mapeamento.telefone ? String(linha[mapeamento.telefone] || '').trim() : '';
    const bairro = mapeamento.bairro ? String(linha[mapeamento.bairro] || '').trim() : '';
    const nomePetBruto = mapeamento.nomePet ? String(linha[mapeamento.nomePet] || '').trim() : '';
    const sexoPetBruto = mapeamento.sexoPet ? String(linha[mapeamento.sexoPet] || '').trim() : '';
    const idadePet = mapeamento.idadePet ? String(linha[mapeamento.idadePet] || '').trim() : '';
    const especiePetBruta = mapeamento.especiePet
      ? String(linha[mapeamento.especiePet] || '').trim()
      : '';
    const racaPet = mapeamento.racaPet ? String(linha[mapeamento.racaPet] || '').trim() : '';

    let cpfLimpo = limparCPF(cpfBruto);
    if (cpfLimpo.length === 10) {
      cpfLimpo = '0' + cpfLimpo;
    }

    const telE164 = normalizarParaE164(telBruto);

    // Se a linha estiver completamente vazia (sem nome de tutor, sem CPF, sem telefone e sem pet), ignora silenciosamente
    if (
      isNomeDescartavel(nomeCompletoBruto) &&
      !cpfLimpo &&
      !telE164 &&
      (!nomePetBruto || isNomeDescartavel(nomePetBruto))
    ) {
      return;
    }

    const nomeCompleto = !isNomeDescartavel(nomeCompletoBruto)
      ? nomeCompletoBruto
      : 'Tutor a identificar';

    const nomeNorm = normStr(nomeCompleto);
    const especieFinal = normalizarEspeciePet(especiePetBruta, undefined, racaPet);
    const sexoFinal = normalizarSexoPet(sexoPetBruto);

    // Verifica se o tutor já existe (por CPF ou por Nome Completo) para vincular novo pet sem duplicar o tutor
    let status: 'valida' | 'duplicada' | 'invalida' = 'valida';

    if (
      (cpfLimpo && (cpfsCadastrados.has(cpfLimpo) || cpfsNaPlanilha.has(cpfLimpo))) ||
      (nomeNorm !== 'tutor a identificar' &&
        (nomesCadastrados.has(nomeNorm) || nomesNaPlanilha.has(nomeNorm)))
    ) {
      status = 'duplicada';
    }

    if (cpfLimpo) {
      cpfsNaPlanilha.add(cpfLimpo);
    }
    if (nomeNorm && nomeNorm !== 'tutor a identificar') {
      nomesNaPlanilha.add(nomeNorm);
    }

    linhasValidadas.push({
      indiceLinha: idx + 1,
      dadosOriginais: linha,
      nomeCompleto,
      cpfLimpo,
      cpfFormatado: cpfLimpo ? formatarCPF(cpfLimpo) : '',
      telefoneE164: telE164,
      telefoneOriginal: telBruto,
      bairro: bairro || 'Centro',
      nomePet: nomePetBruto || '',
      sexoPet: sexoFinal,
      idadePet,
      especiePet: especieFinal,
      racaPet: racaPet || 'SRD',
      status,
      erros,
    });
  });

  const totalValidas = linhasValidadas.filter((l) => l.status === 'valida').length;
  const totalDuplicadas = linhasValidadas.filter((l) => l.status === 'duplicada').length;
  const totalInvalidas = linhasValidadas.filter((l) => l.status === 'invalida').length;

  return {
    linhas: linhasValidadas,
    totalLidas: linhasValidadas.length,
    totalValidas,
    totalDuplicadas,
    totalInvalidas,
  };
}

/**
 * Gera e dispara o download do CSV contendo apenas as linhas inválidas e os motivos de erro
 */
export function baixarRelatorioErrosCSV(linhasInvalidas: LinhaValidada[]): void {
  const dados = linhasInvalidas.map((l) => ({
    'Linha Excel': l.indiceLinha,
    'Nome Tutor': l.nomeCompleto,
    'CPF Informado': l.dadosOriginais['cpf'] || l.cpfLimpo,
    'Telefone Informado': l.telefoneOriginal,
    'Bairro': l.bairro,
    'Nome do Pet': l.nomePet,
    'Motivos de Erro': l.erros.join('; '),
  }));

  const worksheet = XLSX.utils.json_to_sheet(dados);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `relatorio_erros_importacao_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Cria e baixa uma planilha modelo oficial do Excel (.xlsx) pré-preenchida com exemplos reais de Guapimirim
 */
export function baixarPlanilhaModeloExemplo(): void {
  const dadosExemplo = [
    {
      'Nome Completo': 'Ana Clara Mendes',
      'CPF': '529.982.247-25',
      'Número de Telefone': '(21) 98765-1122',
      'Bairro': 'Centro',
      'Nome do Pet': 'Max',
      'Sexo do Pet': 'Macho',
      'Idade do Pet': '2 anos',
      'Espécie do Pet': 'Cão',
      'Raça do Pet': 'Beagle',
    },
    {
      'Nome Completo': 'Ana Clara Mendes',
      'CPF': '529.982.247-25',
      'Número de Telefone': '(21) 98765-1122',
      'Bairro': 'Centro',
      'Nome do Pet': 'Mimi',
      'Sexo do Pet': 'Fêmea',
      'Idade do Pet': '1 ano',
      'Espécie do Pet': 'Gato',
      'Raça do Pet': 'Siamês',
    },
    {
      'Nome Completo': 'Tatiane Pires Moreira',
      'CPF': '854.120.369-87',
      'Número de Telefone': '99345-6789',
      'Bairro': 'Parada Modelo',
      'Nome do Pet': 'Lili',
      'Sexo do Pet': 'Fêmea',
      'Idade do Pet': '6 meses',
      'Espécie do Pet': 'Gato',
      'Raça do Pet': 'Angorá',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(dadosExemplo);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tutores e Pets');

  XLSX.writeFile(workbook, 'modelo_importacao_amigos_do_caio.xlsx');
}
