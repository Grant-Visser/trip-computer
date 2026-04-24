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
        <mat-select [(ngModel)]="selectedVehicleId" (ngModelChange)="onVehicleChange($event)">
          <mat-option *ngFor="let v of vehicles" [value]="v.id">{{ v.name }}</mat-option>
        </mat-select>
      </mat-form-field>

      <div class="history-actions" *ngIf="selectedVehicleId && fillups.length > 0">
        <button mat-stroked-button (click)="exportCsv()">
          <mat-icon>download</mat-icon>
          Export CSV
        </button>
      </div>

      <div *ngIf="fillups.length === 0 && selectedVehicleId" style="text-align:center;padding:32px;color:#9e9e9e">
        No fill-ups yet for this vehicle.
      </div>

      <div class="fillup-list" *ngIf="fillups.length > 0">
        <div *ngFor="let f of sortedFillups" class="fillup-row">
          <div class="fillup-main">
            <div class="fillup-date">{{ f.filled_at | date:'dd MMM yyyy' }}</div>
            <div class="fillup-litres">
              {{ f.litres_added | number:'1.2-2' }} L
              <span *ngIf="f.is_partial" class="partial-tag">PARTIAL</span>
            </div>
          </div>
          <div class="fillup-secondary">
            <span>R{{ f.total_price | number:'1.2-2' }}</span>
            <span *ngIf="f.trip_km"> · {{ f.trip_km | number:'1.0-0' }} km</span>
            <span *ngIf="f.computed_efficiency !== null && f.computed_efficiency !== undefined"> · {{ f.computed_efficiency | number:'1.1-1' }} L/100km</span>
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
    .history-actions {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 8px;
    }
    .fillup-row {
      background: #1a1a2e;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 8px;
    }
    .fillup-main { display: flex; justify-content: space-between; font-size: 15px; font-weight: 500; }
    .fillup-date { color: #e0e0e0; }
    .fillup-litres { color: #80cbc4; }
    .partial-tag {
      margin-left: 8px;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 999px;
      background: #3a2a1a;
      color: #ffcc80;
      border: 1px solid #6d4c41;
      vertical-align: middle;
    }
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
      this.vehicleState.loadStoredVehicleId().subscribe(storedId => {
        const found = storedId ? vehicles.find(v => v.id === storedId) : null;
        const id = found?.id ?? vehicles[0]?.id;
        if (id) {
          this.selectedVehicleId = id;
          this.vehicleState.setSelectedVehicle(found ?? vehicles[0] ?? null);
          this.loadFillups(id);
        }
      });
    });
  }

  onVehicleChange(vehicleId: number): void {
    const selected = this.vehicles.find(v => v.id === vehicleId) ?? null;
    this.vehicleState.setSelectedVehicle(selected);
    this.loadFillups(vehicleId);
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

  exportCsv(): void {
    if (!this.selectedVehicleId || this.fillups.length === 0) {
      this.snackBar.open('No data to export', 'OK', { duration: 2500 });
      return;
    }

    const vehicle = this.vehicles.find(v => v.id === this.selectedVehicleId);
    const rows = this.sortedFillups.slice().reverse();
    const header = [
      'date',
      'litres',
      'price_per_litre',
      'total_price',
      'trip_km',
      'odometer',
      'is_partial',
      'location_name',
      'notes',
    ];

    const escapeCsv = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      const s = String(value);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const body = rows.map(f => {
      const date = f.filled_at.split('T')[0].replace(/-/g, '/');
      return [
        date,
        f.litres_added,
        f.price_per_litre,
        f.total_price,
        f.trip_km ?? '',
        f.odometer ?? '',
        f.is_partial ? '1' : '0',
        f.location_name ?? '',
        f.notes ?? '',
      ].map(escapeCsv).join(',');
    });

    const csv = [header.join(','), ...body].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeVehicleName = (vehicle?.name ?? `vehicle-${this.selectedVehicleId}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const today = new Date().toISOString().slice(0, 10);

    a.href = url;
    a.download = `${safeVehicleName || 'vehicle'}-fillups-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.snackBar.open('CSV exported', 'OK', { duration: 2000 });
  }
}
