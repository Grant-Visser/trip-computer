export interface Vehicle {
  id: number;
  name: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  registration?: string | null;
  tank_capacity_litres?: number | null;
  created_at: string; // ISO8601 with timezone offset
}

export interface Fillup {
  id: number;
  vehicle_id: number;
  filled_at: string; // ISO8601 with timezone offset
  litres_added: number;
  price_per_litre: number; // ZAR
  total_price: number; // ZAR
  trip_km?: number | null;
  odometer?: number | null;
  location_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  created_at: string; // ISO8601 with timezone offset
}

export interface FillupStats {
  vehicle_id: number;
  total_fillups: number;
  total_litres: number;
  total_spent_zar: number;
  total_km: number;
  avg_efficiency_l_per_100km: number;
  avg_cost_per_km: number;
  avg_price_per_litre: number;
  last_odometer: number;
  recent_fillups: Fillup[]; // last 5
}

export interface CreateVehicleDto {
  name: string;
  make?: string;
  model?: string;
  year?: number;
  registration?: string;
  tank_capacity_litres?: number;
}

export interface CreateFillupDto {
  filled_at: string;
  litres_added: number;
  price_per_litre: number;
  total_price: number;
  trip_km?: number;
  odometer?: number;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface ImportFillupRow {
  date: string;
  litres: number;
  price_per_litre: number;
  total_price: number;
  trip_km?: number;
  odometer?: number;
}

export interface ImportPreviewResponse {
  rows: ImportFillupRow[];
  errors: string[];
}
