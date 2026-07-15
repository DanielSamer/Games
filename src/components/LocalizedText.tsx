import type { LocalizedText as LocalizedTextType } from "../types/game";
import { useLanguageMode } from "../context/LanguageMode";

interface Props {
  text: LocalizedTextType;
  primaryLang: "en" | "ar";
  className?: string;
  stacked?: boolean;
}

export function LocalizedText({ text, primaryLang, className = "", stacked = true }: Props) {
  const { mode } = useLanguageMode();
  const { en, ar } = text;

  if (mode === "en") {
    const only = en ?? ar;
    const onlyLang = en ? "en" : "ar";
    return (
      <span className={className} dir={onlyLang === "ar" ? "rtl" : "ltr"} lang={onlyLang}>
        {only}
      </span>
    );
  }

  const primary = primaryLang === "en" ? en : ar;
  const secondary = primaryLang === "en" ? ar : en;

  if (!primary && secondary) {
    return (
      <span className={className} dir={primaryLang === "en" ? "rtl" : "ltr"} lang="ar">
        {secondary}
      </span>
    );
  }

  if (!stacked || !secondary) {
    return (
      <span className={className} dir={primaryLang === "ar" ? "rtl" : "ltr"} lang={primaryLang}>
        {primary}
      </span>
    );
  }

  return (
    <span className={`flex flex-col ${className}`}>
      <span dir={primaryLang === "ar" ? "rtl" : "ltr"} lang={primaryLang}>
        {primary}
      </span>
      <span
        dir={primaryLang === "ar" ? "ltr" : "rtl"}
        lang={primaryLang === "ar" ? "en" : "ar"}
        className="opacity-70 text-[0.55em] font-normal"
      >
        {secondary}
      </span>
    </span>
  );
}
