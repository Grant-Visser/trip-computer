import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { ApiService } from '../../services/api.service';
import { VehicleStateService } from '../../services/vehicle-state.service';
import type { Vehicle, Fillup } from '@trip-computer/shared';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatSelectModule, MatTableModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatSortModule],
  template: `
    <div class="page-container">
      <h2>Fill-up History</h2>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Vehicle</mat-label>
        <mat-select [(ngModel)]="selectedVehicleId" (ngModelChange)="loadFillups($event)">
          <mat-option *ngFor="let v of vehicles" [value]="v.id">{{ v.name }}</mat-option>
        </mat-select>
      </mat-form-field>

      <div *ngIf="fillups.length === 0 && selectedVehicleId" style="text-align:center;padding:32px;color:#9e9e9e">
        No fill-ups yet for this vehicle.
      </div>

      <div class="fillup-list" *ngIf="fillups.length > 0">
        <div *ngFor="let f of sortedFillups" class="fillup-row">
          <div class="fillup-main">
            <div class="fillup-date">{{ f.filled_at | date:'dd MMM yyyy' }}</div>
            <div class="fillup-litres">{{ f.litres_added | number:'1.2-2' }} L</div>
          </div>
          <div class="fillup-secondary">
            <span>R{{ f.total_price | number:'1.2-2' }}</span>
            <span *ngIf="f.trip_km"> · {{ f.trip_km | number:'1.0-0' }} km</span>
            <span *ngIf="f.trip_km"> · {{ (f.litres_added / f.trip_km * 100) | number:'1.1-1' }} L/100km</span>
          </div>
          <div *ngIf="f.location_name" class="fillup-location">📍 {{ f.location_name }}</div>
          <div class="fillup-actions">
            <button mat-icon-button [routerLink]="['/fillup', f.id, 'edit']" title="Edit">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button color="warn" (click)="deleteFillup(f)" title="Delete">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    h2 { margin-bottom: 16px; color: #80cbc4; }
    .fillup-list { margin-top: 8px; }
    .fillup-row {
      background: #1a1a2e;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 8px;
    }
    .fillup-main { display: flex; justify-content: space-between; font-size: 15px; font-weight: 500; }
    .fillup-date { color: #e0e0e0; }
    .fillup-litres { color: #80cbc4; }
    .fillup-secondary { font-size: 13px; color: #9e9e9e; margin-top: 4px; }
    .fillup-location { font-size: 12px; color: #757575; margin-top: 4px; }
    .fillup-actions { display: flex; justify-content: flex-end; margin-top: 4px; }
  `],
})
export class HistoryComponent implements OnInit {
  vehicles: Vehicle[] = [];
  fillups: Fillup[] = [];
  selectedVehicleId: number | null = null;

  constructor(
    private api: ApiService,
    private vehicleState: VehicleStateService,
    private snackBar: MatSnackBar,
  ) {}

  get sortedFillups(): Fillup[] {
    return [...this.fillups].sort((a, b) => b.filled_at.localeCompare(a.filled_at));
  }

  ngOnInit(): void {
    this.api.getVehicles().subscribe(vehicles => {
      this.vehicles = vehicles;
      const storedId = this.vehicleState.getStoredVehicleId();
      const found = storedId ? vehicles.find(v => v.id === storedId) : null;
      const id = found?.id ?? vehicles[0]?.id;
      if (id) {
        this.selectedVehicleId = id;
        this.loadFillups(id);
      }
    });
  }

  loadFillups(vehicleId: number): void {
    this.api.getFillups(vehicleId).subscribe(f => (this.fillups = f));
  }

  deleteFillup(f: Fillup): void {
    if (!confirm(`Delete fill-up from ${new Date(f.filled_at).toLocaleDateString()}?`)) return;
    this.api.deleteFillup(f.id).subscribe({
      next: () => {
        this.fillups = this.fillups.filter(x => x.id !== f.id);
        this.snackBar.open('Fill-up deleted', 'OK', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to delete', 'OK', { duration: 3000 }),
    });
  }
}
