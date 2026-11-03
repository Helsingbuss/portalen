// src/components/Header.tsx
import React, { useState, ReactNode, useRef, useEffect } from "react";
import Image from "next/image";
import { ChevronDownIcon, PlusIcon } from "@heroicons/react/24/outline";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import Link from "next/link";

type HeaderProps = {
  profile?: {
    full_name?: string | null;
    company_name?: string | null;
    title?: string | null;
    employee_number?: string | null;
  };
};

type InquiryNotification = {
  id: string;
  inquiryNumber: string;
  customerName: string;
  pickupAddress: string;
  destinationAddress: string;
  passengers: number | null;
  createdAt: string | null;
};

export default function Header({ profile }: HeaderProps) {
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);

  const [notifications, setNotifications] =
    useState<InquiryNotification[]>([]);

  const [seenNotificationIds, setSeenNotificationIds] =
    useState<string[]>([]);

  const [notificationsLoading, setNotificationsLoading] =
    useState(false);

  const [notificationsError, setNotificationsError] =
    useState("");

  const router = useRouter();

  const dropdownRef = useRef<HTMLDivElement>(null);

  const userName = profile?.full_name ?? "Andreas EkelÃ¶f";
  const companyName = profile?.title ?? profile?.company_name ?? "Helsingbuss";
  const employeeNumber = profile?.employee_number ?? "â€”";

  const togglePanel = (panel: string) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // ðŸ”¥ CLICK OUTSIDE
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setCreateMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    try {
      const stored =
        window.localStorage.getItem(
          "helsingbuss_seen_inquiry_notifications",
        );

      if (!stored) return;

      const parsed = JSON.parse(stored);

      if (Array.isArray(parsed)) {
        setSeenNotificationIds(
          parsed.filter(
            (value): value is string =>
              typeof value === "string",
          ),
        );
      }
    } catch {
      // LocalStorage får aldrig stoppa portalen.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      try {
        setNotificationsLoading(true);

        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!session?.access_token) {
          if (!cancelled) {
            setNotifications([]);
          }

          return;
        }

        const response =
          await fetch(
            "/api/admin/inquiries/notifications",
            {
              method: "GET",
              cache: "no-store",
              headers: {
                Authorization:
                  `Bearer ${session.access_token}`,
              },
            },
          );

        const json =
          await response
            .json()
            .catch(() => ({}));

        if (
          !response.ok ||
          json?.ok === false
        ) {
          throw new Error(
            json?.error ||
            "Kunde inte hämta notiser.",
          );
        }

        if (!cancelled) {
          setNotifications(
            Array.isArray(
              json?.notifications,
            )
              ? json.notifications
              : [],
          );

          setNotificationsError("");
        }

      } catch (error) {

        if (!cancelled) {
          setNotificationsError(
            error instanceof Error
              ? error.message
              : "Kunde inte hämta notiser.",
          );
        }

      } finally {

        if (!cancelled) {
          setNotificationsLoading(false);
        }
      }
    }

    loadNotifications();

    const interval =
      window.setInterval(
        loadNotifications,
        30000,
      );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (
      activePanel !== "notifications" ||
      notifications.length === 0
    ) {
      return;
    }

    setSeenNotificationIds(
      (previous) => {
        const next =
          new Set(previous);

        notifications.forEach(
          (notification) => {
            next.add(notification.id);
          },
        );

        const values =
          Array.from(next).slice(-100);

        try {
          window.localStorage.setItem(
            "helsingbuss_seen_inquiry_notifications",
            JSON.stringify(values),
          );
        } catch {
          // Ignorera localStorage-fel.
        }

        return values;
      },
    );
  }, [
    activePanel,
    notifications,
  ]);

  const unreadNotificationCount =
    notifications.filter(
      (notification) =>
        !seenNotificationIds.includes(
          notification.id,
        ),
    ).length;

  return (
    <>
      {/* TOPBAR */}
      <header className="bg-white border-b border-gray-200 px-6 h-[60px] flex justify-between items-center fixed top-0 left-0 right-0 z-50">

        {/* LOGO */}
        <div className="flex items-center">
          <Image src="/mork_logo.png" alt="Helsingbuss" width={200} height={100} />
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-3">

          {/* Butik */}
          <button className="text-xs px-3 py-1.5 rounded-md border border-gray-300 bg-gray-50 hover:bg-gray-100">
            Butik/kassa
          </button>

          {/* ðŸ”¥ SNABBVAL */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setCreateMenuOpen(!createMenuOpen)}
              className="text-xs px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 flex items-center gap-1"
            >
              <PlusIcon className="w-4 h-4" />
              Snabbval
            </button>

            {/* ðŸ”¥ ANIMERAD DROPDOWN */}
            <div
              className={`absolute right-0 mt-2 w-64 bg-white shadow-lg rounded-xl border z-50 py-2 transform transition-all duration-200 ease-out ${
                createMenuOpen
                  ? "opacity-100 translate-y-0 scale-100"
                  : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
              }`}
            >

              {/* SÃ„LJ */}
              <div className="text-[10px] text-gray-400 px-4 mb-1">SÃ¤lj</div>
              <Link href="#" className="block px-4 py-2 text-sm hover:bg-gray-50">Skapa offert</Link>
              <Link href="#" className="block px-4 py-2 text-sm hover:bg-gray-50">Skapa bokning</Link>

              {/* RESOR */}
              <div className="text-[10px] text-gray-400 px-4 mt-2 mb-1">Resor</div>
              <Link href="#" className="block px-4 py-2 text-sm hover:bg-gray-50">Skapa resa</Link>
              <Link href="#" className="block px-4 py-2 text-sm hover:bg-gray-50">Boka biljett</Link>
              <Link href="#" className="block px-4 py-2 text-sm hover:bg-gray-50">Skapa avgÃ¥ng</Link>

              {/* DRIFT */}
              <div className="text-[10px] text-gray-400 px-4 mt-2 mb-1">Drift</div>
              <Link href="#" className="block px-4 py-2 text-sm hover:bg-gray-50">Skapa kÃ¶rorder</Link>

              {/* CRM */}
              <div className="text-[10px] text-gray-400 px-4 mt-2 mb-1">Kunder</div>
              <Link href="#" className="block px-4 py-2 text-sm hover:bg-gray-50">LÃ¤gg till kund</Link>

            </div>
          </div>

          {/* IKONER */}
          <div className="flex items-center gap-2 ml-2">
            <TopIcon src="/data-report.svg" onClick={() => togglePanel("reports")} />
            <TopIcon src="/note-sticky.svg" onClick={() => togglePanel("notes")} />
            <div className="relative">
              <TopIcon
                src="/bell.svg"
                onClick={() =>
                  togglePanel(
                    "notifications",
                  )
                }
              />

              {unreadNotificationCount > 0 && (
                <span
                  className="
                    pointer-events-none
                    absolute
                    -right-1
                    -top-1
                    flex
                    h-[18px]
                    min-w-[18px]
                    items-center
                    justify-center
                    rounded-full
                    bg-red-600
                    px-1
                    text-[10px]
                    font-bold
                    text-white
                    shadow-sm
                  "
                >
                  {unreadNotificationCount > 9
                    ? "9+"
                    : unreadNotificationCount}
                </span>
              )}
            </div>
            <TopIcon src="/Comment-info.svg" onClick={() => togglePanel("help")} />
          </div>

          {/* PROFIL */}
          <button
            onClick={() => togglePanel("account")}
            className="flex items-center gap-2 ml-3 pl-3 border-l border-gray-200"
          >
            <img src="/User.svg" className="w-[18px] h-[18px] opacity-80" />

            <div className="text-right leading-tight">
              <div className="text-sm font-medium text-gray-800">{userName}</div>
              <div className="text-xs text-gray-500">{companyName}</div>
            </div>

            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </header>

      {/* PANELER */}
      {activePanel && (
        <div className="fixed top-[60px] right-0 bottom-0 w-full max-w-sm bg-white shadow-xl border-l z-40">

          {activePanel === "reports" && (
            <Panel title="Rapporter" onClose={() => setActivePanel(null)} />
          )}

          {activePanel === "notes" && (
            <Panel title="Anteckningar" onClose={() => setActivePanel(null)} />
          )}

          {activePanel === "notifications" && (
            <NotificationPanel
              notifications={notifications}
              loading={notificationsLoading}
              error={notificationsError}
              onClose={() =>
                setActivePanel(null)
              }
            />
          )}

          {activePanel === "account" && (
            <AccountPanel
              onClose={() => setActivePanel(null)}
              userName={userName}
              companyName={companyName}
              employeeNumber={employeeNumber}
              onLogout={handleLogout}
            />
          )}
        </div>
      )}
    </>
  );
}

/* ---------- ICON ---------- */
function TopIcon({ src, onClick }: { src: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
    >
      <img src={src} className="w-[18px] h-[18px] opacity-80" />
    </button>
  );
}

/* ---------- PANEL ---------- */
function Panel({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex justify-between">
        <span className="font-semibold text-sm">{title}</span>
        <button onClick={onClose} className="text-xs text-gray-500">
          StÃ¤ng
        </button>
      </div>

      <div className="p-4 text-sm text-gray-500">
        InnehÃ¥ll kommer hÃ¤r...
      </div>
    </div>
  );
}

/* ---------- NOTIFICATION PANEL ---------- */

function NotificationPanel({
  notifications,
  loading,
  error,
  onClose,
}: {
  notifications: InquiryNotification[];
  loading: boolean;
  error: string;
  onClose: () => void;
}) {
  function formatDate(
    value: string | null,
  ) {
    if (!value) {
      return "Nyss";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return "Ny";
    }

    return date.toLocaleString(
      "sv-SE",
      {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      },
    );
  }

  return (
    <div className="flex h-full flex-col">

      <div className="flex items-start justify-between border-b p-4">
        <div>
          <div className="text-sm font-semibold text-[#1D2937]">
            Notifieringar
          </div>

          <div className="mt-0.5 text-[11px] text-gray-500">
            Helsingbuss beställningstrafik
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-xs text-gray-500"
        >
          Stäng
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">

        {loading &&
          notifications.length === 0 && (
            <div className="p-5 text-sm text-gray-500">
              Hämtar notifieringar...
            </div>
          )}

        {!!error && (
          <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          notifications.length === 0 && (
            <div className="p-8 text-center">

              <div className="text-sm font-semibold text-[#1D2937]">
                Inga nya notifieringar
              </div>

              <div className="mt-1 text-xs text-gray-500">
                Nya offertförfrågningar visas här automatiskt.
              </div>

            </div>
          )}

        {notifications.map(
          (notification) => (
            <Link
              key={notification.id}
              href="/admin/bestallningstrafik/forfragningar"
              onClick={onClose}
              className="
                block
                border-b
                border-gray-100
                px-4
                py-4
                transition
                hover:bg-[#F8FAF9]
              "
            >

              <div className="flex items-start justify-between gap-3">

                <div className="min-w-0">

                  <div className="text-[11px] font-bold uppercase tracking-wide text-[#007764]">
                    Ny förfrågan
                  </div>

                  <div className="mt-0.5 text-sm font-semibold text-[#1D2937]">
                    {notification.inquiryNumber}
                  </div>

                </div>

                <div className="shrink-0 text-[10px] text-gray-400">
                  {formatDate(
                    notification.createdAt,
                  )}
                </div>

              </div>

              <div className="mt-2 text-xs font-medium text-gray-700">
                {notification.customerName}
              </div>

              <div className="mt-1 text-xs leading-5 text-gray-500">
                {notification.pickupAddress}
                {" → "}
                {notification.destinationAddress}
              </div>

              {notification.passengers !== null && (
                <div className="mt-1 text-[11px] text-gray-400">
                  {notification.passengers} resenärer
                </div>
              )}

            </Link>
          ),
        )}

      </div>

      <div className="border-t bg-gray-50 p-4">

        <Link
          href="/admin/bestallningstrafik/forfragningar"
          onClick={onClose}
          className="
            block
            w-full
            rounded-lg
            bg-[#007764]
            px-4
            py-2.5
            text-center
            text-xs
            font-semibold
            text-white
            transition
            hover:bg-[#006A59]
          "
        >
          Visa alla förfrågningar
        </Link>

      </div>

    </div>
  );
}
/* ---------- ACCOUNT PANEL ---------- */
function AccountPanel({
  onClose,
  userName,
  companyName,
  employeeNumber,
  onLogout,
}: {
  onClose: () => void;
  userName: string;
  companyName: string;
  employeeNumber: string;
  onLogout: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex justify-between">
        <span className="font-semibold text-sm">{userName}</span>
        <button onClick={onClose} className="text-xs text-gray-500">
          StÃ¤ng
        </button>
      </div>

      <div className="p-4 space-y-3 text-sm text-gray-800">
        <div>
          <p className="font-medium">{userName}</p>
          <p className="text-xs text-gray-500">{companyName}</p>

          <p className="mt-1 text-xs text-gray-500">
            AnstÃ¤llningsnr: {employeeNumber}
          </p>
        </div>

        <button
          onClick={onLogout}
          className="w-full mt-3 px-3 py-2 text-xs border border-red-300 text-red-600 rounded-md hover:bg-red-50"
        >
          Logga ut
        </button>
      </div>
    </div>
  );
}
