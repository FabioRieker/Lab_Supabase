import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  public isDark = signal<boolean>(false);

  constructor() {
    this.initTheme();
  }

  private initTheme() {
    const saved = localStorage.getItem('dam_app_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDarkMode = saved ? saved === 'dark' : prefersDark;

    this.setTheme(isDarkMode);
  }

  public toggleTheme(): void {
    this.setTheme(!this.isDark());
  }

  public setTheme(dark: boolean): void {
    this.isDark.set(dark);
    localStorage.setItem('dam_app_theme', dark ? 'dark' : 'light');

    if (dark) {
      document.documentElement.classList.add('ion-palette-dark');
      document.body.classList.add('ion-palette-dark');
    } else {
      document.documentElement.classList.remove('ion-palette-dark');
      document.body.classList.remove('ion-palette-dark');
    }
  }
}
