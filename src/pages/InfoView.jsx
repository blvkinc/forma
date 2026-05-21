// ============================================================
// FORMA — static info pages (Terms, Privacy, Trust & safety, API)
// ============================================================
import React from 'react';
import { ArrowLeft } from 'lucide-react';

const PAGES = {
  terms: {
    no: 'A',
    label: 'Legal',
    title: 'Terms of use.',
    intro: 'The short version of how FORMA works between artists, buyers, and the platform.',
    sections: [
      ['Accounts', 'You are responsible for your account and the activity under it. Seller (studio) accounts may list works and open commissions; buyer accounts may bid and book. Roles are set at sign-up and govern what you can do.'],
      ['Auctions', 'Auctions run for a fixed window with anti-snipe extension. Placing a bid is a commitment to pay if you are the top bid when the auction closes. Bids cannot be retracted.'],
      ['Commissions', 'Commission slots are prepaid and held in escrow until the work is delivered and accepted. Disputes are reviewed by FORMA admins.'],
      ['Fees', 'FORMA takes a flat 12% platform fee on settled sales. Net payouts to studios are 85% of escrow after fees, paid on the studio’s payout schedule.'],
      ['Authenticity', 'Listings may be flagged by the community for suspected AI generation. Sellers can restore a flagged listing by submitting process proof. Repeated abuse can lead to removal.'],
      ['Payment status', 'Checkout and payout rails are not enabled yet. Auction invoices and commission escrow states are modeled in the platform, but real fund movement requires the payment gateway integration.'],
    ],
  },
  privacy: {
    no: 'B',
    label: 'Legal',
    title: 'Privacy.',
    intro: 'What FORMA stores and why. We keep this deliberately small.',
    sections: [
      ['What we store', 'Your email, display name, handle, city, bio, and role. Activity you create: bids, follows, watchlist, likes, comments, feed posts, commission bookings, and reports.'],
      ['Why', 'To run the marketplace: authenticate you, show your activity back to you, notify you about bids and commissions, and let studios reach an audience.'],
      ['Sharing', 'Public profile fields and your public activity (listings, feed posts, comments, bids shown by display name) are visible to other users. We do not sell personal data.'],
      ['Notifications', 'Drop-alert subscriptions store the email you enter so we can notify you before public drops. You can remove a subscription at any time.'],
      ['Your data', 'You can edit your profile, change your email and password, and permanently delete your account and owned data from the Profile page.'],
    ],
  },
  trust: {
    no: 'C',
    label: 'Platform',
    title: 'Trust & safety.',
    intro: 'How FORMA keeps listings honest and resolves problems.',
    sections: [
      ['Community AI review', 'Buyers and sellers can flag a listing that looks AI-generated or lacks process history. Enough flags pause bidding until the artist responds.'],
      ['Artist proof', 'Sellers restore a paused listing by submitting process notes and proof links. Reviewed evidence returns the listing with visible authenticity context.'],
      ['Reporting', 'Any artwork, artist, or feed post can be reported. Reports enter an admin queue with priority and are actioned by FORMA moderators.'],
      ['Disputes', 'Commission disputes freeze escrow. Admins can resume work or refund and cancel after review.'],
      ['Enforcement', 'Admins can take down individual artworks and suspend studios that repeatedly violate these rules.'],
    ],
  },
  api: {
    no: 'D',
    label: 'Platform',
    title: 'API.',
    intro: 'FORMA’s data layer runs on Supabase (Postgres + RLS).',
    sections: [
      ['Status', 'There is no public API yet. The application talks to Supabase directly with row-level security enforced per role.'],
      ['Planned', 'A read API for public catalogue data (artists, live auctions, open commissions) is on the roadmap. Write access will stay behind authenticated sessions.'],
      ['Webhooks', 'Outbound webhooks for auction-close and commission-state events are planned alongside the close-out pipeline.'],
      ['Contact', 'For integration and platform questions, reach the team at api@forma.studio.'],
    ],
  },
};

export const InfoView = ({ page, goBack }) => {
  const content = PAGES[page] || PAGES.terms;

  return (
    <main className="fade-in max-w-[900px] mx-auto px-8 py-12">
      <button onClick={goBack} className="mono text-[11px] uppercase tracking-[0.12em] flex items-center gap-2 underline-hover mb-10">
        <ArrowLeft size={12}/> Back
      </button>

      <div className="hair-b pb-8 mb-10">
        <div className="label mb-3">№ {content.no} — {content.label}</div>
        <h1 className="display text-[72px] leading-[0.9]">{content.title}</h1>
        <p className="text-[16px] text-[var(--ink-2)] mt-5 max-w-[560px] leading-relaxed">{content.intro}</p>
      </div>

      <div className="space-y-10">
        {content.sections.map(([heading, body], i) => (
          <div key={heading} className="grid grid-cols-12 gap-6">
            <div className="col-span-3">
              <div className="mono text-[11px] text-[var(--accent)]">0{i + 1}</div>
              <div className="display text-[22px] mt-2">{heading}</div>
            </div>
            <div className="col-span-9">
              <p className="text-[15px] leading-relaxed text-[var(--ink-2)]">{body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="hair-t mt-16 pt-6 mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
        FORMA — Index 24/26 — Last reviewed 2026
      </div>
    </main>
  );
};
