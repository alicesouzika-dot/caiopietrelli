/**
 * Dexie.js (IndexedDB) - Banco de dados local para operação 100% Offline-First
 * Mantém tutores, pets, templates, campanhas, envios e a fila de sincronização em segundo plano.
 */

import Dexie, { Table } from 'dexie';
import { Tutor, Pet, Template, Campanha, Envio } from '../types/database';

export interface FilaItem {
  id?: number;
  tipo:
    | 'CRIAR_TUTOR_PET'
    | 'CRIAR_TUTOR'
    | 'CRIAR_PET'
    | 'ATUALIZAR_TUTOR'
    | 'EXCLUIR_TUTOR'
    | 'REGISTRAR_ENVIO'
    | 'CRIAR_ENVIO'
    | 'ATUALIZAR_CAMPANHA';
  payload: any;
  criado_em: string;
  tentativas: number;
  ultimo_erro?: string;
}

export interface MetaItem {
  chave: string;
  valor: any;
  atualizado_em?: string;
}

export class AmigosDoCaioDB extends Dexie {
  tutores!: Table<Tutor & { latitude?: number | null; longitude?: number | null; endereco?: string | null }, string>;
  pets!: Table<Pet & { foto_path?: string | null; microchip?: string | null }, string>;
  templates!: Table<Template, string>;
  campanhas!: Table<Campanha, string>;
  envios!: Table<Envio & { client_uuid?: string; origem?: 'desktop' | 'mobile' }, string>;
  fila!: Table<FilaItem, number>;
  meta!: Table<MetaItem, string>;

  constructor() {
    super('amigosdocaio');
    this.version(1).stores({
      tutores: 'id, nome_completo, cpf, telefone_e164, bairro, atualizado_em',
      pets: 'id, tutor_id, nome, especie',
      templates: 'id, categoria, ativo',
      campanhas: 'id, status, criado_em',
      envios: 'id, client_uuid, campanha_id, status',
      fila: '++id, tipo, payload, criado_em, tentativas',
      meta: 'chave',
    });
  }
}

export const db = new AmigosDoCaioDB();
