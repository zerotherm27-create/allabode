-- Lets staff type a custom grand total (e.g. a package/discounted price) that
-- overrides the sum of line items, while the itemized list stays visible for
-- transparency. Null (the default) means "use the computed sum" as before.

alter table quotations add column grand_total_override numeric(14, 2);
