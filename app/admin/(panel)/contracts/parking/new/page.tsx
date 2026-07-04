import Link from "next/link";
import { Icon } from "@/components/icon";
import { ParkingTermsForm } from "@/components/admin/parking-terms-form";
import { createParkingAgreement } from "@/app/admin/parking-actions";

export default function NewParkingContractPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/contracts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to contracts
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">Send a Parking Space Rental Agreement</h1>
      <p className="mt-1 text-sm text-slate">
        You set all the rental terms here. The tenant fills in their personal details, vehicle details, and
        government ID on the signing link, then the landlord signs via their own link (or a designated signatory
        countersigns).
      </p>
      <div className="mt-6">
        <ParkingTermsForm
          action={createParkingAgreement}
          submitLabel="Create & send to tenant"
        />
      </div>
    </div>
  );
}
