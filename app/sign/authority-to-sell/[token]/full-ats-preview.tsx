"use client";

import {
  BROKER, atsIntro, buildAtsSections,
  type AtsOwnerDetails, type AtsPropertyDetails, type AtsSaleTerms,
} from "@/lib/pm/authority-to-sell-clauses";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="mt-1.5 flex gap-2 border-b border-line/60 pb-1">
      <span className="w-40 shrink-0 font-semibold text-navy">{label}</span>
      <span className="flex-1">{value || "—"}</span>
    </div>
  );
}

export function FullAtsPreview({
  ownerDetails: od, propertyDetails, saleTerms, executionDate,
}: {
  ownerDetails: AtsOwnerDetails;
  propertyDetails: AtsPropertyDetails;
  saleTerms: AtsSaleTerms;
  executionDate: string;
}) {
  const sections = buildAtsSections(propertyDetails, saleTerms);

  return (
    <div className="text-sm leading-relaxed text-ink">
      <h2 className="text-center font-display text-base font-bold text-navy">AUTHORITY TO SELL</h2>
      <p className="mt-3">{atsIntro(executionDate, saleTerms.executionPlace)}</p>

      <h4 className="mt-4 text-xs font-bold text-navy-700">OWNER / SELLER</h4>
      <Row label="Name:" value={od.name} />
      <Row label="Address:" value={od.address} />
      <Row label="Contact No.:" value={od.contact} />
      <p className="mt-3 text-center">&#x2014; and &#x2014;</p>

      <h4 className="mt-3 text-xs font-bold text-navy-700">BROKER</h4>
      <Row label="Name:" value={BROKER.name} />
      <Row label="PRC License No.:" value={BROKER.prcLicenseNo} />
      <Row label="PTR No.:" value={BROKER.ptrNo} />
      <Row label="DHSUD/HLURB Reg. No.:" value={BROKER.dhsudRegNo} />
      <Row label="Address:" value={BROKER.address} />
      <Row label="Contact No.:" value={BROKER.contactNo} />

      {sections.map((s) => (
        <section key={s.heading}>
          <h3 className="mt-6 border-b-2 border-gold pb-1 font-display text-sm font-bold text-navy">{s.heading}</h3>
          {s.blocks.map((b, i) => {
            if (b.type === "p") return <p key={i} className="mt-2 text-justify">{b.text}</p>;
            if (b.type === "bullets") {
              return (
                <ul key={i} className="mt-2 list-disc pl-5">
                  {b.items.map((it) => <li key={it}>{it}</li>)}
                </ul>
              );
            }
            return (
              <div key={i} className="mt-2">
                {b.items.map((it) => (
                  <div key={it.label} className="mt-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center border ${it.checked ? "border-navy bg-navy" : "border-ink"}`}>
                        {it.checked && <span className="text-[8px] font-bold text-white">X</span>}
                      </span>
                      <span className={it.body ? "font-semibold" : undefined}>{it.label}</span>
                    </div>
                    {it.body && <p className="mt-1 pl-5 text-justify">{it.body}</p>}
                  </div>
                ))}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
