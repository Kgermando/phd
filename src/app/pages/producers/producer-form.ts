import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { map, startWith } from 'rxjs';
import { ProducersService } from '../../services/producers.service';
import { Producer } from '../../models/models';
import { NOMS_PROVINCES, getTerritoiresByProvince, getSecteursByTerritoire, getGroupementsBySecteur } from '../../utils/rdc-geo';

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
  private producersService = inject(ProducersService);

  readonly zones = [
    'Bilia',
    'Monzamboli',
    'Kwanza',
    'Manga',
    'Yandongi-Yamandika',
    'Yalisenza',
    'Yalgba',
  ];

  readonly provinces = NOMS_PROVINCES;

  isEdit = signal(false);
  isPending = signal(false);
  saving = signal(false);
  saved = signal(false);
  savedOffline = signal(false);
  gpsLoading = signal(false);
  gpsError = signal<string | null>(null);
  gpsSuccess = signal(false);
  private editUUID: string | null = null;

  form: FormGroup = this.fb.group({
    nom: ['', Validators.required],
    sexe: ['homme'],
    date_naissance: [''],
    telephone: [''],
    province: ['', Validators.required],
    territoire: [''],
    secteur: [''],
    groupement: [''],
    village: ['', Validators.required],
    zone: ['', Validators.required],
    statut_foncier: ['proprietaire'],
    annees_experience: [0],
    membre_cooperative: [false],
    nom_cooperative: [''],
    champs: this.fb.array([this.buildChamp()]),
    rotation_cultures: [false],
    utilisation_compost: [false],
    signes_degradation: [false],
    source_eau: ['pluie'],
    economie_eau: [false],
    parcelle_inondable: [false],
    utilisation_pesticides: [false],
    formation_pesticides: [false],
    presence_arbres: [false],
    activite_deforestation: [false],
    baise_faune: [false],
    perte_sec: [false],
    perte_inondation: [false],
    perte_vents: [false],
    strategies_adaptation: [''],
    varietes_cultivees: [''],
    rendement_moyen: [0],
    campagnes_par_an: [1],
    manque_eau: [false],
    intrants_couteux: [false],
    acces_credit: [false],
    degradation_sols: [false],
    changements_climatiques: [false],
    lieu_vente: [''],
    besoins_prioritaires: [''],
    latitude: [null],
    longitude: [null],
  });

  formInvalid = toSignal(
    this.form.statusChanges.pipe(map(s => s !== 'VALID')),
    { initialValue: true },
  );

  private provinceValue = toSignal(
    this.form.get('province')!.valueChanges.pipe(
      startWith(this.form.get('province')!.value as string),
    ),
  );

  private territoireValue = toSignal(
    this.form.get('territoire')!.valueChanges.pipe(
      startWith(this.form.get('territoire')!.value as string),
    ),
  );

  private secteurValue = toSignal(
    this.form.get('secteur')!.valueChanges.pipe(
      startWith(this.form.get('secteur')!.value as string),
    ),
  );

  territoires = computed(() => getTerritoiresByProvince(this.provinceValue() ?? ''));
  secteurs = computed(() => getSecteursByTerritoire(this.provinceValue() ?? '', this.territoireValue() ?? ''));
  groupements = computed(() => getGroupementsBySecteur(this.provinceValue() ?? '', this.territoireValue() ?? '', this.secteurValue() ?? ''));

  constructor() {
    effect(() => {
      const terrs = this.territoires();
      const current = this.form.get('territoire')?.value as string;
      if (current && !terrs.includes(current)) {
        this.form.get('territoire')?.setValue('', { emitEvent: false });
        this.form.get('secteur')?.setValue('', { emitEvent: false });
        this.form.get('groupement')?.setValue('', { emitEvent: false });
      }
    });
    effect(() => {
      const sects = this.secteurs();
      const current = this.form.get('secteur')?.value as string;
      if (current && !sects.includes(current)) {
        this.form.get('secteur')?.setValue('', { emitEvent: false });
        this.form.get('groupement')?.setValue('', { emitEvent: false });
      }
    });
    effect(() => {
      const grps = this.groupements();
      const current = this.form.get('groupement')?.value as string;
      if (current && !grps.includes(current)) {
        this.form.get('groupement')?.setValue('', { emitEvent: false });
      }
    });
  }

  get f() { return this.form.controls; }
  get champsArray(): FormArray { return this.form.get('champs') as FormArray; }

  buildChamp(): FormGroup {
    return this.fb.group({
      uuid: [''],
      localisation: [''],
      superficie: [1],
      type_riziculture: ['pluviale'],
      irrigation: [false],
      mode_acces: ['voiture'],
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
      this.editUUID = id;

      // Check local pending producers first (by UUID, not by prefix)
      const pendingProducer = this.producersService.getPendingByUUID(id);
      if (pendingProducer) {
        this.isPending.set(true);
        const p = pendingProducer;
        while (this.champsArray.length > 0) this.champsArray.removeAt(0);
        for (const _ of (p.champs ?? [])) this.champsArray.push(this.buildChamp());
        const patchValue: Partial<Producer> = { ...p };
        if (patchValue.date_naissance) {
          patchValue.date_naissance = patchValue.date_naissance.substring(0, 10);
        }
        this.form.patchValue(patchValue);
        return;
      }

      // Online producer
      const p = await this.producersService.getProducerByUUID(id);
      if (p) {
        while (this.champsArray.length > 0) this.champsArray.removeAt(0);
        for (const _ of (p.champs ?? [])) this.champsArray.push(this.buildChamp());
        // The backend returns date_naissance as an ISO 8601 string (time.Time).
        // The date input requires YYYY-MM-DD, so slice off the time part.
        const patchValue: Partial<Producer> = { ...p };
        if (patchValue.date_naissance) {
          patchValue.date_naissance = patchValue.date_naissance.substring(0, 10);
        }
        this.form.patchValue(patchValue);
      }
    } else {
      this.locateMe();
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    try {
      const val = this.form.getRawValue() as Partial<Producer>;
      // The date input returns YYYY-MM-DD; the backend expects a full ISO 8601
      // time.Time value, so append the UTC time component before sending.
      if (val.date_naissance) {
        val.date_naissance = `${val.date_naissance}T00:00:00Z`;
      }
      if (this.isEdit() && this.editUUID) {
        // Preserve existing champ UUIDs; assign new ones only for newly added champs
        const producerUUID = this.editUUID;
        val.champs = (val.champs ?? []).map(c => ({
          ...c,
          uuid: (c as any).uuid || crypto.randomUUID(),
          producer_uuid: producerUUID,
        }));
        if (this.isPending()) {
          // Update locally — stays pending until sync
          await this.producersService.updatePending(producerUUID, val);
          this.saving.set(false);
          this.savedOffline.set(true);
          setTimeout(() => this.router.navigate(['/producteurs']), 1500);
        } else {
          const result = await this.producersService.updateProducer(producerUUID, val);
          this.saving.set(false);
          if (result._pending) {
            this.savedOffline.set(true);
            setTimeout(() => this.router.navigate(['/producteurs']), 2000);
          } else {
            this.saved.set(true);
            setTimeout(() => this.router.navigate(['/producteurs']), 1200);
          }
        }
      } else {
        // New producer: generate UUIDs on the frontend
        const producerUUID = crypto.randomUUID();
        val.uuid = producerUUID;
        val.champs = (val.champs ?? []).map(c => ({
          ...c,
          uuid: (c as any).uuid || crypto.randomUUID(),
          producer_uuid: producerUUID,
        }));
        const result = await this.producersService.createProducer(val);
        this.saving.set(false);
        if (result._pending) {
          this.savedOffline.set(true);
          setTimeout(() => this.router.navigate(['/producteurs']), 2000);
        } else {
          this.saved.set(true);
          setTimeout(() => this.router.navigate(['/producteurs']), 1200);
        }
      }
    } catch (err) {
      this.saving.set(false);
    }
  }
}
