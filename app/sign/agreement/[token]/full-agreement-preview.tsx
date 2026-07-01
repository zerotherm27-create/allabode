"use client";

import {
  LEASE_TERM_LABEL, PET_LABEL, SMOKING_LABEL, YN_LABEL, FURNISHING_LABEL,
  COMMS_LABEL, RESPONSE_LABEL, payoutScheduleLabel, ownerIdTypeLabel,
} from "@/lib/pm/agreement-labels";

type OwnerDetails = { name: string; nationality: string; civilStatus: string; address: string; email: string; contact: string };
type PropertyDetails = { condo: string; unit: string; address: string; floorArea: string; parking: string; storage: string; furnished: boolean; inclusions: string };
type ServiceSelections = { fullPropertyManagement: boolean; longTermLeasing: boolean; shortTermLeasing: boolean; tenantHunting: boolean; condotelManagement: boolean; otherServices: string };
type AnnexC = {
  minMonthlyRent: string; leaseTerm: string; leaseTermOther: string;
  maxDiscountAmount: string; maxDiscountPercent: string;
  repairLimit: string; repairLimitOther: string;
  petPolicy: string; petConditions: string;
  smokingPolicy: string; subleasing: string; shortTermRentals: string; furnishing: string;
  preferredCommunication: string; preferredResponseTime: string;
  bankName: string; bankAccountName: string; bankAccountNo: string;
  specialInstructions: string;
};

function H1({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 border-b-2 border-gold pb-1 font-display text-sm font-bold text-navy first:mt-0">{children}</h3>;
}
function H2({ children }: { children: React.ReactNode }) {
  return <h4 className="mt-3 text-xs font-bold text-navy-700">{children}</h4>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-justify">{children}</p>;
}
function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="mt-1.5 flex gap-2 border-b border-line/60 pb-1">
      <span className="w-40 shrink-0 font-semibold text-navy">{label}</span>
      <span className="flex-1">{value || "—"}</span>
    </div>
  );
}
function Check({ checked, label }: { checked?: boolean; label: string }) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center border ${checked ? "border-navy bg-navy" : "border-ink"}`}>
        {checked && <span className="text-[8px] font-bold text-white">X</span>}
      </span>
      {label}
    </div>
  );
}

export function FullAgreementPreview({
  ownerDetails: od, propertyDetails: pd, serviceSelections: ss, annexC: ac, effectiveDate,
  ownerIdType, ownerIdNumber, payoutDay,
}: {
  ownerDetails: OwnerDetails;
  propertyDetails: PropertyDetails;
  serviceSelections: ServiceSelections;
  annexC: AnnexC;
  payoutDay?: number | null;
  effectiveDate: string;
  ownerIdType: string;
  ownerIdNumber: string;
}) {
  return (
    <div className="text-xs leading-relaxed text-ink">
      <p className="text-center font-display text-base font-bold text-navy">PROPERTY MANAGEMENT AGREEMENT</p>
      <p className="text-center text-[11px] text-gold">All Abode Property Solutions OPC</p>
      <p className="mt-3 text-center">
        This Agreement is entered into on {effectiveDate || "the date of full execution"}, by and between:
      </p>

      <H2>PROPERTY OWNER</H2>
      <Row label="Name:" value={od.name} />
      <Row label="Nationality:" value={od.nationality || "Filipino"} />
      <Row label="Civil Status:" value={od.civilStatus} />
      <Row label="Address:" value={od.address} />
      <Row label="Email:" value={od.email} />
      <Row label="Contact:" value={od.contact} />
      <P>Hereinafter referred to as the &#x201C;Owner.&#x201D;</P>
      <p className="mt-2 text-center">&#x2014; and &#x2014;</p>
      <P>
        <strong>ALL ABODE PROPERTY SOLUTIONS OPC.</strong>, a One Person Corporation duly organized under Philippine law,
        with principal office at 2216 Chino Roces Ave., Makati, Laureano Di Trevi Towers, Tower 2 #2804, represented by
        its <strong>President, Aremchel M. Cruzado</strong>; hereinafter referred to as the <strong>&#x201C;Manager.&#x201D;</strong>
      </P>

      <H1>I. PROPERTY</H1>
      <Row label="Condominium / Building:" value={pd.condo} />
      <Row label="Unit Number:" value={pd.unit} />
      <Row label="Address:" value={pd.address} />
      <Row label="Floor Area:" value={pd.floorArea} />
      <Row label="Parking Slot:" value={pd.parking} />
      <Row label="Storage Unit:" value={pd.storage} />
      <Row label="Furnished:" value={pd.furnished ? "Yes" : "No"} />
      <Row label="Inclusions:" value={pd.inclusions} />
      <P>The Owner warrants that the above information is complete and accurate.</P>

      <H1>II. APPOINTMENT AND TERM</H1>
      <P>
        The Owner exclusively appoints <strong>All Abode Property Solutions OPC.</strong> as Property Manager, and the
        Manager accepts, agreeing to perform services with commercially reasonable care, diligence, and professional
        standards consistent with Philippine industry practice. The Manager acts as an independent contractor; nothing
        herein creates an employer-employee relationship, partnership, joint venture, or agency beyond the authority
        expressly granted.
      </P>
      <Row label="Effective Date:" value={effectiveDate} />
      <P>
        This Agreement continues until terminated by either Party upon thirty (30) calendar days&#x2019; prior written
        notice. Either Party may terminate immediately upon material breach that remains uncured fifteen (15) calendar
        days after written notice. Termination does not affect accrued rights, fees, reimbursements, or liabilities.
        Existing lease contracts remain valid until their expiration unless otherwise agreed by all parties.
      </P>

      <H1>III. SERVICES SELECTED</H1>
      <Check checked={ss.fullPropertyManagement} label="Full Property Management" />
      <Check checked={ss.longTermLeasing} label="Long-Term Leasing (Six Months or More)" />
      <Check checked={ss.shortTermLeasing} label="Short-Term / Monthly Leasing" />
      <Check checked={ss.tenantHunting} label="Tenant Hunting Only" />
      <Check checked={ss.condotelManagement} label="Condotel Management" />
      <Check checked={!!ss.otherServices} label={`Other Services: ${ss.otherServices || "Bills Payment, Unit Furnishing, Unit Repairs, etc."}`} />
      <P>Specific services and fees are detailed in Annex &#x201C;A.&#x201D;</P>

      <H1>IV. SCOPE OF SERVICES</H1>
      <P>Subject to the service package selected, the Manager shall:</P>
      <P><strong>a. Marketing &amp; Viewings &#x2014; </strong>advertise through online portals, social media, broker networks, and other appropriate channels; conduct property viewings; coordinate with building administration for access; install/remove marketing materials where permitted.</P>
      <P><strong>b. Tenant Screening &#x2014; </strong>verify identity, employment/business, income, credit/rental history, and references. The Owner acknowledges that screening reduces but does not eliminate risk; the Manager does not guarantee a tenant&#x2019;s future conduct or financial capacity.</P>
      <P><strong>c. Lease Documentation &#x2014; </strong>prepare and coordinate execution of lease agreements, renewals, extensions, move-in documents, house rules, inventory lists, and related documents.</P>
      <P><strong>d. Move-In / Move-Out &#x2014; </strong>coordinate with the Owner, Tenant, and building administration on move-in requirements, gate passes, orientation, turnover, inventory inspection, move-out inspection, and security deposit reconciliation.</P>
      <P><strong>e. Tenant Relations &#x2014; </strong>serve as primary contact for maintenance requests, billing concerns, lease administration, building coordination, and general inquiries.</P>
      <P><strong>f. Rental Administration &#x2014; </strong>collect rental payments and other charges; monitor payment schedules; follow up overdue accounts; issue Statements of Account; maintain rental records; prepare Owner payout statements.</P>
      <P><strong>g. Renewals &amp; Inspections &#x2014; </strong>negotiate renewal/extension terms prior to lease expiration, subject to Owner approval; conduct periodic property inspections with reasonable notice to the Tenant.</P>

      <H1>V. MANAGER&#x2019;S AUTHORITY AND LIMITATIONS</H1>
      <P>
        The Manager is authorized to: advertise and market the Property; respond to inquiries; screen and recommend
        tenants; prepare lease documents; coordinate move-in/out; collect rent, deposits, utilities, penalties, and
        other amounts due; coordinate with condominium corporations, HOAs, utility providers, contractors, and
        government agencies; arrange repairs within the approved spending limit (Annex &#x201C;C&#x201D;); engage
        licensed contractors and service providers; maintain property records; and release rental proceeds net of
        authorized deductions.
      </P>
      <P><strong>The Manager shall not</strong>, without express written Owner authorization: (a) sell, mortgage, or otherwise dispose of the Property; (b) execute leases exceeding the Owner-approved maximum term; (c) undertake major renovations or capital improvements beyond the approved spending limit; (d) borrow money on behalf of the Owner; or (e) enter into contracts unrelated to Property management.</P>
      <P>Emergency repairs are governed by Section IX below.</P>

      <H1>VI. OWNER&#x2019;S RESPONSIBILITIES AND WARRANTIES</H1>
      <P>The Owner agrees to: provide proof of ownership or authority to lease (including Special Power of Attorney, if applicable); deliver the Property in clean, safe, habitable, and tenant-ready condition, with all included furniture, appliances, and fixtures in good working order unless otherwise disclosed; remain responsible for major repairs, structural and hidden defects, appliance replacement due to age/normal use, and capital improvements; bear all association dues, utility charges, real property taxes, insurance premiums, and other ownership expenses until the Property is occupied; respond promptly to requests requiring Owner approval; comply with all applicable laws, condominium rules, HOA regulations, and government requirements; and cooperate with the Manager and provide all information, documents, and approvals reasonably necessary for performance.</P>
      <P>The Owner represents and warrants that: (a) the Owner is the lawful owner or duly authorized representative; (b) the Property is free from any restriction prohibiting leasing; (c) all information provided is true, complete, and accurate; (d) all known material defects have been disclosed; and (e) leasing the Property does not violate any law, court order, mortgage, condominium rule, HOA rule, or contractual obligation.</P>
      <P>The Owner agrees to <strong>indemnify and hold the Manager harmless</strong> from any loss, liability, or expense arising from breach of the foregoing warranties. This indemnity survives termination.</P>

      <H1>VII. FEES, COLLECTIONS, AND PAYOUTS</H1>
      <H2>7.1 Fee Schedule</H2>
      <P>Fees are set out in Annex &#x201C;A.&#x201D; Default rates (unless otherwise agreed in writing) apply as listed there.</P>
      <H2>7.2 Rental Collection</H2>
      <P>The Manager is authorized to collect monthly rent, security deposits, advance rentals, utility reimbursements, penalties, and other charges due under the Lease Agreement. Collected funds are deposited into the Manager&#x2019;s designated account before remittance to the Owner.</P>
      <H2>7.3 Deductions Before Payout</H2>
      <P>Prior to each remittance, the Manager shall deduct management fees, leasing commissions, approved repair costs, utility and association due payments made on behalf of the Owner, required withholding taxes, and other authorized expenses, and shall provide a monthly Statement of Account detailing all collections, deductions, and net amount payable.</P>
      <H2>7.4 Non-Circumvention</H2>
      <P>During the term and for twelve (12) months after termination, the Owner shall not directly or indirectly lease the Property to any tenant introduced by the Manager without the Manager&#x2019;s written consent. If the Owner does so without paying the applicable commission, the full commission and applicable management fees remain due.</P>
      <H2>7.5 Taxes</H2>
      <P>Each Party bears government taxes for which it is legally responsible under Philippine law unless otherwise agreed in writing.</P>

      <H1>VIII. SECURITY DEPOSIT</H1>
      <P>The security deposit belongs to the Owner and serves as security for the Tenant&#x2019;s obligations. The Manager administers it until completion of move-out inspection and final accounting. It may be applied to unpaid rent, utilities, association dues chargeable to the Tenant, damage beyond normal wear and tear, missing items, excess cleaning costs, and other Tenant obligations under the Lease Agreement. Any remaining balance shall be returned to the Tenant after deducting all lawful charges, per the timeline in the Lease Agreement.</P>

      <H1>IX. REPAIRS AND MAINTENANCE</H1>
      <P>The Owner bears the cost of repairs from ordinary wear and tear, structural defects, building systems failures, appliance replacement due to age or normal use, hidden defects, and capital improvements. The Tenant is responsible for damage caused by negligence, misuse, abuse, or lease violations. No non-emergency repair exceeding the Owner&#x2019;s approved spending limit (Annex &#x201C;C&#x201D;) shall proceed without prior Owner approval.</P>
      <H2>Emergency Repairs</H2>
      <P>The Manager may arrange emergency repairs without prior approval when immediately necessary to prevent injury, protect the Property from further damage, prevent interruption of essential utilities, comply with condominium rules or applicable law, or mitigate substantial financial loss. The Manager shall notify the Owner as soon as practicable. All reasonable emergency expenses shall be reimbursed by the Owner upon presentation of supporting documents.</P>
      <H2>Reimbursement</H2>
      <P>Whenever the Manager advances payment for any approved Owner expense, the Owner shall reimburse within seven (7) calendar days from receipt of the Statement of Account or written demand. The Manager may deduct unpaid reimbursements from future rental collections with proper documentation.</P>

      <H1>X. DELINQUENCY AND NO GUARANTEE</H1>
      <P>The Manager shall make reasonable efforts to collect overdue rent but does not guarantee collection or assume liability for Tenant default. Should legal action become necessary, the Manager may coordinate with legal counsel upon the Owner&#x2019;s written instruction; all legal fees and litigation costs shall be borne by the Owner unless recovered from the Tenant.</P>
      <P>The Manager does not guarantee that the Property will be leased within any specific period, continuous occupancy, the Tenant&#x2019;s financial capacity or future conduct, timely rent payment, or the market value or appreciation of the Property.</P>

      <H1>XI. LIABILITY, INDEMNIFICATION, AND INSURANCE</H1>
      <H2>Limitation of Liability</H2>
      <P>Except in cases of fraud, gross negligence, or willful misconduct, the Manager shall not be liable for any direct, indirect, incidental, or consequential loss or damage arising from Tenant default, theft, fire, flood, typhoon, earthquake, utility interruptions, acts of third-party contractors, government actions, condominium or HOA decisions, or market fluctuations.</P>
      <H2>Indemnification</H2>
      <P>The Owner shall defend, indemnify, and hold harmless the Manager, its directors, officers, employees, and representatives from any claim arising from the Owner&#x2019;s breach of this Agreement, defects in ownership or authority, hidden defects not disclosed, or violations of laws or rules attributable to the Owner. This indemnity survives termination.</P>
      <H2>Insurance</H2>
      <P>The Manager strongly recommends the Owner maintain adequate insurance, including Fire, Comprehensive Property, Public Liability, and Contents Insurance for furnished units. The Manager shall not be responsible for uninsured losses.</P>

      <H1>XII. CONFIDENTIALITY AND DATA PRIVACY</H1>
      <P>Both Parties shall keep confidential all personal, financial, tenant, business, and proprietary information obtained under this Agreement, except where disclosure is required by law or necessary to perform obligations herein. This obligation continues after termination.</P>
      <P>The Parties shall comply with Republic Act No. 10173 (Data Privacy Act of 2012) and its implementing rules. The Owner authorizes the Manager to collect, process, store, and disclose personal information only as necessary for marketing the Property, tenant screening, lease administration, rental collection, and legal/regulatory compliance.</P>

      <H1>XIII. GENERAL PROVISIONS</H1>
      <H2>Force Majeure</H2>
      <P>Neither Party is liable for delay or failure to perform due to causes beyond reasonable control, including typhoons, floods, earthquakes, fires, epidemics, war, civil unrest, government regulations, power failures, or acts of God.</P>
      <H2>Governing Law and Disputes</H2>
      <P>This Agreement is governed by the laws of the Republic of the Philippines. The Parties shall first attempt good-faith negotiation, then mediation, before litigation. Exclusive venue shall be the proper courts of Makati City, Philippines.</P>
      <H2>Entire Agreement, Severability, Assignment, Notices</H2>
      <P>This Agreement, with its Annexes, constitutes the entire agreement of the Parties. If any provision is invalid, the remaining provisions continue in force. The Owner may not assign this Agreement without the Manager&#x2019;s written consent. All notices shall be in writing, delivered personally, by courier, or by electronic mail to the addresses provided.</P>
      <H2>Counterparts and Electronic Signatures</H2>
      <P>This Agreement may be executed in counterparts. Electronic signatures, executed in compliance with Republic Act No. 8792 (Electronic Commerce Act of 2000) and the Rules on Electronic Evidence (A.M. No. 01-7-01-SC), shall have the same legal effect, validity, and enforceability as a manual signature, to the fullest extent permitted by Philippine law.</P>

      <H1>XIV. SIGNATURES</H1>
      <P>
        IN WITNESS WHEREOF, the Parties will hereunto set their hands as of {effectiveDate || "the date of full execution"},
        Philippines, once both parties have signed below.
      </P>
      <Row label="Government ID on file:" value={ownerIdNumber ? `${ownerIdTypeLabel(ownerIdType)} No. ${ownerIdNumber}` : undefined} />

      <p className="mt-6 text-center font-display text-sm font-bold text-navy">ANNEX &#x201C;A&#x201D; &#x2014; SERVICE FEES</p>
      <table className="mt-2 w-full border-collapse border border-line text-xs">
        <thead>
          <tr className="bg-surface-gray">
            <th className="border border-line p-1.5 text-left">Service</th>
            <th className="border border-line p-1.5 text-left">Fee</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Long-Term Lease (6 months and above)", "One (1) month’s gross rent per new lease"],
            ["Monthly Property Management", "Five Percent (5%) of monthly gross rent, exclusive of applicable taxes"],
            ["Tenant Hunting Only", "One (1) month’s gross rent or as otherwise agreed"],
            ["Short-Term / Monthly Leasing", "Facilitation fee and/or prorated commission as agreed"],
            ["Condotel Management", "Twenty Percent (20%) to Thirty Percent (30%) of gross booking revenue"],
            ["Lease Renewal", "Renewal commission as agreed"],
            ["Lease Extension", "Twenty Percent (20%) of the extension rental amount or as agreed"],
            ["Other Services", "Based on separate written quotation and approval"],
          ].map(([svc, fee]) => (
            <tr key={svc}>
              <td className="border border-line p-1.5">{svc}</td>
              <td className="border border-line p-1.5">{fee}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-6 text-center font-display text-sm font-bold text-navy">ANNEX &#x201C;C&#x201D; &#x2014; OWNER AUTHORITY MATRIX</p>
      <H2>Leasing Authority</H2>
      <Row label="Minimum Monthly Rent:" value={ac.minMonthlyRent ? `₱${ac.minMonthlyRent}` : undefined} />
      <Row label="Preferred Lease Term:" value={LEASE_TERM_LABEL[ac.leaseTerm || ""] || ac.leaseTermOther} />
      <Row label="Max Discount w/o Approval:" value={ac.maxDiscountAmount ? `₱${ac.maxDiscountAmount}` : (ac.maxDiscountPercent ? `${ac.maxDiscountPercent}%` : undefined)} />

      <H2>Repair Authority</H2>
      <Row label="Manager may approve up to:" value={ac.repairLimit === "other" ? ac.repairLimitOther : (ac.repairLimit ? `₱${ac.repairLimit}` : undefined)} />
      <P>Any repair exceeding the above amount requires the Owner&#x2019;s written approval, except emergency repairs as provided in this Agreement.</P>

      <H2>Policies</H2>
      <Row label="Pet Policy:" value={PET_LABEL[ac.petPolicy || ""]} />
      <Row label="Smoking:" value={SMOKING_LABEL[ac.smokingPolicy || ""]} />
      <Row label="Subleasing:" value={YN_LABEL[ac.subleasing || ""]} />
      <Row label="Short-Term Rentals:" value={YN_LABEL[ac.shortTermRentals || ""]} />
      <Row label="Furnishing:" value={FURNISHING_LABEL[ac.furnishing || ""]} />

      <H2>Owner Preferences</H2>
      <Row label="Preferred Communication:" value={COMMS_LABEL[ac.preferredCommunication || ""]} />
      <Row label="Preferred Response Time:" value={RESPONSE_LABEL[ac.preferredResponseTime || ""]} />

      <H2>Owner Bank Details</H2>
      <Row label="Bank:" value={ac.bankName} />
      <Row label="Account Name:" value={ac.bankAccountName} />
      <Row label="Account Number:" value={ac.bankAccountNo} />
      <Row label="Preferred Payout:" value={payoutScheduleLabel(payoutDay)} />

      <H2>Special Instructions</H2>
      <P>{ac.specialInstructions || "None."}</P>

      <p className="mt-6 rounded-md bg-surface-gray px-3 py-2 text-[11px] text-slate">
        Annex &#x201C;B&#x201D; (the physical inventory/turnover checklist) and the notarial acknowledgment are completed
        separately and are not part of this review. The full document, including your signature and All Abode&#x2019;s
        countersignature, will be available as a downloadable PDF once both parties have signed.
      </p>
    </div>
  );
}
