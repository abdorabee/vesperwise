import type { SignalResult } from "@/lib/types";

import { fetchTregFundingSignal } from "./funding";
import { fetchTregHiringSignal } from "./hiring";
import { fetchTregNewsSignal } from "./news";
import { fetchTregTechnologySignal } from "./technology";

export {
  TREG_AKTA_SOURCE,
  TREG_AVIATO_SOURCE,
  TREG_HUNTER_SOURCE,
  TREG_PREDICTLEADS_SOURCE,
} from "./shared";
export { fetchTregFirmographics, type TregFirmographicsResult } from "./firmographics";

export async function fetchTregFallbackSignal(
  key: string,
  domain: string,
  signal?: AbortSignal,
): Promise<SignalResult | null> {
  if (key === "funding") {
    return fetchTregFundingSignal(domain, signal);
  }

  if (key === "hiring") {
    return fetchTregHiringSignal(domain, signal);
  }

  if (key === "technology") {
    return fetchTregTechnologySignal(domain, signal);
  }

  if (key === "news") {
    return fetchTregNewsSignal(domain, signal);
  }

  return null;
}
