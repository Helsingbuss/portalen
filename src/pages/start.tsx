import Header from "../components/Header";
import AdminMenu from "../components/AdminMenu";

export default function Start() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 pt-[60px]"> {/* matcha h-[60px] i Header */}
        <AdminMenu />
        <main className="flex-1 p-6 bg-[#f5f4f0] min-h-screen">
          <h1 className="text-xl font-bold mb-6">Start</h1>
          {/* Här lägger vi senare din startdesign */}
        </main>
      </div>
    </div>
  );
}
