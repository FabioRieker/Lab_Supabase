import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Client } from '../models/client.model';

export interface StorageFileItem {
  name: string;
  url: string;
  size: number;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  // Señales reactivas para el estado global
  public currentUser = signal<User | null>(null);
  public userRole = signal<'admin' | 'user' | null>(null);

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    this.initSession();
  }

  // --- AUTENTICACIÓN Y ROLES ---
  public async initSession() {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (session?.user) {
      this.currentUser.set(session.user);
      await this.loadRole(session.user.id);
    } else {
      this.currentUser.set(null);
      this.userRole.set(null);
    }
  }

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      this.currentUser.set(data.user);
      await this.loadRole(data.user.id);
    }
    return data;
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this.currentUser.set(null);
    this.userRole.set(null);
  }

  public async loadRole(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (!error && data) {
      this.userRole.set(data.role);
    } else {
      this.userRole.set(null);
    }
  }

  // --- CRUD CLIENTES ---
  async getClients(): Promise<Client[]> {
    const { data, error } = await this.supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createClient(client: Client): Promise<void> {
    const { error } = await this.supabase.from('clients').insert([{
      nombre: client.nombre,
      empresa: client.empresa,
      email: client.email
    }]);
    if (error) throw error;
  }

  async updateClient(id: string, client: Partial<Client>): Promise<void> {
    const { error } = await this.supabase.from('clients').update(client).eq('id', id);
    if (error) throw error;
  }

  async deleteClient(id: string): Promise<void> {
    const { error } = await this.supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
  }

  // --- STORAGE BUCKET ---
  async getStorageFiles(bucketName: string = 'images'): Promise<StorageFileItem[]> {
    const { data, error } = await this.supabase.storage.from(bucketName).list('', {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' }
    });
    if (error) throw error;
    if (!data) return [];

    return data
      .filter(item => item.name && item.name !== '.emptyFolderPlaceholder')
      .map(item => {
        const { data: { publicUrl } } = this.supabase.storage.from(bucketName).getPublicUrl(item.name);
        return {
          name: item.name,
          url: publicUrl,
          size: item.metadata?.size || 0,
          createdAt: item.created_at || item.updated_at || new Date().toISOString()
        };
      });
  }

  async uploadStorageFile(bucketName: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'png';
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || 'image';
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${Date.now()}_${sanitizedName}.${fileExt}`;

    const { error } = await this.supabase.storage.from(bucketName).upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'image/jpeg'
    });
    if (error) {
      console.error('Error Supabase Storage Upload:', error);
      throw error;
    }

    const { data: { publicUrl } } = this.supabase.storage.from(bucketName).getPublicUrl(fileName);
    return publicUrl;
  }

  async deleteStorageFile(bucketName: string, fileName: string): Promise<void> {
    const { error } = await this.supabase.storage.from(bucketName).remove([fileName]);
    if (error) throw error;
  }
}
