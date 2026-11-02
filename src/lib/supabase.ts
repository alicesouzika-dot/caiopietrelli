/**
 * Cliente Supabase conectado ao projeto ciyaeuhbzskwzmntadaz com fallback inteligente para Storage Engine local
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://ciyaeuhbzskwzmntadaz.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpeWFldWhienNrd3ptbnRhZGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2MzcyNjEsImV4cCI6MjEwOTIxMzI2MX0.8tdCKJ4lywTRbG8Kghp8qaf2YIdLjge7ZwohKnbUyk4';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey &&
  supabaseAnonKey.length > 20 &&
  !supabaseUrl.includes('seu-projeto')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
