import {
  UserIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  TicketIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";

export default function QuickActionsMenu() {
  return (
    <div className="py-2">
      <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left text-sm">
        <UserIcon className="h-5 w-5 text-gray-600" />
        Skapa ny offert
      </button>

      <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left text-sm">
        <ClipboardDocumentListIcon className="h-5 w-5 text-gray-600" />
        Boka ny bokning
      </button>

      <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left text-sm">
        <UsersIcon className="h-5 w-5 text-gray-600" />
        Skapa körorder
      </button>

      <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left text-sm">
        <TicketIcon className="h-5 w-5 text-gray-600" />
        Boka biljetter
      </button>

      <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left text-sm">
        <BuildingOfficeIcon className="h-5 w-5 text-gray-600" />
        Lägg upp resor
      </button>
    </div>
  );
}
