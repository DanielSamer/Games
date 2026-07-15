import { Link } from "react-router-dom";
import { Bi } from "../components/Bi";

interface Props {
  title: string;
  titleAr: string;
  theme?: "nhie";
}

export function GameStub({ title, titleAr, theme }: Props) {
  const shellClass = theme ? `page-center ${theme}-theme` : "page-center";

  return (
    <div className={shellClass}>
      {theme === "nhie" && (
        <>
          <span className="nhie-stub__scribble nhie-stub__scribble--1" aria-hidden="true">
            🤫
          </span>
          <span className="nhie-stub__scribble nhie-stub__scribble--3" aria-hidden="true">
            👉
          </span>
        </>
      )}
      <div className="stub-card">
        {theme === "nhie" && <span className="nhie-stub__badge">Coming soon · قريباً</span>}
        <h1 className="stub-title">
          <Bi en={title} ar={titleAr} />
        </h1>
        <p className="stub-desc">
          <Bi en="This game isn't built yet — check back soon!" ar="اللعبة لسه مش جاهزة — تابعونا قريب!" />
        </p>
        <Link to="/" className="stub-back">
          ← <Bi en="Back to menu" ar="رجوع للقائمة" />
        </Link>
      </div>
    </div>
  );
}
