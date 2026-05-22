import { supabase } from "../lib/supabase";

export type VehicleSaveInput = {
  id?: string;
  vehicleCode: string;
  registrationNumber?: string;
  brand?: string;
  model?: string;
  vehicleType?: string;
  mileageKm?: number;
  nextServiceKm?: number;
  status?: string;
  notes?: string;
};

export type DriverSaveInput = {
  id?: string;
  fullName: string;
  email?: string;
  phone?: string;
  currentAssignment?: string;
  status?: string;
};

export async function saveVehicle(input: VehicleSaveInput) {
  const payload = {
    vehicle_code: input.vehicleCode.trim(),
    registration_number: input.registrationNumber?.trim() || null,
    brand: input.brand?.trim() || null,
    model: input.model?.trim() || null,
    vehicle_type: input.vehicleType?.trim() || null,
    mileage_km: Number(input.mileageKm || 0),
    next_service_km:
      input.nextServiceKm !== undefined && input.nextServiceKm !== null
        ? Number(input.nextServiceKm)
        : null,
    status: input.status || "available",
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("vehicles")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from("vehicles")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function saveDriver(input: DriverSaveInput) {
  const payload = {
    full_name: input.fullName.trim(),
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    current_assignment: input.currentAssignment?.trim() || null,
    status: input.status || "available",
    role: "driver",
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("drivers")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from("drivers")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
