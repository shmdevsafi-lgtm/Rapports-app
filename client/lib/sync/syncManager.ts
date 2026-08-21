/**
 * Gestionnaire de synchronisation ROBUSTE
 * - Retry automatique
 * - Idempotence (pas de doublons) via la colonne local_id
 * - Gestion des conflits
 * - Queue de sync fiable
 *
 * IMPORTANT: les payloads envoyés à Supabase utilisent les VRAIS noms
 * de colonnes des tables `reports` et `sessions`.
 * Le contenu complet du formulaire est stocké en JSON dans le champ
 * `content` d'offlineStorage, puis désérialisé ici avant l'envoi.
 */

import { supabase } from '../supabase';
import { offlineStorage, StoredReport, StoredSession } from '../storage/offlineStorage';

class SyncManager {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;

  async init(): Promise<void> {
    console.log('🔄 SyncManager initialized');

    offlineStorage.onlineListener(async (online) => {
      console.log(`📡 Network status: ${online ? 'ONLINE' : 'OFFLINE'}`);
      if (online && !this.isSyncing) {
        await this.syncAll();
      }
    });

    if (offlineStorage.isOnline()) {
      setTimeout(() => this.syncAll(), 1000);
    }

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

      for (const report of pendingReports) {
        await this.syncReport(report);
      }

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

      if (report.syncStatus === 'synced' && report.supabaseId) {
        console.log(`✓ Report already synced: ${report.supabaseId}`);
        return;
      }

      const form = JSON.parse(report.content || '{}');

      const payload = {
        local_id: report.localId,
        title: form.title ?? report.title,
        location: form.location ?? null,
        time: form.time ?? null,
        objective: form.objective ?? null,
        participants_boys: form.participants_boys ?? 0,
        participants_girls: form.participants_girls ?? 0,
        leaders_count: form.leaders_count ?? 0,
        category: form.category ?? null,
        beneficiary: form.beneficiary ?? null,
        description_original: form.description_original ?? null,
        description_reformulated: form.description_reformulated ?? null,
        evaluation_positive: form.evaluation_positive ?? null,
        evaluation_negative: form.evaluation_negative ?? null,
        recommendations: form.recommendations ?? null,
        pdf_url: form.pdf_url ?? null,
        created_at: form.date ? `${form.date}T00:00:00.000Z` : report.createdAt,
      };

      let supabaseId: string | null = null;

      if (report.supabaseId) {
        const { error: updateError } = await supabase
          .from('reports')
          .update(payload)
          .eq('id', report.supabaseId);

        if (updateError) throw updateError;
        supabaseId = report.supabaseId;
      } else {
        const { data: existing, error: checkError } = await supabase
          .from('reports')
          .select('id')
          .eq('local_id', report.localId)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existing) {
          supabaseId = existing.id;
          console.log(`✓ Report already exists in Supabase: ${supabaseId}`);
        } else {
          const { data, error: insertError } = await supabase
            .from('reports')
            .insert([payload])
            .select('id')
            .single();

          if (insertError) throw insertError;
          if (!data) throw new Error('No data returned from insert');

          supabaseId = data.id;
        }
      }

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

      const payload: Record<string, unknown> = {
        local_id: session.localId,
        title: session.title,
        date_time: session.date,
        created_at: session.createdAt,
        location: null,
        target_audience: null,
        objective: null,
        methodology_original: null,
        methodology_reformulated: null,
      };

      try {
        const form = JSON.parse(session.description || '{}');
        payload.location = form.location ?? null;
        payload.target_audience = form.targetAudience ?? null;
        payload.objective = form.objective ?? null;
        payload.methodology_original = form.methodology ?? null;
        payload.methodology_reformulated = form.methodology ?? null;
        payload.date_time = form.dateTime ?? session.date;
      } catch {
        // description n'était pas du JSON valide, on garde les valeurs par défaut
      }

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
          .maybeSingle();

        if (checkError) throw checkError;

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
