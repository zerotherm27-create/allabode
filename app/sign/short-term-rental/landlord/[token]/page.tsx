import Image from "next/image";
import { loadStrAgreementForLandlord } from "@/app/sign/short-term-rental-actions";
import { StrLandlordSign } from "./landlord-sign";

export const metadata = { title: "Sign the short term rental agreement", robots: { index: false } };

export default async function SignStrLandlordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const agreement = await loadStrAgreementForLandlord(token);

  if (!agreement) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-navy px-5">
        <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-8 text-center">
          <Image src="/logo/logo-primary.png" alt="All Abode Brokerage and Valuation OPC" width={160} height={48} className="mx-auto h-10 w-auto" />
          <h1 className="mt-6 font-display text-xl font-bold text-navy">This link is no longer valid</h1>
          <p className="mt-2 text-sm text-slate">
            It may have expired or already been used. Please contact All Abode Brokerage and Valuation OPC for a new
            link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-navy px-4 py-10">
      <StrLandlordSign token={token} initial={agreement} />
    </div>
  );
}
