import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatBottomNavModule } from '@angular/material/legacy-bottom-nav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive, MatToolbarModule, MatIconModule, MatButtonModule],
  template: `
    <mat-toolbar color="primary" class="app-toolbar">
      <span>⛽ Trip Computer</span>
    </mat-toolbar>

    <main class="main-content">
      <ng-content></ng-content>
    </main>

    <nav class="bottom-nav">
      <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
        <mat-icon>dashboard</mat-icon>
        <span>Dashboard</span>
      </a>
      <a routerLink="/fillup/new" routerLinkActive="active" class="nav-item nav-add">
        <mat-icon>local_gas_station</mat-icon>
        <span>Fill Up</span>
      </a>
      <a routerLink="/history" routerLinkActive="active" class="nav-item">
        <mat-icon>history</mat-icon>
        <span>History</span>
      </a>
      <a routerLink="/vehicles" routerLinkActive="active" class="nav-item">
        <mat-icon>directions_car</mat-icon>
        <span>Vehicles</span>
      </a>
    </nav>
  `,
  styles: [`
    .app-toolbar {
      background: #1a1a2e;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .main-content {
      min-height: calc(100vh - 56px - 64px);
    }
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 64px;
      background: #1a1a2e;
      display: flex;
      align-items: center;
      justify-content: space-around;
      border-top: 1px solid #2a2a4e;
      z-index: 100;
    }
    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-decoration: none;
      color: #757575;
      font-size: 11px;
      padding: 8px 16px;
      border-radius: 8px;
      transition: color 0.2s;

      mat-icon {
        font-size: 24px;
        height: 24px;
        width: 24px;
        margin-bottom: 2px;
      }

      &.active {
        color: #80cbc4;
      }
    }
  `],
})
export class LayoutComponent {}
