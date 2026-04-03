// ─────────────────────────────────────────────
//  Esta Feito – Shared Constants
// ─────────────────────────────────────────────

export const APP_NAME = 'Esta Feito';
export const APP_TAGLINE = 'Serviços ao seu alcance';
export const APP_TAGLINE_EN = 'Services at your fingertips';

export const CITIES_MZ = [
  'Maputo', 'Matola', 'Beira', 'Nampula',
  'Tete', 'Quelimane', 'Chimoio', 'Nacala',
  'Lichinga', 'Pemba',
] as const;

export const PROVINCES_MZ = [
  'Maputo Cidade', 'Maputo Província', 'Gaza', 'Inhambane',
  'Sofala', 'Manica', 'Tete', 'Zambezia',
  'Nampula', 'Cabo Delgado', 'Niassa',
] as const;

export const SERVICE_CATEGORIES = [
  { value: 'plumbing',         labelPt: 'Canalização',          labelEn: 'Plumbing',          icon: '🔧' },
  { value: 'cleaning',         labelPt: 'Limpeza',              labelEn: 'Cleaning',          icon: '🧹' },
  { value: 'electrical',       labelPt: 'Electricidade',        labelEn: 'Electrical',        icon: '⚡' },
  { value: 'painting',         labelPt: 'Pintura',              labelEn: 'Painting',          icon: '🖌️' },
  { value: 'moving',           labelPt: 'Mudanças',             labelEn: 'Moving',            icon: '📦' },
  { value: 'mining_equipment', labelPt: 'Equipamento Mineiro',  labelEn: 'Mining Equipment',  icon: '⛏️' },
  { value: 'carpentry',        labelPt: 'Carpintaria',          labelEn: 'Carpentry',         icon: '🪚' },
  { value: 'security',         labelPt: 'Segurança',            labelEn: 'Security',          icon: '🔒' },
  { value: 'gardening',        labelPt: 'Jardinagem',           labelEn: 'Gardening',         icon: '🌿' },
  { value: 'other',            labelPt: 'Outro',                labelEn: 'Other',             icon: '🛠️' },
] as const;

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
} as const;

export const JOB_PHOTO_MAX = 5;
export const JOB_DESCRIPTION_MAX_LENGTH = 1000;
export const REVIEW_COMMENT_MAX_LENGTH = 500;

// Mozambique map defaults (centred on Tete)
export const MAP_DEFAULT_CENTER = {
  latitude: -16.1564,
  longitude: 33.5867,
};
export const MAP_DEFAULT_ZOOM = 13;

// Search radius options (km)
export const SEARCH_RADIUS_OPTIONS = [1, 5, 10, 25, 50] as const;
export const DEFAULT_SEARCH_RADIUS_KM = 10;

// Socket.io events
export const SOCKET_EVENTS = {
  // Chat
  JOIN_JOB_ROOM: 'join_job_room',
  LEAVE_JOB_ROOM: 'leave_job_room',
  SEND_MESSAGE: 'send_message',
  NEW_MESSAGE: 'new_message',
  // Jobs
  JOB_UPDATED: 'job_updated',
  QUOTE_RECEIVED: 'quote_received',
  // Notifications
  NOTIFICATION: 'notification',
} as const;
