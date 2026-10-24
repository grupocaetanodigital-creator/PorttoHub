/**
 * PorttoHub — Bridge de Compatibilidade Transparente
 * 100% Migrado para o Supabase Oficial (Projeto fukxrdzhryumbcqibtas)
 * Redireciona todas as chamadas para o cliente Supabase sem consumo de quota Firebase.
 */

export * from './supabase';
export { supabase as firebaseDb } from './supabase';
