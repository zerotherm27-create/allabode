import { Svg, Path, Text, View } from "@react-pdf/renderer";

const PHONE_PATH =
  "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z";
const EMAIL_PATH = "M3 5h18v14H3V5zm2.2 2 6.8 5.1L18.8 7H5.2zM5 17h14V8.9l-7 5.2-7-5.2V17z";
const WEB_PATH =
  "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 9h-3.2a15.8 15.8 0 0 0-1.2-5 8.05 8.05 0 0 1 4.4 5zM12 4.1c.8 1.2 1.4 3.7 1.6 6.9h-3.2c.2-3.2.8-5.7 1.6-6.9zM4.3 13h3.9c.1 1.8.4 3.5.8 4.9A8.04 8.04 0 0 1 4.3 13zm3.9-2H4.3A8.04 8.04 0 0 1 9 6.1 20 20 0 0 0 8.2 11zm3.8 8.9c-.8-1.2-1.4-3.7-1.6-6.9h3.2c-.2 3.2-.8 5.7-1.6 6.9zm1.8-8.9h-3.6c.2-3.7.9-6.1 1.8-6.9.9.8 1.6 3.2 1.8 6.9zm1.2 6.9c.4-1.4.7-3.1.8-4.9h3.9a8.04 8.04 0 0 1-4.7 4.9z";

function ContactItem({ path, label, color, fontSize }: { path: string; label: string; color: string; fontSize: number }) {
  const iconSize = fontSize + 1;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 5 }}>
      {/* @react-pdf renders an <Svg> a couple points below the text baseline
          it's centered against — the marginTop nudges it back up level. */}
      <Svg viewBox="0 0 24 24" style={{ width: iconSize, height: iconSize, marginRight: 3, marginTop: -2 }}>
        <Path d={path} fill={color} />
      </Svg>
      <Text style={{ fontSize, color }}>{label}</Text>
    </View>
  );
}

export function PageContactRow({
  phone, email, website, color, fontSize = 7,
}: {
  phone: string;
  email: string;
  website: string;
  color: string;
  fontSize?: number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 3 }}>
      <ContactItem path={PHONE_PATH} label={phone} color={color} fontSize={fontSize} />
      <ContactItem path={EMAIL_PATH} label={email} color={color} fontSize={fontSize} />
      <ContactItem path={WEB_PATH} label={website} color={color} fontSize={fontSize} />
    </View>
  );
}
