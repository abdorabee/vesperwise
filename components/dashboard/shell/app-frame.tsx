"use client";

import type { CSSProperties, ReactNode } from "react";
import { shellPanelWidth, useShellPanelFrame } from "@/components/dashboard/shell/shell-panel";
import { cn } from "@/lib/utils";

interface AppFrameProps extends React.ComponentProps<"div"> {
  rail: ReactNode;
  list?: ReactNode;
  panel?: ReactNode;
  statusBar?: ReactNode;
}

type FrameStyle = CSSProperties & {
  "--app-frame-list-w": string;
  "--app-frame-panel-w": string;
};

export function AppFrame({
  rail,
  list,
  panel,
  statusBar,
  children,
  className,
  style,
  ...props
}: AppFrameProps) {
  const shellPanel = useShellPanelFrame();
  const panelOpen = shellPanel.managed ? shellPanel.open : Boolean(panel);
  const frameStyle: FrameStyle = {
    "--app-frame-list-w": list ? "var(--list-w)" : "0px",
    "--app-frame-panel-w": shellPanel.managed
      ? shellPanelWidth(shellPanel.open, shellPanel.size)
      : shellPanelWidth(Boolean(panel)),
    ...style,
  };

  return (
    <div
      data-slot="app-frame"
      data-has-list={Boolean(list)}
      data-has-panel={panelOpen}
      className={cn("dashboard-app-frame", className)}
      style={frameStyle}
      {...props}
    >
      <div data-slot="app-frame-rail" className="dashboard-app-frame__rail">
        {rail}
      </div>
      {list ? (
        <aside data-slot="app-frame-list" className="dashboard-app-frame__list">
          {list}
        </aside>
      ) : null}
      <main data-slot="app-frame-main" className="dashboard-app-frame__main">
        {children}
      </main>
      {panel ? (
        <aside data-slot="app-frame-panel" className="dashboard-app-frame__panel">
          {panel}
        </aside>
      ) : null}
      {statusBar ? (
        <div data-slot="app-frame-statusbar" className="dashboard-app-frame__statusbar">
          {statusBar}
        </div>
      ) : null}
    </div>
  );
}
