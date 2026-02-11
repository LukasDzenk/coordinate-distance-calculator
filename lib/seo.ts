export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://coordinatedistance.lukasdzenk.com";

export const seoKeywords = [
  "coordinate distance calculator",
  "coordinate distance calculator online",
  "coordinate distance calculator map",
  "coordinate distance calculator minecraft",
  "coordinate distance calculator math",
  "gps coordinate distance calculator",
  "calculate distance between two coordinates on earth",
  "midpoint formula",
  "how to calculate distance between two latitude and longitude excel",
];

export const faqItems = [
  {
    q: "How do I calculate distance between two latitude and longitude points?",
    a: "Use Haversine for fast great-circle estimates or Vincenty for higher ellipsoid accuracy. This tool supports both and visualizes the route.",
  },
  {
    q: "What is the best algorithm for GPS coordinate distance?",
    a: "Vincenty is typically best for precision on Earth ellipsoid. Haversine is very close and usually enough for most product and analytics workflows.",
  },
  {
    q: "What is the midpoint formula for two coordinates?",
    a: "The midpoint between (lat1, lon1) and (lat2, lon2) is ((lat1+lat2)/2, (lon1+lon2)/2). This calculator shows the midpoint and lets you visualize it on the map or globe.",
  },
  {
    q: "How to calculate distance between two latitude and longitude in Excel?",
    a: "Use the Haversine formula in Excel with RADIANS(), SIN(), COS(), and SQRT(). For quick results, paste your coordinates into this coordinate distance calculator online and copy the distance—or use our tool and export for reporting.",
  },
  {
    q: "Can I paste coordinates directly from Google Maps?",
    a: "Yes. The parser accepts common URL formats, decimal pairs, and DMS notations from mapping tools.",
  },
  {
    q: "Can I use this as a Minecraft coordinate distance calculator?",
    a: "Yes. Switch to Flat mode and use Euclidean or Manhattan metrics. You can also output in blocks.",
  },
];
