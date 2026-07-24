import { Bi } from "../Bi";

interface Props {
  categories: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}

// "Adding a new category" isn't a separate action here — typing a new
// value into the create-pack form's category field (with this bar's
// existing values offered as datalist suggestions) is what makes a new
// pill show up. This bar is just the filter/browse side of that.
export function CategoryFilterBar({ categories, selected, onSelect }: Props) {
  if (categories.length === 0) return null;
  return (
    <div className="category-bar" role="tablist" aria-label="Filter by category">
      <button
        type="button"
        role="tab"
        aria-selected={selected === null}
        className={`category-pill${selected === null ? " category-pill--active" : ""}`}
        onClick={() => onSelect(null)}
      >
        <Bi en="All" ar="الكل" />
      </button>
      {categories.map((c) => (
        <button
          key={c}
          type="button"
          role="tab"
          aria-selected={selected === c}
          className={`category-pill${selected === c ? " category-pill--active" : ""}`}
          onClick={() => onSelect(c)}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
