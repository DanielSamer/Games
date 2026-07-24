import { X } from "lucide-react";

interface Props {
  strikes: number;
  flash: boolean;
}

export function Strikes({ strikes, flash }: Props) {
  return (
    <>
      <div className="strikes">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`strikes__x ${i < strikes ? "strikes__x--on" : ""}`}>
            <X aria-hidden="true" />
          </div>
        ))}
      </div>
      {flash && (
        <div className="strike-flash" aria-hidden="true">
          <X />
        </div>
      )}
    </>
  );
}
