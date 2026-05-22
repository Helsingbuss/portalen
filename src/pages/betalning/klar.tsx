export default function PaymentSuccessPage() {
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
        <div style={{ fontSize: 64 }}>OK</div>

        <h1 style={{ marginTop: 20, fontSize: 32, color: "#1d2937" }}>
          Betalningen lyckades
        </h1>

        <p style={{ marginTop: 15, color: "#4b5563", lineHeight: 1.7 }}>
          Tack for din bokning hos Helsingbuss.
          <br />
          Din betalning har registrerats och en bekraftelse skickas till din e-post.
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
          Till startsidan
        </a>
      </div>
    </main>
  );
}
