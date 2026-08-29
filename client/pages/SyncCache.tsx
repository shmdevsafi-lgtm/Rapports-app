import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { offlineStorage, StoredReport, StoredSession } from "@/lib/storage/offlineStorage";
import { syncManager } from "@/lib/sync/syncManager";
import { RefreshCw, UploadCloud, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export default function SyncCache() {
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(offlineStorage.isOnline());

  const loadCache = useCallback(async () => {
    setLoading(true);
    try {
      const [allReports, allSessions] = await Promise.all([
        offlineStorage.getAllReports(),
        offlineStorage.getAllSessions(),
      ]);
      setReports(allReports.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setSessions(allSessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCache();
    const unsubscribe = offlineStorage.onlineListener((online) => setIsOnline(online));
    return unsubscribe;
  }, [loadCache]);

  const handlePushAll = async () => {
    setSyncing(true);
    try {
      await syncManager.syncAll();
    } finally {
      setSyncing(false);
      await loadCache();
    }
  };

  const pendingCount =
    reports.filter((r) => r.syncStatus !== "synced").length +
    sessions.filter((s) => s.syncStatus !== "synced").length;

  return (
    <Layout>
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-3 text-4xl font-black shm-text-gradient uppercase tracking-wider">
           مساحة تخزين البيانات 
          </h1>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
                isOnline ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
              }`}
            >
              
            {pendingCount > 0 && (
              <span className="text-xs font-black text-gray-400">{pendingCount} عنصر بانتظار المزامنة</span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={loadCache} variant="outline" className="gap-2 rounded-xl font-black" disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            تحديث
          </Button>
          <Button onClick={handlePushAll} className="gap-2 rounded-xl font-black" disabled={syncing || pendingCount === 0}>
            <UploadCloud size={16} className={syncing ? "animate-pulse" : ""} />
            {syncing ? "جاري الإرسال..." : "دفع الكل الآن"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="h-14 w-14 animate-spin rounded-full border-b-4 border-primary" />
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 text-lg font-black text-gray-700">التقارير ({reports.length})</h2>
            {reports.length === 0 ? (
              <EmptyState label="لا توجد تقارير في المخزن المحلي" />
            ) : (
              <div className="space-y-3">
                {reports.map((r) => (
                  <CacheRow key={r.id} title={r.title} createdAt={r.createdAt} status={r.syncStatus} errorMessage={r.errorMessage} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-lg font-black text-gray-700">الحصص ({sessions.length})</h2>
            {sessions.length === 0 ? (
              <EmptyState label="لا توجد حصص في المخزن المحلي" />
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => (
                  <CacheRow key={s.id} title={s.title} createdAt={s.createdAt} status={s.syncStatus} errorMessage={s.errorMessage} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Layout>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-[2rem] border-2 border-dashed border-gray-100 bg-white py-16 text-center">
      <p className="font-black uppercase tracking-[0.15em] text-gray-300">{label}</p>
    </div>
  );
}

function CacheRow({
  title,
  createdAt,
  status,
  errorMessage,
}: {
  title: string;
  createdAt: string;
  status: "pending" | "synced" | "failed";
  errorMessage?: string;
}) {
  const badge =
    status === "synced" ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600">
        <CheckCircle2 size={14} /> تمت المزامنة
      </span>
    ) : status === "failed" ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">
        <AlertCircle size={14} /> فشلت المزامنة
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-600">
        <Clock size={14} /> بانتظار الإرسال
      </span>
    );

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="min-w-0 flex-1 text-right">
        <p className="truncate font-black text-gray-800">{title || "بدون عنوان"}</p>
        <p className="text-xs font-bold text-gray-400">{new Date(createdAt).toLocaleString("ar-MA")}</p>
        {status === "failed" && errorMessage && (
          <p className="mt-1 break-all text-[10px] font-mono text-red-400">{errorMessage}</p>
        )}
      </div>
      {badge}
    </div>
  );
      }
