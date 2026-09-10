import type { ReactNode } from "react";

import SettingsRail from "./settings-rail";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="settings-page">
      <div className="set-shell">
        <SettingsRail />
        <div className="set-content">{children}</div>
      </div>
    </div>
  );
}
