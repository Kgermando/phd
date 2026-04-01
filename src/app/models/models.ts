export interface User {
  id?: number;
  username: string;
  password: string;
  role: 'admin' | 'agent';
  fullName: string;
}

export interface Field {
  id?: number;
  localisation: string;
  superficie: number;
  typeRiziculture: 'pluviale' | 'irriguee' | 'bas-fond';
  irrigation: boolean;
  modeAcces: 'voiture' | 'velo' | 'pied';
}

export interface Producer {
  id?: number;
  nom: string;
  sexe: 'homme' | 'femme';
  dateNaissance: string;
  telephone: string;
  village: string;
  groupement: string;
  statutFoncier: 'proprietaire' | 'exploitant' | 'metayer' | 'autre';
  anneesExperience: number;
  membreCooperative: boolean;
  nomCooperative?: string;
  champs: Field[];
  // Section 4 - Pratiques environnementales
  rotationCultures: boolean;
  utilisationCompost: boolean;
  signesDegradation: boolean;
  sourceEau: 'pluie' | 'fleuve' | 'barrage' | 'forage';
  economieEau: boolean;
  parcelleInondable: boolean;
  utilisationPesticides: boolean;
  formationPesticides: boolean;
  presenceArbres: boolean;
  activiteDeforestation: boolean;
  baiseFaune: boolean;
  // Section 5 - Risques climatiques
  perteSec: boolean;
  perteInondation: boolean;
  perteVents: boolean;
  strategiesAdaptation: string;
  // Section 6 - Production
  varietesCultivees: string;
  rendementMoyen: number;
  campagnesParAn: number;
  // Section 7 - Contraintes
  manqueEau: boolean;
  intrantsCouteux: boolean;
  accesCred: boolean;
  degradationSols: boolean;
  changementsClimatiques: boolean;
  lieuVente: string;
  // Section 8
  besoinsPrioritaires: string;
  // Section 9 - Géolocalisation
  latitude?: number;
  longitude?: number;
  // Meta
  agentRecenseurId: number;
  dateRecensement: string;
  zone: string;
  score?: number;
}
