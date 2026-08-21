/**
 * Service de stockage OFFLINE pour Rapports et Séances
 * Utilise IndexedDB pour persistence fiable
 * Compatible Capacitor + WebView Android
 */

interface StoredReport {
  id: string; // UUID local
  localId: string; // Identifiant unique stable
  title: string;
  content: string;
  date: string;
  pdfBase64?: string; // PDF généré stocké localement
  syncStatus: 'pending' | 'synced' | 'failed'; // État sync
  createdAt: string;
  updatedAt: string;
  supabaseId?: string; // ID après sync vers Supabase
  lastSyncAttempt?: string;
  errorMessage?: string;
}

interface StoredSession {
  id: string;
  localId: string;
  title: string;
  description: string;
  date: string;
  participants: string[];
  syncStatus: 'pending' | 'synced' | 'failed';
  createdAt: string;
  updatedAt: string;
  supabaseId?: string;
  lastSyncAttempt?: string;
  errorMessage?: string;
}

class OfflineStorageService {
  private dbName = 'SHMReportsDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✓ IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store pour les rapports
        if (!db.objectStoreNames.contains('reports')) {
          const reportStore = db.createObjectStore('reports', { keyPath: 'id' });
          reportStore.createIndex('localId', 'localId', { unique: true });
          reportStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          reportStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Store pour les séances
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('localId', 'localId', { unique: true });
          sessionStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          sessionStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Store pour les métadonnées de sync
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  // ========== RAPPORTS ==========

  async saveReport(report: Omit<StoredReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoredReport> {
    if (!this.db) throw new Error('Database not initialized');

    const fullReport: StoredReport = {
      ...report,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('reports', 'readwrite');
      const store = tx.objectStore('reports');
      const request = store.add(fullReport);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('✓ Report saved locally:', fullReport.localId);
        resolve(fullReport);
      };
    });
  }

  async getReport(id: string): Promise<StoredReport | undefined> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('reports', 'readonly');
      const store = tx.objectStore('reports');
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getAllReports(): Promise<StoredReport[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('reports', 'readonly');
      const store = tx.objectStore('reports');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getPendingReports(): Promise<StoredReport[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('reports', 'readonly');
      const store = tx.objectStore('reports');
      const index = store.index('syncStatus');
      const request = index.getAll('pending');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async updateReportSyncStatus(id: string, status: 'synced' | 'failed', supabaseId?: string, error?: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const report = await this.getReport(id);
    if (!report) throw new Error(`Report ${id} not found`);

    report.syncStatus = status;
    report.updatedAt = new Date().toISOString();
    report.lastSyncAttempt = new Date().toISOString();
    if (supabaseId) report.supabaseId = supabaseId;
    if (error) report.errorMessage = error;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('reports', 'readwrite');
      const store = tx.objectStore('reports');
      const request = store.put(report);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`✓ Report sync status updated: ${status}`);
        resolve();
      };
    });
  }

  async deleteReport(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('reports', 'readwrite');
      const store = tx.objectStore('reports');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // ========== SÉANCES ==========

  async saveSession(session: Omit<StoredSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoredSession> {
    if (!this.db) throw new Error('Database not initialized');

    const fullSession: StoredSession = {
      ...session,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      const request = store.add(fullSession);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('✓ Session saved locally:', fullSession.localId);
        resolve(fullSession);
      };
    });
  }

  async getSession(id: string): Promise<StoredSession | undefined> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('sessions', 'readonly');
      const store = tx.objectStore('sessions');
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getAllSessions(): Promise<StoredSession[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('sessions', 'readonly');
      const store = tx.objectStore('sessions');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getPendingSessions(): Promise<StoredSession[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('sessions', 'readonly');
      const store = tx.objectStore('sessions');
      const index = store.index('syncStatus');
      const request = index.getAll('pending');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async updateSessionSyncStatus(id: string, status: 'synced' | 'failed', supabaseId?: string, error?: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const session = await this.getSession(id);
    if (!session) throw new Error(`Session ${id} not found`);

    session.syncStatus = status;
    session.updatedAt = new Date().toISOString();
    session.lastSyncAttempt = new Date().toISOString();
    if (supabaseId) session.supabaseId = supabaseId;
    if (error) session.errorMessage = error;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      const request = store.put(session);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`✓ Session sync status updated: ${status}`);
        resolve();
      };
    });
  }

  async deleteSession(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // ========== UTILITAIRES ==========

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async clear(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['reports', 'sessions', 'syncQueue'], 'readwrite');

      tx.objectStore('reports').clear();
      tx.objectStore('sessions').clear();
      tx.objectStore('syncQueue').clear();

      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve();
    });
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  onlineListener(callback: (online: boolean) => void): () => void {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));

    return () => {
      window.removeEventListener('online', () => callback(true));
      window.removeEventListener('offline', () => callback(false));
    };
  }
}

export const offlineStorage = new OfflineStorageService();
export type { StoredReport, StoredSession };
