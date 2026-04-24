import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { Vehicle, CreateVehicleDto, Fillup, CreateFillupDto, FillupStats, ImportFillupRow } from '@trip-computer/shared';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Vehicles
  getVehicles(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(`${this.base}/api/vehicles`);
  }

  getVehicle(id: number): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.base}/api/vehicles/${id}`);
  }

  createVehicle(dto: CreateVehicleDto): Observable<Vehicle> {
    return this.http.post<Vehicle>(`${this.base}/api/vehicles`, dto);
  }

  updateVehicle(id: number, dto: Partial<CreateVehicleDto>): Observable<Vehicle> {
    return this.http.put<Vehicle>(`${this.base}/api/vehicles/${id}`, dto);
  }

  deleteVehicle(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/vehicles/${id}`);
  }

  // Fill-ups
  getFillups(vehicleId: number): Observable<Fillup[]> {
    return this.http.get<Fillup[]>(`${this.base}/api/vehicles/${vehicleId}/fillups`);
  }

  getFillup(id: number): Observable<Fillup> {
    return this.http.get<Fillup>(`${this.base}/api/fillups/${id}`);
  }

  createFillup(vehicleId: number, dto: CreateFillupDto): Observable<Fillup> {
    return this.http.post<Fillup>(`${this.base}/api/vehicles/${vehicleId}/fillups`, dto);
  }

  updateFillup(id: number, dto: Partial<CreateFillupDto>): Observable<Fillup> {
    return this.http.put<Fillup>(`${this.base}/api/fillups/${id}`, dto);
  }

  deleteFillup(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/fillups/${id}`);
  }

  // Stats
  getStats(vehicleId: number): Observable<FillupStats> {
    return this.http.get<FillupStats>(`${this.base}/api/vehicles/${vehicleId}/stats`);
  }

  // Import
  importFillups(vehicleId: number, rows: ImportFillupRow[]): Observable<{ imported: number }> {
    return this.http.post<{ imported: number }>(`${this.base}/api/vehicles/${vehicleId}/import`, { rows });
  }
}
