// =====================================================
// Données géographiques de la République Démocratique du Congo
// Province de la Mongala · 3 territoires · secteurs et groupements
// =====================================================

export interface SecteurRDC {
  nom: string;
  groupements: string[];
}

export interface TerritoireRDC {
  nom: string;
  secteurs: SecteurRDC[];
}

export interface ProvinceRDC {
  nom: string;
  territoires: TerritoireRDC[];
}

export const PROVINCES_RDC: ProvinceRDC[] = [
  {
    nom: 'Mongala',
    territoires: [
      {
        nom: 'Bongandanga',
        secteurs: [
          { nom: 'Bongandanga', groupements: [] },
          { nom: 'Boso-Djanoa', groupements: [] },
          { nom: 'Boso-Melo', groupements: [] },
          { nom: 'Boso-Simba', groupements: [] },
        ],
      },
      {
        nom: 'Bumba',
        secteurs: [
          {
            nom: 'Banda-Yowa',
            groupements: [
              'Bokoy', 'Boli Nord', 'Boli Sud', 'Gongo',
              'Yamandika I', 'Yamandika II', 'Yambata-Bambou', 'Yambata-Rizière',
            ],
          },
          {
            nom: 'Itimbiri',
            groupements: [
              'Bokombe', 'Bopandu', 'Bowela Bomenge', 'Concession PHC',
              'PHC Yamolota', 'Woonda', 'Yabiango', 'Yaliambi', 'Yaligimba', 'Yamolota',
            ],
          },
          {
            nom: 'Loeka',
            groupements: [
              'Bongowy', 'Bosanga', 'Botsoli', 'Budja',
              'Manga', 'Wasalaka', 'Yakoy', 'Yambenga', 'Yambili', 'Yamongili',
            ],
          },
          {
            nom: 'Molua',
            groupements: [
              'Bondjo', 'Ebonda', 'Ekango', 'Likombe', 'Yaengomba',
              'Yalokolu', 'Yambau', 'Yambuli', 'Yamikeli', 'Yamisiko', 'Yamolanga', 'Yapaka',
            ],
          },
          {
            nom: 'Monzamboli',
            groupements: [
              'Bolupi', 'Ndobo', 'Yakombo', 'Yalombo', 'Yambao',
              'Yambenga', 'Yamendo', 'Yangola', 'Yanzela', 'Yatshonzo',
            ],
          },
          {
            nom: 'Yandongi',
            groupements: [
              'Bauma', 'Benzale', 'Bodzogi', 'Bokoy', 'Bondunga', 'Doko',
              'Libute', 'Mombongo', 'Ndundu Sanga', 'Yalisika', 'Yambila', 'Yambuku', 'Yanzela', 'Yasongo',
            ],
          },
        ],
      },
      {
        nom: 'Lisala',
        secteurs: [
          { nom: 'Mongala-Motima', groupements: [] },
          { nom: 'Ngombe-Doko', groupements: [] },
          { nom: 'Ngombe-Mombangi', groupements: [] },
        ],
      },
    ],
  },
];

export const NOMS_PROVINCES: string[] = PROVINCES_RDC.map(p => p.nom);

export function getTerritoiresByProvince(province: string): string[] {
  return PROVINCES_RDC.find(p => p.nom === province)?.territoires.map(t => t.nom) ?? [];
}

export function getSecteursByTerritoire(province: string, territoire: string): string[] {
  const prov = PROVINCES_RDC.find(p => p.nom === province);
  return prov?.territoires.find(t => t.nom === territoire)?.secteurs.map(s => s.nom) ?? [];
}

export function getGroupementsBySecteur(province: string, territoire: string, secteur: string): string[] {
  const prov = PROVINCES_RDC.find(p => p.nom === province);
  const terr = prov?.territoires.find(t => t.nom === territoire);
  return terr?.secteurs.find(s => s.nom === secteur)?.groupements ?? [];
}
