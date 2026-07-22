import { useLanguageMode } from "../context/LanguageMode";

interface Props {
  en: string;
  ar: string;
}

export function Bi({ en, ar }: Props) {
  const { mode } = useLanguageMode();
  if (mode === "ar") {
    return (
      <span dir="rtl" lang="ar">
        {ar}
      </span>
    );
  }
  return <>{en}</>;
}
