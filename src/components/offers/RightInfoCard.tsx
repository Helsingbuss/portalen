type Row = { label: string; value?: string | null };

export default function RightInfoCard({
  title = "Kunduppgifter",
  rows = [],
}: {
  title?: string;
  rows: Row[];
}) {
  const v = (x: any, f = "—") =>
    x === null || x === undefined || x === "" ? f : String(x);

  return (
    <div className="p-4 md:p-5 lg:p-6">
      <div className="inline-flex items-center rounded-full bg-[#e5eef3] px-3 py-1 text-sm text-[#194C66] mb-3">
        {title}
      </div>

      <div className="space-y-2 text-[14px]">
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-[#0f172a]/70 font-medium min-w-[110px]">
              {r.label}
            </span>
            <span className="text-[#0f172a]">{v(r.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
