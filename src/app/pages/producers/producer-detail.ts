import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { db } from '../../db/database';
import { Producer } from '../../models/models';
import { scoreProducer, ScoringResult } from '../../utils/scoring';

@Component({
  selector: 'app-producer-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIcon],
  templateUrl: './producer-detail.html',
  styleUrl: './producer-detail.scss',
})
export class ProducerDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  producer = signal<Producer | null>(null);
  scoring = signal<ScoringResult | null>(null);
  notFound = signal(false);

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const p = await db.producers.get(id);
    if (!p) { this.notFound.set(true); return; }
    this.producer.set(p);
    this.scoring.set(scoreProducer(p));
  }

  async delete(): Promise<void> {
    const p = this.producer();
    if (!p || !confirm(`Supprimer ${p.nom} ? Cette action est irréversible.`)) return;
    await db.producers.delete(p.id!);
    this.router.navigate(['/producteurs']);
  }
}
