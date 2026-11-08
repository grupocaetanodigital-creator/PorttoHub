export type AreaType = 
  | 'quadra' 
  | 'academia' 
  | 'jogos' 
  | 'festa' 
  | 'churrasqueira' 
  | 'piscina' 
  | 'coworking' 
  | 'outro';

export type ResidentType = 'Morador' | 'Dependente' | 'Inquilino' | 'Prestador' | 'Funcionário' | 'proprietario' | 'outro';
export type ResidentStatus = 'Ativo' | 'Bloqueado' | 'Pendente';

export interface Resident {
  id: string;
  condoId?: string;
  name: string;
  unit?: string;
  block?: string;
  type?: ResidentType;
  role?: 'proprietario' | 'inquilino' | 'dependente' | 'outro';
  status?: ResidentStatus;
  document?: string;
  phone: string;
  email: string;
  vehiclePlate?: string;
  faceEnrolled?: boolean;
  avatar?: string;
  biometricVectorId?: string;
  accessSchedule?: '24h' | 'Comercial' | 'Personalizado';
  isResponsible?: boolean;
  createdAt?: string;
}

export interface Unit {
  id: string;
  condoId: string;
  number: string;
  block: string;
  residents: Resident[];
}

export interface UnitSummary {
  unitNumber: string;
  block: string;
  residents: Resident[];
  hasVehicles: boolean;
  activeStatus: boolean;
}

export interface CommonArea {
  id: string;
  condoId: string;
  name: string;
  type: AreaType;
  startHour: string; // e.g. "06:00"
  endHour: string;   // e.g. "22:00"
  slotDurationMinutes: number; // e.g. 60 or 30 or 120
  capacity: number;
  description: string;
  rules: string[];
  cleaningFee: number; // 0 for free
  requiresApproval?: boolean;
  isActive: boolean;
  color?: string;
}

export type ReservationStatus = 'confirmada' | 'em_uso' | 'concluida' | 'cancelada';

export interface Reservation {
  id: string;
  condoId: string;
  areaId: string;
  unitId: string;
  unitNumber: string;
  unitBlock: string;
  residentId: string;
  residentName: string;
  residentPhone?: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "08:00"
  endTime: string;   // "09:00"
  status: ReservationStatus;
  guestCount: number;
  notes?: string;
  cleaningFee: number;
  createdAt: string;
  reservationCode: string;
}

export interface Condominium {
  id: string;
  name: string;
  code: string;
  cnpj?: string;
  address: string;
  city?: string;
  state?: string;
  totalUnits?: number;
  unitsCount?: number;
  activeResidents?: number;
  securityLevel?: 'Alto' | 'Médio' | 'Máximo';
  contactPhone?: string;
  syndicName?: string;
  createdAt?: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  reservation?: Reservation;
}

export type AccessStatus = 'Liberado' | 'Negado' | 'Alerta' | 'Cadastrado';
export type AccessMethod = 'Reconhecimento Facial' | 'QR Code' | 'Tag RFID' | 'Acionamento Remoto' | 'Biometria Digital';

export interface AccessLog {
  id: string;
  condoId: string;
  residentName: string;
  unit: string;
  timestamp: string;
  date: string;
  status: AccessStatus;
  method: AccessMethod;
  gate: string;
  reason?: string;
  photoUrl?: string;
  confidenceScore?: number;
  livenessScore?: number;
}

export interface VisitorPass {
  id: string;
  condoId: string;
  visitorName: string;
  document: string;
  unitDestination: string;
  residentAuthorizer: string;
  type: 'Visitante' | 'Delivery' | 'Prestador' | 'Festa / Evento';
  qrCodeToken: string;
  validUntil: string;
  singleUse: boolean;
  used: boolean;
  status: 'Válido' | 'Expirado' | 'Utilizado';
  notes?: string;
}

export interface HardwareDevice {
  id: string;
  condoId: string;
  name: string;
  type: 'camera' | 'relay' | 'totem' | 'turnstile';
  ipAddress: string;
  port: number;
  status: 'online' | 'offline' | 'alert';
  location: string;
  lastPing: string;
  pulseTimeMs?: number;
  streamUrl?: string;
}
