import React, { useEffect, useRef } from "react";
import { registerPushTokenForCurrentUser } from "../services/pushTokenService";

type Props = {
  appRole: "admin" | "agent" | "driver";
};

export default function PushTokenBootstrap({ appRole }: Props) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;

    hasRun.current = true;

    registerPushTokenForCurrentUser(appRole).then((result) => {
      console.log("[PUSH_BOOTSTRAP]", appRole, result);
    });
  }, [appRole]);

  return null;
}
