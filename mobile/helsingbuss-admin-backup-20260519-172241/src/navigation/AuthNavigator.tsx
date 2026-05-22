import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SplashScreen from "../screens/auth/SplashScreen";
import IntroScreen from "../screens/auth/IntroScreen";
import LoginScreen from "../screens/auth/LoginScreen";

export type AuthStackParamList = {
  Splash: undefined;
  Intro: undefined;
  Login: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

type Props = {
  onLogin: () => void;
};

export default function AuthNavigator({ onLogin }: Props) {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Intro" component={IntroScreen} />
      <Stack.Screen name="Login">
        {() => <LoginScreen onLogin={onLogin} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
