import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      path: "/admin",
      label: "Dashboard",
      icon: <i className="bx bx-bar-chart-alt-2"></i>,
    },

    {
      path: "/admin/alerts",
      label: "Alerts",
      icon: <i className="bx bx-bell"></i>,
    },
    {
      path: "/admin/settings",
      label: "Settings",
      icon: <i className="bx bx-cog"></i>,
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const isActive = (path) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans">
      {/* Sidebar */}
      <aside
        className={`${
          isCollapsed ? "w-15" : "w-64"
        } bg-slate-900 text-slate-300 flex flex-col fixed h-full z-10 shadow-2xl border border-slate-800/50 overflow-y-auto overflow-x-hidden no-scrollbar transition-all duration-300`}
      >
        {/* Logo */}
        <div
          className={`p-4 flex items-center ${
            isCollapsed ? "justify-center cursor-pointer" : "justify-between"
          }`}
          onClick={() => isCollapsed && setIsCollapsed(false)}
        >
          <div className="flex items-center gap-3">
            <div className="drop-shadow-md text-violet-400 shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-droplets w-7 h-7"
              >
                <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"></path>
                <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"></path>
              </svg>
            </div>
            {!isCollapsed && (
              <h1 className="text-white text-lg tracking-wide whitespace-nowrap">
                Admin Panel
              </h1>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-slate-500 hover:text-white transition shrink-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-panel-left-close-icon lucide-panel-left-close"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
                <path d="m16 15-3-3 3-3" />
              </svg>
            </button>
          )}
        </div>

        <div className="px-3 pb-3">
          <div className="h-[0.5px] w-full bg-gray-800" />
        </div>

        {/* Nav Links */}
        <nav className="flex-1 flex flex-col px-4 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group relative flex items-center ${
                  isCollapsed ? "justify-center" : "gap-3 px-3"
                } py-1.5 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden ${
                  active
                    ? "text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {/* Active Background Glow */}
                {active && !isCollapsed && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/10 to-violet-500/40 rounded-xl" />
                )}
                {/* Active Right Glow Border */}
                {active && !isCollapsed && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2/3 w-1 bg-violet-400 rounded-l-full shadow-[0_0_12px_rgba(167,139,250,0.8)]" />
                )}

                <span className="text-[1.1rem] relative z-10 shrink-0">
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span className="relative z-10 whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info & logout */}
        <div
          className={
            isCollapsed ? "mt-auto p-4 flex justify-center" : "mt-auto p-4"
          }
        >
          <div
            className={
              isCollapsed
                ? "flex flex-col items-center gap-2"
                : "bg-gradient-to-br from-slate-800 to-slate-700 p-3 flex-row rounded-2xl border border-slate-800/50 shadow-inner flex items-center justify-between transition relative overflow-hidden"
            }
          >
            <div
              className={`flex items-center ${
                isCollapsed ? "justify-center" : "gap-3"
              } overflow-hidden`}
            >
              <div
                className="w-9 h-9 shrink-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md z-10"
                title={isCollapsed ? user?.full_name : ""}
              >
                {user?.full_name?.charAt(0) || "A"}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 z-10">
                  <p className="text-white text-sm font-semibold truncate leading-tight">
                    {user?.full_name || "Admin"}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className={`w-10 h-10 shrink-0 rounded-xl text-white flex items-center justify-center cursor-pointer hover:text-red-500 transition z-10 ${
                isCollapsed ? "" : "ml-2"
              }`}
              title="Logout"
            >
              <i className="bx bx-log-out text-xl"></i>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`flex-1 ${
          isCollapsed ? "ml-20" : "ml-64"
        } p-4 flex transition-all duration-300`}
      >
        <div className="w-full rounded-3xl overflow-hidden shadow-2xl relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
