import { Producer } from '../models/models';

export interface ScoreDetail {
  critere: string;
  description: string;
  score: number;
  max: number;
}

export interface ScoringResult {
  total: number;
  details: ScoreDetail[];
  eligible: boolean;
}

export function scoreProducer(p: Producer): ScoringResult {
  const details: ScoreDetail[] = [];

  // 1. Superficie cultivée (max 10)
  const totalha = p.champs.reduce((s, c) => s + c.superficie, 0);
  details.push({
    critere: 'Superficie cultivée',
    description: 'Priorité aux exploitations économiquement viables',
    score: totalha >= 5 ? 10 : totalha >= 2 ? 7 : totalha >= 1 ? 4 : 2,
    max: 10,
  });

  // 2. Expérience en riziculture (max 10)
  details.push({
    critere: 'Expérience en riziculture',
    description: "Nombre d'années de pratique",
    score: p.anneesExperience >= 10 ? 10 : p.anneesExperience >= 5 ? 7 : p.anneesExperience >= 2 ? 4 : 1,
    max: 10,
  });

  // 3. Statut foncier sécurisé (max 10)
  details.push({
    critere: 'Statut foncier sécurisé',
    description: "Propriétaire ou droit d'exploitation stable",
    score: p.statutFoncier === 'proprietaire' ? 10 : p.statutFoncier === 'exploitant' ? 7 : p.statutFoncier === 'metayer' ? 4 : 2,
    max: 10,
  });

  // 4. Accès à l'eau (max 10)
  const hasIrrigation = p.champs.some((c) => c.irrigation);
  details.push({
    critere: "Accès à l'eau",
    description: 'Irrigation fiable ou aménagement hydraulique',
    score: hasIrrigation ? 10 : p.sourceEau === 'barrage' || p.sourceEau === 'forage' ? 7 : p.sourceEau === 'fleuve' ? 5 : 3,
    max: 10,
  });

  // 5. Respect des itinéraires techniques (max 10)
  details.push({
    critere: 'Respect des itinéraires techniques',
    description: 'Calendrier agricole, bonnes semences, application conseil',
    score: p.campagnesParAn >= 2 && p.rendementMoyen > 0 ? 8 : p.campagnesParAn >= 1 ? 5 : 2,
    max: 10,
  });

  // 6. Pratiques environnementales (max 10)
  const envScore = [p.rotationCultures, p.utilisationCompost, p.presenceArbres, !p.activiteDeforestation].filter(Boolean).length;
  details.push({
    critere: 'Pratiques environnementales',
    description: 'Rotation, compost, gestion durable',
    score: Math.round((envScore / 4) * 10),
    max: 10,
  });

  // 7. Vulnérabilité climatique (max 10)
  const risques = [p.perteSec, p.perteInondation, p.perteVents].filter(Boolean).length;
  const adapte = p.strategiesAdaptation && p.strategiesAdaptation.trim().length > 5;
  details.push({
    critere: 'Vulnérabilité climatique',
    description: "Producteurs à risque mais capables de s'adapter",
    score: risques > 0 && adapte ? 10 : risques > 0 && !adapte ? 5 : 7,
    max: 10,
  });

  // 8. Organisation / Coopérative (max 5)
  details.push({
    critere: 'Organisation / Coopérative',
    description: "Membre actif d'une organisation agricole",
    score: p.membreCooperative ? 5 : 0,
    max: 5,
  });

  // 9. Capacité de production (max 10)
  details.push({
    critere: 'Capacité de production',
    description: "Rendement et potentiel d'amélioration",
    score: p.rendementMoyen >= 3000 ? 10 : p.rendementMoyen >= 2000 ? 8 : p.rendementMoyen >= 1000 ? 5 : 2,
    max: 10,
  });

  // 10. Motivation / Engagement (max 10)
  details.push({
    critere: 'Motivation / Engagement',
    description: 'Disponibilité pour formations et respect des exigences projet',
    score: p.besoinsPrioritaires && p.besoinsPrioritaires.trim().length > 5 ? 8 : 4,
    max: 10,
  });

  // 11. Inclusion sociale (max 5)
  const annee = new Date().getFullYear();
  const age = p.dateNaissance ? annee - parseInt(p.dateNaissance.split('-')[0], 10) : 40;
  const estJeune = age < 35;
  const estFemme = p.sexe === 'femme';
  details.push({
    critere: 'Inclusion sociale',
    description: 'Jeunes, femmes, groupes vulnérables',
    score: estFemme && estJeune ? 5 : estFemme || estJeune ? 3 : 0,
    max: 5,
  });

  const total = details.reduce((s, d) => s + d.score, 0);
  return { total, details, eligible: total >= 60 };
}
