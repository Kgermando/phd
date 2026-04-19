import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Producer, ProducerStats, Champs, Score } from '../models/models';
import { AuthService } from '../auth/services/auth.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProducersService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly API_URL = `${environment.apiUrl}/producers`;
  private readonly OFFLINE_KEY = 'phd_offline_producers';
  private readonly OFFLINE_SCORES_KEY = 'phd_offline_scores';

  producers = signal<Producer[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  /** List of producers saved locally but not yet synced to the server. */
  pendingSync = signal<Producer[]>([]);

  producerCount = computed(() => this.producers().length);

  constructor() {
    this.pendingSync.set(this.readPending());
    // Auto-sync whenever the app loads and we're online
    if (navigator.onLine) {
      this.syncPending();
    }
  }

  // ─── Offline helpers ─────────────────────────────────────────

  private readPending(): Producer[] {
    try {
      return JSON.parse(localStorage.getItem(this.OFFLINE_KEY) ?? '[]') as Producer[];
    } catch {
      return [];
    }
  }

  private writePending(list: Producer[]): void {
    localStorage.setItem(this.OFFLINE_KEY, JSON.stringify(list));
    this.pendingSync.set(list);
  }

  private addPending(data: Partial<Producer>): Producer {
    const local: Producer = {
      ...(data as Producer),
      uuid: `local_${crypto.randomUUID()}`,
      _pending: true,
      champs: (data.champs ?? []) as Champs[],
      created_at: new Date(),
    };
    const list = this.readPending();
    list.push(local);
    this.writePending(list);
    return local;
  }

  removePending(uuid: string): void {
    this.writePending(this.readPending().filter(p => p.uuid !== uuid));
  }

  getPendingByUUID(uuid: string): Producer | null {
    return this.readPending().find(p => p.uuid === uuid) ?? null;
  }

  updatePending(uuid: string, data: Partial<Producer>): Producer {
    const list = this.readPending();
    const idx = list.findIndex(p => p.uuid === uuid);
    if (idx === -1) throw new Error('Producteur local introuvable');
    const updated: Producer = { ...list[idx], ...data, uuid, _pending: true };
    list[idx] = updated;
    this.writePending(list);
    return updated;
  }

  /** Try to push all pending local producers and scores to the server. */
  async syncPending(): Promise<void> {
    // 1. Sync pending producers; after creation, re-key any related pending scores
    const producerList = this.readPending();
    for (const p of producerList) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { uuid: localUUID, _pending, created_at, updated_at, ...payload } = p as any;
        const created = await this.createProducerOnline(payload);
        this.removePending(localUUID);
        // Re-associate pending scores from local UUID → real server UUID
        const related = this.readPendingScores().filter(s => s.producer_uuid === localUUID);
        for (const s of related) {
          this.updatePendingScore(s.uuid!, { producer_uuid: created.uuid });
        }
      } catch {
        // Keep it local; will retry next time
      }
    }

    // 2. Sync pending scores whose producer is now on the server
    const scores = this.readPendingScores().filter(s => !s.producer_uuid.startsWith('local_'));
    for (const s of scores) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { uuid, _pending, producer_uuid, created_at, updated_at, ...payload } = s as any;
        await this.createScoreOnline(producer_uuid, payload);
        this.removePendingScore(uuid);
      } catch {
        // Keep it local; will retry next time
      }
    }
  }

  private getAuthHeaders(): Record<string, string> {
    return this.auth.getAuthHeader();
  }

  // ─── Producers ───────────────────────────────────────────────

  async getStats(): Promise<ProducerStats | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ status: string; stats: ProducerStats }>(
          `${this.API_URL}/stats`,
          { headers: this.getAuthHeaders() },
        )
      );
      return response.stats ?? null;
    } catch {
      return null;
    }
  }

  async getPaginatedProducers(
    page = 1,
    limit = 15,
    search = '',
    village = '',
    province = '',
    territoire = '',
    zone = '',
    userUUID = '',
  ): Promise<{ data: Producer[]; total: number; total_pages: number; current_page: number }> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        limit: limit.toString(),
      };
      if (search) params['search'] = search;
      if (village) params['village'] = village;
      if (province) params['province'] = province;
      if (territoire) params['territoire'] = territoire;
      if (zone) params['zone'] = zone;
      if (userUUID) params['user_uuid'] = userUUID;
      const query = new URLSearchParams(params).toString();
      const response = await firstValueFrom(
        this.http.get<{ status: string; total: number; page: number; limit: number; producers: Producer[] }>(
          `${this.API_URL}/all/paginate?${query}`,
          { headers: this.getAuthHeaders() },
        )
      );
      const data = response.producers ?? [];
      this.producers.set(data);
      const totalPages = Math.ceil((response.total ?? 0) / (response.limit ?? limit));
      return { data, total: response.total ?? 0, total_pages: totalPages, current_page: response.page ?? page };
    } catch (err: any) {
      this.error.set(err.message ?? 'Erreur lors du chargement des producteurs');
      return { data: [], total: 0, total_pages: 0, current_page: page };
    } finally {
      this.loading.set(false);
    }
  }

  async getProducerByUUID(uuid: string): Promise<Producer | null> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(
        this.http.get<{ status: string; producer: Producer }>(
          `${this.API_URL}/get/${uuid}`,
          { headers: this.getAuthHeaders() },
        )
      );
      return response.producer ?? null;
    } catch (err: any) {
      this.error.set(err.message ?? 'Producteur introuvable');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async createProducer(data: Partial<Producer>): Promise<Producer> {
    this.error.set(null);
    if (!navigator.onLine) {
      return this.addPending(data);
    }
    return this.createProducerOnline(data);
  }

  private async createProducerOnline(data: Partial<Producer>): Promise<Producer> {
    const response = await firstValueFrom(
      this.http.post<{ status: string; producer: Producer }>(
        `${this.API_URL}/create`, data,
        { headers: this.getAuthHeaders() },
      )
    );
    return response.producer;
  }

  async updateProducer(uuid: string, data: Partial<Producer>): Promise<Producer> {
    this.error.set(null);
    const response = await firstValueFrom(
      this.http.put<{ status: string; producer: Producer }>(
        `${this.API_URL}/update/${uuid}`, data,
        { headers: this.getAuthHeaders() },
      )
    );
    return response.producer;
  }

  async deleteProducer(uuid: string): Promise<void> {
    this.error.set(null);
    await firstValueFrom(
      this.http.delete(`${this.API_URL}/delete/${uuid}`, { headers: this.getAuthHeaders() })
    );
  }

  // ─── Champs ───────────────────────────────────────────────────

  async addChamp(producerUUID: string, champ: Partial<Champs>): Promise<Champs> {
    this.error.set(null);
    const response = await firstValueFrom(
      this.http.post<{ status: string; champ: Champs }>(
        `${this.API_URL}/${producerUUID}/champs/add`, champ,
        { headers: this.getAuthHeaders() },
      )
    );
    return response.champ;
  }

  async deleteChamp(champUUID: string): Promise<void> {
    this.error.set(null);
    await firstValueFrom(
      this.http.delete(`${this.API_URL}/champs/${champUUID}`, { headers: this.getAuthHeaders() })
    );
  }

  // ─── Scores ───────────────────────────────────────────────────

  // ─── Offline score helpers ────────────────────────────────────

  private readPendingScores(): Score[] {
    try {
      return JSON.parse(localStorage.getItem(this.OFFLINE_SCORES_KEY) ?? '[]') as Score[];
    } catch {
      return [];
    }
  }

  private writePendingScores(list: Score[]): void {
    localStorage.setItem(this.OFFLINE_SCORES_KEY, JSON.stringify(list));
  }

  addPendingScore(producerUUID: string, data: Partial<Score>): Score {
    const local: Score = {
      ...(data as Score),
      uuid: `local_score_${crypto.randomUUID()}`,
      producer_uuid: producerUUID,
      score_total: this.computeScoreTotal(data),
      recommande: this.computeScoreTotal(data) >= 60,
      _pending: true,
      created_at: new Date(),
    };
    const list = this.readPendingScores();
    list.unshift(local); // newest first
    this.writePendingScores(list);
    return local;
  }

  updatePendingScore(uuid: string, data: Partial<Score>): Score {
    const list = this.readPendingScores();
    const idx = list.findIndex(s => s.uuid === uuid);
    if (idx === -1) throw new Error('Score local introuvable');
    const updated: Score = {
      ...list[idx], ...data, uuid, _pending: true,
      score_total: this.computeScoreTotal({ ...list[idx], ...data }),
      recommande: this.computeScoreTotal({ ...list[idx], ...data }) >= 60,
    };
    list[idx] = updated;
    this.writePendingScores(list);
    return updated;
  }

  removePendingScore(uuid: string): void {
    this.writePendingScores(this.readPendingScores().filter(s => s.uuid !== uuid));
  }

  getPendingScoresByProducer(producerUUID: string): Score[] {
    return this.readPendingScores().filter(s => s.producer_uuid === producerUUID);
  }

  private computeScoreTotal(data: Partial<Score>): number {
    const fields: (keyof Score)[] = [
      'superficie_cultivee', 'experience_riziculture', 'statut_foncier_securise',
      'acces_eau', 'respect_itineraires_techniques', 'pratiques_environnementales',
      'vulnerabilite_climatique', 'organisation_cooperative', 'capacite_production',
      'motivation_engagement', 'inclusion_sociale',
    ];
    return fields.reduce((sum, k) => sum + ((data[k] as number) ?? 0), 0);
  }

  async getScoresByProducer(producerUUID: string): Promise<Score[]> {
    this.error.set(null);
    try {
      const response = await firstValueFrom(
        this.http.get<{ status: string; data: Score[] }>(
          `${this.API_URL}/${producerUUID}/scores`,
          { headers: this.getAuthHeaders() },
        )
      );
      return response.data ?? [];
    } catch (err: any) {
      this.error.set(err.message ?? 'Erreur lors du chargement des scores');
      return [];
    }
  }

  async createScore(producerUUID: string, scoreData: Partial<Score>): Promise<Score> {
    this.error.set(null);
    if (!navigator.onLine) {
      return this.addPendingScore(producerUUID, scoreData);
    }
    return this.createScoreOnline(producerUUID, scoreData);
  }

  private async createScoreOnline(producerUUID: string, scoreData: Partial<Score>): Promise<Score> {
    const response = await firstValueFrom(
      this.http.post<{ status: string; data: Score }>(
        `${this.API_URL}/${producerUUID}/scores/create`, scoreData,
        { headers: this.getAuthHeaders() },
      )
    );
    return response.data;
  }

  async updateScore(scoreUUID: string, scoreData: Partial<Score>): Promise<Score> {
    this.error.set(null);
    const response = await firstValueFrom(
      this.http.put<{ status: string; data: Score }>(
        `${this.API_URL}/scores/${scoreUUID}/update`, scoreData,
        { headers: this.getAuthHeaders() },
      )
    );
    return response.data;
  }

  async deleteScore(scoreUUID: string): Promise<void> {
    this.error.set(null);
    await firstValueFrom(
      this.http.delete(
        `${this.API_URL}/scores/${scoreUUID}/delete`,
        { headers: this.getAuthHeaders() },
      )
    );
  }

  async getRecommendedProducers(): Promise<Score[]> {
    this.error.set(null);
    try {
      const response = await firstValueFrom(
        this.http.get<{ status: string; data: Score[] }>(
          `${this.API_URL}/scores/recommended/list`,
          { headers: this.getAuthHeaders() },
        )
      );
      return response.data ?? [];
    } catch (err: any) {
      this.error.set(err.message ?? 'Erreur');
      return [];
    }
  }

  clearError(): void {
    this.error.set(null);
  }
}
