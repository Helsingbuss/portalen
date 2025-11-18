type Props = { title: string; value: string | number; sub?: string };
export default function StatCard({ title, value, sub }: Props) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-sm text-[#194C66]/70">{title}</div>
      <div className="text-2xl font-semibold text-[#194C66] mt-1">{value}</div>
      {sub && <div className="text-xs text-[#194C66]/60 mt-1">{sub}</div>}
    </div>
  );
}
