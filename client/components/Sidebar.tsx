import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  X,
  LayoutDashboard,
  FileText,
  FilePlus2,
  CalendarPlus,
  HardDriveDownload,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { to: "/dashboard", label: "لوحة القيادة", icon: LayoutDashboard },
  { to: "/reports", label: "التقارير والحصص", icon: FileText },
  { to: "/add-report", label: "إضافة تقرير", icon: FilePlus2 },
  { to: "/add-session", label: "إضافة حصة", icon: CalendarPlus },
  { to: "/sync-cache", label: "المخزن المحلي", icon: HardDriveDownload },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Ferme automatiquement le menu à chaque changement de page.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    onClose();
    navigate("/login");
  };

  return (
    <>
      {/* Overlay sombre derrière le menu, ferme au clic */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Panneau latéral (RTL : s'ouvre depuis la droite) */}
      <aside
        dir="rtl"
        className={`fixed top-0 right-0 z-50 h-full w-80 max-w-[85vw] bg-white shadow-2xl transition-transform duration-300 flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 relative overflow-hidden rounded-full border-2 border-primary/10 p-1">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2Fd8cf247061ae4e73b8c8529275e40675%2F1e55c030693d429b8a71a3a705492b5e?format=webp&width=800&height=1200"
                alt="Logo SHM"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-black text-sm shm-text-gradient uppercase tracking-tight">
              القائمة
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all"
            aria-label="إغلاق القائمة"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                  active
                    ? "shm-gradient text-white shadow-md shadow-primary/20"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-5 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-[#8b1e3f] hover:bg-rose-50 transition-all"
          >
            <LogOut size={18} />
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  );
}
