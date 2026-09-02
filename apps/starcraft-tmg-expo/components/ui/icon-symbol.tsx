import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "book.fill": "menu-book",
  "hammer.fill": "build",
  "wrench.fill": "handyman",
  "flag.fill": "flag",
  "gearshape.fill": "settings",
  "gamecontroller.fill": "sports-esports",
  "dice.fill": "casino",
  "shield.fill": "shield",
  "bolt.fill": "bolt",
  "person.2.fill": "groups",
  "plus": "add",
  "minus": "remove",
  "trash.fill": "delete",
  "square.and.arrow.up": "share",
  "doc.on.clipboard": "content-paste",
  "arrow.down.circle": "download",
  "arrow.clockwise": "refresh",
  "xmark": "close",
  "checkmark": "check",
  "magnifyingglass": "search",
  "info.circle": "info",
  "exclamationmark.triangle": "warning",
  "star.fill": "star",
  "chart.bar.fill": "bar-chart",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const mappedName = MAPPING[name as string] || "help";
  return <MaterialIcons color={color} size={size} name={mappedName} style={style} />;
}
