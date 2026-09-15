import { DialogComponent } from './shared/dialog.component';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SessionExpiredModalComponent } from './shared/session-expired-modal/session-expired-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DialogComponent, RouterOutlet, SessionExpiredModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'cash-track';
}
