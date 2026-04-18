import { Producer } from './producer.model';
import { UserStats } from './user.model';

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
