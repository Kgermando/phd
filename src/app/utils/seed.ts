import { db } from '../db/database';
import { Producer, User } from '../models/models';

const ZONES = ['Yalisenza', 'Monzamboli', 'Kwanza', 'Yandongi-Yamandika', 'Manga', 'Bilia', 'YALGBA'];

const VILLAGES: Record<string, string[]> = {
  Yalisenza: ['Yalisenza Centre', 'Yalisenza Nord'],
  Monzamboli: ['Monzamboli', 'Molua'],
  Kwanza: ['Kwanza', 'Itimbiri'],
  'Yandongi-Yamandika': ['Yandongi', 'Yamandika'],
  Manga: ['Manga', 'Lorka'],
  Bilia: ['Bilia', 'Banda Yowa'],
  YALGBA: ['YALGBA', 'Bumba'],
};

const NOMS_H = ['Jean Mobili', 'Pierre Bofolo', 'Emmanuel Lokondo', 'André Bolumbu', 'Claude Motindo', 'Patrick Lisomba', 'Désiré Mombele', 'Yves Ilanga', 'Robert Bokolombe', 'Alain Mongala'];
const NOMS_F = ['Marie Losanganya', 'Alice Bolela', 'Berthe Mobimba', 'Clarisse Eboma', 'Rose Lisomba', 'Suzanne Mombele', 'Jeanne Loketa', 'Christine Bangala'];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randBool(prob = 0.5): boolean {
  return Math.random() < prob;
}

function buildProducer(agentId: number, idx: number): Producer {
  const isFemme = randBool(0.4);
  const zone = ZONES[idx % ZONES.length];
  const village = rand(VILLAGES[zone]);
  const year = 1960 + randInt(5, 40);
  const noms = isFemme ? NOMS_F : NOMS_H;
  const nom = rand(noms);
  const anneesExp = randInt(1, 20);
  const rendement = randInt(800, 4000);
  const campagnes = randInt(1, 2);

  return {
    nom,
    sexe: isFemme ? 'femme' : 'homme',
    dateNaissance: `${year}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
    telephone: `+243 8${randInt(10, 99)} ${randInt(100, 999)} ${randInt(1000, 9999)}`,
    village,
    groupement: `Groupement ${rand(['Nord', 'Sud', 'Est', 'Ouest', 'Centre'])}`,
    zone,
    statutFoncier: rand(['proprietaire', 'exploitant', 'metayer', 'autre'] as const),
    anneesExperience: anneesExp,
    membreCooperative: randBool(0.55),
    nomCooperative: randBool(0.5) ? rand(['COPRIZ Bumba', 'ASSOPRORIZ', 'FENAPRIZ', 'CORI-Mongala']) : undefined,
    champs: [
      {
        localisation: village,
        superficie: randInt(1, 8),
        typeRiziculture: rand(['pluviale', 'irriguee', 'bas-fond'] as const),
        irrigation: randBool(0.45),
        modeAcces: rand(['voiture', 'velo', 'pied'] as const),
      },
    ],
    rotationCultures: randBool(0.6),
    utilisationCompost: randBool(0.5),
    signesDegradation: randBool(0.3),
    sourceEau: rand(['pluie', 'fleuve', 'barrage', 'forage'] as const),
    economieEau: randBool(0.4),
    parcelleInondable: randBool(0.35),
    utilisationPesticides: randBool(0.45),
    formationPesticides: randBool(0.3),
    presenceArbres: randBool(0.65),
    activiteDeforestation: randBool(0.2),
    baiseFaune: randBool(0.25),
    perteSec: randBool(0.4),
    perteInondation: randBool(0.5),
    perteVents: randBool(0.3),
    strategiesAdaptation: rand([
      'Diversification des cultures et utilisation de variétés résistantes',
      'Stockage de semences améliorées et irrigation de complément',
      'Association culturale et rotation des espèces',
      'Utilisation de techniques agroforestières',
      '',
    ]),
    varietesCultivees: rand(['NERICA 4', 'IR64', 'WITA 9', 'Bouaké 189', 'WAB 56-50']),
    rendementMoyen: rendement,
    campagnesParAn: campagnes,
    manqueEau: randBool(0.5),
    intrantsCouteux: randBool(0.6),
    accesCred: randBool(0.55),
    degradationSols: randBool(0.3),
    changementsClimatiques: randBool(0.45),
    lieuVente: rand(['Marché de Bumba', 'Localement dans le village', 'Kinshasa', 'Lisala']),
    besoinsPrioritaires: rand([
      'Accès aux intrants agricoles subventionnés et formation technique',
      'Construction de magasins de stockage et accès au crédit agricole',
      'Réhabilitation des pistes de desserte agricole',
      'Formation sur les bonnes pratiques rizicoles et phytosanitaires',
    ]),
    latitude: -1.7 + Math.random() * 1.5,
    longitude: 21.5 + Math.random() * 3,
    agentRecenseurId: agentId,
    dateRecensement: `2026-0${randInt(1, 3)}-${String(randInt(1, 28)).padStart(2, '0')}`,
  };
}

export async function seedDatabase(): Promise<void> {
  const existingUsers = await db.users.count();
  if (existingUsers > 0) return;

  const users: User[] = [
    { username: 'admin', password: 'admin123', role: 'admin', fullName: 'Administrateur Projet' },
    { username: 'agent1', password: 'agent123', role: 'agent', fullName: 'Moïse Lokota' },
    { username: 'agent2', password: 'agent123', role: 'agent', fullName: 'Félicité Bosamba' },
  ];
  const ids = await db.users.bulkAdd(users, { allKeys: true });
  const adminId = ids[0] as number;

  const producers: Producer[] = Array.from({ length: 42 }, (_, i) =>
    buildProducer(i < 15 ? adminId : (ids[1] as number), i)
  );

  await db.producers.bulkAdd(producers);
}
