import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function CommunityLayout() {
  const { isAdmin } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    {
      path: "/",
      label: "Dashboard",
      icon: <i className="bx bx-bar-chart-alt-2"></i>,
    },
    { path: "/alerts", label: "Alerts", icon: <i className="bx bx-bell"></i> },
    {
      path: "/history",
      label: "History",
      icon: <i className="bx bx-history"></i>,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans relative">
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${isCollapsed ? "w-15" : "w-64"} ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } bg-slate-900 text-slate-300 flex flex-col fixed h-full z-40 shadow-2xl border border-slate-800/50 overflow-y-auto overflow-x-hidden no-scrollbar transition-all duration-300`}
      >
        {/* Logo */}
        <div
          className={`p-4 flex items-center ${
            isCollapsed ? "justify-center cursor-pointer" : "justify-between"
          }`}
          onClick={() => isCollapsed && setIsCollapsed(false)}
        >
          <div className="flex items-center gap-3">
            <div className="drop-shadow-md text-cyan-400 shrink-0">
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
                FloodWatch
              </h1>
            )}
          </div>
          {!isCollapsed && (
            <>
              {/* Desktop Collapse Button */}
              <button
                onClick={() => setIsCollapsed(true)}
                className="hidden md:block text-slate-500 hover:text-white transition shrink-0"
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
              {/* Mobile Close Button */}
              <button
                onClick={() => setIsMobileOpen(false)}
                className="md:hidden text-slate-500 hover:text-white transition shrink-0"
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
            </>
          )}
        </div>
        <div className="px-3 pb-3">
          <div className="h-[0.5px]  w-full bg-gray-800" />
        </div>

        {/* Nav Links */}
        <nav className="flex-1 flex flex-col px-4 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
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
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-cyan-500/40 rounded-xl" />
                )}
                {/* Active Right Glow Border */}
                {active && !isCollapsed && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2/3 w-1 bg-cyan-400 rounded-l-full shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
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

        {/* Admin Card */}
        <div
          className={
            isCollapsed ? "mt-auto p-4 flex justify-center" : "mt-auto p-4"
          }
        >
          <div
            className={
              isCollapsed
                ? "flex justify-center"
                : "bg-gradient-to-b from-slate-800 to-slate-900 p-4 rounded-2xl border border-slate-800/50 shadow-lg flex flex-col gap-3 relative overflow-hidden"
            }
          >
            {!isCollapsed && (
              <>
                {/* Subtle glow effect behind card */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

                <div className="flex items-center gap-2 text-white font-semibold text-sm whitespace-nowrap">
                  <span className="text-cyan-400 text-lg flex items-center">
                    <i className="bx bx-shield"></i>
                  </span>
                  {isAdmin ? "Admin Dashboard" : "System Admin"}
                </div>
                <p className="text-[#8a9db0] text-xs leading-relaxed">
                  {isAdmin
                    ? "Manage alerts, and system configuration directly."
                    : "Access restricted. Log in to manage settings."}
                </p>
              </>
            )}

            {isAdmin ? (
              <Link
                to="/admin"
                className={
                  isCollapsed
                    ? "w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white flex justify-center items-center shadow-lg shadow-cyan-500/20 hover:opacity-90 transition z-10"
                    : "w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-medium flex justify-center items-center shadow-lg shadow-cyan-500/20 hover:opacity-90 transition z-10"
                }
                title={isCollapsed ? "Go to Panel" : ""}
              >
                {isCollapsed ? (
                  <i className="bx bx-shield text-xl"></i>
                ) : (
                  "Go to Panel"
                )}
              </Link>
            ) : (
              <Link
                to="/admin/login"
                className={
                  isCollapsed
                    ? "w-10 h-10 rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 text-white flex justify-center items-center shadow-md border border-slate-700 hover:bg-slate-700 transition z-10"
                    : "w-full py-2.5 rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 text-white text-sm font-medium flex justify-center items-center shadow-md border border-slate-700 hover:bg-slate-700 transition z-10"
                }
                title={isCollapsed ? "Admin Login" : ""}
              >
                {isCollapsed ? (
                  <i className="bx bx-shield text-xl"></i>
                ) : (
                  "Admin Login"
                )}
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`flex-1 flex flex-col ${
          isCollapsed ? "md:ml-20" : "md:ml-64"
        } ml-0 p-4 flex transition-all duration-300 relative`}
      >
        {/* Mobile Header (In document flow) */}
        {!isMobileOpen && (
          <div className="md:hidden flex justify-between items-center w-full pb-4 px-2">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="text-white/90 hover:text-white"
            >
              <i className="bx bx-menu text-3xl"></i>
            </button>
            <div className="text-[13px] tracking-wide font-medium text-white/90">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
        )}

        <div className="w-full rounded-3xl overflow-hidden shadow-2xl relative min-h-[calc(100vh-2rem)] md:min-h-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
