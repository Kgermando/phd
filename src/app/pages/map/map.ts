import {
  ChangeDetectionStrategy,
  Component,
  computed,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { GoogleMap, MapMarker, MapInfoWindow } from '@angular/google-maps';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { db } from '../../db/database';
import { Producer } from '../../models/models';
import { scoreProducer } from '../../utils/scoring';

interface MapProducer extends Producer {
  score: number;
  position: google.maps.LatLngLiteral;
}

// google.maps.SymbolPath.CIRCLE = 0 (numeric enum value, safe without API loaded)
const CIRCLE = 0 as unknown as google.maps.SymbolPath;

@Component({
  selector: 'app-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GoogleMap, MapMarker, MapInfoWindow, MatIcon, RouterLink],
  templateUrl: './map.html',
  styleUrl: './map.scss',
})
export class MapComponent implements OnInit {
  @ViewChild(MapInfoWindow) infoWindow?: MapInfoWindow;

  producers = signal<MapProducer[]>([]);
  selected = signal<MapProducer | null>(null);
  loaded = signal(false);

  readonly center = signal<google.maps.LatLngLiteral>({ lat: 2.19, lng: 22.48 });
  readonly zoom = signal(10);

  readonly mapOptions = computed<google.maps.MapOptions>(() => ({
    mapTypeId: 'roadmap',
    fullscreenControl: false,
    streetViewControl: false,
    mapTypeControl: false,
  }));

  eligibleCount = computed(() => this.producers().filter((p) => p.score >= 60).length);
  withGpsCount = computed(() => this.producers().length);

  markerOptions(p: MapProducer): google.maps.MarkerOptions {
    return {
      title: p.nom,
      icon: {
        path: CIRCLE,
        scale: 10,
        fillColor: p.score >= 60 ? '#2e7d32' : '#c62828',
        fillOpacity: 0.9,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
    };
  }

  async ngOnInit(): Promise<void> {
    const all = await db.producers.toArray();
    const withGps = all
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => ({
        ...p,
        score: scoreProducer(p).total,
        position: { lat: p.latitude!, lng: p.longitude! },
      }));

    this.producers.set(withGps);

    if (withGps.length > 0) {
      const avgLat = withGps.reduce((s, p) => s + p.position.lat, 0) / withGps.length;
      const avgLng = withGps.reduce((s, p) => s + p.position.lng, 0) / withGps.length;
      this.center.set({ lat: avgLat, lng: avgLng });
    }

    this.loaded.set(true);
  }

  openInfo(marker: MapMarker, p: MapProducer): void {
    this.selected.set(p);
    this.infoWindow?.open(marker);
  }

  closeInfo(): void {
    this.selected.set(null);
  }
}
