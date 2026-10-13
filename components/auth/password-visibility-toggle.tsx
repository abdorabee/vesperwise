"use client";

import { Eye, EyeOff } from "lucide-react";

import { IconTooltip, useIconTooltip } from "@/components/ui/icon-tooltip";

interface PasswordVisibilityToggleProps {
  isVisible: boolean;
  onToggle: (isVisible: boolean) => void;
}

export function PasswordVisibilityToggle({ isVisible, onToggle }: PasswordVisibilityToggleProps) {
  const tip = useIconTooltip();
  return (
    <button
      type="button"
      className="auth-password-toggle"
      onClick={() => onToggle(!isVisible)}
      {...tip.triggerProps}
    >
      {isVisible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
      <IconTooltip id={tip.id}>{isVisible ? "Hide password" : "Show password"}</IconTooltip>
    </button>
  );
}
