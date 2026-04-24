import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import type { Vehicle, FillupStats } from '@trip-computer/shared';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <div *ngIf="vehicle" class="vehicle-header">
        <h2>{{ vehicle.name }}</h2>
        <div class="vehicle-meta" *ngIf="vehicle.make">{{ vehicle.make }} {{ vehicle.model }} {{ vehicle.year }}</div>
        <div class="vehicle-meta" *ngIf="vehicle.registration">🪪 {{ vehicle.registration }}</div>
        <div class="vehicle-meta" *ngIf="vehicle.tank_capacity_litres">Tank: {{ vehicle.tank_capacity_litres }} L</div>
      </div>

      <div *ngIf="stats" class="stats-grid" style="margin-top:16px">
        <div class="stat-card">
          <div class="label">Fill-ups</div>
          <div class="value">{{ stats.total_fillups }}</div>
        </div>
        <div class="stat-card">
          <div class="label">Total km</div>
          <div class="value">{{ stats.total_km | number:'1.0-0' }}</div>
          <div class="unit">km</div>
        </div>
        <div class="stat-card">
          <div class="label">Total Litres</div>
          <div class="value">{{ stats.total_litres | number:'1.0-0' }}</div>
          <div class="unit">L</div>
        </div>
        <div class="stat-card">
          <div class="label">Total Spent</div>
          <div class="value">{{ stats.total_spent_zar | number:'1.0-0' }}</div>
          <div class="unit">ZAR</div>
        </div>
        <div class="stat-card">
          <div class="label">Avg L/100km</div>
          <div class="value">{{ stats.avg_efficiency_l_per_100km | number:'1.1-1' }}</div>
        </div>
        <div class="stat-card">
          <div class="label">Last Odometer</div>
          <div class="value">{{ stats.last_odometer | number:'1.0-0' }}</div>
          <div class="unit">km</div>
        </div>
      </div>

      <div style="display:flex;gap:12px;margin-top:24px">
        <button mat-stroked-button routerLink="/history">View History</button>
        <button mat-raised-button color="primary" routerLink="/fillup/new">Add Fill-up</button>
      </div>
    </div>
  `,
  styles: [`
    .vehicle-header h2 { color: #80cbc4; margin-bottom: 4px; }
    .vehicle-meta { font-size: 14px; color: #9e9e9e; }
  `],
})
export class VehicleDetailComponent implements OnInit {
  vehicle: Vehicle | null = null;
  stats: FillupStats | null = null;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    const id = parseInt(this.route.snapshot.paramMap.get('id')!);
    this.api.getVehicle(id).subscribe(v => (this.vehicle = v));
    this.api.getStats(id).subscribe(s => (this.stats = s));
  }
}
