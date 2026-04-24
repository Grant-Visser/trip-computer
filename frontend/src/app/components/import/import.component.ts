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

      <div class="import-help">
        <div class="help-title">How to import</div>
        <ol>
          <li>Select your vehicle.</li>
          <li>Upload a CSV file or paste rows into the text box.</li>
          <li>Click Preview, verify the rows, then click Import.</li>
        </ol>
        <div class="help-format">
          Accepted CSV columns: <strong>date, litres, price_per_litre, total_price, trip_km, odometer</strong>
        </div>
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Vehicle</mat-label>
        <mat-select [(ngModel)]="selectedVehicleId" (ngModelChange)="onVehicleChange($event)">
          <mat-option *ngFor="let v of vehicles" [value]="v.id">{{ v.name }}</mat-option>
        </mat-select>
      </mat-form-field>

      <div class="section-title">Paste raw data or upload CSV</div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Paste fill-up data (one per line)</mat-label>
        <textarea matInput [(ngModel)]="pasteData" rows="8"
          placeholder="date,litres,price_per_litre,total_price,trip_km,odometer&#10;2025-10-28,52.78,21.63,1141.65,570.4,32756&#10;2025/09/14 48.50 R21.30 R1033.05 520.1 32185"></textarea>
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
          <span *ngIf="row.is_partial" class="partial-flag">PARTIAL</span>
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
    .import-help {
      background: #1a1a2e;
      border: 1px solid #2a2a4e;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 16px;
      color: #cfd8dc;
      font-size: 13px;
    }
    .help-title {
      color: #80cbc4;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .import-help ol {
      margin: 0 0 8px 18px;
      padding: 0;
    }
    .help-format {
      color: #9e9e9e;
      font-size: 12px;
    }
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
    .partial-flag {
      margin-left: auto;
      color: #ffcc80;
      font-size: 11px;
      border: 1px solid #6d4c41;
      border-radius: 999px;
      padding: 2px 6px;
      background: #3a2a1a;
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
      this.vehicleState.loadStoredVehicleId().subscribe(storedId => {
        const found = storedId ? v.find(x => x.id === storedId) : null;
        if (found) {
          this.selectedVehicleId = found.id;
          this.vehicleState.setSelectedVehicle(found);
        } else if (v.length > 0) {
          this.selectedVehicleId = v[0].id;
          this.vehicleState.setSelectedVehicle(v[0]);
        }
      });
    });
  }

  onVehicleChange(vehicleId: number): void {
    const selected = this.vehicles.find(v => v.id === vehicleId) ?? null;
    this.vehicleState.setSelectedVehicle(selected);
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
    let isPartialColIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i === 0) {
        const headerCells = line.split(',').map(c => c.trim().toLowerCase());
        const hasDateHeader = headerCells.includes('date') || line.toLowerCase().startsWith('date');
        if (hasDateHeader) {
          isPartialColIndex = headerCells.findIndex(c => c === 'is_partial' || c === 'partial');
          continue;
        }
      }

      try {
        const row = this.parseLine(line, isPartialColIndex);
        if (row) this.preview.push(row);
      } catch (e) {
        this.parseErrors.push(`Line ${i + 1}: ${(e as Error).message}`);
      }
    }
  }

  private parseLine(line: string, isPartialColIndex: number): ImportFillupRow | null {
    // Try CSV format first: date,litres,price_per_litre,total_price,trip_km,odometer
    const csvParts = line.split(',');
    if (csvParts.length >= 4) {
      const parsedPartial = isPartialColIndex >= 0
        ? this.parsePartialValue(csvParts[isPartialColIndex])
        : this.parsePartialValue(csvParts[6]);

      return {
        date: csvParts[0].trim(),
        litres: parseFloat(csvParts[1]),
        price_per_litre: parseFloat(csvParts[2]),
        total_price: parseFloat(csvParts[3]),
        trip_km: csvParts[4] ? parseFloat(csvParts[4]) : undefined,
        odometer: csvParts[5] ? parseFloat(csvParts[5]) : undefined,
        is_partial: parsedPartial,
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
      is_partial: this.parsePartialValue(parts[6]),
    };
  }

  private parsePartialValue(value: string | undefined): boolean | undefined {
    if (value == null) return undefined;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'y') {
      return true;
    }
    if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'n') {
      return false;
    }
    return undefined;
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
