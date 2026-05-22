import { Redirect } from "expo-router";
export default function AgentIndex() {
  return <Redirect href={"/agent/dashboard" as any} />;
}
