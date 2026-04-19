import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { Producer, Score } from '../../models/models';
import { ProducersService } from '../../services/producers.service';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-producer-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIcon, ReactiveFormsModule, DatePipe],
  templateUrl: './producer-detail.html',
  styleUrl: './producer-detail.scss',
})
export class ProducerDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private producersService = inject(ProducersService);
  protected auth = inject(AuthService);

  producer = signal<Producer | null>(null);
  scores = signal<Score[]>([]);
  notFound = signal(false);
  isPending = signal(false);
  loading = computed(() => this.producersService.loading());

  // Score panel state
  showScoreForm = signal(false);
  editingScore = signal<Score | null>(null);
  savingScore = signal(false);
  scoreError = signal<string | null>(null);

  latestScore = computed(() => this.scores()[0] ?? null);
  isEligible = computed(() => this.latestScore()?.recommande ?? false);

  readonly scoreCriteria: { key: keyof Score; label: string; max: number }[] = [
    { key: 'superficie_cultivee', label: 'Superficie cultivée', max: 10 },
    { key: 'experience_riziculture', label: 'Expérience en riziculture', max: 10 },
    { key: 'statut_foncier_securise', label: 'Statut foncier sécurisé', max: 10 },
    { key: 'acces_eau', label: "Accès à l'eau", max: 10 },
    { key: 'respect_itineraires_techniques', label: 'Itinéraires techniques', max: 10 },
    { key: 'pratiques_environnementales', label: 'Pratiques environnementales', max: 10 },
    { key: 'vulnerabilite_climatique', label: 'Vulnérabilité climatique', max: 10 },
    { key: 'organisation_cooperative', label: 'Organisation/Coopérative', max: 5 },
    { key: 'capacite_production', label: 'Capacité de production', max: 10 },
    { key: 'motivation_engagement', label: 'Motivation/Engagement', max: 10 },
    { key: 'inclusion_sociale', label: 'Inclusion sociale', max: 5 },
  ];

  scoreForm: FormGroup = this.fb.group({
    superficie_cultivee:            [0, [Validators.required, Validators.min(0), Validators.max(10)]],
    experience_riziculture:         [0, [Validators.required, Validators.min(0), Validators.max(10)]],
    statut_foncier_securise:        [0, [Validators.required, Validators.min(0), Validators.max(10)]],
    acces_eau:                      [0, [Validators.required, Validators.min(0), Validators.max(10)]],
    respect_itineraires_techniques: [0, [Validators.required, Validators.min(0), Validators.max(10)]],
    pratiques_environnementales:    [0, [Validators.required, Validators.min(0), Validators.max(10)]],
    vulnerabilite_climatique:       [0, [Validators.required, Validators.min(0), Validators.max(10)]],
    organisation_cooperative:       [0, [Validators.required, Validators.min(0), Validators.max(5)]],
    capacite_production:            [0, [Validators.required, Validators.min(0), Validators.max(10)]],
    motivation_engagement:          [0, [Validators.required, Validators.min(0), Validators.max(10)]],
    inclusion_sociale:              [0, [Validators.required, Validators.min(0), Validators.max(5)]],
  });

  async ngOnInit(): Promise<void> {
    const uuid = this.route.snapshot.paramMap.get('id') ?? '';

    // Local (offline) producer
    if (uuid.startsWith('local_')) {
      this.isPending.set(true);
      const p = this.producersService.getPendingByUUID(uuid);
      if (!p) { this.notFound.set(true); return; }
      this.producer.set(p);
      // Pending producers cannot have server scores, only local ones
      this.scores.set(this.producersService.getPendingScoresByProducer(uuid));
      return;
    }

    // Online producer
    const p = await this.producersService.getProducerByUUID(uuid);
    if (!p) { this.notFound.set(true); return; }
    this.producer.set(p);
    // Merge server scores + any locally-pending scores for this producer
    const serverScores = p.scores ?? [];
    const localScores = this.producersService.getPendingScoresByProducer(uuid);
    this.scores.set([...localScores, ...serverScores]);
  }

  openNewScore(): void {
    this.editingScore.set(null);
    this.scoreForm.reset({
      superficie_cultivee: 0, experience_riziculture: 0, statut_foncier_securise: 0,
      acces_eau: 0, respect_itineraires_techniques: 0, pratiques_environnementales: 0,
      vulnerabilite_climatique: 0, organisation_cooperative: 0, capacite_production: 0,
      motivation_engagement: 0, inclusion_sociale: 0,
    });
    this.scoreError.set(null);
    this.showScoreForm.set(true);
  }

  openEditScore(score: Score): void {
    this.editingScore.set(score);
    this.scoreForm.patchValue(score);
    this.scoreError.set(null);
    this.showScoreForm.set(true);
  }

  cancelScoreForm(): void {
    this.showScoreForm.set(false);
    this.editingScore.set(null);
  }

  async submitScore(): Promise<void> {
    if (this.scoreForm.invalid) return;
    this.savingScore.set(true);
    this.scoreError.set(null);
    try {
      const producerUUID = this.producer()!.uuid!;
      const editing = this.editingScore();
      if (editing) {
        if (editing._pending) {
          const updated = this.producersService.updatePendingScore(editing.uuid!, this.scoreForm.getRawValue());
          this.scores.update(list => list.map(s => s.uuid === updated.uuid ? updated : s));
        } else {
          await this.producersService.updateScore(editing.uuid!, this.scoreForm.getRawValue());
          const serverScores = await this.producersService.getScoresByProducer(producerUUID);
          const localScores = this.producersService.getPendingScoresByProducer(producerUUID);
          this.scores.set([...localScores, ...serverScores]);
        }
      } else {
        const created = await this.producersService.createScore(producerUUID, this.scoreForm.getRawValue());
        if (created._pending) {
          this.scores.update(list => [created, ...list]);
        } else {
          const serverScores = await this.producersService.getScoresByProducer(producerUUID);
          const localScores = this.producersService.getPendingScoresByProducer(producerUUID);
          this.scores.set([...localScores, ...serverScores]);
        }
      }
      this.showScoreForm.set(false);
      this.editingScore.set(null);
    } catch (err: any) {
      this.scoreError.set(err.message ?? 'Erreur lors de la sauvegarde du score');
    } finally {
      this.savingScore.set(false);
    }
  }

  async deleteScore(score: Score): Promise<void> {
    if (!confirm('Supprimer ce score ?')) return;
    try {
      if (score._pending) {
        this.producersService.removePendingScore(score.uuid!);
        this.scores.update(list => list.filter(s => s.uuid !== score.uuid));
      } else {
        await this.producersService.deleteScore(score.uuid!);
        const producerUUID = this.producer()!.uuid!;
        const serverScores = await this.producersService.getScoresByProducer(producerUUID);
        const localScores = this.producersService.getPendingScoresByProducer(producerUUID);
        this.scores.set([...localScores, ...serverScores]);
      }
    } catch (err: any) {
      this.scoreError.set(err.message ?? 'Erreur lors de la suppression');
    }
  }

  async delete(): Promise<void> {
    const p = this.producer();
    if (!p || !confirm(`Supprimer ${p.nom} ? Cette action est irréversible.`)) return;
    if (this.isPending()) {
      this.producersService.removePending(p.uuid!);
    } else {
      await this.producersService.deleteProducer(p.uuid!);
    }
    this.router.navigate(['/producteurs']);
  }

  getScoreValue(score: Score, key: keyof Score): number {
    return (score[key] as number) ?? 0;
  }
}

