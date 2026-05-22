import { useEffect } from "react";

export default function AdminOperatorsRedirect() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace("/admin/sundra/operatorer/register");
    }
  }, []);

  return null;
}
