// 3-D Secure programme marks shown next to the checkout button, per the card
// types Card Train accepts (Visa + Mastercard). Required by GPAP's Website Review.
// Official artwork from the CyberSource integration materials, in public/payment-logos/.

export default function SecureBadges({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <img
        src="/payment-logos/visa-secure.png"
        alt="Visa Secure"
        className="h-6 w-auto"
        loading="lazy"
      />
      <img
        src="/payment-logos/mc-identity-check.png"
        alt="Mastercard Identity Check"
        className="h-6 w-auto"
        loading="lazy"
      />
    </div>
  );
}
