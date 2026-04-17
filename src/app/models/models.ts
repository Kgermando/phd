// =====================================================
// USER MODELS - Aligné avec le backend Go/Fiber
// =====================================================

export interface User {
  uuid: string;
  fullname: string;
  email: string;
  telephone: string;
  password: string;
  password_confirm?: string;
  role: 'Directeur' | 'Superviseur' | 'Producteur' | 'Admin';
  permission: string;
  status: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserResponse {
  uuid: string;
  fullname: string;
  email: string;
  telephone: string;
  password?: string;
  password_confirm?: string;
  role: 'Directeur' | 'Superviseur' | 'Producteur' | 'Admin';
  permission: string;
  status: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LoginRequest {
  identifier: string; // email ou telephone
  password: string;
}

export interface LoginResponse {
  message: string;
  data: string; // JWT token
}

export interface PasswordResetRequest {
  email: string;
}

export interface ResetPasswordRequest {
  password: string;
  password_confirm: string;
}

export interface UpdateInfoRequest {
  fullname: string;
  email: string;
  telephone: string;
  direction_uuid?: string;
  bureau_uuid?: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  password: string;
  password_confirm: string;
}

// =====================================================
// SYNC STATUS - Pour tracker l'état offline/online
// =====================================================
export interface SyncStatus {
  isSynced: boolean;
  lastSyncTime?: Date;
  pendingChanges: number;
  isOnline: boolean;
}

// =====================================================
// CHAMPS MODEL - Champs agricoles
// =====================================================
export interface Champs {
  uuid?: string;
  producer_uuid: string;
  localisation: string;
  superficie: number; // en hectares
  type_riziculture: 'pluviale' | 'irriguee' | 'bas-fond';
  irrigation: boolean;
  mode_acces: 'voiture' | 'velo' | 'pied';
  created_at?: Date;
  updated_at?: Date;
}

// =====================================================
// SCORE MODEL - Grille de scoring /100 (seuil >= 60)
// =====================================================
export interface Score {
  uuid?: string;
  producer_uuid: string;
  superficie_cultivee: number;           // max 10
  experience_riziculture: number;        // max 10
  statut_foncier_securise: number;       // max 10
  acces_eau: number;                     // max 10
  respect_itineraires_techniques: number; // max 10
  pratiques_environnementales: number;   // max 10
  vulnerabilite_climatique: number;      // max 10
  organisation_cooperative: number;      // max 5
  capacite_production: number;           // max 10
  motivation_engagement: number;         // max 10
  inclusion_sociale: number;             // max 5
  score_total: number;
  recommande: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// =====================================================
// PRODUCER MODEL - Aligné avec le backend Go/Fiber
// =====================================================
export interface Producer {
  uuid?: string;
  created_at?: Date;
  updated_at?: Date;

  user_uuid?: string;
  user?: UserResponse;

  // Section 1 - Informations personnelles
  nom: string;
  sexe: 'homme' | 'femme';
  date_naissance: string;
  telephone: string;
  village: string;
  groupement: string;

  // Section 2 - Statut foncier & expérience
  statut_foncier: 'proprietaire' | 'exploitant' | 'metayer' | 'autre';
  annees_experience: number;
  membre_cooperative: boolean;
  nom_cooperative?: string;

  // Section 3 - Champs
  champs: Champs[];

  // Section 4 - Pratiques environnementales
  rotation_cultures: boolean;
  utilisation_compost: boolean;
  signes_degradation: boolean;
  source_eau: 'pluie' | 'fleuve' | 'barrage' | 'forage';
  economie_eau: boolean;
  parcelle_inondable: boolean;
  utilisation_pesticides: boolean;
  formation_pesticides: boolean;
  presence_arbres: boolean;
  activite_deforestation: boolean;
  baise_faune: boolean;

  // Section 5 - Risques climatiques
  perte_sec: boolean;
  perte_inondation: boolean;
  perte_vents: boolean;
  strategies_adaptation: string;

  // Section 6 - Production
  varietes_cultivees: string;
  rendement_moyen: number;
  campagnes_par_an: number;

  // Section 7 - Contraintes
  manque_eau: boolean;
  intrants_couteux: boolean;
  acces_credit: boolean;
  degradation_sols: boolean;
  changements_climatiques: boolean;
  lieu_vente: string;

  // Section 8 - Besoins
  besoins_prioritaires: string;

  // Section 9 - Géolocalisation
  latitude?: number;
  longitude?: number;
  zone: string;

  scores?: Score[];

  // Offline sync flag (front-end only, not sent to backend)
  _pending?: boolean;
}

// =====================================================
// PRODUCER STATS - Returned by GET /producers/stats
// =====================================================
export interface ProducerStats {
  Total: number;
  Eligible: number;
  NonEligible: number;
  Femmes: number;
}

// =====================================================
// API RESPONSES
// =====================================================
export interface ProducerResponse {
  status: 'success' | 'error';
  message?: string;
  producer?: Producer;
  producers?: Producer[];
  total?: number;
  page?: number;
  limit?: number;
}

// =====================================================
// MAP MODELS - Aligné avec les endpoints /dashboard/map
// =====================================================
export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapProducerResponse {
  producer: Producer;
  score: number;
  position: LatLng;
}

export interface MapData {
  producers: MapProducerResponse[];
  total: number;
  with_coords: number;
}

// =====================================================
// DASHBOARD MODELS - Aligné avec les endpoints /dashboard
// =====================================================

export interface ZoneStat {
  zone: string;
  count: number;
  eligible: number;
  avg_score: number;
  producers: number;
}

export interface BarStat {
  label: string;
  count: number;
}

export interface PieSlice {
  label: string;
  count: number;
  pct: number;
  color: string;
  d: string;
}

export interface LineData {
  month: string;
  label: string;
  count: number;
}

export interface UserStats {
  user_uuid: string;
  user_fullname: string;
  total_producers: number;
  eligible_producers: number;
  non_eligible_producers: number;
  avg_score: number;
  completion_rate: number;
  last_survey_date: string | null;
}

export interface DashboardStats {
  total: number;
  eligible: number;
  non_eligible: number;
  avg_score: number;
  femmes: number;
  hommes: number;
  zones: ZoneStat[];
  max_zone_count: number;
  recent: Producer[];
  statut_foncier_pie: PieSlice[];
  source_eau_pie: PieSlice[];
  type_riz_pie: PieSlice[];
  cooperative_pie: PieSlice[];
  zone_pie: PieSlice[];
  tranche_age_stats: BarStat[];
  line_data: LineData[];
}

export interface ZonePerformance {
  zone: string;
  total_producers: number;
  eligible_producers: number;
  avg_score: number;
  top_agents: UserStats[];
}

export interface ScoreDetail {
  total: number;
  environmental: number;
  experience: number;
  production: number;
  risk_management: number;
  access_to_resources: number;
  institutional_support: number;
}

export interface ProducerWithScore {
  producer: Producer;
  score: number;
  score_detail: ScoreDetail;
}
