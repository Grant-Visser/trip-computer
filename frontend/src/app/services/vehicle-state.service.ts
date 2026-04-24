import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { catchError, map, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import type { Vehicle } from '@trip-computer/shared';

@Injectable({ providedIn: 'root' })
export class VehicleStateService {
  private _selectedVehicle = new BehaviorSubject<Vehicle | null>(null);
  selectedVehicle$ = this._selectedVehicle.asObservable();
  private selectedVehicleId: number | null = null;

  constructor(private api: ApiService) {}

  setSelectedVehicle(vehicle: Vehicle | null): void {
    this._selectedVehicle.next(vehicle);
    this.selectedVehicleId = vehicle?.id ?? null;
    this.api.setSelectedVehicleId(this.selectedVehicleId).pipe(
      catchError(() => of({ selected_vehicle_id: this.selectedVehicleId }))
    ).subscribe();
  }

  getStoredVehicleId() {
    return this.selectedVehicleId;
  }

  loadStoredVehicleId() {
    return this.api.getAppState().pipe(
      map(s => s.selected_vehicle_id ?? null),
      tap(id => { this.selectedVehicleId = id; }),
      catchError(() => {
        this.selectedVehicleId = null;
        return of(null);
      })
    );
  }
}
