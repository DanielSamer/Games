import { useState } from "react";

interface Props {
  title: string;
  onChange: (title: string) => void;
}

export function EditableTitle({ title, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  const commit = () => {
    const trimmed = draft.trim();
    onChange(trimmed.length > 0 ? trimmed : title);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        className="app-title app-title-input"
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(title);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <h1
      className="app-title"
      onClick={() => {
        setDraft(title);
        setEditing(true);
      }}
      title="Click to rename"
    >
      {title}
    </h1>
  );
}
