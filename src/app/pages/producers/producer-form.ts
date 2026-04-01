import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { db } from '../../db/database';

const ZONES = ['Yalisenza', 'Monzamboli', 'Kwanza', 'Yandongi-Yamandika', 'Manga', 'Bilia', 'YALGBA'];

@Component({
  selector: 'app-producer-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MatIcon, DecimalPipe],
  templateUrl: './producer-form.html',
  styleUrl: './producer-form.scss',
})
export class ProducerFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  readonly zones = ZONES;
  isEdit = signal(false);
  saving = signal(false);
  saved = signal(false);
  gpsLoading = signal(false);
  gpsError = signal<string | null>(null);
  gpsSuccess = signal(false);
  private editId: number | null = null;

  form: FormGroup = this.fb.group({
    nom: ['', Validators.required],
    sexe: ['homme'],
    dateNaissance: [''],
    telephone: [''],
    village: ['', Validators.required],
    groupement: [''],
    zone: ['', Validators.required],
    statutFoncier: ['proprietaire'],
    anneesExperience: [0],
    membreCooperative: [false],
    nomCooperative: [''],
    champs: this.fb.array([this.buildChamp()]),
    rotationCultures: [false],
    utilisationCompost: [false],
    signesDegradation: [false],
    sourceEau: ['pluie'],
    economieEau: [false],
    parcelleInondable: [false],
    utilisationPesticides: [false],
    formationPesticides: [false],
    presenceArbres: [false],
    activiteDeforestation: [false],
    baiseFaune: [false],
    perteSec: [false],
    perteInondation: [false],
    perteVents: [false],
    strategiesAdaptation: [''],
    varietesCultivees: [''],
    rendementMoyen: [0],
    campagnesParAn: [1],
    manqueEau: [false],
    intrantsCouteux: [false],
    accesCred: [false],
    degradationSols: [false],
    changementsClimatiques: [false],
    lieuVente: [''],
    besoinsPrioritaires: [''],
    latitude: [null],
    longitude: [null],
  });

  get f() { return this.form.controls; }
  get champsArray(): FormArray { return this.form.get('champs') as FormArray; }

  buildChamp(): FormGroup {
    return this.fb.group({
      localisation: [''],
      superficie: [1],
      typeRiziculture: ['pluviale'],
      irrigation: [false],
      modeAcces: ['voiture'],
    });
  }

  addChamp(): void { this.champsArray.push(this.buildChamp()); }
  removeChamp(i: number): void { this.champsArray.removeAt(i); }

  locateMe(): void {
    if (!navigator.geolocation) {
      this.gpsError.set(`La geolocalisation n'est pas supportee par ce navigateur.`);
      return;
    }
    this.gpsLoading.set(true);
    this.gpsError.set(null);
    this.gpsSuccess.set(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.form.patchValue({
          latitude: parseFloat(pos.coords.latitude.toFixed(6)),
          longitude: parseFloat(pos.coords.longitude.toFixed(6)),
        });
        this.gpsLoading.set(false);
        this.gpsSuccess.set(true);
      },
      (err) => {
        this.gpsLoading.set(false);
        const msgs: Record<number, string> = {
          1: 'Permission refusee. Autorisez la localisation dans les parametres du navigateur.',
          2: 'Position indisponible. Verifiez que le GPS est active.',
          3: `Delai d'attente depasse. Reessayez.`,
        };
        this.gpsError.set(msgs[err.code] ?? 'Erreur de geolocalisation.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  clearGps(): void {
    this.form.patchValue({ latitude: null, longitude: null });
    this.gpsSuccess.set(false);
    this.gpsError.set(null);
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nouveau') {
      this.isEdit.set(true);
      this.editId = Number(id);
      const p = await db.producers.get(this.editId);
      if (p) {
        // Rebuild champs formArray
        while (this.champsArray.length > 0) this.champsArray.removeAt(0);
        for (const _ of p.champs) this.champsArray.push(this.buildChamp());
        this.form.patchValue(p);
      }
    } else {
      // Auto-detect GPS for new entries
      this.locateMe();
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const val = this.form.getRawValue();
    const data = {
      ...val,
      agentRecenseurId: this.auth.currentUser()?.id ?? 1,
      dateRecensement: new Date().toISOString().split('T')[0],
    };
    if (this.isEdit() && this.editId) {
      await db.producers.update(this.editId, data);
    } else {
      await db.producers.add(data);
    }
    this.saving.set(false);
    this.saved.set(true);
    setTimeout(() => this.router.navigate(['/producteurs']), 1200);
  }
}
