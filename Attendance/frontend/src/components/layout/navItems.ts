import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, ClipboardCheck, History } from "lucide-react";

export const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/students", label: "Students", icon: Users },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/history", label: "History", icon: History },
];
