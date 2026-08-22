import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Download, Home, ExternalLink } from "lucide-react";

type Logo = string;

type ReportState = {
  pdfUrl?: string;
  title?: string;
  logos?: Logo[];
  report?: Record<string, unknown>;
};

const valueOf = (report: Record<string, unknown> | undefined, key: string, fallback = "غير محدد") => {
  const value = report?.[key];
  return value === undefined || value === null || value === "" ? fallback : String(value);
};

export default function ReportSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const state = (location.state as ReportState) || {};
  const report = state.report || {};
  const title = state.title || valueOf(report, "title");
  const logos = state.logos || [];

  const generatePdfBlob = async (): Promise<string | null> => {
    if (!reportRef.current) return null;
    const reportElement = reportRef.current;
    const originalWidth = reportElement.style.width;
    const originalTransform = reportElement.style.transform;
    const originalTransformOrigin = reportElement.style.transformOrigin;

    try {
      reportElement.style.width = "794px";
      reportElement.style.transform = "scale(0.75)";
      reportElement.style.transformOrigin = "top left";
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const canvas = await html2canvas(reportElement, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 794,
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");

      // Blob + URL locale : fonctionne de façon fiable même dans la
      // WebView Android (contrairement à pdf.save() qui déclenche un
      // téléchargement natif souvent silencieusement bloqué dans l'APK).
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      return url;
    } finally {
      reportElement.style.width = originalWidth;
      reportElement.style.transform = originalTransform;
      reportElement.style.transformOrigin = originalTransformOrigin;
    }
  };

  const downloadPdf = async () => {
    setIsExporting(true);
    try {
      const url = pdfBlobUrl || (await generatePdfBlob());
      if (!url) return;
      if (!pdfBlobUrl) setPdfBlobUrl(url);

      // Ouvre le PDF dans le navigateur (nouvel onglet sur le web,
      // navigateur système via Capacitor dans l'APK) au lieu de
      // forcer un téléchargement natif qui échoue silencieusement
      // dans la WebView Android.
      window.open(url, "_blank", "noopener,noreferrer");
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
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={downloadPdf} disabled={isExporting} className="gap-2 rounded-xl px-6 py-6 font-black">
              <Download size={18} />
              {isExporting ? "جاري تجهيز PDF..." : "تحميل PDF"}
            </Button>
            {pdfBlobUrl && (
              <Button
                onClick={() => window.open(pdfBlobUrl, "_blank", "noopener,noreferrer")}
                variant="outline"
                className="gap-2 rounded-xl px-6 py-6 font-black"
              >
                <ExternalLink size={18} />
                فتح في المتصفح
              </Button>
            )}
          </div>
        </div>

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
