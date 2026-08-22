/**
 * Gestionnaire de synchronisation ROBUSTE
 * - Retry automatique
 * - Idempotence (pas de doublons) via la colonne local_id
 * - Gestion des conflits
 * - Queue de sync fiable
 *
 * IMPORTANT: les payloads envoyés à Supabase utilisent les VRAIS noms
 * de colonnes des tables `reports` et `sessions` (voir schema_export.sql).
 * Le contenu complet du formulaire est stocké en JSON dans le champ
 * `content` d'offlineStorage, puis désérialisé ici avant l'envoi.
 */

import { supabase } from '../supabase';
import { offlineStorage, StoredReport, StoredSession } from '../storage/offlineStorage';

// Extrait un message lisible d'une erreur Supabase (objet PostgREST
// avec .message/.details/.hint) ou d'une Error classique. String(err)
// sur un objet donne littéralement "[object Object]" — à éviter.
function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    const parts = [e.message, e.details, e.hint, e.code].filter(Boolean);
    if (parts.length > 0) return parts.join(' | ');
    try {
      return JSON.stringify(error);
    } catch {
      return 'Erreur inconnue (objet non sérialisable)';
    }
  }
  return String(error);
}

// Convertit une valeur de <input type="datetime-local"> ("2026-08-21T17:20",
// sans secondes ni timezone) en ISO 8601 complet accepté par une
// colonne timestamptz. Passe telle quelle toute valeur déjà complète.
function normalizeDateTime(value: unknown): string | null {
  if (!value || typeof value !== 'string') return null;
  if (/Z$|[+-]\d{2}:\d{2}$/.test(value)) return value; // déjà avec timezone
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return `${value}:00.000Z`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) return `${value}.000Z`;
  return value;
}

// Extrait la partie "YYYY-MM-DD" d'une valeur datetime-local ou ISO,
// pour la colonne `date` (type `date`, NOT NULL) distincte de
// `date_time` (timestamptz) dans la table sessions.
function extractDatePart(value: unknown): string | null {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

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
      const errorMsg = describeError(error);
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
        // `date` est NOT NULL dans la table sessions (type `date`,
        // distinct de `date_time`) : on la dérive systématiquement,
        // avec un repli sur aujourd'hui si aucune date exploitable.
        date: extractDatePart(session.date) || new Date().toISOString().slice(0, 10),
        created_at: session.createdAt,
        location: null,
        target_audience: null,
        objective: null,
        methodology_original: null,
        methodology_reformulated: null,
      };

      // Le détail complet du formulaire (location, target_audience,
      // objective, methodology...) est sérialisé en JSON dans
      // `description` par AddSession.tsx pour ne rien perdre offline.
      try {
        const form = JSON.parse(session.description || '{}');
        payload.location = form.location ?? null;
        payload.target_audience = form.targetAudience ?? null;
        payload.objective = form.objective ?? null;
        payload.methodology_original = form.methodology ?? null;
        payload.methodology_reformulated = form.methodology ?? null;
        // datetime-local donne "2026-08-21T17:20" (sans secondes ni
        // timezone) — pas un ISO 8601 complet. On le complète pour
        // que la colonne timestamptz l'accepte de façon fiable.
        const rawDateTime = form.dateTime ?? session.date;
        payload.date_time = normalizeDateTime(rawDateTime);
        payload.date = extractDatePart(rawDateTime) || (payload.date as string);
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
      const errorMsg = describeError(error);
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
