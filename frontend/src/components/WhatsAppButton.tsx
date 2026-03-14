/**
 * Floating WhatsApp contact button.
 * Fixed bottom-right, z-40 (below app modals at z-50).
 * On mobile shrinks to 52px and sits higher to avoid browser chrome.
 */
export default function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/5492615366672"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex items-center justify-center w-14 h-14 rounded-full shadow-lg shadow-black/20 transition-transform hover:scale-110 active:scale-95 sm:bottom-6 sm:right-6"
      style={{ backgroundColor: "#25D366" }}
    >
      {/* Official WhatsApp logo SVG */}
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-8 h-8"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M24 4C12.954 4 4 12.954 4 24c0 3.498.902 6.785 2.487 9.64L4.08 43.02a1 1 0 0 0 1.224 1.224l9.38-2.407A19.94 19.94 0 0 0 24 44c11.046 0 20-8.954 20-20S35.046 4 24 4Z"
          fill="white"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M17.147 14.647c-.408-.93-1.02-.91-1.39-.926-.36-.015-.773-.018-1.185-.018-.413 0-1.083.155-1.65.775-.566.62-2.163 2.113-2.163 5.153 0 3.04 2.215 5.977 2.524 6.391.308.413 4.297 6.87 10.596 9.362 1.48.574 2.636.916 3.537 1.173 1.486.424 2.838.364 3.906.22 1.192-.16 3.67-1.5 4.188-2.949.518-1.449.518-2.692.362-2.95-.155-.259-.567-.413-.98-.62-.413-.207-2.441-1.21-2.82-1.345-.38-.134-.655-.207-1.03.207-.375.413-1.444 1.345-1.77 1.623-.325.275-.65.31-1.209.104-.56-.207-2.364-.873-4.505-2.783-1.664-1.487-2.788-3.324-3.113-3.883-.325-.56-.035-.864.245-1.143.25-.25.56-.65.84-.976.278-.325.37-.56.554-.93.186-.372.094-.697-.046-.975-.14-.275-1.023-2.576-1.431-3.51Z"
          fill="#25D366"
        />
      </svg>

      {/* Pulse ring — desktop only, would be too distracting on mobile */}
      <span
        className="absolute inset-0 rounded-full animate-ping opacity-30 hidden sm:block"
        style={{ backgroundColor: "#25D366" }}
      />
    </a>
  );
}
