import { Image, Text, View } from "@react-pdf/renderer";

export type IdCell = {
  label: string;
  /** e.g. "Passport No. P1302864B · Issued 2019-04-01" */
  meta?: string;
  imageDataUri: string | null;
  /** Shown instead of the image when there is none. */
  note?: string;
};

/**
 * Print size by how many IDs share the page (content area is roughly 524 x 582 pt): the fewer IDs,
 * the bigger each prints. A real ID card is ~245 pt wide, so 250 is about life-size.
 */
export function idSizeFor(count: number): { columns: 1 | 2; width: number; maxHeight: number } {
  if (count <= 2) return { columns: 1, width: 330, maxHeight: 215 };
  if (count <= 4) return { columns: 2, width: 250, maxHeight: 160 };
  return { columns: 2, width: 210, maxHeight: 130 };
}

/**
 * "COPY OF Valid IDs" body: IDs laid out two per row so a typical contract (landlord, tenant and a few
 * occupants) fits on one page instead of one ID per half-page. Each cell is unbreakable.
 */
export function IdGrid({ cells }: { cells: IdCell[] }) {
  const size = idSizeFor(cells.length);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
      {cells.map((c, i) => (
        <View key={i} style={{ width: size.columns === 1 ? "100%" : "50%", paddingRight: 12, marginBottom: 14 }} wrap={false}>
          <Text style={{ fontFamily: "Helvetica-Bold", borderBottomWidth: 1, borderBottomColor: "#16202c", paddingBottom: 2, marginBottom: 4 }}>
            {c.label}
          </Text>
          {c.meta ? <Text style={{ fontSize: 8, color: "#5b6573" }}>{c.meta}</Text> : null}
          {c.imageDataUri ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={c.imageDataUri} style={{ width: size.width, maxHeight: size.maxHeight, objectFit: "contain", marginTop: 4, alignSelf: "flex-start" }} />
          ) : (
            <Text style={{ fontSize: 8, color: "#5b6573", marginTop: 4 }}>{c.note ?? "ID image unavailable."}</Text>
          )}
        </View>
      ))}
    </View>
  );
}
