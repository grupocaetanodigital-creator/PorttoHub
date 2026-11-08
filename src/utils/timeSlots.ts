import { CommonArea, Reservation, TimeSlot } from '../types';

export function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

export function formatMinutesToTime(totalMinutes: number): string {
  const normalized = totalMinutes % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Generates all discrete time slots between startHour and endHour
 * respecting slotDurationMinutes (e.g. 60, 30, 120, 240)
 */
export function generateTimeSlotsForArea(
  area: CommonArea,
  date: string,
  reservations: Reservation[]
): TimeSlot[] {
  const startMins = parseTimeToMinutes(area.startHour);
  let endMins = parseTimeToMinutes(area.endHour);

  // If endHour is "00:00", it means midnight (24:00)
  if (endMins === 0 && startMins > 0) {
    endMins = 24 * 60;
  } else if (endMins <= startMins) {
    // If end is before start, assume next day midnight
    endMins += 24 * 60;
  }

  const duration = Math.max(30, area.slotDurationMinutes || 60);
  const slots: TimeSlot[] = [];

  // Filter reservations for this area on this date that are not cancelled
  const areaReservations = reservations.filter(
    (r) => r.areaId === area.id && r.date === date && r.status !== 'cancelada'
  );

  for (let current = startMins; current + duration <= endMins; current += duration) {
    const slotStartStr = formatMinutesToTime(current);
    const slotEndStr = formatMinutesToTime(current + duration);

    // Check if slot overlaps with an existing reservation
    const matchingReservation = areaReservations.find((r) => {
      const rStart = parseTimeToMinutes(r.startTime);
      let rEnd = parseTimeToMinutes(r.endTime);
      if (rEnd <= rStart) rEnd += 24 * 60;

      const slotS = current;
      const slotE = current + duration;

      // Overlap condition
      return Math.max(rStart, slotS) < Math.min(rEnd, slotE);
    });

    slots.push({
      startTime: slotStartStr,
      endTime: slotEndStr,
      isAvailable: !matchingReservation,
      reservation: matchingReservation,
    });
  }

  return slots;
}

export function formatDatePTBR(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  
  const weekdays = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];
  const months = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  return `${weekdays[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

export function formatShortDatePTBR(dateStr: string): { weekday: string; day: string; month: string } {
  if (!dateStr) return { weekday: '', day: '', month: '' };
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);

  const shortWeekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return {
    weekday: shortWeekdays[d.getDay()],
    day: String(d.getDate()).padStart(2, '0'),
    month: shortMonths[d.getMonth()],
  };
}

export function formatCurrencyBRL(value: number): string {
  if (!value || value <= 0) return 'Gratuito';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function generateReservationCode(unitNumber: string): string {
  const cleanUnit = unitNumber.replace(/\D/g, '') || '00';
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RES-${cleanUnit}-${rand}`;
}
