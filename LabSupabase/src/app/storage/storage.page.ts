import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService, StorageFileItem } from '../services/supabase.service';
import { ThemeService } from '../services/theme.service';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonButton, IonIcon,
  IonButtons, IonToast, IonModal, IonInput, IonItem, IonLabel, IonBadge, IonSpinner
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  imagesOutline, arrowBackOutline, cloudUploadOutline, trashOutline,
  eyeOutline, refreshOutline, moonOutline, sunnyOutline, downloadOutline,
  closeOutline, alertCircleOutline, folderOpenOutline, checkmarkCircleOutline,
  imageOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-storage',
  templateUrl: './storage.page.html',
  styleUrls: ['./storage.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol,
    IonCard, IonCardContent, IonButton, IonIcon,
    IonButtons, IonToast, IonModal, IonInput, IonBadge, IonSpinner
  ],
})
export class StoragePage implements OnInit {
  public supabaseService = inject(SupabaseService);
  public themeService = inject(ThemeService);

  bucketName = 'images';
  images: StorageFileItem[] = [];
  isLoading = false;
  isUploading = false;
  errorMessage = '';

  toastMessage = '';
  isToastOpen = false;

  selectedImage: StorageFileItem | null = null;
  isPreviewOpen = false;

  // Señales reactivas
  currentUser = this.supabaseService.currentUser;
  isAdmin = this.supabaseService.userRole;
  isDark = this.themeService.isDark;

  constructor() {
    addIcons({
      imagesOutline, arrowBackOutline, cloudUploadOutline, trashOutline,
      eyeOutline, refreshOutline, moonOutline, sunnyOutline, downloadOutline,
      closeOutline, alertCircleOutline, folderOpenOutline, checkmarkCircleOutline,
      imageOutline
    });
  }

  async ngOnInit() {
    await this.loadImages();
  }

  async loadImages() {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      this.images = await this.supabaseService.getStorageFiles(this.bucketName.trim());
    } catch (e: any) {
      this.images = [];
      this.errorMessage = e.message || 'No se pudo acceder al bucket. Verifica que el bucket existe y tiene permisos de lectura públicos en Supabase.';
    } finally {
      this.isLoading = false;
    }
  }

  async onFileSelected(event: any) {
    const file: File = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.showToast('Por favor selecciona un archivo de imagen válido');
      return;
    }

    this.isUploading = true;
    try {
      await this.supabaseService.uploadStorageFile(this.bucketName.trim(), file);
      this.showToast('¡Imagen subida con éxito!');
      await this.loadImages();
    } catch (e: any) {
      this.showToast('Error al subir imagen: ' + (e.message || 'Verifica las políticas RLS del Bucket'));
    } finally {
      this.isUploading = false;
      event.target.value = '';
    }
  }

  async deleteImage(img: StorageFileItem) {
    if (!this.currentUser()) {
      this.showToast('Debes iniciar sesión para borrar imágenes del Bucket');
      return;
    }

    if (this.isAdmin() !== 'admin') {
      this.showToast('Acceso restringido: Solo administradores pueden eliminar imágenes');
      return;
    }

    try {
      await this.supabaseService.deleteStorageFile(this.bucketName.trim(), img.name);
      this.showToast('Imagen eliminada del Storage');
      await this.loadImages();
    } catch (e: any) {
      this.showToast('Error al eliminar: ' + e.message);
    }
  }

  openPreview(img: StorageFileItem) {
    this.selectedImage = img;
    this.isPreviewOpen = true;
  }

  closePreview() {
    this.selectedImage = null;
    this.isPreviewOpen = false;
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  formatBytes(bytes: number, decimals = 1): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  }

  setToastOpen(isOpen: boolean) {
    this.isToastOpen = isOpen;
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    this.isToastOpen = true;
  }
}
