// src/pages/widget/departures/[slug].tsx
import { useRouter } from "next/router";
import Head from "next/head";
import DeparturesTable from "@/components/trips/DeparturesTable";

export default function DeparturesWidgetPage() {
  const router = useRouter();
  const { slug } = router.query;
  const slugStr = typeof slug === "string" ? slug : "";

  return (
    <>
      <Head>
        <title>Avgångar – Helsingbuss</title>
        {/* Vi vill inte att widget-index-sidorna indexeras av Google */}
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-transparent">
        {slugStr ? (
          // Ingen extra layout – bara tabellen
          <div className="p-0 m-0">
            <DeparturesTable slug={slugStr} />
          </div>
        ) : (
          <div className="p-4 text-sm text-slate-500">Laddar…</div>
        )}
      </div>
    </>
  );
}
