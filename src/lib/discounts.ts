export type DiscountCampaign = {
  id: string;
  name: string;
  label: string | null;
  type: "PERCENT" | "FIXED" | "TWO_FOR_ONE";
  value: number | null;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;   // "YYYY-MM-DD"
  active: boolean;
  trip_id?: string | null;
  ticket_type_id?: number | null;
  min_quantity?: number | null;
  max_quantity?: number | null;
  promo_code?: string | null;
};

export function applyDiscount(
  campaign: DiscountCampaign | null,
  unitPrice: number,
  quantity: number,
  today: string // "YYYY-MM-DD"
) {
  if (!campaign) {
    const total = unitPrice * quantity;
    return { total, discount: 0, label: null };
  }

  // kolla giltighet
  if (
    !campaign.active ||
    today < campaign.start_date ||
    today > campaign.end_date ||
    (campaign.min_quantity && quantity < campaign.min_quantity)
  ) {
    const total = unitPrice * quantity;
    return { total, discount: 0, label: null };
  }

  let total = unitPrice * quantity;
  let discount = 0;

  switch (campaign.type) {
    case "PERCENT": {
      const pct = campaign.value ?? 0;
      discount = (total * pct) / 100;
      break;
    }
    case "FIXED": {
      const val = campaign.value ?? 0;
      discount = Math.min(val, total);
      break;
    }
    case "TWO_FOR_ONE": {
      // Exakt för "Res 2 – betala för 1"
      const payable = Math.ceil(quantity / 2);
      const newTotal = payable * unitPrice;
      discount = total - newTotal;
      total = newTotal;
      break;
    }
  }

  if (discount < 0) discount = 0;
  return {
    total,
    discount,
    label: campaign.label ?? null,
  };
}
