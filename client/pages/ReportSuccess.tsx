import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Download, Home, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Logo = string;

type ReportState = {
  pdfUrl?: string;
  title?: string;
  logos?: Logo[];
  report?: Record<string, unknown>;
  supabaseId?: string;
};

const valueOf = (report: Record<string, unknown> | undefined, key: string, fallback = "غير محدد") => {
  const value = report?.[key];
  return value === undefined || value === null || value === "" ? fallback : String(value);
};

async function openExternal(url: string) {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url });
      return;
    }
  } catch {
    // @capacitor/browser indisponible (ex: web pur) → fallback ci-dessous
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function ReportSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [debugError, setDebugError] = useState<string | null>(null);
  const state = (location.state as ReportState) || {};
  const report = state.report || {};
  const title = state.title || valueOf(report, "title");
  const logos = state.logos || [];

  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (!reportRef.current) return null;

    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const imgData = canvas.toDataURL("image/jpeg", 0.92);

    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    }

    return pdf.output("blob");
  };

  const uploadPdfToSupabase = async (blob: Blob): Promise<string | null> => {
    const fileName = `${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("report-pdfs")
      .upload(fileName, blob, { contentType: "application/pdf", upsert: false });

    if (uploadError) {
      throw new Error(`Échec upload Storage: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage.from("report-pdfs").getPublicUrl(fileName);
    const publicUrl = publicUrlData?.publicUrl || null;

    const reportId = (state as any).supabaseId as string | undefined;
    const localId = (report as any).localId as string | undefined;

    if (publicUrl) {
      if (reportId) {
        await supabase.from("reports").update({ pdf_url: publicUrl }).eq("id", reportId);
      } else if (localId) {
        await supabase.from("reports").update({ pdf_url: publicUrl }).eq("local_id", localId);
      }
    }

    return publicUrl;
  };

  const downloadPdf = async () => {
    setIsExporting(true);
    setDebugError(null);
    try {
      let url = pdfBlobUrl;
      let blob: Blob | null = null;

      if (!url) {
        blob = await generatePdfBlob();
        if (!blob) {
          setDebugError("Impossible de capturer le contenu du rapport.");
          return;
        }
        url = URL.createObjectURL(blob);
        setPdfBlobUrl(url);
      }

      await openExternal(url);

      if (blob && uploadStatus === "idle") {
        setUploadStatus("uploading");
        uploadPdfToSupabase(blob)
          .then(() => setUploadStatus("done"))
          .catch((err) => {
            console.error("Upload PDF échoué:", err);
            setUploadStatus("error");
          });
      }
    } catch (error: any) {
      console.error("Erreur génération PDF:", error);
      setDebugError(error?.message || String(error));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-col gap-5 rounded-3xl border border-rose-100 bg-rose-50 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8b1e3f] text-white shadow-lg shadow-rose-200">
              <CheckCircle2 size={30} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#8b1e3f]">تم حفظ التقرير بنجاح</p>
              <h1 className="text-2xl font-black text-slate-900">{title}</h1>
              {uploadStatus === "uploading" && (
                <p className="text-xs font-bold text-amber-600">جاري رفع PDF إلى الخادم...</p>
              )}
              {uploadStatus === "done" && (
                <p className="text-xs font-bold text-emerald-600">تم حفظ رابط PDF بنجاح ✓</p>
              )}
              {uploadStatus === "error" && (
                <p className="text-xs font-bold text-red-600">تعذر رفع PDF إلى الخادم (يبقى متاحاً محلياً)</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={downloadPdf} disabled={isExporting} className="gap-2 rounded-xl px-6 py-6 font-black">
              <Download size={18} />
              {isExporting ? "جاري تجهيز PDF..." : pdfBlobUrl ? "فتح PDF" : "تحميل PDF"}
            </Button>
            {pdfBlobUrl && (
              <Button
                onClick={() => openExternal(pdfBlobUrl)}
                variant="outline"
                className="gap-2 rounded-xl px-6 py-6 font-black"
              >
                <ExternalLink size={18} />
                فتح في المتصفح
              </Button>
            )}
          </div>
        </div>

        {debugError && (
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-right" dir="ltr">
            <p className="mb-2 font-black text-red-700">DEBUG ERROR:</p>
            <p className="break-all font-mono text-xs text-red-600">{debugError}</p>
          </div>
        )}

        <div ref={reportRef} dir="rtl" className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl sm:p-8">
          <article className="mx-auto max-w-4xl overflow-hidden bg-white" style={{ pageBreakInside: "avoid" }}>
            <header className="px-6 py-6 text-center text-slate-900 sm:px-12">
              <div className="mb-5 h-1 bg-[#8B0000]" />
              <div className="flex items-center justify-center gap-5">
                {logos[0] ? <img src={logos[0]} alt="الشعار الأيمن" className="h-20 w-20 object-contain" /> : <div className="h-20 w-20" />}
                <div className="min-w-0 flex-1 text-center leading-8">
                  <p className="text-xl font-black">الكشفية الحسنية المغربية</p>
                  <p className="text-base">فرع آسفي مجموعة الأمل</p>
                  <p className="text-base">فوج عمر الفاروق</p>
                </div>
                {logos[1] ? <img src={logos[1]} alt="الشعار الأيسر" className="h-20 w-20 object-contain" /> : <div className="h-20 w-20" />}
              </div>
              <div className="mt-5 h-1 bg-[#8B0000]" />
              <h2 className="mt-7 text-2xl font-black">تقرير حول: {title}</h2>
            </header>

            <div className="px-6 pb-8 sm:px-12">
              <div className="overflow-hidden border border-[#d8c9a9]" style={{ pageBreakInside: "avoid" }}>
                <table className="w-full table-auto border-collapse text-right">
                  <tbody>
                    <TableRow label="الفئة المستهدفة" value={valueOf(report, "beneficiary")} />
                    <TableRow label="المكان" value={valueOf(report, "location")} />
                    <TableRow label="الزمان" value={valueOf(report, "time")} />
                    <TableRow label="الجهة المنظمة" value={valueOf(report, "category")} />
                    <TableRow label="عدد المشاركين" value={`${valueOf(report, "participants_boys", "0")} ذكور | ${valueOf(report, "participants_girls", "0")} إناث | ${valueOf(report, "leaders_count", "0")} قادة`} />
                    <TableRow label="الهدف من النشاط" value={valueOf(report, "objective")} />
                    <TableRow label="سير النشاط" value={valueOf(report, "description")} />
                    <TableRow label="النقاط الإيجابية" value={valueOf(report, "evaluationPositive")} />
                    <TableRow label="النقاط السلبية" value={valueOf(report, "evaluationNegative")} />
                    <TableRow label="التوصيات" value={valueOf(report, "recommendations")} />
                  </tbody>
                </table>
              </div>
              <footer className="mt-6 border-t border-slate-200 pt-5 text-center text-xs font-bold text-slate-400" style={{ pageBreakInside: "avoid" }}>
                تم إنشاء هذا التقرير بواسطة نظام إدارة التقارير - الكشفية الحسنية المغربية
              </footer>
            </div>
          </article>
        </div>

        <div className="flex flex-col justify-between gap-4 sm:flex-row">
          <button onClick={() => navigate("/dashboard")} className="flex items-center justify-center gap-2 font-black text-slate-400 transition hover:text-[#5b2a86]"><Home size={17} /> العودة إلى لوحة القيادة</button>
          <button onClick={() => navigate("/add-report")} className="flex items-center justify-center gap-2 font-black text-[#5b2a86] transition hover:text-[#8b1e3f]"><ArrowRight size={17} /> إنشاء تقرير آخر</button>
        </div>
      </div>
    </Layout>
  );
}

function TableRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-[#d8c9a9] last:border-b-0" style={{ pageBreakInside: "avoid" }}>
      <th className="whitespace-nowrap bg-[#f5e6c8] px-4 py-3 align-middle text-sm font-black text-[#5f4a2b]">{label}</th>
      <td className="whitespace-pre-wrap break-words bg-white px-4 py-3 text-center text-sm font-medium leading-7 text-slate-700" style={{ overflowWrap: "anywhere" }}>{value}</td>
    </tr>
  );
}
