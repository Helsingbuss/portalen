import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useAuthStore } from "@/mobile/store/auth";
import { router } from "expo-router";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ProfileMenu({ open, onClose }: Props) {
  const logout = useAuthStore((s) => s.logout);

  const Row = ({ title, subtitle, onPress, danger }: any) => (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.06)",
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <Text style={{ color: danger ? "#ff6b6b" : "white", fontSize: 16, fontWeight: "800" }}>
        {title}
      </Text>
      {!!subtitle && (
        <Text style={{ color: "rgba(255,255,255,0.65)", marginTop: 3, fontSize: 13 }}>
          {subtitle}
        </Text>
      )}
    </Pressable>
  );

  return (
    <Modal transparent visible={open} animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: "#1D2937",
            padding: 16,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
          }}
        >
          <Text style={{ color: "white", fontSize: 18, fontWeight: "900", marginBottom: 12 }}>
            Profil
          </Text>

          <Row
            title="Inställningar"
            subtitle="Notiser, språk, tema, säkerhet"
            onPress={() => {
              onClose();
              router.push("/settings");
            }}
          />

          <Row
            title="Konto"
            subtitle="Profil, roll och behörighet"
            onPress={() => {
              onClose();
              router.push("/account");
            }}
          />

          <Row
            title="Logga ut"
            subtitle="Du loggas ut från Helsingbuss Portal"
            danger
            onPress={() => {
              logout();
              onClose();
              router.replace("/login");
            }}
          />

          <Pressable
            onPress={onClose}
            style={{
              marginTop: 4,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "700" }}>Stäng</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}