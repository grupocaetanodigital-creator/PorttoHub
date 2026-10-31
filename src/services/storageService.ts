import { Condominium, Resident, AccessLog, VisitorPass, HardwareDevice } from '../types';
import { 
  INITIAL_CONDOMINIUMS, 
  INITIAL_RESIDENTS, 
  INITIAL_ACCESS_LOGS, 
  INITIAL_VISITOR_PASSES, 
  INITIAL_DEVICES 
} from '../data/initialData';

const STORAGE_KEYS = {
  CONDOMINIUMS: 'porttohub_condominiums_v1',
  ACTIVE_CONDO_ID: 'porttohub_active_condo_id_v1',
  RESIDENTS: 'porttohub_residents_v1',
  LOGS: 'porttohub_logs_v1',
  VISITOR_PASSES: 'porttohub_visitor_passes_v1',
  DEVICES: 'porttohub_devices_v1'
};

export const storageService = {
  // --- CONDOMINIUMS ---
  getCondominiums(): Condominium[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONDOMINIUMS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Error reading condominiums:', e);
    }
    // Initialize if empty
    localStorage.setItem(STORAGE_KEYS.CONDOMINIUMS, JSON.stringify(INITIAL_CONDOMINIUMS));
    return INITIAL_CONDOMINIUMS;
  },

  saveCondominium(condo: Condominium): Condominium[] {
    const list = this.getCondominiums();
    const existingIndex = list.findIndex(c => c.id === condo.id);
    let updated: Condominium[];
    if (existingIndex >= 0) {
      updated = list.map(c => c.id === condo.id ? condo : c);
    } else {
      updated = [condo, ...list];
    }
    localStorage.setItem(STORAGE_KEYS.CONDOMINIUMS, JSON.stringify(updated));
    return updated;
  },

  getActiveCondoId(): string {
    const id = localStorage.getItem(STORAGE_KEYS.ACTIVE_CONDO_ID);
    if (id) return id;
    const condos = this.getCondominiums();
    const defaultId = condos[0]?.id || 'condo_1';
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CONDO_ID, defaultId);
    return defaultId;
  },

  setActiveCondoId(id: string) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CONDO_ID, id);
  },

  // --- RESIDENTS (ENFORCING TENANT ISOLATION) ---
  getAllResidents(): Resident[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RESIDENTS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Error reading residents:', e);
    }
    localStorage.setItem(STORAGE_KEYS.RESIDENTS, JSON.stringify(INITIAL_RESIDENTS));
    return INITIAL_RESIDENTS;
  },

  getResidentsForCondo(condoId: string): Resident[] {
    const all = this.getAllResidents();
    // Strict tenant isolation filter
    return all.filter(r => r.condoId === condoId);
  },

  saveResident(resident: Resident): Resident[] {
    const all = this.getAllResidents();
    const existingIndex = all.findIndex(r => r.id === resident.id);
    let updated: Resident[];
    if (existingIndex >= 0) {
      updated = all.map(r => r.id === resident.id ? resident : r);
    } else {
      updated = [resident, ...all];
    }
    localStorage.setItem(STORAGE_KEYS.RESIDENTS, JSON.stringify(updated));
    return updated.filter(r => r.condoId === resident.condoId);
  },

  deleteResident(residentId: string, condoId: string): Resident[] {
    const all = this.getAllResidents();
    const updated = all.filter(r => r.id !== residentId);
    localStorage.setItem(STORAGE_KEYS.RESIDENTS, JSON.stringify(updated));
    return updated.filter(r => r.condoId === condoId);
  },

  // --- ACCESS LOGS (STRICTLY ISOLATED PER CONDOMINIUM) ---
  getAllLogs(): AccessLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Error reading logs:', e);
    }
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_ACCESS_LOGS));
    return INITIAL_ACCESS_LOGS;
  },

  getLogsForCondo(condoId: string): AccessLog[] {
    const all = this.getAllLogs();
    return all.filter(l => l.condoId === condoId);
  },

  addLog(log: AccessLog): AccessLog[] {
    const all = this.getAllLogs();
    const updated = [log, ...all];
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updated));
    return updated.filter(l => l.condoId === log.condoId);
  },

  // --- VISITOR PASSES ---
  getAllVisitorPasses(): VisitorPass[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VISITOR_PASSES);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Error reading visitor passes:', e);
    }
    localStorage.setItem(STORAGE_KEYS.VISITOR_PASSES, JSON.stringify(INITIAL_VISITOR_PASSES));
    return INITIAL_VISITOR_PASSES;
  },

  getVisitorPassesForCondo(condoId: string): VisitorPass[] {
    const all = this.getAllVisitorPasses();
    return all.filter(p => p.condoId === condoId);
  },

  saveVisitorPass(pass: VisitorPass): VisitorPass[] {
    const all = this.getAllVisitorPasses();
    const existingIndex = all.findIndex(p => p.id === pass.id);
    let updated: VisitorPass[];
    if (existingIndex >= 0) {
      updated = all.map(p => p.id === pass.id ? pass : p);
    } else {
      updated = [pass, ...all];
    }
    localStorage.setItem(STORAGE_KEYS.VISITOR_PASSES, JSON.stringify(updated));
    return updated.filter(p => p.condoId === pass.condoId);
  },

  // --- HARDWARE DEVICES ---
  getAllDevices(): HardwareDevice[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DEVICES);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Error reading devices:', e);
    }
    localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(INITIAL_DEVICES));
    return INITIAL_DEVICES;
  },

  getDevicesForCondo(condoId: string): HardwareDevice[] {
    const all = this.getAllDevices();
    return all.filter(d => d.condoId === condoId);
  },

  saveDevice(device: HardwareDevice): HardwareDevice[] {
    const all = this.getAllDevices();
    const existingIndex = all.findIndex(d => d.id === device.id);
    let updated: HardwareDevice[];
    if (existingIndex >= 0) {
      updated = all.map(d => d.id === device.id ? device : d);
    } else {
      updated = [device, ...all];
    }
    localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(updated));
    return updated.filter(d => d.condoId === device.condoId);
  },

  resetAllData() {
    localStorage.removeItem(STORAGE_KEYS.CONDOMINIUMS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_CONDO_ID);
    localStorage.removeItem(STORAGE_KEYS.RESIDENTS);
    localStorage.removeItem(STORAGE_KEYS.LOGS);
    localStorage.removeItem(STORAGE_KEYS.VISITOR_PASSES);
    localStorage.removeItem(STORAGE_KEYS.DEVICES);
  }
};
