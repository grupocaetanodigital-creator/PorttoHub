import { Condominium, CommonArea, Unit, Reservation } from '../types';
import { INITIAL_CONDOMINIUMS, INITIAL_AREAS, INITIAL_UNITS, INITIAL_RESERVATIONS } from '../data/initialData';

const STORAGE_KEYS = {
  CONDOS: 'porttohub_condominiums_v1',
  AREAS: 'porttohub_common_areas_v1',
  UNITS: 'porttohub_units_v1',
  RESERVATIONS: 'porttohub_reservations_v1',
  ACTIVE_CONDO: 'porttohub_active_condo_id_v1',
};

export function loadCondominiums(): Condominium[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONDOS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading condos from localStorage', e);
  }
  saveCondominiums(INITIAL_CONDOMINIUMS);
  return INITIAL_CONDOMINIUMS;
}

export function saveCondominiums(data: Condominium[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.CONDOS, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving condos to localStorage', e);
  }
}

export function loadCommonAreas(): CommonArea[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AREAS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading areas from localStorage', e);
  }
  saveCommonAreas(INITIAL_AREAS);
  return INITIAL_AREAS;
}

export function saveCommonAreas(data: CommonArea[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.AREAS, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving areas to localStorage', e);
  }
}

export function loadUnits(): Unit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.UNITS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading units from localStorage', e);
  }
  saveUnits(INITIAL_UNITS);
  return INITIAL_UNITS;
}

export function saveUnits(data: Unit[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving units to localStorage', e);
  }
}

export function loadReservations(): Reservation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RESERVATIONS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading reservations from localStorage', e);
  }
  saveReservations(INITIAL_RESERVATIONS);
  return INITIAL_RESERVATIONS;
}

export function saveReservations(data: Reservation[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving reservations to localStorage', e);
  }
}

export function loadActiveCondoId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_CONDO);
    if (stored) return stored;
  } catch (e) {
    console.error('Error reading active condo', e);
  }
  return INITIAL_CONDOMINIUMS[0].id;
}

export function saveActiveCondoId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CONDO, id);
  } catch (e) {
    console.error('Error saving active condo', e);
  }
}

export function resetToDemoData() {
  saveCondominiums(INITIAL_CONDOMINIUMS);
  saveCommonAreas(INITIAL_AREAS);
  saveUnits(INITIAL_UNITS);
  saveReservations(INITIAL_RESERVATIONS);
  saveActiveCondoId(INITIAL_CONDOMINIUMS[0].id);
}
