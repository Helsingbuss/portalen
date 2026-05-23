import { Redirect } from "expo-router";

export default function DashboardRedirect() {
  return <Redirect href={"/role-select" as any} />;
}
