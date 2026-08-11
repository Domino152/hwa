import { NavLink } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "./navItems";

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-foreground/10">
        <GraduationCap className="h-8 w-8" />
        <div>
          <h1 className="font-bold text-lg">College ERP</h1>
          <p className="text-xs text-sidebar-foreground/60">Attendance Module</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-4 border-t border-sidebar-foreground/10">
        <p className="text-xs text-sidebar-foreground/40">v1.0.0</p>
      </div>
    </aside>
  );
}
