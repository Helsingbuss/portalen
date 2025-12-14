import { AccountLayout } from "@/components/account/AccountLayout";
import type { GetServerSideProps } from "next";

type PageProps = {
  user: { firstName: string; email: string };
};

export default function ProfilePage({ user }: PageProps) {
  return (
    <AccountLayout user={user}>
      <div className="hb-dashboard">
        <h1 className="hb-dashboard-title">Min profil</h1>
        <p>Här kommer vi lägga formulär för namn, telefon, adress osv.</p>
      </div>
    </AccountLayout>
  );
}

export const getServerSideProps: GetServerSideProps<PageProps> =
  async () => {
    // samma fejk-user som på / tills vi har riktig auth
    return {
      props: {
        user: {
          firstName: "Andreas",
          email: "info@helsingbuss.se",
        },
      },
    };
  };
