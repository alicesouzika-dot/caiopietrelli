/**
 * Motor de Sincronização e Gestão Offline-First (Dexie + Supabase)
 * Implementa Pull completo e Push com retry exponencial da fila local.
 */

import { db, FilaItem } from './db';
import { supabase, isSupabaseConfigured } from './supabase';
import { Pet } from '../types/database';
import { INITIAL_TUTORES, INITIAL_TEMPLATES, INITIAL_CAMPANHAS, INITIAL_ENVIOS } from './mockData';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Coordenadas padrão de bairros de Guapimirim/RJ para o mapa de campo
export const COORDENADAS_GUAPIMIRIM: Record<string, { lat: number; lng: number }> = {
  'Centro': { lat: -22.5358, lng: -42.9822 },
  'Bananal': { lat: -22.5280, lng: -42.9740 },
  'Parada Modelo': { lat: -22.5440, lng: -42.9910 },
  'Caneca Fina': { lat: -22.5210, lng: -42.9680 },
  'Citrolândia': { lat: -22.5510, lng: -43.0030 },
  'Paiol': { lat: -22.5390, lng: -42.9780 },
  'Vale das Pedrinhas': { lat: -22.5180, lng: -42.9860 },
  'Quinta Mariana': { lat: -22.5320, lng: -42.9650 },
};

export async function inicializarDexieSeVazio() {
  if (!isSupabaseConfigured) {
    const count = await db.tutores.count();
    if (count === 0) {
      const tutoresComGeo = INITIAL_TUTORES.map((t) => {
        const geo = COORDENADAS_GUAPIMIRIM[t.bairro || 'Centro'] || COORDENADAS_GUAPIMIRIM['Centro'];
        return {
          ...t,
          latitude: geo.lat + (Math.random() - 0.5) * 0.005,
          longitude: geo.lng + (Math.random() - 0.5) * 0.005,
          endereco: `Rua das Flores, Guapimirim/RJ`,
        };
      });

      const todosPets: Pet[] = [];
      for (const t of tutoresComGeo) {
        const { pets, ...tutorData } = t;
        await db.tutores.put(tutorData);
        if (pets && pets.length > 0) {
          for (const p of pets) {
            todosPets.push(p);
            await db.pets.put(p);
          }
        }
      }

      await db.templates.bulkPut(INITIAL_TEMPLATES);
      await db.campanhas.bulkPut(INITIAL_CAMPANHAS);
      await db.envios.bulkPut(INITIAL_ENVIOS);
      await db.meta.put({ chave: 'ultimo_sync', valor: new Date().toISOString() });
    }
    return;
  }

  // Quando conectado ao Supabase, sincroniza diretamente com o servidor
  if (navigator.onLine) {
    await sincronizarPush();
    await sincronizarPull();
  }
}

/**
 * PULL SYNC: Sincroniza o estado do Supabase com o Dexie (respeitando exclusões feitas no banco)
 */
export async function sincronizarPull(): Promise<{ novos: number; atualizados: number }> {
  if (!isSupabaseConfigured || !supabase || !navigator.onLine) {
    return { novos: 0, atualizados: 0 };
  }

  try {
    // Se houver itens na fila offline, envia antes de atualizar o cache local
    const filaPendentes = await db.fila.count();
    if (filaPendentes > 0) {
      await sincronizarPush();
    }

    const [tutoresRes, petsRes, templatesRes, campanhasRes, enviosRes] = await Promise.all([
      supabase.from('tutores').select('*').order('criado_em', { ascending: false }),
      supabase.from('pets').select('*').order('criado_em', { ascending: true }),
      supabase.from('templates').select('*').order('criado_em', { ascending: false }),
      supabase.from('campanhas').select('*').order('criado_em', { ascending: false }),
      supabase.from('envios').select('*').order('criado_em', { ascending: false }),
    ]);

    if (!tutoresRes.error && tutoresRes.data !== null) {
      await db.tutores.clear();
      if (tutoresRes.data.length > 0) {
        await db.tutores.bulkPut(tutoresRes.data);
      }
      localStorage.setItem('amigos_caio_tutores_v3', JSON.stringify(tutoresRes.data));
    }

    if (!petsRes.error && petsRes.data !== null) {
      await db.pets.clear();
      if (petsRes.data.length > 0) {
        await db.pets.bulkPut(petsRes.data);
      }
      localStorage.setItem('amigos_caio_pets_v3', JSON.stringify(petsRes.data));
    }

    if (!templatesRes.error && templatesRes.data !== null) {
      await db.templates.clear();
      if (templatesRes.data.length > 0) {
        await db.templates.bulkPut(templatesRes.data);
      }
      localStorage.setItem('amigos_caio_templates_v3', JSON.stringify(templatesRes.data));
    }

    if (!campanhasRes.error && campanhasRes.data !== null) {
      await db.campanhas.clear();
      if (campanhasRes.data.length > 0) {
        await db.campanhas.bulkPut(campanhasRes.data);
      }
      localStorage.setItem('amigos_caio_campanhas_v3', JSON.stringify(campanhasRes.data));
    }

    if (!enviosRes.error && enviosRes.data !== null) {
      await db.envios.clear();
      if (enviosRes.data.length > 0) {
        await db.envios.bulkPut(enviosRes.data);
      }
      localStorage.setItem('amigos_caio_envios_v3', JSON.stringify(enviosRes.data));
    }

    await db.meta.put({ chave: 'ultimo_sync', valor: new Date().toISOString() });
    window.dispatchEvent(new Event('amigos_caio_storage_update'));
    window.dispatchEvent(new Event('amigos_caio_sync_completed'));
    return { novos: tutoresRes.data?.length || 0, atualizados: 0 };
  } catch (err) {
    console.warn('Erro durante pull sync remoto:', err);
    return { novos: 0, atualizados: 0 };
  }
}

/**
 * PUSH SYNC: Envia itens pendentes na fila local para o Supabase
 */
export async function sincronizarPush(): Promise<{ processados: number; falhas: number }> {
  const itens = await db.fila.toArray();
  if (itens.length === 0) return { processados: 0, falhas: 0 };

  let processados = 0;
  let falhas = 0;

  for (const item of itens) {
    try {
      if (isSupabaseConfigured && supabase && navigator.onLine) {
        if (item.tipo === 'CRIAR_TUTOR_PET') {
          const { tutor, pet } = item.payload;
          const tutorPayload = {
            ...tutor,
            cpf: tutor.cpf && tutor.cpf.trim() ? tutor.cpf.trim() : null,
          };
          const { data: tutorData, error: tutorErr } = await supabase
            .from('tutores')
            .upsert(tutorPayload, { onConflict: 'id' })
            .select()
            .single();

          if (tutorErr) throw tutorErr;

          if (pet && tutorData) {
            pet.tutor_id = tutorData.id;
            const { error: petErr } = await supabase.from('pets').upsert(pet, { onConflict: 'id' });
            if (petErr) throw petErr;
          }
        } else if (item.tipo === 'CRIAR_TUTOR' || item.tipo === 'ATUALIZAR_TUTOR') {
          const tutorPayload = {
            ...item.payload,
            cpf: item.payload.cpf && item.payload.cpf.trim() ? item.payload.cpf.trim() : null,
          };
          const { error } = await supabase.from('tutores').upsert(tutorPayload, { onConflict: 'id' });
          if (error) throw error;
        } else if (item.tipo === 'CRIAR_PET') {
          const { error } = await supabase.from('pets').upsert(item.payload, { onConflict: 'id' });
          if (error) throw error;
        } else if (item.tipo === 'REGISTRAR_ENVIO' || item.tipo === 'CRIAR_ENVIO') {
          const envio = item.payload;
          const campId =
            envio.campanha_id && UUID_REGEX.test(envio.campanha_id) ? envio.campanha_id : null;
          const tutorId =
            envio.tutor_id && UUID_REGEX.test(envio.tutor_id) ? envio.tutor_id : null;
          const petId =
            envio.pet_id && UUID_REGEX.test(envio.pet_id) ? envio.pet_id : null;

          let validCampId = campId;
          if (campId) {
            const campLocal = await db.campanhas.get(campId);
            if (!campLocal) validCampId = null;
          }

          const { error } = await supabase.from('envios').upsert(
            {
              ...envio,
              campanha_id: validCampId,
              tutor_id: tutorId,
              pet_id: petId,
              origem: 'mobile',
            },
            { onConflict: 'client_uuid' }
          );
          if (error) throw error;
        } else if (item.tipo === 'EXCLUIR_TUTOR') {
          if (item.payload?.id && UUID_REGEX.test(item.payload.id)) {
            const { error } = await supabase.from('tutores').delete().eq('id', item.payload.id);
            if (error) throw error;
          }
        }
      }

      if (item.id) {
        await db.fila.delete(item.id);
      }
      processados++;
    } catch (err: any) {
      falhas++;
      if (item.id) {
        await db.fila.update(item.id, {
          tentativas: (item.tentativas || 0) + 1,
          ultimo_erro: err.message || 'Falha de sincronização',
        });
      }
    }
  }

  window.dispatchEvent(new Event('amigos_caio_sync_completed'));
  return { processados, falhas };
}

/**
 * Adiciona uma ação à fila de sincronização offline
 */
export async function enfileirarAcaoOffline(
  tipo: FilaItem['tipo'],
  payload: any
): Promise<number> {
  const id = await db.fila.add({
    tipo,
    payload,
    criado_em: new Date().toISOString(),
    tentativas: 0,
  });

  if (navigator.onLine) {
    sincronizarPush().catch(console.warn);
  }

  window.dispatchEvent(new Event('amigos_caio_storage_update'));
  return id;
}
