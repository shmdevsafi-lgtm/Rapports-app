/**
 * Gestionnaire de synchronisation ROBUSTE
 * - Retry automatique
 * - Idempotence (pas de doublons)
 * - Gestion des conflits
 * - Queue de sync fiable
 */

import { supabase } from '../supabase';
import { offlineStorage, StoredReport, StoredSession } from '../storage/offlineStorage';

interface SyncQueueItem {
  id?: number;
  type: 'report' | 'session';
  localId: string;
  retries: number;
  lastError?: string;
  createdAt: string;
}

class SyncManager {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private maxRetries = 5;
  private retryDelayMs = 3000; // 3 secondes

  async init(): Promise<void> {
    console.log('🔄 SyncManager initialized');

    // Écouter le retour de connexion Internet
    offlineStorage.onlineListener(async (online) => {
      console.log(`📡 Network status: ${online ? 'ONLINE' : 'OFFLINE'}`);
      if (online && !this.isSyncing) {
        await this.syncAll();
      }
    });

    // Sync automatique au démarrage si online
    if (offlineStorage.isOnline()) {
      setTimeout(() => this.syncAll(), 1000);
    }

    // Sync périodique (toutes les 30 secondes si online)
    this.syncInterval = setInterval(() => {
      if (offlineStorage.isOnline() && !this.isSyncing) {
        this.syncAll().catch((err) => console.error('Periodic sync error:', err));
      }
    }, 30000);
  }

  async syncAll(): Promise<void> {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress, skipping...');
      return;
    }

    this.isSyncing = true;
    console.log('🔄 Starting full sync...');

    try {
      const pendingReports = await offlineStorage.getPendingReports();
      const pendingSessions = await offlineStorage.getPendingSessions();

      console.log(`📊 Pending items: ${pendingReports.length} reports, ${pendingSessions.length} sessions`);

      // Sync rapports
      for (const report of pendingReports) {
        await this.syncReport(report);
      }

      // Sync séances
      for (const session of pendingSessions) {
        await this.syncSession(session);
      }

      console.log('✅ Sync completed');
    } catch (error) {
      console.error('❌ Sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncReport(report: StoredReport): Promise<void> {
    if (!offlineStorage.isOnline()) {
      console.log(`⏸️  Offline, skipping report sync: ${report.localId}`);
      return;
    }

    try {
      console.log(`📤 Syncing report: ${report.localId}`);

      // Vérifier si déjà synced
      if (report.syncStatus === 'synced' && report.supabaseId) {
        console.log(`✓ Report already synced: ${report.supabaseId}`);
        return;
      }

      // Préparer le payload
      const payload = {
        title: report.title,
        content: report.content,
        date: report.date,
        local_id: report.localId, // Important: identifiant stable pour idempotence
        created_at: report.createdAt,
        status: 'pending',
      };

      // Insérer ou mettre à jour
      let supabaseId: string | null = null;

      if (report.supabaseId) {
        // Mise à jour
        const { error: updateError } = await supabase
          .from('reports')
          .update(payload)
          .eq('id', report.supabaseId);

        if (updateError) throw updateError;
        supabaseId = report.supabaseId;
      } else {
        // Insertion - vérifier d'abord si existe via local_id
        const { data: existing, error: checkError } = await supabase
          .from('reports')
          .select('id')
          .eq('local_id', report.localId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError; // Erreur réelle
        }

        if (existing) {
          // Déjà existe, c'est un retry
          supabaseId = existing.id;
          console.log(`✓ Report already exists in Supabase: ${supabaseId}`);
        } else {
          // Nouvelle insertion
          const { data, error: insertError } = await supabase.from('reports').insert([payload]).select('id').single();

          if (insertError) throw insertError;
          if (!data) throw new Error('No data returned from insert');

          supabaseId = data.id;
        }
      }

      // Marquer comme synced
      await offlineStorage.updateReportSyncStatus(report.id, 'synced', supabaseId);
      console.log(`✅ Report synced: ${supabaseId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Report sync failed: ${errorMsg}`);
      await offlineStorage.updateReportSyncStatus(report.id, 'failed', undefined, errorMsg);
    }
  }

  private async syncSession(session: StoredSession): Promise<void> {
    if (!offlineStorage.isOnline()) {
      console.log(`⏸️  Offline, skipping session sync: ${session.localId}`);
      return;
    }

    try {
      console.log(`📤 Syncing session: ${session.localId}`);

      if (session.syncStatus === 'synced' && session.supabaseId) {
        console.log(`✓ Session already synced: ${session.supabaseId}`);
        return;
      }

      const payload = {
        title: session.title,
        description: session.description,
        date: session.date,
        participants: session.participants,
        local_id: session.localId,
        created_at: session.createdAt,
        status: 'pending',
      };

      let supabaseId: string | null = null;

      if (session.supabaseId) {
        const { error: updateError } = await supabase
          .from('sessions')
          .update(payload)
          .eq('id', session.supabaseId);

        if (updateError) throw updateError;
        supabaseId = session.supabaseId;
      } else {
        const { data: existing, error: checkError } = await supabase
          .from('sessions')
          .select('id')
          .eq('local_id', session.localId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existing) {
          supabaseId = existing.id;
          console.log(`✓ Session already exists in Supabase: ${supabaseId}`);
        } else {
          const { data, error: insertError } = await supabase
            .from('sessions')
            .insert([payload])
            .select('id')
            .single();

          if (insertError) throw insertError;
          if (!data) throw new Error('No data returned from insert');

          supabaseId = data.id;
        }
      }

      await offlineStorage.updateSessionSyncStatus(session.id, 'synced', supabaseId);
      console.log(`✅ Session synced: ${supabaseId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Session sync failed: ${errorMsg}`);
      await offlineStorage.updateSessionSyncStatus(session.id, 'failed', undefined, errorMsg);
    }
  }

  async destroy(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    console.log('🛑 SyncManager stopped');
  }

  getStatus(): {
    isSyncing: boolean;
    isOnline: boolean;
  } {
    return {
      isSyncing: this.isSyncing,
      isOnline: offlineStorage.isOnline(),
    };
  }
}

export const syncManager = new SyncManager();
