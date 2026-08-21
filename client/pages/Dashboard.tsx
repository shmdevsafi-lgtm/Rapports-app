import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-black shm-text-gradient mb-4">
            لوحة القيادة
          </h2>
          <div className="w-24 h-1.5 shm-gradient mx-auto rounded-full"></div>
          <p className="mt-6 text-gray-500 font-medium uppercase tracking-widest text-sm">
            مرحباً بك في نظام تسيير التقارير و الحصص
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl px-6">
          <button
            onClick={() => navigate("/add-report")}
            className="flex-1 shm-card group hover:-translate-y-2"
          >
            <div className="w-16 h-16 shm-gradient text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
              <span className="text-3xl">📄</span>
            </div>
            <h3 className="text-2xl font-black text-gray-800 mb-2">إضافة تقرير</h3>
            <p className="text-gray-400 text-sm font-medium">نموذج SHM A4 الرسمي</p>
          </button>

          <button
            onClick={() => navigate("/add-session")}
            className="flex-1 shm-card group hover:-translate-y-2"
          >
            <div className="w-16 h-16 shm-gradient text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
              <span className="text-3xl">📝</span>
            </div>
            <h3 className="text-2xl font-black text-gray-800 mb-2">إضافة حصة</h3>
            <p className="text-gray-400 text-sm font-medium">طريقة 5W البيداغوجية</p>
          </button>

          <button
            onClick={() => navigate("/reports")}
            className="flex-1 shm-card group hover:-translate-y-2 bg-gray-50 border-gray-100"
          >
            <div className="w-16 h-16 bg-white border border-gray-100 text-gray-800 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
              <span className="text-3xl">📂</span>
            </div>
            <h3 className="text-2xl font-black text-gray-800 mb-2">الوثائق</h3>
            <p className="text-gray-400 text-sm font-medium">عرض و تحميل الملفات</p>
          </button>
        </div>

      </div>
    </Layout>
  );
}
