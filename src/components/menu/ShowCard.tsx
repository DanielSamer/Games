import { Link } from "react-router-dom";
import type { CSSProperties } from "react";
import { useLanguageMode } from "../../context/LanguageMode";

export interface ShowCardData {
  id: "feud" | "chaser" | "nhie";
  to: string;
  accent: string;
  titleLinesEn: string[];
  nameAr: string;
  descEn: string;
  descAr: string;
  tagEn: string;
  tagAr: string;
}

interface Props {
  show: ShowCardData;
  dimmed: boolean;
  style?: CSSProperties;
  onHoverChange: (id: ShowCardData["id"] | null) => void;
}

export function ShowCard({ show, dimmed, style, onHoverChange }: Props) {
  const { mode } = useLanguageMode();
  const bilingual = mode === "bilingual";
  const cardStyle = { ...style, "--accent": show.accent } as CSSProperties;

  return (
    <Link
      to={show.to}
      className={`show-card show-card--${show.id} ${dimmed ? "show-card--dimmed" : ""}`}
      style={cardStyle}
      onMouseEnter={() => onHoverChange(show.id)}
      onMouseLeave={() => onHoverChange(null)}
      onFocus={() => onHoverChange(show.id)}
      onBlur={() => onHoverChange(null)}
    >
      <div className="show-card__marquee">
        <span className="show-card__marquee-texture" aria-hidden="true" />
        <h3 className="show-card__wordmark">
          {show.titleLinesEn.map((line) => (
            <span className="show-card__wordmark-line" key={line}>
              {line}
            </span>
          ))}
        </h3>
        {bilingual && (
          <span className="show-card__name-ar" dir="rtl" lang="ar">
            {show.nameAr}
          </span>
        )}
      </div>

      <div className="show-card__info">
        <p className="show-card__desc" dir={bilingual ? "rtl" : "ltr"} lang={bilingual ? "ar" : "en"}>
          {bilingual ? show.descAr : show.descEn}
          {bilingual && (
            <span className="show-card__desc-ar" dir="ltr" lang="en">
              {show.descEn}
            </span>
          )}
        </p>

        <div className="show-card__footer">
          <span className="show-card__tag" dir={bilingual ? "rtl" : "ltr"} lang={bilingual ? "ar" : "en"}>
            {bilingual ? show.tagAr : show.tagEn}
            {bilingual && (
              <span className="show-card__tag-ar" dir="ltr" lang="en">
                {show.tagEn}
              </span>
            )}
          </span>
          <span className="show-card__arrow" aria-hidden="true">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
