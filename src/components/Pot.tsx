interface Props {
  pot: number;
}

export function Pot({ pot }: Props) {
  return (
    <div className="pot">
      <div className="pot__label">Pot</div>
      <div className="pot__value">{pot}</div>
    </div>
  );
}
