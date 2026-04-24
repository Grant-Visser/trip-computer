import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import type { Vehicle } from '@trip-computer/shared';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="page-container">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="margin:0;color:#80cbc4">Vehicles</h2>
        <button mat-raised-button color="primary" routerLink="/vehicles/new">
          <mat-icon>add</mat-icon> Add
        </button>
      </div>

      <div *ngFor="let v of vehicles" class="vehicle-card" [routerLink]="['/vehicles', v.id]">
        <div class="vehicle-name">{{ v.name }}</div>
        <div class="vehicle-meta" *ngIf="v.make || v.model">{{ v.make }} {{ v.model }} {{ v.year }}</div>
        <div class="vehicle-meta" *ngIf="v.registration">🪪 {{ v.registration }}</div>
        <mat-icon class="vehicle-arrow">chevron_right</mat-icon>
      </div>

      <div *ngIf="vehicles.length === 0" style="text-align:center;padding:48px;color:#9e9e9e">
        <mat-icon style="font-size:48px;height:48px;width:48px">directions_car</mat-icon>
        <p>No vehicles. Add one to get started.</p>
      </div>
    </div>
  `,
  styles: [`
    h2 { margin-bottom: 0; }
    .vehicle-card {
      background: #1a1a2e;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 10px;
      cursor: pointer;
      position: relative;
      display: flex;
      flex-direction: column;
      &:active { opacity: 0.8; }
    }
    .vehicle-name { font-size: 17px; font-weight: 600; color: #e0e0e0; }
    .vehicle-meta { font-size: 13px; color: #9e9e9e; margin-top: 4px; }
    .vehicle-arrow { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: #424242; }
  `],
})
export class VehiclesComponent implements OnInit {
  vehicles: Vehicle[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getVehicles().subscribe(v => (this.vehicles = v));
  }
}
