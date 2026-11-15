import { DashboardTour } from "@/components/dashboard/tour";
import { ownerTour } from "@/lib/dashboard/tours";

/** Each owner page renders its own DashboardShell; this only adds the guided tour on top. */
export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <DashboardTour {...ownerTour} />
    </>
  );
}
