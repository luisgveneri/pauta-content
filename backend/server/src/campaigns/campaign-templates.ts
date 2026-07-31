import { CampaignObjective, CampaignSlotPhase } from '@prisma/client';

export type SlotTemplate = {
  phase: CampaignSlotPhase;
  relativeTo: 'start' | 'end';
  offsetDays: number;
  label: string;
};

export const CAMPAIGN_TEMPLATES: Record<CampaignObjective, SlotTemplate[]> = {
  TOURNAMENT: [
    { phase: 'PRE', relativeTo: 'start', offsetDays: -21, label: 'Apertura de inscripciones' },
    { phase: 'PRE', relativeTo: 'start', offsetDays: -7, label: 'Últimas plazas' },
    { phase: 'PRE', relativeTo: 'start', offsetDays: -2, label: 'Cuenta atrás' },
    { phase: 'DURING', relativeTo: 'start', offsetDays: 0, label: 'Cobertura en directo' },
    { phase: 'POST', relativeTo: 'end', offsetDays: 1, label: 'Resultados y highlights' },
  ],
  CLINIC: [
    { phase: 'PRE', relativeTo: 'start', offsetDays: -14, label: 'Anuncio del clinic' },
    { phase: 'PRE', relativeTo: 'start', offsetDays: -3, label: 'Últimas plazas' },
    { phase: 'DURING', relativeTo: 'start', offsetDays: 0, label: 'Contenido del día' },
    { phase: 'POST', relativeTo: 'end', offsetDays: 2, label: 'Resumen y feedback' },
  ],
  TEAM_RECRUITMENT: [
    { phase: 'PRE', relativeTo: 'start', offsetDays: -21, label: 'Buscamos jugadores' },
    { phase: 'PRE', relativeTo: 'start', offsetDays: -7, label: 'Recordatorio de captación' },
    { phase: 'DURING', relativeTo: 'start', offsetDays: 0, label: 'Behind the scenes' },
    { phase: 'POST', relativeTo: 'end', offsetDays: 3, label: 'Presentación del equipo' },
  ],
  OTHER: [
    { phase: 'PRE', relativeTo: 'start', offsetDays: -7, label: 'Anuncio' },
    { phase: 'DURING', relativeTo: 'start', offsetDays: 0, label: 'Cobertura' },
    { phase: 'POST', relativeTo: 'end', offsetDays: 2, label: 'Resumen' },
  ],
};

export const OBJECTIVE_RESULT_UNITS: Record<CampaignObjective, string> = {
  TOURNAMENT: 'plazas vendidas',
  CLINIC: 'inscripciones',
  TEAM_RECRUITMENT: 'equipos captados',
  OTHER: 'resultado',
};

export function generateSlots(objective: CampaignObjective, eventStartDate: Date, eventEndDate: Date) {
  return CAMPAIGN_TEMPLATES[objective].map((template) => {
    const anchor = template.relativeTo === 'start' ? eventStartDate : eventEndDate;
    const scheduledDate = new Date(anchor);
    scheduledDate.setDate(scheduledDate.getDate() + template.offsetDays);
    return {
      phase: template.phase,
      label: template.label,
      scheduledDate,
    };
  });
}
