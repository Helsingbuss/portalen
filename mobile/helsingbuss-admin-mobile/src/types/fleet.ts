export type FleetVehicle = {
  id: string;
  name: string;
  model: string;
  registration?: string;
  km: string;
  nextService: string;
  status: "available" | "service_soon" | "in_traffic" | "inactive" | string;
};

export type FleetDriver = {
  id: string;
  name: string;
  assignment: string;
  phone?: string;
  status: "available" | "in_traffic" | "inactive" | string;
};

export type FleetDocuments = {
  inspectionIssues: number;
  serviceSoon: number;
  insuranceOk: boolean;
  checklistsTodo: number;
};

export type FleetOverview = {
  vehicles: FleetVehicle[];
  drivers: FleetDriver[];
  documents: FleetDocuments;
};
