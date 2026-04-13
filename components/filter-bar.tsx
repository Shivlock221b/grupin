import Link from "next/link";
import { DealFilters } from "@/lib/types";

type FilterBarProps = {
  categories: string[];
  areas: string[];
  selected: DealFilters;
};

const discountBands = ["15-19%", "20-24%", "25%+"];

export function FilterBar({ categories, areas, selected }: FilterBarProps) {
  return (
    <form className="grid gap-4 rounded-[2rem] border border-[rgba(22,38,32,0.12)] bg-white p-6 shadow-[0_18px_50px_rgba(58,80,64,0.08)] md:grid-cols-4">
      <label className="space-y-2 text-sm font-medium text-[var(--forest)]">
        Category
        <select
          defaultValue={selected.category ?? ""}
          name="category"
          className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium text-[var(--forest)]">
        Area
        <select
          defaultValue={selected.area ?? ""}
          name="area"
          className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3"
        >
          <option value="">All areas</option>
          {areas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium text-[var(--forest)]">
        Discount
        <select
          defaultValue={selected.discountBand ?? ""}
          name="discountBand"
          className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3"
        >
          <option value="">All bands</option>
          {discountBands.map((band) => (
            <option key={band} value={band}>
              {band}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end gap-3">
        <button
          type="submit"
          className="flex-1 rounded-full bg-[var(--forest)] px-5 py-3 text-sm font-semibold text-white"
        >
          Apply
        </button>
        <Link
          href="/deals"
          className="rounded-full border border-[rgba(22,38,32,0.16)] px-5 py-3 text-sm font-semibold text-[var(--forest)]"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}
