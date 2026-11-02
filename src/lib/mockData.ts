/**
 * Dados iniciais do sistema Amigos do Caio (Guapimirim/RJ)
 * Sincronizados com os UUIDs do banco de dados Supabase (ciyaeuhbzskwzmntadaz)
 */

import { Profile, Tutor, Pet, Template, Campanha, Envio, AuditLog } from '../types/database';

export const INITIAL_PROFILES: Profile[] = [
  {
    id: '60f81164-83b1-42ac-88bb-4146e3a3543d',
    nome: 'Caio Silva (Vereador)',
    email: 'admin@guapimirim.rj.gov.br',
    role: 'admin',
    ativo: true,
    ultimo_acesso: new Date().toISOString(),
    criado_em: '2026-01-10T10:00:00Z',
  },
  {
    id: '09327367-ef12-404b-99c6-ba6fd2bf5170',
    nome: 'Lucas Assessor (Proteção Animal)',
    email: 'moderador@guapimirim.rj.gov.br',
    role: 'moderador',
    ativo: true,
    ultimo_acesso: new Date(Date.now() - 3600000).toISOString(),
    criado_em: '2026-01-15T14:30:00Z',
  },
  {
    id: '9b7166a4-5803-4707-8227-7f3346f94c3a',
    nome: 'Dra. Carolina Mendes (Veterinária)',
    email: 'dra.carolina@guapimirim.rj.gov.br',
    role: 'moderador',
    ativo: true,
    ultimo_acesso: new Date(Date.now() - 86400000).toISOString(),
    criado_em: '2026-02-01T09:15:00Z',
  },
];

export const INITIAL_CONFIGS: Record<string, string> = {
  remetente_numero: '5521976397273',
  zapi_ativo: 'false',
  zapi_instance_id: '',
  zapi_token: '',
  zapi_client_token: '',
  zapi_base_url: 'https://api.z-api.io',
  delay_entre_envios_ms: '5000',
  delay_digitando_s: '2',
  max_tentativas: '3',
  nome_assinatura: 'Equipe Amigos do Caio',
};

export const INITIAL_TEMPLATES: Template[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    titulo: 'Campanha de Vacinação Antirrábica',
    categoria: 'vacinacao',
    corpo: `Olá, {{nome_tutor}}! 🐾

A Secretaria de Bem-Estar e Proteção Animal de Guapimirim informa: *campanha de vacinação antirrábica* no bairro {{bairro}}.

Traga o {{nome_pet}} ({{especie}}) com coleira e guia. A vacinação é *gratuita*.

{{assinatura}}`,
    ativo: true,
    criado_em: '2026-01-12T08:00:00Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    titulo: 'Feira de Adoção Responsável',
    categoria: 'adocao',
    corpo: `Oi, {{nome_tutor}}! 🐶🐱

Neste sábado tem *Feira de Adoção* em Guapimirim! Filhotes e adultos esperando um lar cheio de carinho.

Se o {{nome_pet}} já faz sua casa feliz, imagina um irmãozinho pra ele?

Entrada gratuita. Traga a família!

{{assinatura}}`,
    ativo: true,
    criado_em: '2026-01-14T11:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    titulo: 'Evento Pet no Bairro',
    categoria: 'evento',
    corpo: `Atenção, tutores de {{bairro}}! 🎪

Vem aí o *Evento Pet de Guapimirim*: banho solidário, microchipagem, orientação veterinária e adoção.

Esperamos você e o {{nome_pet}}!

{{assinatura}}`,
    ativo: true,
    criado_em: '2026-01-20T15:00:00Z',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    titulo: 'Mutirão Municipal de Castração',
    categoria: 'castracao',
    corpo: `Olá, {{nome_tutor}}! 🩺

Estão abertas as inscrições para o *Mutirão Gratuito de Castração* em Guapimirim.

Se você deseja cadastrar o {{nome_pet}} ({{especie}}), responda esta mensagem para agendarmos a triagem. Vagas limitadas por ordem de resposta!

{{assinatura}}`,
    ativo: true,
    criado_em: '2026-02-05T09:30:00Z',
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    titulo: 'Comunicado Geral de Proteção Animal',
    categoria: 'geral',
    corpo: `Prezado(a) {{nome_tutor}},

Lembramos aos moradores de {{bairro}} sobre a importância de manter as vacinas do {{nome_pet}} em dia e evitar o abandono.

Em caso de denúncias de maus-tratos ou dúvidas sobre atendimento veterinário, fale com nosso gabinete.

{{assinatura}}`,
    ativo: true,
    criado_em: '2026-02-10T14:00:00Z',
  },
];

export const INITIAL_TUTORES: (Tutor & { pets: Pet[] })[] = [
  {
    id: 'a1b2c3d4-0001-4000-8000-000000000001',
    nome_completo: 'Mariana Santos Silva',
    cpf: '21458963201',
    telefone_original: '(21) 98765-4321',
    telefone_e164: '5521987654321',
    bairro: 'Centro',
    ativo: true,
    observacoes: 'Cadastrada no mutirão de vacinação 2025.',
    criado_em: '2026-01-15T10:00:00Z',
    atualizado_em: '2026-01-15T10:00:00Z',
    pets: [
      {
        id: '78ab0cd7-e113-451d-b07d-eb1c1cad385f',
        tutor_id: 'a1b2c3d4-0001-4000-8000-000000000001',
        nome: 'Thor',
        sexo: 'Macho',
        idade: '3 anos',
        especie: 'Cão',
        raca: 'Vira-lata (SRD)',
        criado_em: '2026-01-15T10:00:00Z',
      },
      {
        id: 'd44147b1-9777-4a8b-bc9b-502a1a8242a6',
        tutor_id: 'a1b2c3d4-0001-4000-8000-000000000001',
        nome: 'Mel',
        sexo: 'Fêmea',
        idade: '1 ano',
        especie: 'Gato',
        raca: 'Siamês',
        criado_em: '2026-01-15T10:05:00Z',
      },
    ],
  },
  {
    id: 'a1b2c3d4-0002-4000-8000-000000000002',
    nome_completo: 'Carlos Eduardo Moreira',
    cpf: '78451296305',
    telefone_original: '(21) 97654-3210',
    telefone_e164: '5521976543210',
    bairro: 'Bananal',
    ativo: true,
    observacoes: 'Interesse em castração.',
    criado_em: '2026-01-16T11:20:00Z',
    atualizado_em: '2026-01-16T11:20:00Z',
    pets: [
      {
        id: 'bf60530a-2a3a-48d6-b2a7-dd8a187d64e9',
        tutor_id: 'a1b2c3d4-0002-4000-8000-000000000002',
        nome: 'Pipoca',
        sexo: 'Fêmea',
        idade: '2 anos',
        especie: 'Cão',
        raca: 'Poodle',
        criado_em: '2026-01-16T11:20:00Z',
      },
    ],
  },
  {
    id: 'a1b2c3d4-0003-4000-8000-000000000003',
    nome_completo: 'Fernanda Lima Oliveira',
    cpf: '36521489710',
    telefone_original: '(21) 96543-2109',
    telefone_e164: '5521965432109',
    bairro: 'Parada Modelo',
    ativo: true,
    observacoes: 'Tutor exemplar, vacinas sempre em dia.',
    criado_em: '2026-01-18T14:40:00Z',
    atualizado_em: '2026-01-18T14:40:00Z',
    pets: [
      {
        id: '27fc8d0d-a0dd-4011-ae9c-3a20c37b2e30',
        tutor_id: 'a1b2c3d4-0003-4000-8000-000000000003',
        nome: 'Simba',
        sexo: 'Macho',
        idade: '4 anos',
        especie: 'Gato',
        raca: 'SRD',
        criado_em: '2026-01-18T14:40:00Z',
      },
    ],
  },
  {
    id: 'a1b2c3d4-0004-4000-8000-000000000004',
    nome_completo: 'Rodrigo Peixoto Castro',
    cpf: '52896314782',
    telefone_original: '(21) 99887-1122',
    telefone_e164: '5521998871122',
    bairro: 'Caneca Fina',
    ativo: true,
    observacoes: 'Tem espaço grande, pode acolher resgates temporários.',
    criado_em: '2026-01-20T09:15:00Z',
    atualizado_em: '2026-01-20T09:15:00Z',
    pets: [
      {
        id: 'dd53e6ec-2c81-4519-9a0f-930aeff6797b',
        tutor_id: 'a1b2c3d4-0004-4000-8000-000000000004',
        nome: 'Bob',
        sexo: 'Macho',
        idade: '5 anos',
        especie: 'Cão',
        raca: 'Labrador',
        criado_em: '2026-01-20T09:15:00Z',
      },
    ],
  },
  {
    id: 'a1b2c3d4-0005-4000-8000-000000000005',
    nome_completo: 'Juliana Rezende Costa',
    cpf: '41236589745',
    telefone_original: '(21) 98123-4567',
    telefone_e164: '5521981234567',
    bairro: 'Citrolândia',
    ativo: true,
    observacoes: '',
    criado_em: '2026-01-22T16:00:00Z',
    atualizado_em: '2026-01-22T16:00:00Z',
    pets: [
      {
        id: 'be176a4d-2aca-45a7-b367-dd91bfc71c2f',
        tutor_id: 'a1b2c3d4-0005-4000-8000-000000000005',
        nome: 'Luna',
        sexo: 'Fêmea',
        idade: '8 meses',
        especie: 'Gato',
        raca: 'Persa',
        criado_em: '2026-01-22T16:00:00Z',
      },
    ],
  },
  {
    id: 'a1b2c3d4-0006-4000-8000-000000000006',
    nome_completo: 'Paulo Roberto Guimarães',
    cpf: '96325874102',
    telefone_original: '(21) 97412-5896',
    telefone_e164: '5521974125896',
    bairro: 'Paiol',
    ativo: true,
    observacoes: 'Cão idoso, necessita de cuidados articulares.',
    criado_em: '2026-01-25T13:10:00Z',
    atualizado_em: '2026-01-25T13:10:00Z',
    pets: [
      {
        id: '66558244-7ed1-443e-99f7-dbacc9e6f39c',
        tutor_id: 'a1b2c3d4-0006-4000-8000-000000000006',
        nome: 'Marley',
        sexo: 'Macho',
        idade: '8 anos',
        especie: 'Cão',
        raca: 'Golden Retriever',
        criado_em: '2026-01-25T13:10:00Z',
      },
    ],
  },
  {
    id: 'a1b2c3d4-0007-4000-8000-000000000007',
    nome_completo: 'Beatriz Nogueira Souza',
    cpf: '15975348620',
    telefone_original: '(21) 99123-9874',
    telefone_e164: '5521991239874',
    bairro: 'Vale das Pedrinhas',
    ativo: true,
    observacoes: '',
    criado_em: '2026-01-28T10:30:00Z',
    atualizado_em: '2026-01-28T10:30:00Z',
    pets: [
      {
        id: 'db3ea55d-86bf-4b2d-bb36-05d03fc299b3',
        tutor_id: 'a1b2c3d4-0007-4000-8000-000000000007',
        nome: 'Nina',
        sexo: 'Fêmea',
        idade: '1 ano e meio',
        especie: 'Cão',
        raca: 'SRD',
        criado_em: '2026-01-28T10:30:00Z',
      },
    ],
  },
  {
    id: 'a1b2c3d4-0008-4000-8000-000000000008',
    nome_completo: 'Lucas Fernandes Dias',
    cpf: '85214796325',
    telefone_original: '(21) 98321-6549',
    telefone_e164: '5521983216549',
    bairro: 'Quinta Mariana',
    ativo: true,
    observacoes: 'Gato resgatado.',
    criado_em: '2026-02-01T15:20:00Z',
    atualizado_em: '2026-02-01T15:20:00Z',
    pets: [
      {
        id: 'fc83c123-0a02-4683-a2d2-3cb366182403',
        tutor_id: 'a1b2c3d4-0008-4000-8000-000000000008',
        nome: 'Frajola',
        sexo: 'Macho',
        idade: '3 anos',
        especie: 'Gato',
        raca: 'SRD',
        criado_em: '2026-02-01T15:20:00Z',
      },
    ],
  },
];

export const INITIAL_CAMPANHAS: Campanha[] = [
  {
    id: 'c1111111-1111-4111-8111-111111111111',
    nome: 'Vacinação Antirrábica - Bairros Centro e Bananal',
    categoria: 'vacinacao',
    template_id: '11111111-1111-1111-1111-111111111111',
    metodo: 'manual',
    filtros_aplicados: {
      bairros: ['Centro', 'Bananal'],
      especies: ['Cão'],
    },
    total_destinatarios: 2,
    total_enviados: 2,
    total_erros: 0,
    status: 'concluida',
    criado_por: '60f81164-83b1-42ac-88bb-4146e3a3543d',
    criado_em: '2026-02-15T09:00:00Z',
    concluido_em: '2026-02-15T09:45:00Z',
  },
  {
    id: 'c2222222-2222-4222-8222-222222222222',
    nome: 'Mutirão de Castração Felina - Parada Modelo',
    categoria: 'castracao',
    template_id: '44444444-4444-4444-4444-444444444444',
    metodo: 'zapi',
    filtros_aplicados: {
      bairros: ['Parada Modelo', 'Citrolândia'],
      especies: ['Gato'],
    },
    total_destinatarios: 2,
    total_enviados: 1,
    total_erros: 1,
    status: 'concluida',
    criado_por: '60f81164-83b1-42ac-88bb-4146e3a3543d',
    criado_em: '2026-02-20T14:00:00Z',
    concluido_em: '2026-02-20T14:15:00Z',
  },
];

export const INITIAL_ENVIOS: Envio[] = [
  {
    id: 'e1111111-1111-4111-8111-111111111111',
    campanha_id: 'c1111111-1111-4111-8111-111111111111',
    tutor_id: 'a1b2c3d4-0001-4000-8000-000000000001',
    pet_id: '78ab0cd7-e113-451d-b07d-eb1c1cad385f',
    telefone_destino: '5521987654321',
    mensagem_final: 'Olá, Mariana Santos Silva! 🐾 A Secretaria de Bem-Estar e Proteção Animal de Guapimirim informa...',
    metodo: 'manual',
    status: 'enviado',
    tentativas: 1,
    enviado_em: '2026-02-15T09:20:00Z',
    criado_em: '2026-02-15T09:00:00Z',
  },
  {
    id: 'e2222222-2222-4222-8222-222222222222',
    campanha_id: 'c1111111-1111-4111-8111-111111111111',
    tutor_id: 'a1b2c3d4-0002-4000-8000-000000000002',
    pet_id: 'bf60530a-2a3a-48d6-b2a7-dd8a187d64e9',
    telefone_destino: '5521976543210',
    mensagem_final: 'Olá, Carlos Eduardo Moreira! 🐾 A Secretaria de Bem-Estar e Proteção Animal de Guapimirim informa...',
    metodo: 'manual',
    status: 'enviado',
    tentativas: 1,
    enviado_em: '2026-02-15T09:35:00Z',
    criado_em: '2026-02-15T09:00:00Z',
  },
  {
    id: 'e3333333-3333-4333-8333-333333333333',
    campanha_id: 'c2222222-2222-4222-8222-222222222222',
    tutor_id: 'a1b2c3d4-0003-4000-8000-000000000003',
    pet_id: '27fc8d0d-a0dd-4011-ae9c-3a20c37b2e30',
    telefone_destino: '5521965432109',
    mensagem_final: 'Olá, Fernanda Lima Oliveira! 🩺 Estão abertas as inscrições para o Mutirão Gratuito de Castração em Guapimirim...',
    metodo: 'zapi',
    status: 'enviado',
    zapi_message_id: 'zaap-msg-88231',
    tentativas: 1,
    enviado_em: '2026-02-20T14:05:00Z',
    criado_em: '2026-02-20T14:00:00Z',
  },
  {
    id: 'e4444444-4444-4444-8444-444444444444',
    campanha_id: 'c2222222-2222-4222-8222-222222222222',
    tutor_id: 'a1b2c3d4-0005-4000-8000-000000000005',
    pet_id: 'be176a4d-2aca-45a7-b367-dd91bfc71c2f',
    telefone_destino: '5521981234567',
    mensagem_final: 'Olá, Juliana Rezende Costa! 🩺 Estão abertas as inscrições para o Mutirão Gratuito de Castração em Guapimirim...',
    metodo: 'zapi',
    status: 'erro',
    erro: 'Instância ocupada ou timeout no envio (HTTP 504)',
    tentativas: 3,
    enviado_em: null,
    criado_em: '2026-02-20T14:00:00Z',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'a0000001-0000-4000-8000-000000000001',
    user_id: '60f81164-83b1-42ac-88bb-4146e3a3543d',
    user_nome: 'Caio Silva (Vereador)',
    acao: 'SISTEMA_INICIALIZADO',
    entidade: 'sistema',
    entidade_id: null,
    detalhes: { versao: '1.0.0', municipio: 'Guapimirim/RJ' },
    criado_em: '2026-01-10T10:00:00Z',
  },
  {
    id: 'a0000002-0000-4000-8000-000000000002',
    user_id: '60f81164-83b1-42ac-88bb-4146e3a3543d',
    user_nome: 'Caio Silva (Vereador)',
    acao: 'CRIAR_CAMPANHA',
    entidade: 'campanhas',
    entidade_id: 'c1111111-1111-4111-8111-111111111111',
    detalhes: { metodo: 'manual', total: 2 },
    criado_em: '2026-02-15T09:00:00Z',
  },
  {
    id: 'a0000003-0000-4000-8000-000000000003',
    user_id: '60f81164-83b1-42ac-88bb-4146e3a3543d',
    user_nome: 'Caio Silva (Vereador)',
    acao: 'DISPARO_ZAPI',
    entidade: 'campanhas',
    entidade_id: 'c2222222-2222-4222-8222-222222222222',
    detalhes: { enviados: 1, erros: 1 },
    criado_em: '2026-02-20T14:15:00Z',
  },
];
