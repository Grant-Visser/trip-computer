import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import type { Vehicle } from '@trip-computer/shared';

@Injectable({ providedIn: 'root' })
export class VehicleStateService {
  private _selectedVehicle = new BehaviorSubject<Vehicle | null>(null);
  selectedVehicle$ = this._selectedVehicle.asObservable();

  setSelectedVehicle(vehicle: Vehicle | null): void {
    this._selectedVehicle.next(vehicle);
    if (vehicle) {
      localStorage.setItem('selectedVehicleId', vehicle.id.toString());
    }
  }

  getStoredVehicleId(): number | null {
    const stored = localStorage.getItem('selectedVehicleId');
    return stored ? parseInt(stored) : null;
  }
}
