export default function Logo({ size = "md", showText = true }) {
  const markSize = size === "lg" ? 56 : size === "sm" ? 28 : 40;
  const textSize = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-2xl";

  return (
    <div className="flex items-center gap-3">
      <svg width={markSize} height={markSize} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="94" fill="none" stroke="#DCD4C2" strokeWidth="2" />
        <circle cx="100" cy="100" r="70" fill="none" stroke="#1B3A5C" strokeWidth="6" />
        <circle cx="100" cy="30" r="12" fill="#1B3A5C" />
        <circle cx="160.6" cy="65" r="12" fill="#1B3A5C" />
        <circle cx="160.6" cy="135" r="12" fill="#1B3A5C" />
        <circle cx="100" cy="170" r="12" fill="#1B3A5C" />
        <circle cx="39.4" cy="135" r="12" fill="#1B3A5C" />
        <circle cx="39.4" cy="65" r="14" fill="#A6812E" />
        <circle cx="100" cy="100" r="9" fill="#1B3A5C" />
      </svg>
      {showText && (
        <span className={`font-display ${textSize} text-circle-ink tracking-tight leading-none`}>
          Umgalelo
        </span>
      )}
    </div>
  );
}
