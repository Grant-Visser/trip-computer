import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { VehicleStateService } from '../../services/vehicle-state.service';
import type { Vehicle, Fillup } from '@trip-computer/shared';

@Component({
  selector: 'app-fillup-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="page-container">
      <h2>{{ isEdit ? 'Edit Fill-up' : 'Add Fill-up' }}</h2>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <mat-form-field appearance="outline">
          <mat-label>Vehicle</mat-label>
          <mat-select formControlName="vehicle_id" required>
            <mat-option *ngFor="let v of vehicles" [value]="v.id">{{ v.name }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Date & Time</mat-label>
          <input matInput formControlName="filled_at" type="datetime-local" required>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Litres Added</mat-label>
          <input matInput formControlName="litres_added" type="number" step="0.01" min="0" required>
          <mat-hint>e.g. 52.78</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Price per Litre (R)</mat-label>
          <input matInput formControlName="price_per_litre" type="number" step="0.01" min="0" required (input)="calcTotal()">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Total Price (R)</mat-label>
          <input matInput formControlName="total_price" type="number" step="0.01" min="0" required>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Trip km (since last fill-up)</mat-label>
          <input matInput formControlName="trip_km" type="number" step="0.1" min="0">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Odometer (km)</mat-label>
          <input matInput formControlName="odometer" type="number" step="0.1" min="0">
        </mat-form-field>

        <div *ngIf="efficiencyPreview" class="efficiency-preview">
          📊 Estimated efficiency: <strong>{{ efficiencyPreview | number:'1.1-1' }} L/100km</strong>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Location</mat-label>
          <input matInput formControlName="location_name">
          <button mat-icon-button matSuffix type="button" (click)="getLocation()" [disabled]="geoLoading">
            <mat-icon>my_location</mat-icon>
          </button>
          <mat-hint *ngIf="geoLoading">Getting location...</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Notes</mat-label>
          <textarea matInput formControlName="notes" rows="2"></textarea>
        </mat-form-field>

        <div class="form-actions">
          <button mat-stroked-button type="button" routerLink="/dashboard">Cancel</button>
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving">
            {{ saving ? 'Saving...' : (isEdit ? 'Update' : 'Save Fill-up') }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    h2 { margin-bottom: 16px; color: #80cbc4; }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px; }
    .efficiency-preview {
      background: #1a1a2e;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      font-size: 14px;
      color: #80cbc4;
    }
  `],
})
export class FillupFormComponent implements OnInit {
  form!: FormGroup;
  vehicles: Vehicle[] = [];
  isEdit = false;
  editId: number | null = null;
  saving = false;
  geoLoading = false;
  efficiencyPreview: number | null = null;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private vehicleState: VehicleStateService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      vehicle_id: [null, Validators.required],
      filled_at: [this.nowLocal(), Validators.required],
      litres_added: [null, [Validators.required, Validators.min(0.01)]],
      price_per_litre: [null, [Validators.required, Validators.min(0)]],
      total_price: [null, [Validators.required, Validators.min(0)]],
      trip_km: [null],
      odometer: [null],
      location_name: [''],
      latitude: [null],
      longitude: [null],
      notes: [''],
    });

    this.api.getVehicles().subscribe(v => {
      this.vehicles = v;
      const storedId = this.vehicleState.getStoredVehicleId();
      if (storedId) this.form.patchValue({ vehicle_id: storedId });
      else if (v.length > 0) this.form.patchValue({ vehicle_id: v[0].id });
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEdit = true;
      this.editId = parseInt(idParam);
      this.api.getFillup(this.editId).subscribe(f => this.patchForm(f));
    } else {
      this.getLocation();
    }

    this.form.valueChanges.subscribe(() => this.updateEfficiencyPreview());
  }

  calcTotal(): void {
    const litres = this.form.value.litres_added;
    const ppl = this.form.value.price_per_litre;
    if (litres && ppl) {
      this.form.patchValue({ total_price: +(litres * ppl).toFixed(2) }, { emitEvent: false });
    }
  }

  updateEfficiencyPreview(): void {
    const { litres_added, trip_km } = this.form.value;
    if (litres_added > 0 && trip_km > 0) {
      this.efficiencyPreview = (litres_added / trip_km) * 100;
    } else {
      this.efficiencyPreview = null;
    }
  }

  getLocation(): void {
    if (!navigator.geolocation) return;
    this.geoLoading = true;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        this.form.patchValue({ latitude, longitude });
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
          .then(r => r.json())
          .then(data => {
            const name = data.display_name?.split(',').slice(0, 2).join(',') ?? '';
            this.form.patchValue({ location_name: name });
            this.geoLoading = false;
          })
          .catch(() => { this.geoLoading = false; });
      },
      () => { this.geoLoading = false; }
    );
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving = true;

    const v = this.form.value;
    const vehicleId = v.vehicle_id;

    // Convert datetime-local to ISO8601 with timezone
    const filled_at = this.localDateTimeToIso(v.filled_at);

    const dto = {
      filled_at,
      litres_added: +v.litres_added,
      price_per_litre: +v.price_per_litre,
      total_price: +v.total_price,
      trip_km: v.trip_km ? +v.trip_km : undefined,
      odometer: v.odometer ? +v.odometer : undefined,
      location_name: v.location_name || undefined,
      latitude: v.latitude || undefined,
      longitude: v.longitude || undefined,
      notes: v.notes || undefined,
    };

    const obs$ = this.isEdit && this.editId
      ? this.api.updateFillup(this.editId, dto)
      : this.api.createFillup(vehicleId, dto);

    obs$.subscribe({
      next: () => {
        this.snackBar.open('Fill-up saved!', 'OK', { duration: 2000 });
        this.router.navigate(['/history']);
      },
      error: () => {
        this.snackBar.open('Failed to save fill-up', 'OK', { duration: 3000 });
        this.saving = false;
      },
    });
  }

  private patchForm(f: Fillup): void {
    this.form.patchValue({
      vehicle_id: f.vehicle_id,
      filled_at: this.isoToLocalDateTime(f.filled_at),
      litres_added: f.litres_added,
      price_per_litre: f.price_per_litre,
      total_price: f.total_price,
      trip_km: f.trip_km,
      odometer: f.odometer,
      location_name: f.location_name,
      latitude: f.latitude,
      longitude: f.longitude,
      notes: f.notes,
    });
  }

  private nowLocal(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  private isoToLocalDateTime(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private localDateTimeToIso(local: string): string {
    const d = new Date(local);
    const offset = -d.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const abs = Math.abs(offset);
    const hh = Math.floor(abs / 60).toString().padStart(2, '0');
    const mm = (abs % 60).toString().padStart(2, '0');
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${hh}:${mm}`;
  }
}
