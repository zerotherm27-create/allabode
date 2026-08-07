"use client";

import {
  buildAddendumClauses, buildAddendumRecital, addendumSectionNumbers,
  addendumTitle, addendumBankIntro, addendumRoles,
  DEFAULT_ADDENDUM_BANK_DETAILS,
  type AddendumClause, type AddendumTenantDetails, type AddendumTermsInput,
  type AddendumFeeItem, type AddendumScheduleRow,
} from "@/lib/pm/addendum-clauses";
import type { ClauseParagraph } from "@/lib/pm/tenancy-clauses";
import type { AddendumRecord } from "@/app/sign/addendum-actions";

function Para({ p }: { p: ClauseParagraph }) {
  return (
    <>
      {p.fields && (
        <div className="my-2 flex flex-col gap-1 pl-6">
          {p.fields.map(([label, value]) => (
            <p key={label} className="text-sm">
              <span className="inline-block w-44 font-semibold">{label}</span>: {value}
            </p>
          ))}
        </div>
      )}
      {p.text && (
        p.sub ? (
          <div className="mb-2 flex gap-2 text-sm">
            <span className="w-8 shrink-0 font-semibold">{p.sub}</span>
            <span>
              {p.subTitle ? <span className="block font-semibold">{p.subTitle}</span> : null}
              {p.text}
            </span>
          </div>
        ) : (
          <p className="mb-2 text-sm">{p.text}</p>
        )
      )}
      {p.numbered && (
        <div className="mb-2 flex flex-col gap-1 pl-10">
          {p.numbered.map((n) => (
            <p key={n.marker + n.text} className="text-sm">
              <span className="inline-block w-8">{n.marker}</span>{n.text}
            </p>
          ))}
        </div>
      )}
    </>
  );
}

function ClauseBlock({ clause }: { clause: AddendumClause }) {
  return (
    <div>
      {clause.title ? <h4 className="mb-1.5 mt-4 text-sm font-bold text-navy">{clause.no}. {clause.title}</h4> : null}
      {clause.paras.map((p, j) => <Para key={j} p={p} />)}
    </div>
  );
}

/**
 * Full-text on-screen review of the Addendum, built from the same clause
 * source as the PDF (lib/pm/addendum-clauses.ts) so they never drift.
 * `tenantDetails` is passed separately so the tenant wizard can preview
 * unsaved edits; the landlord page passes the stored values.
 */
export function FullAddendumPreview({
  record, tenantDetails, token,
}: {
  record: AddendumRecord;
  tenantDetails: AddendumTenantDetails;
  /** Supplied so an uploaded original can be opened through its token-gated route. */
  token?: string;
}) {
  const terms: AddendumTermsInput = {
    parentType: record.parent_type,
    parentSnapshot: record.parent_snapshot ?? {},
    effectiveDate: record.effective_date,
    newStartDate: record.new_start_date,
    newEndDate: record.new_end_date,
    feeItems: record.fee_items ?? [],
    partyChanges: record.party_changes ?? [],
    amendedClauses: record.amended_clauses ?? [],
  };
  const roles = addendumRoles(record.parent_type);
  const sections = addendumSectionNumbers(terms);
  const clauses = buildAddendumClauses(terms);
  const recital = buildAddendumRecital(terms, record.landlord_details ?? {}, tenantDetails, record.agreement_date);
  const bank = { ...DEFAULT_ADDENDUM_BANK_DETAILS, ...(record.bank_details ?? {}) };
  const feeItems: AddendumFeeItem[] = record.fee_items ?? [];
  const schedule: AddendumScheduleRow[] = record.payment_schedule ?? [];
  const feeTotal = feeItems.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const peso = (n: number) => `PHP ${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="text-ink">
      <h3 className="mb-4 text-center font-display text-base font-bold text-navy">{addendumTitle(terms)}</h3>

      {/* The original was signed off-platform, so give the reader a way to open
          the very document this Addendum amends before they sign it. */}
      {token && record.parent_source === "uploaded" && record.parent_document_path && (
        <p className="mb-4 rounded-md bg-surface-gray px-4 py-3 text-sm">
          <a
            href={`/api/sign/addendum/${token}/original`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-navy-700 underline"
          >
            Open the original {record.parent_snapshot?.contractTitle || "contract"} this Addendum amends
          </a>
        </p>
      )}

      <p className="mb-2 text-sm font-bold">{recital.opener}</p>
      <p className="mb-2 text-sm">{recital.intro}</p>
      <p className="mb-2 pl-4 text-sm"><span className="font-bold">{recital.landlordName}</span>{recital.landlordLine}</p>
      <p className="mb-2 text-center text-sm">— and —</p>
      <p className="mb-2 pl-4 text-sm"><span className="font-bold">{recital.tenantName}</span>{recital.tenantLine}</p>
      <p className="mb-2 text-sm">{recital.partiesNote}</p>
      {recital.whereas.map((w, i) => (
        <p key={i} className="mb-2 text-sm"><span className="font-bold">WHEREAS, </span>{w}</p>
      ))}
      <p className="mb-2 text-sm"><span className="font-bold">NOW, THEREFORE, </span>{recital.nowTherefore}</p>

      {clauses.map((c, i) => {
        if (sections.fees !== null && c.no === sections.fees) {
          return (
            <div key={i}>
              <h4 className="mb-1.5 mt-4 text-sm font-bold text-navy">{c.no}. {c.title}</h4>
              {c.paras[0] ? <Para p={c.paras[0]} /> : null}

              <table className="my-3 w-full border border-line text-sm">
                <thead>
                  <tr className="bg-surface">
                    <th className="border-b border-line px-3 py-2 text-left font-semibold">Item</th>
                    <th className="border-b border-line px-3 py-2 text-right font-semibold">Amount (PHP)</th>
                  </tr>
                </thead>
                <tbody>
                  {feeItems.map((r, j) => (
                    <tr key={j}>
                      <td className="border-b border-line px-3 py-2">{r.label}</td>
                      <td className="border-b border-line px-3 py-2 text-right">{peso(Number(r.amount) || 0)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="px-3 py-2">TOTAL</td>
                    <td className="px-3 py-2 text-right">{peso(feeTotal)}</td>
                  </tr>
                </tbody>
              </table>

              <p className="mb-2 text-sm">{addendumBankIntro(bank)}</p>

              <table className="my-3 w-full border border-line text-sm">
                <tbody>
                  {([
                    ["Name", bank.name],
                    ["Bank", bank.bank],
                    ["Branch", bank.branch],
                    ["Account No.", bank.accountNumber],
                  ] as const).map(([label, value]) => (
                    <tr key={label}>
                      <td className="w-32 border-b border-line px-3 py-2 font-semibold">{label}</td>
                      <td className="border-b border-line px-3 py-2">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {schedule.length > 0 && (
                <table className="my-3 w-full border border-line text-sm">
                  <thead>
                    <tr className="bg-surface">
                      <th className="border-b border-line px-3 py-2 text-left font-semibold">DATE DUE</th>
                      <th className="border-b border-line px-3 py-2 text-right font-semibold">AMOUNT</th>
                      <th className="border-b border-line px-3 py-2 text-left font-semibold">BANK/BRANCH</th>
                      <th className="border-b border-line px-3 py-2 text-left font-semibold">COVERAGE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((r, j) => (
                      <tr key={j}>
                        <td className="border-b border-line px-3 py-2">{r.dueDate}</td>
                        <td className="border-b border-line px-3 py-2 text-right">{r.amount}</td>
                        <td className="border-b border-line px-3 py-2">{r.bankBranch}</td>
                        <td className="border-b border-line px-3 py-2">{r.coverage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {c.paras.slice(1).map((p, j) => <Para key={j} p={p} />)}
            </div>
          );
        }
        return <ClauseBlock key={i} clause={c} />;
      })}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="border-b border-ink pb-6" />
          <p className="mt-1 text-sm font-semibold">{recital.landlordName}</p>
          <p className="text-xs text-slate">{roles.principal}</p>
        </div>
        <div>
          <p className="border-b border-ink pb-6" />
          <p className="mt-1 text-sm font-semibold">{recital.tenantName}</p>
          <p className="text-xs text-slate">{roles.counterparty}</p>
        </div>
      </div>
    </div>
  );
}
