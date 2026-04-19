import { UserResponse } from './user.model';

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
  superficie_cultivee: number;            // max 10
  experience_riziculture: number;         // max 10
  statut_foncier_securise: number;        // max 10
  acces_eau: number;                      // max 10
  respect_itineraires_techniques: number; // max 10
  pratiques_environnementales: number;    // max 10
  vulnerabilite_climatique: number;       // max 10
  organisation_cooperative: number;       // max 5
  capacite_production: number;            // max 10
  motivation_engagement: number;          // max 10
  inclusion_sociale: number;              // max 5
  score_total: number;
  recommande: boolean;
  created_at?: Date;
  updated_at?: Date;

  // Offline sync flag (front-end only, not sent to backend)
  _pending?: boolean;
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
  province: string;
  territoire: string;
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

  /** Computed by backend on paginated list responses (score >= 60 → eligible). */
  total_score?: number;

  // Offline sync flag (front-end only, not sent to backend)
  _pending?: boolean;
}

// =====================================================
// PRODUCER STATS - Returned by GET /producers/stats
// =====================================================
export interface ProducerStats {
  total: number;
  eligible: number;
  non_eligible: number;
  femmes: number;
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

export interface ScoreDetail {
  total: number;
  environmental: number;
  experience: number;
  production: number;
  risk_management: number;
  access_to_resources: number;
  institutional_support: number;
}

/** Backend embeds all Producer fields at the top level and appends total_score. */
export type ProducerWithScore = Producer & { total_score: number; };
