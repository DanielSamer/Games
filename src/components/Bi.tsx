import { useLanguageMode } from "../context/LanguageMode";

interface Props {
  en: string;
  ar: string;
}

/** Renders Arabic as the primary text, plus a secondary English companion when the site is in EN+AR mode. */
export function Bi({ en, ar }: Props) {
  const { mode } = useLanguageMode();
  if (mode === "en") {
    return <>{en}</>;
  }
  return (
    <>
      <span dir="rtl" lang="ar">
        {ar}
      </span>
      <span className="bi-en" dir="ltr" lang="en">
        {en}
      </span>
    </>
  );
}
