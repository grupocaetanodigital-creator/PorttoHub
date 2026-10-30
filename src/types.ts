export type AreaType = 
  | 'quadra' 
  | 'academia' 
  | 'jogos' 
  | 'festa' 
  | 'churrasqueira' 
  | 'piscina' 
  | 'coworking' 
  | 'outro';

export interface Resident {
  id: string;
  name: string;
  role: 'proprietario' | 'inquilino' | 'dependente' | 'outro';
  phone: string;
  email: string;
  isResponsible: boolean;
}

export interface Unit {
  id: string;
  condoId: string;
  number: string;
  block: string;
  residents: Resident[];
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
  address: string;
  unitsCount: number;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  reservation?: Reservation;
}
