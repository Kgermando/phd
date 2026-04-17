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

  /** Try to push all pending local producers to the server. */
  async syncPending(): Promise<void> {
    const list = this.readPending();
    if (!list.length) return;
    for (const p of list) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { uuid, _pending, created_at, updated_at, ...payload } = p as any;
        await this.createProducerOnline(payload);
        this.removePending(p.uuid!);
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
