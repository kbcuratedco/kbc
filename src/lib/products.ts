export type ProductCategory = "stationery" | "banner" | "sports";

export interface Product {
  id: string;
  title: string;
  category: ProductCategory;
  price: number; // base price (banners: base = 5ft price)
  image: string; // primary image (kept for back-compat, mirrors images[0])
  images?: string[]; // all product images (first = primary)
  description: string;
  freeShipping?: boolean;
  digital?: boolean;
}

export const BANNER_SIZES = [
  { id: "5ft", label: "5 ft", price: 45 },
  { id: "7ft", label: "7 ft", price: 60 },
  { id: "9ft", label: "9 ft", price: 80 },
] as const;

export type BannerSizeId = (typeof BANNER_SIZES)[number]["id"];

export const PRODUCTS: Product[] = [
  // Stationery
  {
    id: "stat-boys",
    title: "Boys Custom Stationery Set",
    category: "stationery",
    price: 25,
    image: "https://i.etsystatic.com/64278780/r/il/7300eb/8095917575/il_340x270.8095917575_jem6.jpg",
    description: "Variety notecards, 24 count. Hand-drawn designs for the little gentleman in your life.",
    freeShipping: true,
  },
  {
    id: "stat-girls",
    title: "Girls Custom Stationery Set",
    category: "stationery",
    price: 25,
    image: "https://i.etsystatic.com/64278780/r/il/9ec395/8045499826/il_340x270.8045499826_20wf.jpg",
    description: "Variety notecards, 24 count. Playful hand-painted florals & motifs.",
    freeShipping: true,
  },
  {
    id: "stat-lemon",
    title: "Lemon Notecards",
    category: "stationery",
    price: 25,
    image: "https://i.etsystatic.com/64278780/r/il/eacdf3/8093412077/il_340x270.8093412077_qsc0.jpg",
    description: "Custom stationery set, 24 count. Sun-kissed lemon watercolors.",
    freeShipping: true,
  },
  {
    id: "stat-bow",
    title: "Girl Bow Notecards",
    category: "stationery",
    price: 25,
    image: "https://i.etsystatic.com/64278780/r/il/390c0a/8095919521/il_340x270.8095919521_j99t.jpg",
    description: "Custom girl stationery set, 24 count. Sweet hand-drawn bows.",
    freeShipping: true,
  },
  {
    id: "stat-camp",
    title: "Summer Camp Keep-in-Touch Card",
    category: "stationery",
    price: 7,
    image: "https://i.etsystatic.com/64278780/r/il/bc48db/8216413186/il_340x270.8216413186_t3bf.jpg",
    description: "Digital download template for camp letters home.",
    digital: true,
  },
  // Banners (base price = 5ft)
  {
    id: "ban-birthday",
    title: "Birthday Banner",
    category: "banner",
    price: 45,
    image: "https://i.etsystatic.com/64278780/r/il/4c62c2/8080686983/il_340x270.8080686983_8yy8.jpg",
    description: "Hand-painted birthday banner, made to your theme and colors.",
    freeShipping: true,
  },
  {
    id: "ban-holiday",
    title: "Holiday Banner",
    category: "banner",
    price: 45,
    image: "https://i.etsystatic.com/64278780/r/il/5a347a/7641111754/il_340x270.7641111754_15hw.jpg",
    description: "Custom holiday banner painted by hand for your celebration.",
    freeShipping: true,
  },
  {
    id: "ban-school",
    title: "School Banner",
    category: "banner",
    price: 45,
    image: "https://i.etsystatic.com/64278780/r/il/1ab0f9/8080691361/il_340x270.8080691361_jcep.jpg",
    description: "Back-to-school or milestone banner, personalized for your student.",
    freeShipping: true,
  },
  {
    id: "ban-gameday",
    title: "Game Day Banner",
    category: "banner",
    price: 45,
    image: "https://i.etsystatic.com/64278780/r/il/ce2052/8080688947/il_340x270.8080688947_csdy.jpg",
    description: "Bring on the spirit — banner in your team's colors and logos.",
    freeShipping: true,
  },
  {
    id: "ban-schoolsout",
    title: "School's Out Banner",
    category: "banner",
    price: 45,
    image: "https://i.etsystatic.com/64278780/r/il/7760f0/8080693701/il_340x270.8080693701_ec2w.jpg",
    description: "End-of-school celebration banner, hand-painted just for the graduate.",
    freeShipping: true,
  },
  // Sports
  {
    id: "sport-balls",
    title: "Custom Hand-Painted Sports Balls",
    category: "sports",
    price: 25,
    image: "https://i.etsystatic.com/64278780/r/il/7af67e/8080579409/il_340x270.8080579409_tass.jpg",
    description: "Baseballs, softballs & more — painted by hand for your team.",
  },
  {
    id: "sport-volleyball",
    title: "Custom Hand-Painted Volleyballs",
    category: "sports",
    price: 55,
    image: "https://i.etsystatic.com/64278780/r/il/d61c60/7641170266/il_340x270.7641170266_9iw1.jpg",
    description: "Regulation volleyballs hand-painted with player name, number, and team art.",
    freeShipping: true,
  },
  {
    id: "sport-football",
    title: "Custom Hand-Painted Footballs",
    category: "sports",
    price: 89.99,
    image: "https://i.etsystatic.com/64278780/r/il/01da70/7689099693/il_340x270.7689099693_ot3i.jpg",
    description: "Full-size footballs, hand-painted with your player's design.",
    freeShipping: true,
  },
];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  stationery: "Stationery",
  banner: "Banners",
  sports: "Sports",
};