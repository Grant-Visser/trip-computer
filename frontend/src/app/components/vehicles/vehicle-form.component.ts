import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSnackBarModule],
  template: `
    <div class="page-container">
      <h2>Add Vehicle</h2>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <mat-form-field appearance="outline">
          <mat-label>Vehicle Name *</mat-label>
          <input matInput formControlName="name" placeholder="e.g. VW Polo">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Make</mat-label>
          <input matInput formControlName="make" placeholder="e.g. Volkswagen">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Model</mat-label>
          <input matInput formControlName="model" placeholder="e.g. Polo 1.0 TSI">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Year</mat-label>
          <input matInput formControlName="year" type="number" placeholder="e.g. 2022">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Registration</mat-label>
          <input matInput formControlName="registration" placeholder="e.g. CA123456">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Tank Capacity (litres)</mat-label>
          <input matInput formControlName="tank_capacity_litres" type="number" step="0.1" placeholder="e.g. 50">
        </mat-form-field>

        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:8px">
          <button mat-stroked-button type="button" routerLink="/vehicles">Cancel</button>
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving">
            {{ saving ? 'Saving...' : 'Add Vehicle' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`h2 { color: #80cbc4; margin-bottom: 16px; }`],
})
export class VehicleFormComponent {
  form: FormGroup;
  saving = false;

  constructor(private fb: FormBuilder, private api: ApiService, private router: Router, private snackBar: MatSnackBar) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      make: [''],
      model: [''],
      year: [null],
      registration: [''],
      tank_capacity_litres: [null],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const dto = { ...this.form.value };
    if (!dto.year) delete dto.year;
    if (!dto.tank_capacity_litres) delete dto.tank_capacity_litres;
    this.api.createVehicle(dto).subscribe({
      next: () => {
        this.snackBar.open('Vehicle added!', 'OK', { duration: 2000 });
        this.router.navigate(['/vehicles']);
      },
      error: () => {
        this.snackBar.open('Failed to add vehicle', 'OK', { duration: 3000 });
        this.saving = false;
      },
    });
  }
}
