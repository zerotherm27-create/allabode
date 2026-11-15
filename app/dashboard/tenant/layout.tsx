import { DashboardTour } from "@/components/dashboard/tour";
import { tenantTour } from "@/lib/dashboard/tours";

/** Each tenant page renders its own DashboardShell; this only adds the guided tour on top. */
export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <DashboardTour {...tenantTour} />
    </>
  );
}
