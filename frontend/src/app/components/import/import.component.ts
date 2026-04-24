import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { VehicleStateService } from '../../services/vehicle-state.service';
import type { Vehicle, ImportFillupRow } from '@trip-computer/shared';

@Component({
  selector: 'app-import',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatInputModule, MatFormFieldModule, MatSelectModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="page-container">
      <h2>Import Fill-ups</h2>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Vehicle</mat-label>
        <mat-select [(ngModel)]="selectedVehicleId">
          <mat-option *ngFor="let v of vehicles" [value]="v.id">{{ v.name }}</mat-option>
        </mat-select>
      </mat-form-field>

      <div class="section-title">Paste raw data or upload CSV</div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Paste fill-up data (one per line)</mat-label>
        <textarea matInput [(ngModel)]="pasteData" rows="8"
          placeholder="2025/10/28 52.78 R21.63 R1141.65 570.4 32756&#10;2025/09/14 48.50 R21.30 R1033.05 520.1 32185"></textarea>
        <mat-hint>Format: date litres R price_per_litre R total_price trip_km odometer</mat-hint>
      </mat-form-field>

      <div style="margin-bottom:16px">
        <input #fileInput type="file" accept=".csv" style="display:none" (change)="onFileChange($event)">
        <button mat-stroked-button (click)="fileInput.click()">
          <mat-icon>upload_file</mat-icon> Upload CSV
        </button>
        <span *ngIf="fileName" style="margin-left:8px;font-size:13px;color:#9e9e9e">{{ fileName }}</span>
      </div>

      <button mat-raised-button color="accent" (click)="parseData()" [disabled]="!pasteData && !fileName">
        <mat-icon>preview</mat-icon> Preview
      </button>

      <div *ngIf="preview.length > 0" class="preview-section">
        <div class="section-title" style="margin-top:16px">Preview ({{ preview.length }} rows)</div>
        <div *ngFor="let row of preview" class="preview-row">
          <span>{{ row.date }}</span>
          <span>{{ row.litres }} L</span>
          <span>R{{ row.price_per_litre }}</span>
          <span>R{{ row.total_price }}</span>
          <span *ngIf="row.trip_km">{{ row.trip_km }} km</span>
        </div>

        <div *ngIf="parseErrors.length > 0" class="error-list">
          <div *ngFor="let e of parseErrors" class="error-row">⚠️ {{ e }}</div>
        </div>

        <button mat-raised-button color="primary" style="margin-top:16px"
          [disabled]="!selectedVehicleId || importing"
          (click)="importData()">
          {{ importing ? 'Importing...' : 'Import ' + preview.length + ' fill-ups' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    h2 { color: #80cbc4; margin-bottom: 16px; }
    .preview-row {
      display: flex;
      gap: 12px;
      padding: 8px 12px;
      background: #1a1a2e;
      border-radius: 6px;
      margin-bottom: 4px;
      font-size: 13px;
      color: #e0e0e0;
    }
    .error-list { margin-top: 8px; }
    .error-row { color: #ef9a9a; font-size: 12px; padding: 4px 0; }
  `],
})
export class ImportComponent implements OnInit {
  vehicles: Vehicle[] = [];
  selectedVehicleId: number | null = null;
  pasteData = '';
  fileName = '';
  preview: ImportFillupRow[] = [];
  parseErrors: string[] = [];
  importing = false;

  constructor(
    private api: ApiService,
    private vehicleState: VehicleStateService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.api.getVehicles().subscribe(v => {
      this.vehicles = v;
      const storedId = this.vehicleState.getStoredVehicleId();
      const found = storedId ? v.find(x => x.id === storedId) : null;
      if (found) this.selectedVehicleId = found.id;
      else if (v.length > 0) this.selectedVehicleId = v[0].id;
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.fileName = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.pasteData = (e.target as FileReader).result as string;
    };
    reader.readAsText(file);
  }

  parseData(): void {
    this.preview = [];
    this.parseErrors = [];
    const lines = this.pasteData.trim().split('\n').map(l => l.trim()).filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip CSV header
      if (i === 0 && line.toLowerCase().startsWith('date')) continue;

      try {
        const row = this.parseLine(line);
        if (row) this.preview.push(row);
      } catch (e) {
        this.parseErrors.push(`Line ${i + 1}: ${(e as Error).message}`);
      }
    }
  }

  private parseLine(line: string): ImportFillupRow | null {
    // Try CSV format first: date,litres,price_per_litre,total_price,trip_km,odometer
    const csvParts = line.split(',');
    if (csvParts.length >= 4) {
      return {
        date: csvParts[0].trim(),
        litres: parseFloat(csvParts[1]),
        price_per_litre: parseFloat(csvParts[2]),
        total_price: parseFloat(csvParts[3]),
        trip_km: csvParts[4] ? parseFloat(csvParts[4]) : undefined,
        odometer: csvParts[5] ? parseFloat(csvParts[5]) : undefined,
      };
    }

    // Space-delimited: 2025/10/28 52.78 R21.63 R1141.65 570.4 32756
    const parts = line.split(/\s+/);
    if (parts.length < 4) throw new Error('Not enough fields');

    const stripR = (s: string) => parseFloat(s.replace(/^R/i, ''));

    return {
      date: parts[0],
      litres: parseFloat(parts[1]),
      price_per_litre: stripR(parts[2]),
      total_price: stripR(parts[3]),
      trip_km: parts[4] ? parseFloat(parts[4]) : undefined,
      odometer: parts[5] ? parseFloat(parts[5]) : undefined,
    };
  }

  importData(): void {
    if (!this.selectedVehicleId || this.preview.length === 0) return;
    this.importing = true;
    this.api.importFillups(this.selectedVehicleId, this.preview).subscribe({
      next: (res) => {
        this.snackBar.open(`Imported ${res.imported} fill-ups!`, 'OK', { duration: 3000 });
        this.preview = [];
        this.pasteData = '';
        this.fileName = '';
        this.importing = false;
      },
      error: () => {
        this.snackBar.open('Import failed', 'OK', { duration: 3000 });
        this.importing = false;
      },
    });
  }
}
