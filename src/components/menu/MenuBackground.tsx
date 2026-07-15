import type { CSSProperties } from "react";

interface Props {
  accent: string | null;
}

export function MenuBackground({ accent }: Props) {
  const tintStyle = {
    "--menu-tint-accent": accent ?? "transparent",
    opacity: accent ? 1 : 0,
  } as CSSProperties;

  return (
    <div className="menu-bg" aria-hidden="true">
      <div className="menu-bg__base" />
      <div className="menu-bg__tint" style={tintStyle} />
      <div className="menu-bg__grain" />
    </div>
  );
}
