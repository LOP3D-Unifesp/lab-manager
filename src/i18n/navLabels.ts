import type { NavigationItem } from "../lib/navigation";
import type { MessageKey } from "./catalog";

export function navLabelKey(item: NavigationItem, kind: "desktop" | "mobile") {
  return `nav.${kind}.${item.path}` as MessageKey;
}
