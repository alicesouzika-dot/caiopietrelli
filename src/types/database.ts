// Tipos do banco de dados e entidades do sistema Amigos do Caio

export type UserRole = 'admin' | 'moderador';

export interface Profile {
  id: string;
  nome: string;
  nome_completo?: string;
  email: string;
  senha?: string;
  role: UserRole;
  ativo: boolean;
  ultimo_acesso?: string | null;
  criado_em: string;
  user_metadata?: {
    nome?: string;
  };
}

export interface Tutor {
  id: string;
  nome_completo: string;
  nome?: string; // alias mobile
  cpf: string;
  telefone_original?: string;
  telefone_e164: string;
  telefone?: string; // alias mobile
  bairro?: string;
  ativo: boolean;
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;

  // Campos mobile
  client_uuid?: string;
  origem?: 'desktop' | 'mobile';
  latitude?: number | null;
  longitude?: number | null;
  endereco?: string | null;

  // Pets associados (quando carregados via join)
  pets?: Pet[];
}

export type PetSexo =
  | 'Macho'
  | 'Fêmea'
  | 'Não informado'
  | 'macho'
  | 'femea'
  | 'indefinido';

export interface Pet {
  id: string;
  tutor_id: string;
  nome: string;
  sexo: PetSexo;
  idade?: string | null;
  especie?: string; // ex: Cão, Gato, Ave, Outro, cao, gato, outro
  raca?: string | null;
  porte?: 'pequeno' | 'medio' | 'grande';
  castrado?: boolean;
  vacinado?: boolean;
  criado_em: string;
  atualizado_em?: string;

  // Campos mobile
  client_uuid?: string;
  origem?: 'desktop' | 'mobile';
  foto_path?: string | null;
  microchip?: string | null;
}

export type TemplateCategoria = 'vacinacao' | 'adocao' | 'evento' | 'castracao' | 'geral';

export interface Template {
  id: string;
  titulo: string;
  nome?: string; // alias mobile
  categoria: TemplateCategoria;
  corpo: string;
  conteudo?: string; // alias mobile
  ativo: boolean;
  criado_em: string;
}

export type CampanhaMetodo = 'manual' | 'zapi';

export type CampanhaStatus = 'rascunho' | 'em_andamento' | 'pausada' | 'concluida' | 'cancelada';

export interface CampanhaFiltros {
  bairros?: string[];
  especies?: string[];
  sexos?: string[];
  faixaIdade?: string;
}

export interface Campanha {
  id: string;
  nome: string;
  categoria: string;
  template_id?: string | null;
  metodo: CampanhaMetodo;
  filtros_aplicados?: CampanhaFiltros;
  total_destinatarios: number;
  total_enviados: number;
  total_erros: number;
  status: CampanhaStatus;
  criado_por?: string | null;
  criado_em: string;
  concluido_em?: string | null;

  // Template opcional resolvido
  template?: Template;
}

export type EnvioStatus = 'pendente' | 'enviando' | 'enviado' | 'erro' | 'pulado' | 'cancelado';

export interface Envio {
  id: string;
  campanha_id: string;
  tutor_id: string;
  pet_id?: string | null;
  telefone_destino: string;
  telefone?: string; // alias mobile
  mensagem_final: string;
  mensagem?: string; // alias mobile
  metodo: CampanhaMetodo;
  canal?: 'manual' | 'zapi'; // alias mobile
  status: EnvioStatus;
  zapi_message_id?: string | null;
  erro?: string | null;
  erro_mensagem?: string | null; // alias mobile
  tentativas: number;
  enviado_em?: string | null;
  criado_em: string;

  // Campos mobile
  client_uuid?: string;
  origem?: 'desktop' | 'mobile';
  dispositivo?: 'pwa' | 'web';

  // Detalhes hidratados para visualização
  tutor?: Tutor;
  pet?: Pet;
}

export interface Configuracao {
  chave: string;
  valor: string;
  atualizado_por?: string | null;
  atualizado_em?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  user_nome?: string | null;
  acao: string;
  entidade?: string | null;
  entidade_id?: string | null;
  detalhes?: any;
  dispositivo?: string;
  criado_em: string;
}

export interface PushSubscriptionItem {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
  plataforma?: 'ios' | 'android' | 'desktop';
  ativo: boolean;
  criado_em: string;
}
