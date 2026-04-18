import { Producer } from './producer.model';

// =====================================================
// MAP MODELS - Aligné avec les endpoints /dashboard/map
// =====================================================

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapProducerResponse {
  producer: Producer;
  score: number;
  position: LatLng;
}

export interface MapData {
  producers: MapProducerResponse[];
  total: number;
  with_coords: number;
}
