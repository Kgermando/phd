import { Producer } from '../models/models';

export interface ScoringDetail {
  critere: string;
  description: string;
  score: number;
  max: number;
}

export interface ScoringResult {
  total: number;
  eligible: boolean;
  experience: number;
  practices: number;
  sustainability: number;
  resilience: number;
  details: ScoringDetail[];
}

/** @deprecated Use ScoringResult */
export type ProducerScore = ScoringResult;

/**
 * Calculer le score d'un producteur basé sur plusieurs critères
 * Score totalisé de 0 à 100
 */
export function scoreProducer(producer: Producer): ScoringResult {
  let experience = 0;
  let practices = 0;
  let sustainability = 0;
  let resilience = 0;

  // 1. Score d'expérience (0-20 points)
  experience = Math.min(20, (producer.annees_experience || 0) * 2);

  // 2. Score des pratiques (0-30 points)
  const practicePoints = [
    producer.rotation_cultures ? 5 : 0,
    producer.utilisation_compost ? 5 : 0,
    producer.formation_pesticides ? 5 : 0,
    producer.membre_cooperative ? 5 : 0,
    producer.acces_credit ? 5 : 0,
    producer.presence_arbres ? 5 : 0,
  ];
  practices = Math.min(30, practicePoints.reduce((a, b) => a + b, 0));

  // 3. Score de durabilité (0-25 points)
  const sustainabilityPoints = [
    producer.economie_eau ? 5 : 0,
    !producer.utilisation_pesticides ? 5 : 0, // Bon si sans pesticides
    !producer.activite_deforestation ? 5 : 0, // Bon si pas de déforestation
    !producer.parcelle_inondable ? 5 : 0, // Bon si pas inondable
    !producer.signes_degradation ? 5 : 0, // Bon si pas de dégradation
  ];
  sustainability = Math.min(25, sustainabilityPoints.reduce((a, b) => a + b, 0));

  // 4. Score de résilience (0-25 points)
  const resiliencePoints: number[] = [];

  // Rendement moyen
  if (producer.rendement_moyen >= 3000) resiliencePoints.push(5);
  else if (producer.rendement_moyen >= 1500) resiliencePoints.push(3);
  else resiliencePoints.push(1);

  // Diversification (variétés cultivées, multiple campagnes)
  resiliencePoints.push(producer.campagnes_par_an >= 2 ? 5 : 2);

  // Adaptation aux changements climatiques
  if (producer.strategies_adaptation && producer.strategies_adaptation.length > 0) {
    resiliencePoints.push(5);
  }

  // Non affecté par les risques climatiques
  const climateRisks = [
    producer.manque_eau,
    producer.perte_sec,
    producer.perte_inondation,
    producer.perte_vents,
  ].filter(Boolean).length;

  resiliencePoints.push(Math.max(1, 5 - climateRisks));

  // Superficie totale de champs
  const totalSuperficie = producer.champs?.reduce((sum, c) => sum + c.superficie, 0) || 0;
  if (totalSuperficie >= 2) resiliencePoints.push(5);
  else if (totalSuperficie >= 1) resiliencePoints.push(3);
  else resiliencePoints.push(1);

  resilience = Math.min(25, resiliencePoints.reduce((a, b) => a + b, 0));

  const total = Math.min(100, Math.round(experience + practices + sustainability + resilience));

  return {
    total,
    eligible: total >= 60,
    experience: Math.round(experience),
    practices: Math.round(practices),
    sustainability: Math.round(sustainability),
    resilience: Math.round(resilience),
    details: [
      { critere: 'Expérience', description: 'Années d\'expérience en riziculture', score: Math.round(experience), max: 20 },
      { critere: 'Pratiques agricoles', description: 'Rotation, compost, coopérative, crédit…', score: Math.round(practices), max: 30 },
      { critere: 'Durabilité', description: 'Économie d\'eau, pesticides, déforestation…', score: Math.round(sustainability), max: 25 },
      { critere: 'Résilience', description: 'Rendement, diversification, adaptation climatique', score: Math.round(resilience), max: 25 },
    ],
  };
}

/**
 * Déterminer l'éligibilité d'un producteur
 */
export function isEligible(producer: Producer): boolean {
  return scoreProducer(producer).total >= 60;
}

/**
 * Catégoriser les producteurs
 */
export function categorizProducer(
  producer: Producer
): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  const score = scoreProducer(producer).total;

  if (score < 40) return 'beginner';
  if (score < 60) return 'intermediate';
  if (score < 80) return 'advanced';
  return 'expert';
}
