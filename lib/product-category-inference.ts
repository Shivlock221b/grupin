import { FetchedProduct } from "@/lib/product-fetchers";

export const productCategoryOptions = ["Skincare", "Haircare", "Makeup", "Accessories", "Fragrance", "Bodycare", "Facial care"] as const;

export type ProductCategory = typeof productCategoryOptions[number];

const categoryRules: Array<{ category: ProductCategory; keywords: string[] }> = [
  {
    category: "Haircare",
    keywords: [
      "hair",
      "shampoo",
      "conditioner",
      "hair mask",
      "hair serum",
      "scalp",
      "anti dandruff",
      "leave-in",
      "bonding concentrate",
      "hairfall",
      "hair fall",
      "keratin",
    ],
  },
  {
    category: "Fragrance",
    keywords: ["perfume", "fragrance", "eau de parfum", "eau de toilette", "body mist", "deodorant", "deo", "cologne"],
  },
  {
    category: "Makeup",
    keywords: [
      "lipstick",
      "lip gloss",
      "lip liner",
      "foundation",
      "concealer",
      "compact",
      "mascara",
      "eyeliner",
      "kajal",
      "brow",
      "blush",
      "highlighter",
      "primer",
      "setting spray",
      "nail enamel",
      "palette",
      "makeup",
    ],
  },
  {
    category: "Facial care",
    keywords: ["face wash", "cleanser", "face cleanser", "toner", "face serum", "sunscreen", "moisturizer", "moisturiser", "face cream", "face mask"],
  },
  {
    category: "Skincare",
    keywords: ["skin", "skincare", "serum", "retinol", "vitamin c", "hyaluronic", "niacinamide", "spf", "acne", "cream", "lotion"],
  },
  {
    category: "Bodycare",
    keywords: ["body wash", "body lotion", "body butter", "shower gel", "hand cream", "foot cream", "body cream", "body oil"],
  },
  {
    category: "Accessories",
    keywords: ["brush", "sponge", "applicator", "comb", "clip", "mirror", "sharpener", "pouch", "tweezer", "lash curler"],
  },
];

function walkStrings(value: unknown, output: string[], seen = new Set<unknown>()) {
  if (!value || seen.has(value)) return;
  if (typeof value === "string") {
    output.push(value);
    return;
  }
  if (typeof value !== "object") return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item) => walkStrings(item, output, seen));
    return;
  }
  Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
    if (/categor|type|name|title|description|breadcrumb/i.test(key)) {
      walkStrings(item, output, seen);
    }
  });
}

export function inferProductCategory(product: Pick<FetchedProduct, "title" | "description" | "brandName" | "variantType" | "raw">): ProductCategory | null {
  const strings = [
    product.title,
    product.description,
    product.brandName,
    product.variantType,
  ].filter(Boolean).map(String);
  walkStrings(product.raw, strings);

  const haystack = strings.join(" ").toLowerCase();
  if (!haystack.trim()) return null;

  for (const rule of categoryRules) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return rule.category;
    }
  }

  return null;
}
