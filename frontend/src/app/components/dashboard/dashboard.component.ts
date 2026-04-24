import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import {
  CategoryScale,
  Chart,
  ChartConfiguration,
  ChartData,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { ApiService } from '../../services/api.service';
import { VehicleStateService } from '../../services/vehicle-state.service';
import type { Vehicle, Fillup, FillupStats } from '@trip-computer/shared';

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Filler, Legend, Tooltip);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatSelectModule, MatCardModule, MatButtonModule, MatIconModule, BaseChartDirective],
  template: `
    <div class="page-container">
      <mat-form-field appearance="outline" class="vehicle-select">
        <mat-label>Select Vehicle</mat-label>
        <mat-select [(ngModel)]="selectedVehicleId" (ngModelChange)="onVehicleChange($event)">
          <mat-option *ngFor="let v of vehicles" [value]="v.id">{{ v.name }}</mat-option>
        </mat-select>
      </mat-form-field>

      <div class="quick-actions" *ngIf="vehicles.length > 0">
        <a mat-stroked-button routerLink="/fillup/new">
          <mat-icon>local_gas_station</mat-icon>
          Add Fill-up
        </a>
        <a mat-stroked-button routerLink="/import">
          <mat-icon>upload_file</mat-icon>
          Import CSV
        </a>
      </div>

      <ng-container *ngIf="stats">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="label">Avg Efficiency</div>
            <div class="value">{{ stats.avg_efficiency_l_per_100km | number:'1.1-1' }}</div>
            <div class="unit">L/100km</div>
          </div>
          <div class="stat-card">
            <div class="label">Avg Cost/km</div>
            <div class="value">{{ stats.avg_cost_per_km | number:'1.2-2' }}</div>
            <div class="unit">R/km</div>
          </div>
          <div class="stat-card">
            <div class="label">Avg Price/L</div>
            <div class="value">{{ stats.avg_price_per_litre | number:'1.2-2' }}</div>
            <div class="unit">R/litre</div>
          </div>
          <div class="stat-card">
            <div class="label">Total Spent</div>
            <div class="value">{{ stats.total_spent_zar | number:'1.0-0' }}</div>
            <div class="unit">ZAR</div>
          </div>
        </div>

        <div class="chart-container" *ngIf="efficiencyChartData.datasets[0].data.length > 1">
          <div class="section-title">Efficiency Trend (L/100km)</div>
          <canvas baseChart
            [data]="efficiencyChartData"
            [options]="lineChartOptions"
            type="line">
          </canvas>
        </div>

        <div class="chart-container" *ngIf="priceChartData.datasets[0].data.length > 1">
          <div class="section-title">Price per Litre (R)</div>
          <canvas baseChart
            [data]="priceChartData"
            [options]="lineChartOptions"
            type="line">
          </canvas>
        </div>

        <div class="section-title" style="margin-top:16px">Last Fill-up</div>
        <div *ngIf="stats.recent_fillups.length > 0" class="stat-card last-fillup">
          <div class="last-fillup-row">
            <span>{{ stats.recent_fillups[0].filled_at | date:'dd MMM yyyy' }}</span>
            <span>{{ stats.recent_fillups[0].litres_added | number:'1.2-2' }} L</span>
          </div>
          <div class="last-fillup-row">
            <span>R{{ stats.recent_fillups[0].total_price | number:'1.2-2' }}</span>
            <span *ngIf="stats.recent_fillups[0].trip_km">
              {{ stats.recent_fillups[0].trip_km }} km
            </span>
          </div>
          <div *ngIf="stats.recent_fillups[0].location_name" style="font-size:12px;color:#9e9e9e;margin-top:4px">
            📍 {{ stats.recent_fillups[0].location_name }}
          </div>
        </div>
        <div *ngIf="stats.recent_fillups.length === 0" style="color:#757575;text-align:center;padding:24px">
          No fill-ups yet. <a routerLink="/fillup/new">Add your first one!</a>
        </div>

        <!-- Records Section -->
        <div class="section-title" style="margin-top:24px">🏆 Records</div>
        <div class="stats-grid records-grid">
          <div class="stat-card">
            <div class="label">Best Economy</div>
            <div class="value">{{ stats.best_efficiency_l_per_100km !== null ? (stats.best_efficiency_l_per_100km | number:'1.1-1') : '—' }}</div>
            <div class="unit">L/100km{{ stats.best_efficiency_date ? ' · ' + (stats.best_efficiency_date | date:'dd MMM yy') : '' }}</div>
          </div>
          <div class="stat-card">
            <div class="label">📏 Longest Trip</div>
            <div class="value">{{ stats.best_trip_km !== null ? (stats.best_trip_km | number:'1.0-0') : '—' }}</div>
            <div class="unit">km{{ stats.best_trip_date ? ' · ' + (stats.best_trip_date | date:'dd MMM yy') : '' }}</div>
          </div>
          <div class="stat-card">
            <div class="label">💚 Cheapest Litre</div>
            <div class="value">{{ stats.lowest_price_per_litre !== null ? 'R' + (stats.lowest_price_per_litre | number:'1.2-2') : '—' }}</div>
            <div class="unit">/L{{ stats.lowest_price_date ? ' · ' + (stats.lowest_price_date | date:'dd MMM yy') : '' }}</div>
          </div>
          <div class="stat-card">
            <div class="label">💸 Priciest Litre</div>
            <div class="value">{{ stats.highest_price_per_litre !== null ? 'R' + (stats.highest_price_per_litre | number:'1.2-2') : '—' }}</div>
            <div class="unit">/L{{ stats.highest_price_date ? ' · ' + (stats.highest_price_date | date:'dd MMM yy') : '' }}</div>
          </div>
          <div class="stat-card">
            <div class="label">💰 Cheapest Fill-up</div>
            <div class="value">{{ stats.lowest_total_cost !== null ? 'R' + (stats.lowest_total_cost | number:'1.0-0') : '—' }}</div>
            <div class="unit">total</div>
          </div>
          <div class="stat-card">
            <div class="label">💸 Priciest Fill-up</div>
            <div class="value">{{ stats.highest_total_cost !== null ? 'R' + (stats.highest_total_cost | number:'1.0-0') : '—' }}</div>
            <div class="unit">total</div>
          </div>
        </div>
      </ng-container>

      <div *ngIf="!selectedVehicleId && vehicles.length === 0" style="text-align:center;padding:40px;color:#9e9e9e">
        <mat-icon style="font-size:48px;height:48px;width:48px">directions_car</mat-icon>
        <p>No vehicles yet.</p>
        <a mat-raised-button color="primary" routerLink="/vehicles/new">Add a vehicle</a>
      </div>
    </div>
  `,
  styles: [`
    .vehicle-select { width: 100%; margin-bottom: 16px; }
    .quick-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .last-fillup { text-align: left; }
    .last-fillup-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 15px; }
  `]
})
export class DashboardComponent implements OnInit {
  vehicles: Vehicle[] = [];
  selectedVehicleId: number | null = null;
  stats: FillupStats | null = null;
  fillups: Fillup[] = [];

  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#9e9e9e' }, grid: { color: '#2a2a4e' } },
      y: { ticks: { color: '#9e9e9e' }, grid: { color: '#2a2a4e' } },
    },
  };

  efficiencyChartData: ChartData<'line'> = {
    labels: [],
    datasets: [{ data: [], borderColor: '#80cbc4', backgroundColor: 'rgba(128,203,196,0.1)', tension: 0.4, fill: true }],
  };

  priceChartData: ChartData<'line'> = {
    labels: [],
    datasets: [{ data: [], borderColor: '#ce93d8', backgroundColor: 'rgba(206,147,216,0.1)', tension: 0.4, fill: true }],
  };

  constructor(private api: ApiService, private vehicleState: VehicleStateService) {}

  ngOnInit(): void {
    this.api.getVehicles().subscribe(vehicles => {
      this.vehicles = vehicles;
      this.vehicleState.loadStoredVehicleId().subscribe(storedId => {
        const found = storedId ? vehicles.find(v => v.id === storedId) : null;
        if (found) {
          this.selectedVehicleId = found.id;
          this.vehicleState.setSelectedVehicle(found);
          this.loadStats(found.id);
        } else if (vehicles.length > 0) {
          this.selectedVehicleId = vehicles[0].id;
          this.vehicleState.setSelectedVehicle(vehicles[0]);
          this.loadStats(vehicles[0].id);
        }
      });
    });
  }

  onVehicleChange(id: number): void {
    const v = this.vehicles.find(x => x.id === id) ?? null;
    this.vehicleState.setSelectedVehicle(v);
    if (id) this.loadStats(id);
  }

  private loadStats(vehicleId: number): void {
    this.api.getStats(vehicleId).subscribe(stats => {
      this.stats = stats;
      this.buildCharts(stats.recent_fillups.slice().reverse());
    });
  }

  private buildCharts(fillups: Fillup[]): void {
    const last10 = fillups.slice(-10);
    const labels = last10.map(f => {
      const d = new Date(f.filled_at);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });

    const efficiencies = last10.map(f =>
      f.trip_km && f.trip_km > 0 ? (f.litres_added / f.trip_km) * 100 : null
    );
    const prices = last10.map(f => f.price_per_litre);

    this.efficiencyChartData = {
      labels,
      datasets: [{
        data: efficiencies as number[],
        borderColor: '#80cbc4',
        backgroundColor: 'rgba(128,203,196,0.1)',
        tension: 0.4,
        fill: true,
      }],
    };

    this.priceChartData = {
      labels,
      datasets: [{
        data: prices,
        borderColor: '#ce93d8',
        backgroundColor: 'rgba(206,147,216,0.1)',
        tension: 0.4,
        fill: true,
      }],
    };
  }
}
