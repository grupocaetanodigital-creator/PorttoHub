/**
 * PorttoHub — Re-export de Migração para Firebase Firestore
 * Redireciona todas as chamadas herdadas para a SDK oficial do Firebase.
 */

export * from './firebase';
export { firebaseDb as supabase, firebaseDb } from './firebase';
