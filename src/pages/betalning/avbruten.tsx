export default function PaymentCancelledPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f7fb",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 40,
          borderRadius: 20,
          maxWidth: 520,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ fontSize: 64 }}>!</div>

        <h1 style={{ marginTop: 20, fontSize: 32, color: "#1d2937" }}>
          Betalningen avbröts
        </h1>

        <p style={{ marginTop: 15, color: "#4b5563", lineHeight: 1.7 }}>
          Ingen betalning genomfördes.
          <br />
          Du kan alltid gå tillbaka och försöka igen.
        </p>

        <a
          href="/"
          style={{
            marginTop: 30,
            display: "inline-block",
            background: "#1A545F",
            color: "#fff",
            padding: "14px 24px",
            borderRadius: 12,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Tillbaka
        </a>
      </div>
    </main>
  );
}
