import Link from "next/link";
import { useRouter } from "next/router";
import { Home, FileText, Ticket, Users, Bus, Wallet, BarChart2 } from "lucide-react";

type Item = { href: string; label: string; icon: React.ElementType };

const items: Item[] = [
  { href: "/admin",                 label: "Översikt",           icon: Home },
  { href: "/admin/offers",          label: "Offert & Bokning",   icon: FileText },
  { href: "/admin/trips",           label: "Resor & Biljetter",  icon: Ticket },
  { href: "/admin/drivers",         label: "Personal",           icon: Users },
  { href: "/admin/vehicles",        label: "Fordonsflotta",      icon: Bus },
  { href: "/admin/finance",         label: "Ekonomi",            icon: Wallet },
  { href: "/admin/overview-status", label: "Överblick & Status", icon: BarChart2 },
];

export default function AdminMenu() {
  const { pathname } = useRouter();
  return (
    <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-white border-r">
      <div className="p-4 text-[#194C66] font-semibold">Helsingbuss Admin</div>
      <nav className="px-2 space-y-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition
              ${active ? "bg-[#194C66] text-white" : "text-[#194C66] hover:bg-[#194C66]/10"}`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[15px]">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
