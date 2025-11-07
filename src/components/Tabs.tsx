// components/Tabs.tsx
type Tab = { key: string; label: string; href: string };
export default function Tabs({ tabs, active }: { tabs: Tab[]; active: string }) {
  return (
    <div className="flex gap-2 border-b">
      {tabs.map(t => (
        <a
          key={t.key}
          href={t.href}
          className={`px-3 py-2 rounded-t ${active===t.key ? "bg-white border-x border-t" : "text-[#194C66]/70 hover:text-[#194C66]"}`}
          aria-current={active===t.key ? "page" : undefined}
        >
          {t.label}
        </a>
      ))}
    </div>
  );
}
