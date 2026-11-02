/**
 * Engine de Armazenamento Reativo e Sincronizado com Supabase
 * Mantém o estado em localStorage para resposta imediata e sincroniza em tempo real com o banco PostgreSQL do Supabase.
 */

import {
  INITIAL_AUDIT_LOGS,
  INITIAL_CAMPANHAS,
  INITIAL_CONFIGS,
  INITIAL_ENVIOS,
  INITIAL_PROFILES,
  INITIAL_TEMPLATES,
  INITIAL_TUTORES,
} from './mockData';
import {
  AuditLog,
  Campanha,
  Envio,
  Pet,
  Profile,
  Template,
  Tutor,
} from '../types/database';
import { limparCPF } from './cpf';
import { normalizarParaE164 } from './telefone';
import { supabase, isSupabaseConfigured } from './supabase';
import { db } from './db';

const KEY_TUTORES = 'amigos_caio_tutores_v3';
const KEY_PETS = 'amigos_caio_pets_v3';
const KEY_TEMPLATES = 'amigos_caio_templates_v3';
const KEY_CAMPANHAS = 'amigos_caio_campanhas_v3';
const KEY_ENVIOS = 'amigos_caio_envios_v3';
const KEY_PROFILES = 'amigos_caio_profiles_v3';
const KEY_CONFIGS = 'amigos_caio_configs_v3';
const KEY_LOGS = 'amigos_caio_logs_v3';
const KEY_CURRENT_USER = 'amigos_caio_auth_session_v4';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ensureUuid(id?: string | null): string {
  if (id && UUID_REGEX.test(id)) return id;
  return crypto.randomUUID();
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key: string, data: any) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new Event('amigos_caio_storage_update'));
  } catch (e) {
    console.error('Falha ao salvar no storage:', e);
  }
}

let syncIniciado = false;

/**
 * Baixa dados reais do Supabase e atualiza o cache local reativo (inclusive listas vazias após exclusão)
 */
export async function sincronizarStorageComSupabase(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    const [
      tutoresRes,
      petsRes,
      templatesRes,
      campanhasRes,
      enviosRes,
      profilesRes,
      configsRes,
      logsRes,
    ] = await Promise.all([
      supabase.from('tutores').select('*').order('nome_completo', { ascending: true }),
      supabase.from('pets').select('*').order('criado_em', { ascending: true }),
      supabase.from('templates').select('*').order('criado_em', { ascending: false }),
      supabase.from('campanhas').select('*').order('criado_em', { ascending: false }),
      supabase.from('envios').select('*').order('criado_em', { ascending: false }),
      supabase.from('profiles').select('*').order('criado_em', { ascending: true }),
      supabase.from('configuracoes').select('*'),
      supabase.from('audit_log').select('*').order('criado_em', { ascending: false }).limit(200),
    ]);

    if (!tutoresRes.error && tutoresRes.data !== null) {
      localStorage.setItem(KEY_TUTORES, JSON.stringify(tutoresRes.data));
      await db.tutores.clear();
      if (tutoresRes.data.length > 0) {
        await db.tutores.bulkPut(tutoresRes.data);
      }
    }

    if (!petsRes.error && petsRes.data !== null) {
      localStorage.setItem(KEY_PETS, JSON.stringify(petsRes.data));
      await db.pets.clear();
      if (petsRes.data.length > 0) {
        await db.pets.bulkPut(petsRes.data);
      }
    }

    if (!templatesRes.error && templatesRes.data !== null) {
      localStorage.setItem(KEY_TEMPLATES, JSON.stringify(templatesRes.data));
      await db.templates.clear();
      if (templatesRes.data.length > 0) {
        await db.templates.bulkPut(templatesRes.data);
      }
    }

    if (!campanhasRes.error && campanhasRes.data !== null) {
      localStorage.setItem(KEY_CAMPANHAS, JSON.stringify(campanhasRes.data));
      await db.campanhas.clear();
      if (campanhasRes.data.length > 0) {
        await db.campanhas.bulkPut(campanhasRes.data);
      }
    }

    if (!enviosRes.error && enviosRes.data !== null) {
      localStorage.setItem(KEY_ENVIOS, JSON.stringify(enviosRes.data));
      await db.envios.clear();
      if (enviosRes.data.length > 0) {
        await db.envios.bulkPut(enviosRes.data);
      }
    }

    if (!profilesRes.error && profilesRes.data !== null) {
      localStorage.setItem(KEY_PROFILES, JSON.stringify(profilesRes.data));
      const atual = readJson<Profile | null>(KEY_CURRENT_USER, null);
      if (atual) {
        const atualizado = profilesRes.data.find((p: Profile) => p.id === atual.id);
        if (atualizado && atualizado.ativo) {
          localStorage.setItem(KEY_CURRENT_USER, JSON.stringify(atualizado));
        } else {
          localStorage.removeItem(KEY_CURRENT_USER);
        }
      }
    }

    if (!configsRes.error && configsRes.data !== null) {
      const cfgMap: Record<string, string> = { ...INITIAL_CONFIGS };
      configsRes.data.forEach((row: any) => {
        if (row.chave) cfgMap[row.chave] = row.valor ?? '';
      });
      localStorage.setItem(KEY_CONFIGS, JSON.stringify(cfgMap));
    }

    if (!logsRes.error && logsRes.data !== null) {
      localStorage.setItem(KEY_LOGS, JSON.stringify(logsRes.data));
    }

    window.dispatchEvent(new Event('amigos_caio_storage_update'));
  } catch (err) {
    console.warn('Falha ao sincronizar cache com Supabase:', err);
  }
}

// Inicializa dados no localStorage e dispara sync com Supabase
export function inicializarStorageSeNecessario() {
  // Remove sessão antiga do simulador caso exista
  localStorage.removeItem('amigos_caio_current_user_v3');

  if (!isSupabaseConfigured) {
    if (!localStorage.getItem(KEY_TUTORES)) {
      const tutoresSemPets: Tutor[] = [];
      const todosPets: Pet[] = [];

      INITIAL_TUTORES.forEach((t) => {
        const { pets, ...tutorData } = t;
        tutoresSemPets.push(tutorData);
        if (pets && pets.length > 0) {
          todosPets.push(...pets);
        }
      });

      writeJson(KEY_TUTORES, tutoresSemPets);
      writeJson(KEY_PETS, todosPets);
      writeJson(KEY_TEMPLATES, INITIAL_TEMPLATES);
      writeJson(KEY_CAMPANHAS, INITIAL_CAMPANHAS);
      writeJson(KEY_ENVIOS, INITIAL_ENVIOS);
      writeJson(KEY_PROFILES, INITIAL_PROFILES);
      writeJson(KEY_CONFIGS, INITIAL_CONFIGS);
      writeJson(KEY_LOGS, INITIAL_AUDIT_LOGS);
    }
    return;
  }

  if (!syncIniciado) {
    syncIniciado = true;
    sincronizarStorageComSupabase();
  }
}

// ==========================================
// TUTORES & PETS
// ==========================================

export function listarTutores(): (Tutor & { pets: Pet[] })[] {
  const tutores = readJson<Tutor[]>(KEY_TUTORES, []);
  const pets = readJson<Pet[]>(KEY_PETS, []);

  return tutores
    .map((t) => ({
      ...t,
      pets: pets.filter((p) => p.tutor_id === t.id),
    }))
    .sort((a, b) =>
      (a.nome_completo || '').trim().localeCompare((b.nome_completo || '').trim(), 'pt-BR', {
        sensitivity: 'base',
      })
    );
}

export function buscarTutorPorId(id: string): (Tutor & { pets: Pet[] }) | null {
  const todos = listarTutores();
  return todos.find((t) => t.id === id) || null;
}

export function salvarTutor(
  tutorInput: Partial<Tutor> & { id?: string; nome_completo: string; cpf?: string; telefone_e164?: string },
  petsNovos?: Partial<Pet>[]
): Tutor {
  const tutores = readJson<Tutor[]>(KEY_TUTORES, []);
  const pets = readJson<Pet[]>(KEY_PETS, []);
  const cpfLimpo = limparCPF(tutorInput.cpf);
  const telNormalizado = normalizarParaE164(tutorInput.telefone_e164);

  const agora = new Date().toISOString();
  let tutorFinal: Tutor;

  const indexExistente = tutores.findIndex(
    (t) =>
      (tutorInput.id && t.id === tutorInput.id) ||
      (!tutorInput.id && cpfLimpo && limparCPF(t.cpf) === cpfLimpo) ||
      (!tutorInput.id &&
        !cpfLimpo &&
        tutorInput.nome_completo &&
        t.nome_completo.trim().toLowerCase() === tutorInput.nome_completo.trim().toLowerCase())
  );

  if (indexExistente >= 0) {
    const existente = tutores[indexExistente];
    tutorFinal = {
      ...existente,
      ...tutorInput,
      id: ensureUuid(existente.id),
      cpf: tutorInput.id ? cpfLimpo : (cpfLimpo || existente.cpf || ''),
      telefone_original: tutorInput.id
        ? (tutorInput.telefone_original ?? telNormalizado)
        : (tutorInput.telefone_original || existente.telefone_original || telNormalizado),
      telefone_e164: tutorInput.id
        ? telNormalizado
        : (telNormalizado || existente.telefone_e164 || ''),
      atualizado_em: agora,
    };
    tutores[indexExistente] = tutorFinal;
  } else {
    tutorFinal = {
      id: ensureUuid(tutorInput.id),
      nome_completo: tutorInput.nome_completo.trim(),
      cpf: cpfLimpo,
      telefone_original: tutorInput.telefone_original || telNormalizado,
      telefone_e164: telNormalizado,
      bairro: tutorInput.bairro || 'Centro',
      ativo: tutorInput.ativo ?? true,
      observacoes: tutorInput.observacoes || '',
      criado_em: agora,
      atualizado_em: agora,
    };
    tutores.unshift(tutorFinal);
  }

  writeJson(KEY_TUTORES, tutores);
  const { pets: _ignorePetsLocal, ...tutorSemPetsLocal } = tutorFinal as any;
  db.tutores.put(tutorSemPetsLocal).catch(() => {});

  const petsParaSupabase: Pet[] = [];

  if (petsNovos && petsNovos.length > 0) {
    petsNovos.forEach((p) => {
      const novoPet: Pet = {
        id: ensureUuid(p.id),
        tutor_id: tutorFinal.id,
        nome: p.nome || 'Pet',
        sexo: p.sexo || 'Não informado',
        idade: p.idade || '',
        especie: p.especie || 'Cão',
        raca: p.raca || 'SRD',
        criado_em: agora,
      };
      pets.push(novoPet);
      petsParaSupabase.push(novoPet);
      db.pets.put(novoPet).catch(() => {});
    });
    writeJson(KEY_PETS, pets);
  }

  if (isSupabaseConfigured && supabase) {
    const { pets: _ignorePets, ...tutorRow } = tutorFinal as any;
    supabase
      .from('tutores')
      .upsert(
        {
          id: tutorRow.id,
          nome_completo: tutorRow.nome_completo,
          cpf: tutorRow.cpf || null,
          telefone_original: tutorRow.telefone_original || tutorRow.telefone_e164 || '',
          telefone_e164: tutorRow.telefone_e164 || '',
          bairro: tutorRow.bairro || 'Centro',
          ativo: tutorRow.ativo ?? true,
          observacoes: tutorRow.observacoes || '',
          latitude: tutorRow.latitude ?? null,
          longitude: tutorRow.longitude ?? null,
          endereco: tutorRow.endereco ?? null,
          atualizado_em: agora,
        },
        { onConflict: 'id' }
      )
      .then(({ error }) => {
        if (error) console.error('Erro ao salvar tutor no Supabase:', error.message);
        else if (petsParaSupabase.length > 0 && supabase) {
          supabase
            .from('pets')
            .upsert(petsParaSupabase, { onConflict: 'id' })
            .then(({ error: petErr }) => {
              if (petErr) console.error('Erro ao salvar pets no Supabase:', petErr.message);
            });
        }
      });
  }

  return tutorFinal;
}

/**
 * Importa um lote de linhas validadas do Excel com sincronização em lote no Supabase
 * (garante que todos os tutores sejam gravados antes dos pets, evitando falhas de chave estrangeira).
 */
export async function importarLoteTutoresEPets(
  linhas: {
    nomeCompleto: string;
    cpfLimpo: string;
    telefoneOriginal: string;
    telefoneE164: string;
    bairro: string;
    nomePet: string;
    sexoPet: Pet['sexo'];
    especiePet: string;
    idadePet: string;
    racaPet: string;
    status: 'valida' | 'duplicada' | 'invalida';
  }[],
  onProgress?: (pct: number) => void
): Promise<{ criados: number; atualizados: number; petsAdicionados: number }> {
  const tutores = readJson<Tutor[]>(KEY_TUTORES, []);
  const pets = readJson<Pet[]>(KEY_PETS, []);
  const agora = new Date().toISOString();

  let criados = 0;
  let atualizados = 0;
  let petsAdicionados = 0;

  const tutoresParaSupabaseMap = new Map<string, any>();
  const petsParaSupabaseMap = new Map<string, any>();

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    const cpfLimpo = limparCPF(l.cpfLimpo);
    const telE164 = normalizarParaE164(l.telefoneE164 || l.telefoneOriginal);
    const nomeNorm = (l.nomeCompleto || '').trim().toLowerCase();

    const idxExistente = tutores.findIndex(
      (t) =>
        (cpfLimpo && limparCPF(t.cpf) === cpfLimpo) ||
        (nomeNorm &&
          nomeNorm !== 'tutor a identificar' &&
          t.nome_completo.trim().toLowerCase() === nomeNorm)
    );

    let tutorFinal: Tutor;

    if (idxExistente >= 0) {
      const ex = tutores[idxExistente];
      tutorFinal = {
        ...ex,
        id: ensureUuid(ex.id),
        nome_completo:
          ex.nome_completo && ex.nome_completo !== 'Tutor a identificar'
            ? ex.nome_completo
            : l.nomeCompleto.trim(),
        cpf: cpfLimpo || ex.cpf || '',
        telefone_original: l.telefoneOriginal || ex.telefone_original || telE164,
        telefone_e164: telE164 || ex.telefone_e164 || '',
        bairro: l.bairro || ex.bairro || 'Centro',
        ativo: ex.ativo ?? true,
        atualizado_em: agora,
      };
      tutores[idxExistente] = tutorFinal;
      atualizados++;
    } else {
      tutorFinal = {
        id: crypto.randomUUID(),
        nome_completo: l.nomeCompleto.trim() || 'Tutor a identificar',
        cpf: cpfLimpo,
        telefone_original: l.telefoneOriginal || telE164,
        telefone_e164: telE164,
        bairro: l.bairro || 'Centro',
        ativo: true,
        observacoes: '',
        criado_em: agora,
        atualizado_em: agora,
      };
      tutores.unshift(tutorFinal);
      criados++;
    }

    tutoresParaSupabaseMap.set(tutorFinal.id, {
      id: tutorFinal.id,
      nome_completo: tutorFinal.nome_completo,
      cpf: tutorFinal.cpf || null,
      telefone_original: tutorFinal.telefone_original || tutorFinal.telefone_e164 || '',
      telefone_e164: tutorFinal.telefone_e164 || '',
      bairro: tutorFinal.bairro || 'Centro',
      ativo: tutorFinal.ativo ?? true,
      observacoes: tutorFinal.observacoes || '',
      criado_em: tutorFinal.criado_em,
      atualizado_em: agora,
    });

    if (l.nomePet && l.nomePet.trim()) {
      const nomePetLimpo = l.nomePet.trim();
      const petExistenteIdx = pets.findIndex(
        (p) =>
          p.tutor_id === tutorFinal.id &&
          p.nome.trim().toLowerCase() === nomePetLimpo.toLowerCase()
      );

      let petFinal: Pet;
      if (petExistenteIdx >= 0) {
        petFinal = {
          ...pets[petExistenteIdx],
          id: ensureUuid(pets[petExistenteIdx].id),
          sexo: l.sexoPet || pets[petExistenteIdx].sexo || 'Não informado',
          especie: l.especiePet || pets[petExistenteIdx].especie || 'Cão',
          idade: l.idadePet || pets[petExistenteIdx].idade || '',
          raca: l.racaPet || pets[petExistenteIdx].raca || 'SRD',
          atualizado_em: agora,
        };
        pets[petExistenteIdx] = petFinal;
      } else {
        petFinal = {
          id: crypto.randomUUID(),
          tutor_id: tutorFinal.id,
          nome: nomePetLimpo,
          sexo: l.sexoPet || 'Não informado',
          idade: l.idadePet || '',
          especie: l.especiePet || 'Cão',
          raca: l.racaPet || 'SRD',
          criado_em: agora,
          atualizado_em: agora,
        };
        pets.push(petFinal);
        petsAdicionados++;
      }

      petsParaSupabaseMap.set(petFinal.id, {
        id: petFinal.id,
        tutor_id: petFinal.tutor_id,
        nome: petFinal.nome,
        sexo: petFinal.sexo,
        idade: petFinal.idade || null,
        especie: petFinal.especie || 'Cão',
        raca: petFinal.raca || 'SRD',
        criado_em: petFinal.criado_em,
        atualizado_em: agora,
      });
    }

    if (onProgress && (i % 10 === 0 || i === linhas.length - 1)) {
      onProgress(Math.round(((i + 1) / linhas.length) * 60));
    }
  }

  writeJson(KEY_TUTORES, tutores);
  writeJson(KEY_PETS, pets);

  const tutoresRows = Array.from(tutoresParaSupabaseMap.values());
  const petsRows = Array.from(petsParaSupabaseMap.values());

  await db.tutores.bulkPut(tutoresRows).catch(() => {});
  if (petsRows.length > 0) {
    await db.pets.bulkPut(petsRows).catch(() => {});
  }

  if (isSupabaseConfigured && supabase) {
    if (tutoresRows.length > 0) {
      const { error: tErr } = await supabase
        .from('tutores')
        .upsert(tutoresRows, { onConflict: 'id' });
      if (tErr) console.error('Erro ao importar lote de tutores no Supabase:', tErr.message);
    }
    if (onProgress) onProgress(85);
    if (petsRows.length > 0) {
      const { error: pErr } = await supabase
        .from('pets')
        .upsert(petsRows, { onConflict: 'id' });
      if (pErr) console.error('Erro ao importar lote de pets no Supabase:', pErr.message);
    }
  }

  if (onProgress) onProgress(100);
  window.dispatchEvent(new Event('amigos_caio_storage_update'));

  return { criados, atualizados, petsAdicionados };
}

export function excluirTutor(id: string): boolean {
  let tutores = readJson<Tutor[]>(KEY_TUTORES, []);
  let pets = readJson<Pet[]>(KEY_PETS, []);

  const petsDoTutorIds = pets.filter((p) => p.tutor_id === id).map((p) => p.id);
  tutores = tutores.filter((t) => t.id !== id);
  pets = pets.filter((p) => p.tutor_id !== id);

  writeJson(KEY_TUTORES, tutores);
  writeJson(KEY_PETS, pets);

  db.tutores.delete(id).catch(() => {});
  if (petsDoTutorIds.length > 0) {
    db.pets.bulkDelete(petsDoTutorIds).catch(() => {});
  }

  if (isSupabaseConfigured && supabase && UUID_REGEX.test(id)) {
    supabase
      .from('tutores')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('Erro ao excluir tutor no Supabase:', error.message);
      });
  }

  return true;
}

export function salvarPet(pet: Partial<Pet> & { tutor_id: string; nome: string }): Pet {
  const pets = readJson<Pet[]>(KEY_PETS, []);
  const agora = new Date().toISOString();

  let petFinal: Pet;
  const idx = pets.findIndex((p) => pet.id && p.id === pet.id);
  if (idx >= 0) {
    petFinal = { ...pets[idx], ...pet, id: ensureUuid(pets[idx].id), atualizado_em: agora };
    pets[idx] = petFinal;
  } else {
    petFinal = {
      id: ensureUuid(pet.id),
      tutor_id: pet.tutor_id,
      nome: pet.nome,
      sexo: pet.sexo || 'Não informado',
      idade: pet.idade || '',
      especie: pet.especie || 'Cão',
      raca: pet.raca || 'SRD',
      criado_em: agora,
      atualizado_em: agora,
    };
    pets.push(petFinal);
  }

  writeJson(KEY_PETS, pets);
  db.pets.put(petFinal).catch(() => {});

  if (isSupabaseConfigured && supabase) {
    supabase
      .from('pets')
      .upsert(
        {
          id: petFinal.id,
          tutor_id: petFinal.tutor_id,
          nome: petFinal.nome,
          sexo: petFinal.sexo,
          idade: petFinal.idade || null,
          especie: petFinal.especie || 'Cão',
          raca: petFinal.raca || 'SRD',
          criado_em: petFinal.criado_em,
          atualizado_em: agora,
        },
        { onConflict: 'id' }
      )
      .then(({ error }) => {
        if (error) console.error('Erro ao salvar pet no Supabase:', error.message);
      });
  }

  return petFinal;
}

export function excluirPet(petId: string): boolean {
  let pets = readJson<Pet[]>(KEY_PETS, []);
  pets = pets.filter((p) => p.id !== petId);
  writeJson(KEY_PETS, pets);
  db.pets.delete(petId).catch(() => {});

  if (isSupabaseConfigured && supabase && UUID_REGEX.test(petId)) {
    supabase
      .from('pets')
      .delete()
      .eq('id', petId)
      .then(({ error }) => {
        if (error) console.error('Erro ao excluir pet no Supabase:', error.message);
      });
  }

  return true;
}

// ==========================================
// TEMPLATES
// ==========================================

export function listarTemplates(): Template[] {
  return readJson<Template[]>(KEY_TEMPLATES, []);
}

export function salvarTemplate(tpl: Partial<Template> & { titulo: string; categoria: any; corpo: string }): Template {
  const templates = readJson<Template[]>(KEY_TEMPLATES, []);
  const agora = new Date().toISOString();
  let tplFinal: Template;

  const idx = templates.findIndex((t) => tpl.id && t.id === tpl.id);
  if (idx >= 0) {
    tplFinal = { ...templates[idx], ...tpl, id: ensureUuid(templates[idx].id) };
    templates[idx] = tplFinal;
  } else {
    tplFinal = {
      id: ensureUuid(tpl.id),
      titulo: tpl.titulo,
      categoria: tpl.categoria,
      corpo: tpl.corpo,
      ativo: tpl.ativo ?? true,
      criado_em: agora,
    };
    templates.unshift(tplFinal);
  }

  writeJson(KEY_TEMPLATES, templates);
  db.templates.put(tplFinal).catch(() => {});

  if (isSupabaseConfigured && supabase) {
    supabase
      .from('templates')
      .upsert(
        {
          id: tplFinal.id,
          titulo: tplFinal.titulo,
          categoria: tplFinal.categoria,
          corpo: tplFinal.corpo,
          ativo: tplFinal.ativo,
          criado_em: tplFinal.criado_em,
        },
        { onConflict: 'id' }
      )
      .then(({ error }) => {
        if (error) console.error('Erro ao salvar template no Supabase:', error.message);
      });
  }

  return tplFinal;
}

export function excluirTemplate(id: string): boolean {
  let templates = readJson<Template[]>(KEY_TEMPLATES, []);
  templates = templates.filter((t) => t.id !== id);
  writeJson(KEY_TEMPLATES, templates);
  db.templates.delete(id).catch(() => {});

  if (isSupabaseConfigured && supabase && UUID_REGEX.test(id)) {
    supabase
      .from('templates')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('Erro ao excluir template no Supabase:', error.message);
      });
  }

  return true;
}

// ==========================================
// CAMPANHAS & ENVIOS
// ==========================================

export function listarCampanhas(): Campanha[] {
  const campanhas = readJson<Campanha[]>(KEY_CAMPANHAS, []);
  const templates = listarTemplates();

  return campanhas.map((c) => ({
    ...c,
    template: templates.find((t) => t.id === c.template_id),
  }));
}

export function buscarCampanhaPorId(id: string): Campanha | null {
  const campanhas = listarCampanhas();
  return campanhas.find((c) => c.id === id) || null;
}

export function criarCampanhaComEnvios(
  campanhaData: Omit<Campanha, 'id' | 'criado_em' | 'total_enviados' | 'total_erros' | 'total_destinatarios'>,
  destinatarios: { tutor: Tutor; pet?: Pet; mensagem: string }[]
): { campanha: Campanha; envios: Envio[] } {
  const campanhas = readJson<Campanha[]>(KEY_CAMPANHAS, []);
  const envios = readJson<Envio[]>(KEY_ENVIOS, []);
  const agora = new Date().toISOString();

  const idCampanha = crypto.randomUUID();
  const criadoPorValido =
    campanhaData.criado_por && UUID_REGEX.test(campanhaData.criado_por)
      ? campanhaData.criado_por
      : null;
  const templateIdValido =
    campanhaData.template_id && UUID_REGEX.test(campanhaData.template_id)
      ? campanhaData.template_id
      : null;

  const novaCampanha: Campanha = {
    ...campanhaData,
    id: idCampanha,
    template_id: templateIdValido,
    criado_por: criadoPorValido,
    total_destinatarios: destinatarios.length,
    total_enviados: 0,
    total_erros: 0,
    status: 'rascunho',
    criado_em: agora,
  };

  const novosEnvios: Envio[] = destinatarios.map((d) => {
    const idEnvio = crypto.randomUUID();
    return {
      id: idEnvio,
      client_uuid: idEnvio,
      campanha_id: idCampanha,
      tutor_id: d.tutor.id,
      pet_id: d.pet?.id && UUID_REGEX.test(d.pet.id) ? d.pet.id : null,
      telefone_destino: d.tutor.telefone_e164,
      mensagem_final: d.mensagem,
      metodo: campanhaData.metodo,
      status: 'pendente',
      tentativas: 0,
      criado_em: agora,
    };
  });

  campanhas.unshift(novaCampanha);
  envios.unshift(...novosEnvios);

  writeJson(KEY_CAMPANHAS, campanhas);
  writeJson(KEY_ENVIOS, envios);

  db.campanhas.put(novaCampanha).catch(() => {});
  if (novosEnvios.length > 0) {
    db.envios.bulkPut(novosEnvios).catch(() => {});
  }

  if (isSupabaseConfigured && supabase) {
    const { template: _ignoreTpl, ...campRow } = novaCampanha as any;
    supabase
      .from('campanhas')
      .upsert(campRow, { onConflict: 'id' })
      .then(({ error }) => {
        if (error) console.error('Erro ao criar campanha no Supabase:', error.message);
        else if (novosEnvios.length > 0 && supabase) {
          supabase
            .from('envios')
            .upsert(novosEnvios, { onConflict: 'id' })
            .then(({ error: envErr }) => {
              if (envErr) console.error('Erro ao criar envios no Supabase:', envErr.message);
            });
        }
      });
  }

  return { campanha: novaCampanha, envios: novosEnvios };
}

export function atualizarStatusCampanha(id: string, status: Campanha['status'], extras?: Partial<Campanha>) {
  const campanhas = readJson<Campanha[]>(KEY_CAMPANHAS, []);
  const idx = campanhas.findIndex((c) => c.id === id);
  if (idx >= 0) {
    const concluidoEm = status === 'concluida' ? new Date().toISOString() : campanhas[idx].concluido_em;
    campanhas[idx] = {
      ...campanhas[idx],
      status,
      ...(extras || {}),
      ...(concluidoEm ? { concluido_em: concluidoEm } : {}),
    };
    writeJson(KEY_CAMPANHAS, campanhas);
    db.campanhas.put(campanhas[idx]).catch(() => {});

    if (isSupabaseConfigured && supabase && UUID_REGEX.test(id)) {
      const { template: _ignore, ...campRow } = campanhas[idx] as any;
      supabase
        .from('campanhas')
        .upsert(campRow, { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.error('Erro ao atualizar campanha no Supabase:', error.message);
        });
    }
  }
}

export function excluirCampanha(id: string): boolean {
  let campanhas = readJson<Campanha[]>(KEY_CAMPANHAS, []);
  let envios = readJson<Envio[]>(KEY_ENVIOS, []);

  campanhas = campanhas.filter((c) => c.id !== id);
  envios = envios.filter((e) => e.campanha_id !== id);

  writeJson(KEY_CAMPANHAS, campanhas);
  writeJson(KEY_ENVIOS, envios);
  db.campanhas.delete(id).catch(() => {});

  if (isSupabaseConfigured && supabase && UUID_REGEX.test(id)) {
    supabase
      .from('campanhas')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('Erro ao excluir campanha no Supabase:', error.message);
      });
  }

  return true;
}

export function listarEnvios(campanhaId?: string): (Envio & { tutor?: Tutor; pet?: Pet })[] {
  const envios = readJson<Envio[]>(KEY_ENVIOS, []);
  const tutores = listarTutores();
  const pets = readJson<Pet[]>(KEY_PETS, []);

  const filtrados = campanhaId ? envios.filter((e) => e.campanha_id === campanhaId) : envios;

  return filtrados.map((e) => ({
    ...e,
    tutor: tutores.find((t) => t.id === e.tutor_id),
    pet: pets.find((p) => p.id === e.pet_id),
  }));
}

export function atualizarEnvio(envioId: string, partial: Partial<Envio>) {
  const envios = readJson<Envio[]>(KEY_ENVIOS, []);
  const idx = envios.findIndex((e) => e.id === envioId);
  if (idx >= 0) {
    envios[idx] = { ...envios[idx], ...partial };
    writeJson(KEY_ENVIOS, envios);

    const envioAtualizado = envios[idx];
    db.envios.put(envioAtualizado).catch(() => {});

    const campId = envioAtualizado.campanha_id;
    const enviosDaCampanha = envios.filter((e) => e.campanha_id === campId);
    const enviados = enviosDaCampanha.filter((e) => e.status === 'enviado').length;
    const erros = enviosDaCampanha.filter((e) => e.status === 'erro').length;

    const campanhas = readJson<Campanha[]>(KEY_CAMPANHAS, []);
    const cIdx = campanhas.findIndex((c) => c.id === campId);
    if (cIdx >= 0) {
      campanhas[cIdx].total_enviados = enviados;
      campanhas[cIdx].total_erros = erros;
      writeJson(KEY_CAMPANHAS, campanhas);

      if (isSupabaseConfigured && supabase && UUID_REGEX.test(campId)) {
        supabase
          .from('campanhas')
          .update({ total_enviados: enviados, total_erros: erros })
          .eq('id', campId)
          .then();
      }
    }

    if (isSupabaseConfigured && supabase && UUID_REGEX.test(envioId)) {
      const { tutor: _t, pet: _p, ...envioRow } = envioAtualizado as any;
      supabase
        .from('envios')
        .upsert(envioRow, { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.error('Erro ao atualizar envio no Supabase:', error.message);
        });
    }
  }
}

// ==========================================
// CONFIGURAÇÕES
// ==========================================

export function listarConfiguracoes(): Record<string, string> {
  return readJson<Record<string, string>>(KEY_CONFIGS, INITIAL_CONFIGS);
}

export function salvarConfiguracoes(novasConfigs: Record<string, string>, userId?: string) {
  const atuais = listarConfiguracoes();
  const merge = { ...atuais, ...novasConfigs };
  writeJson(KEY_CONFIGS, merge);

  if (isSupabaseConfigured && supabase) {
    const agora = new Date().toISOString();
    const userIdValido = userId && UUID_REGEX.test(userId) ? userId : null;
    const rows = Object.entries(novasConfigs).map(([chave, valor]) => ({
      chave,
      valor: String(valor ?? ''),
      atualizado_por: userIdValido,
      atualizado_em: agora,
    }));
    supabase
      .from('configuracoes')
      .upsert(rows, { onConflict: 'chave' })
      .then(({ error }) => {
        if (error) console.error('Erro ao salvar configurações no Supabase:', error.message);
      });
  }

  adicionarAuditLog({
    user_id: userId && UUID_REGEX.test(userId) ? userId : null,
    user_nome: 'Administrador',
    acao: 'ALTERAR_CONFIGURACOES',
    entidade: 'configuracoes',
    entidade_id: null,
    detalhes: { chaves_alteradas: Object.keys(novasConfigs) },
  });
}

// ==========================================
// EQUIPE & PERFIS
// ==========================================

export function listarPerfis(): Profile[] {
  return readJson<Profile[]>(KEY_PROFILES, INITIAL_PROFILES);
}

export function criarPerfil(novo: Omit<Profile, 'id' | 'criado_em'>): Profile {
  const perfis = readJson<Profile[]>(KEY_PROFILES, []);
  const perfilCriado: Profile = {
    ...novo,
    senha: novo.senha || 'Souzik@8451',
    id: crypto.randomUUID(),
    criado_em: new Date().toISOString(),
  };
  perfis.push(perfilCriado);
  writeJson(KEY_PROFILES, perfis);

  if (isSupabaseConfigured && supabase) {
    supabase
      .from('profiles')
      .upsert(
        {
          id: perfilCriado.id,
          nome: perfilCriado.nome,
          email: perfilCriado.email,
          senha: perfilCriado.senha,
          role: perfilCriado.role,
          ativo: perfilCriado.ativo ?? true,
          criado_em: perfilCriado.criado_em,
        },
        { onConflict: 'id' }
      )
      .then(({ error }) => {
        if (error) console.error('Erro ao criar perfil no Supabase:', error.message);
      });
  }

  return perfilCriado;
}

export function atualizarPerfil(id: string, partial: Partial<Profile>): Profile | null {
  const perfis = readJson<Profile[]>(KEY_PROFILES, []);
  const idx = perfis.findIndex((p) => p.id === id);
  if (idx >= 0) {
    perfis[idx] = { ...perfis[idx], ...partial };
    writeJson(KEY_PROFILES, perfis);

    const usuarioAtual = readJson<Profile | null>(KEY_CURRENT_USER, null);
    if (usuarioAtual && usuarioAtual.id === id) {
      writeJson(KEY_CURRENT_USER, perfis[idx]);
    }

    if (isSupabaseConfigured && supabase && UUID_REGEX.test(id)) {
      const payload: Record<string, any> = {
        nome: perfis[idx].nome,
        email: perfis[idx].email,
        role: perfis[idx].role,
        ativo: perfis[idx].ativo,
      };
      if (partial.senha) {
        payload.senha = partial.senha;
      }
      if (partial.ultimo_acesso !== undefined) {
        payload.ultimo_acesso = partial.ultimo_acesso;
      }
      supabase
        .from('profiles')
        .update(payload)
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Erro ao atualizar perfil no Supabase:', error.message);
        });
    }

    return perfis[idx];
  }
  return null;
}

export function excluirPerfil(id: string): boolean {
  let perfis = readJson<Profile[]>(KEY_PROFILES, []);
  perfis = perfis.filter((p) => p.id !== id);
  writeJson(KEY_PROFILES, perfis);

  if (isSupabaseConfigured && supabase && UUID_REGEX.test(id)) {
    supabase
      .from('profiles')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('Erro ao excluir perfil no Supabase:', error.message);
      });
  }

  return true;
}

export function buscarUsuarioAtual(): Profile | null {
  inicializarStorageSeNecessario();
  return readJson<Profile | null>(KEY_CURRENT_USER, null);
}

export function trocarUsuarioAtual(perfil: Profile) {
  writeJson(KEY_CURRENT_USER, perfil);
}

export function limparUsuarioAtual() {
  localStorage.removeItem(KEY_CURRENT_USER);
  window.dispatchEvent(new Event('amigos_caio_storage_update'));
}

// ==========================================
// AUDIT LOG
// ==========================================

export function listarAuditLogs(): AuditLog[] {
  return readJson<AuditLog[]>(KEY_LOGS, []);
}

export function adicionarAuditLog(log: Omit<AuditLog, 'id' | 'criado_em'>): AuditLog {
  const logs = readJson<AuditLog[]>(KEY_LOGS, []);
  const idLog = crypto.randomUUID();
  const agora = new Date().toISOString();
  const userIdValido = log.user_id && UUID_REGEX.test(log.user_id) ? log.user_id : null;

  const novoLog: AuditLog = {
    ...log,
    id: idLog,
    user_id: userIdValido,
    criado_em: agora,
  };
  logs.unshift(novoLog);
  writeJson(KEY_LOGS, logs);

  if (isSupabaseConfigured && supabase) {
    supabase
      .from('audit_log')
      .insert({
        id: novoLog.id,
        user_id: userIdValido,
        user_nome: novoLog.user_nome || 'Sistema',
        acao: novoLog.acao,
        entidade: novoLog.entidade || null,
        entidade_id: novoLog.entidade_id || null,
        detalhes: novoLog.detalhes || null,
        dispositivo: novoLog.dispositivo || 'web',
        criado_em: agora,
      })
      .then(({ error }) => {
        if (error) console.error('Erro ao gravar audit_log no Supabase:', error.message);
      });
  }

  return novoLog;
}
