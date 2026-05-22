import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import AuthNavigator from "./AuthNavigator";
import MainTabs from "./MainTabs";

export default function RootNavigator() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <NavigationContainer>
      {isLoggedIn ? (
        <MainTabs />
      ) : (
        <AuthNavigator onLogin={() => setIsLoggedIn(true)} />
      )}
    </NavigationContainer>
  );
}
