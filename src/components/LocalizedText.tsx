import type { LocalizedText as LocalizedTextType } from "../types/game";
import { useLanguageMode } from "../context/LanguageMode";

interface Props {
  text: LocalizedTextType;
  primaryLang: "en" | "ar";
  className?: string;
  stacked?: boolean;
}

export function LocalizedText({ text, className = "" }: Props) {
  const { mode } = useLanguageMode();
  const { en, ar } = text;

  const preferred = mode === "ar" ? ar : en;
  const only = preferred ?? (mode === "ar" ? en : ar);
  const onlyLang = preferred === ar ? "ar" : "en";

  return (
    <span className={className} dir={onlyLang === "ar" ? "rtl" : "ltr"} lang={onlyLang}>
      {only}
    </span>
  );
}
