export default function OfferLeftSidebar() {
  /**
   * Tom vit panel (”menyn”) som inte skrollar.
   * Höjd och negativa marginaler styrs från föräldern i OfferInkommen
   * så den ligger tight mot toppraden och botten.
   */
  return (
    <aside className="hidden lg:block h-full">
      <div className="bg-white shadow h-full overflow-hidden rounded-none" />
    </aside>
  );
}
