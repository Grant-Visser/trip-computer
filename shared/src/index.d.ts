export interface Vehicle {
    id: number;
    name: string;
    make?: string | null;
    model?: string | null;
    year?: number | null;
    registration?: string | null;
    tank_capacity_litres?: number | null;
    created_at: string;
}
export interface Fillup {
    id: number;
    vehicle_id: number;
    filled_at: string;
    litres_added: number;
    price_per_litre: number;
    total_price: number;
    trip_km?: number | null;
    odometer?: number | null;
    location_name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    notes?: string | null;
    is_partial?: number | null;
    created_at: string;
    computed_efficiency?: number | null;
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
    recent_fillups: Fillup[];
    best_efficiency_l_per_100km: number | null;
    worst_efficiency_l_per_100km: number | null;
    best_trip_km: number | null;
    lowest_price_per_litre: number | null;
    highest_price_per_litre: number | null;
    lowest_total_cost: number | null;
    highest_total_cost: number | null;
    best_efficiency_date: string | null;
    best_trip_date: string | null;
    lowest_price_date: string | null;
    highest_price_date: string | null;
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
    is_partial?: boolean;
}
export interface ImportFillupRow {
    date: string;
    litres: number;
    price_per_litre: number;
    total_price: number;
    trip_km?: number;
    odometer?: number;
    is_partial?: boolean;
}
export interface ImportPreviewResponse {
    rows: ImportFillupRow[];
    errors: string[];
}
//# sourceMappingURL=index.d.ts.map