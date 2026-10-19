import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { ThemeService } from '../services/theme.service';
import { Client } from '../models/client.model';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel,
  IonItemSliding, IonItemOptions, IonItemOption, IonIcon, IonButton,
  IonInput, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonToast,
  IonModal, IonButtons, IonSegment, IonSegmentButton, IonBadge, IonGrid, IonRow, IonCol
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  createOutline, trashOutline, moonOutline, sunnyOutline,
  logInOutline, logOutOutline, addOutline, imagesOutline,
  peopleOutline, closeOutline, shieldCheckmarkOutline, personCircleOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, RouterLink,
    IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel,
    IonItemSliding, IonItemOptions, IonItemOption, IonIcon, IonButton,
    IonInput, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonToast,
    IonModal, IonButtons, IonBadge
  ],
})
export class HomePage implements OnInit {
  public supabaseService = inject(SupabaseService);
  public themeService = inject(ThemeService);
  private fb = inject(FormBuilder);

  clients: Client[] = [];
  clientForm: FormGroup;
  editingClientId: string | null = null;
  toastMessage = '';
  isToastOpen = false;

  // Login Modal State
  isLoginModalOpen = false;
  loginEmail = '';
  loginPassword = '';
  loginError = '';
  isLoggingIn = false;
  private pendingAction: (() => Promise<void>) | null = null;

  // Señales reactivas expuestas a la vista
  isAdmin = this.supabaseService.userRole;
  currentUser = this.supabaseService.currentUser;
  isDark = this.themeService.isDark;

  constructor() {
    addIcons({
      createOutline, trashOutline, moonOutline, sunnyOutline,
      logInOutline, logOutOutline, addOutline, imagesOutline,
      peopleOutline, closeOutline, shieldCheckmarkOutline, personCircleOutline
    });

    this.clientForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      empresa: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  async ngOnInit() {
    // Si ya existe sesión previa en localStorage, se carga el rol y clientes
    await this.supabaseService.initSession();
    await this.loadClients();
  }

  async loadClients() {
    try {
      this.clients = await this.supabaseService.getClients();
    } catch (e: any) {
      this.clients = [];
      // Si no está autenticado, RLS bloquea select
      if (this.currentUser()) {
        this.showToast('Error cargando clientes: ' + e.message);
      }
    }
  }

  // --- INTERCEPCIÓN DE ACCIONES (SOLICITAR LOGIN CON ADMIN) ---

  async handleSaveClient() {
    if (this.clientForm.invalid) return;

    // 1. Si no está logueado, solicitar login
    if (!this.currentUser()) {
      this.openLoginModal('Inicia sesión con un usuario Administrador para guardar el cliente.', async () => {
        await this.handleSaveClient();
      });
      return;
    }

    // 2. Si está logueado pero no es admin
    if (this.isAdmin() !== 'admin') {
      this.showToast('Acceso denegado: Tu usuario no tiene permisos de Administrador para insertar (RLS en Supabase).');
      return;
    }

    // 3. Ejecutar guardado
    try {
      const formValue = this.clientForm.value;
      if (this.editingClientId) {
        await this.supabaseService.updateClient(this.editingClientId, formValue);
        this.showToast('Cliente actualizado con éxito');
      } else {
        await this.supabaseService.createClient(formValue);
        this.showToast('Cliente insertado con éxito');
      }
      this.resetForm();
      await this.loadClients();
    } catch (e: any) {
      this.showToast('Error de guardado: ' + e.message);
    }
  }

  handleEdit(client: Client) {
    if (!this.currentUser()) {
      this.openLoginModal('Inicia sesión como Administrador para editar este cliente.', async () => {
        this.editClient(client);
      });
      return;
    }

    if (this.isAdmin() !== 'admin') {
      this.showToast('Acceso denegado: Solo administradores pueden editar clientes (RLS).');
      return;
    }

    this.editClient(client);
  }

  async handleDelete(id: string) {
    if (!this.currentUser()) {
      this.openLoginModal('Inicia sesión como Administrador para eliminar este cliente.', async () => {
        await this.handleDelete(id);
      });
      return;
    }

    if (this.isAdmin() !== 'admin') {
      this.showToast('Acceso denegado: Solo administradores pueden eliminar clientes (RLS).');
      return;
    }

    try {
      await this.supabaseService.deleteClient(id);
      this.showToast('Cliente eliminado correctamente');
      await this.loadClients();
    } catch (e: any) {
      this.showToast('Error eliminando: ' + e.message);
    }
  }

  private editClient(client: Client) {
    this.editingClientId = client.id!;
    this.clientForm.patchValue({
      nombre: client.nombre,
      empresa: client.empresa,
      email: client.email
    });
  }

  resetForm() {
    this.clientForm.reset();
    this.editingClientId = null;
  }

  // --- CONTROL DE LOGIN MODAL ---

  openLoginModal(message?: string, callback?: () => Promise<void>) {
    this.loginError = message || '';
    this.pendingAction = callback || null;
    this.isLoginModalOpen = true;
  }

  closeLoginModal() {
    this.isLoginModalOpen = false;
    this.loginError = '';
    this.pendingAction = null;
  }

  async performLogin() {
    if (!this.loginEmail || !this.loginPassword) {
      this.loginError = 'Por favor introduce email y contraseña';
      return;
    }

    this.isLoggingIn = true;
    this.loginError = '';

    try {
      await this.supabaseService.login(this.loginEmail, this.loginPassword);
      this.isLoginModalOpen = false;
      this.showToast(`Bienvenido ${this.loginEmail} [${this.isAdmin() || 'usuario'}]`);
      await this.loadClients();

      if (this.pendingAction) {
        const action = this.pendingAction;
        this.pendingAction = null;
        await action();
      }
    } catch (err: any) {
      this.loginError = 'Error de autenticación: ' + (err.message || 'Credenciales inválidas');
    } finally {
      this.isLoggingIn = false;
    }
  }

  async performLogout() {
    await this.supabaseService.logout();
    this.resetForm();
    this.clients = [];
    this.showToast('Sesión cerrada correctamente');
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  setToastOpen(isOpen: boolean) {
    this.isToastOpen = isOpen;
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    this.isToastOpen = true;
  }
}
