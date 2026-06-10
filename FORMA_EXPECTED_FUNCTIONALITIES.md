# FORMA Expected Functionalities

Last updated: 2026-06-10

This document defines the expected production functionality for FORMA across
every user type. It is intended to be the product and QA source of truth for
the current Supabase-backed implementation, with payment gateways intentionally
kept as the only major deferred product integration.

## Product Summary

FORMA is a curated digital art marketplace for collectors and verified artists.
The platform combines:

- Public discovery of artists, artwork, auctions, commissions, and editorial
  content.
- Buyer workflows for bidding, collecting, following, commenting, reporting,
  booking commissions, and participating in authenticity review.
- Seller workflows for onboarding, studio management, artwork listings,
  auctions, commissions, feed publishing, proof submission, and settlement
  visibility.
- Admin workflows for seller approval, user safety, artwork moderation,
  AI-authenticity review, dispute handling, auction close-out, settlement
  review, delivery monitoring, and audit inspection.

## Role Model

FORMA must keep user roles separated at the database, API, and UI layers.

| Role | Purpose | Account State | Primary Access |
|---|---|---|---|
| Guest | Public visitor | No authenticated session | Read public marketplace content and start auth/onboarding |
| Buyer | Collector/customer | Authenticated profile with buyer role | Bid, follow, save, comment, report, book commissions, manage account |
| Seller applicant | Buyer or new user applying to sell | Application pending or rejected | Submit onboarding evidence and track review status |
| Verified seller | Approved artist/studio owner | Artist role plus admin verification | Manage studio, list work, publish posts, offer commissions, view settlements |
| Admin | Platform operator | Admin role assigned only through protected path | Review queues, moderate, settle, audit, configure operational actions |
| System worker | Scheduled/service process | Service-role only | Close auctions, expire content, deliver queued email/webhook jobs |

### Role Boundary Rules

- One email address maps to one user account.
- The same email must not create separate buyer and seller accounts.
- A buyer who wants to sell must use "Apply to sell" from the same account.
- Users must not self-assign admin, artist, verified, or suspended status.
- A seller must not access studio setup, artwork listing, commission creation,
  or seller feed publishing until admin approval is complete.
- Admins review and moderate. They must not appear as normal marketplace social
  participants unless explicitly using a test account.
- Service-role functionality must never run from browser code.

## Global Interface Expectations

- The homepage is promotional and editorial. It should show featured artists,
  featured works, platform positioning, and curated content.
- Search and catalogue browsing belong on a dedicated Explore page, not the
  homepage body.
- Creation, edit, review, booking, report, dispute, and moderation forms should
  be modal dialogs or dedicated pages. They should not stack as long embedded
  forms inside unrelated page sections.
- Important forms must validate required fields before submission.
- User-facing labels must reflect the real state. For example, "Closing soon"
  should only appear for auctions that are actually near their end time.
- Text animation should be restrained and applied mainly to headers or major
  editorial moments. Body copy, forms, tables, and controls should remain calm
  and readable.
- The Swiss design direction should stay clean, grid-based, typographic,
  high-contrast, and functional.
- The app should be responsive before launch, even if responsiveness work is
  temporarily deprioritized during functionality development.

## Guest Functionality

Guests are public visitors who have not signed in.

### Discovery

- View the landing page with featured platform content.
- Browse the Explore page with public artwork listings.
- Search and filter public artworks by query, category, status, price, artist,
  and availability.
- View public artwork detail pages.
- View public artist cards and artist profile pages.
- View public commission offerings.
- View public feed posts and public comments where allowed.
- View trust and authenticity signals that are safe to expose publicly.

### Authentication Entry Points

- Sign up as a buyer.
- Start seller onboarding before account confirmation when choosing to sell.
- Sign in with email/password.
- Sign in with Google OAuth when enabled in Supabase.
- Request password reset.
- Confirm account email from a white-labeled FORMA email.

### Guest Restrictions

- Cannot bid.
- Cannot like, save, follow, comment, vote, report, book, or message.
- Cannot upload files.
- Cannot create a seller application without completing the required onboarding
  and account creation flow.
- Cannot access buyer dashboard, seller studio, or admin console.

## Buyer Functionality

Buyers are authenticated collectors and customers.

### Account And Profile

- Create a buyer account.
- Confirm email address through branded FORMA email.
- Sign in and sign out reliably.
- Reset password.
- Change email when Supabase email-change confirmation is configured.
- Edit display name, bio, city/location, and avatar.
- Use an auto-generated handle that is stable and read-only after creation,
  unless an admin-only rename policy is later introduced.
- View own notifications.
- Delete or deactivate account when supported by policy.

### Marketplace Browsing

- Browse/search/filter artworks on Explore.
- View artwork detail including title, artist, media, price, current bid,
  auction timing, status, comments, authenticity state, and availability.
- View artist profile cards without exposing private profile data such as email.
- View public seller studios and commission offerings.

### Auction Participation

- Place valid bids on active auctions.
- See current bid, next minimum bid, bid count, and auction end time.
- Receive feedback when a bid is too low, late, invalid, or blocked.
- Be blocked from bidding on:
  - own listings,
  - ended auctions,
  - inactive/taken-down artworks,
  - AI-restricted artworks,
  - auctions where role or rate-limit checks fail.
- Benefit from anti-snipe extension rules when enabled.
- Receive in-app notification when outbid.
- View won auctions and invoice/settlement status in the buyer dashboard.

### Buyer Dashboard

- View active bids.
- View watched or saved artworks.
- View acquired works.
- View auction invoices and payment status.
- View commission bookings and their current state.
- Open commission threads from dashboard entries.
- View relevant notifications.

### Social And Community

- Follow and unfollow artists.
- Like and unlike artworks.
- Save and unsave feed posts.
- Like feed posts.
- Comment on feed posts.
- Comment on artwork detail pages.
- Report artwork, feed posts, comments, commissions, or users.
- Vote on suspected AI-generated artwork.
- Remove or change own AI vote when allowed.

### Commission Booking

- Browse available commission boards and slots.
- Submit a booking request with a clear brief and required fields.
- See price, timeline, slot status, and seller terms before booking.
- Open a commission thread after booking.
- Send messages in the commission thread.
- Mark messages as milestones where allowed by role.
- Cancel, accept delivery, or open a dispute according to the commission state
  machine.
- View escrow or invoice placeholders until payment integration exists.

### Drop Alerts

- Subscribe to drop alerts with a visible email field.
- Receive drop-alert notifications when the delivery worker and email provider
  are configured.
- Unsubscribe or manage alert preferences when supported.

### Buyer Restrictions

- Cannot list artworks.
- Cannot create or edit seller studios.
- Cannot create commission boards.
- Cannot publish seller feed posts.
- Cannot approve sellers, moderate reports, close auctions, or mark invoices
  paid.
- Should not be shown advanced webhook tools as a normal dashboard feature.
  Webhooks may exist only under advanced account/developer settings if enabled.

## Seller Applicant Functionality

Seller applicants are users applying to become verified sellers.

### Seller Onboarding Entry

- New users choosing "Apply to sell" should enter the onboarding form before
  email confirmation is sent.
- Existing buyers should be able to apply to sell from their account without
  creating a second account.
- The application should collect enough evidence for admin review before the
  user can access seller tools.

### Required Application Data

The onboarding form should validate at minimum:

- Legal or display name.
- Studio or artist name.
- Email.
- Location or operating region when required.
- Portfolio links.
- Social/profile links.
- Artist statement or process description.
- Sample artwork images.
- Process/work-in-progress proof images when available.
- Mediums, categories, or specialties.
- Confirmation that submitted work is owned by the applicant.
- Agreement to platform seller rules.

### Application States

- Draft: applicant has started but not submitted.
- Submitted: applicant has completed required fields and awaits review.
- Needs revision: admin requests changes or more proof.
- Approved: applicant becomes a verified seller.
- Rejected: applicant is not allowed to sell unless reapplication is permitted.

### Applicant Restrictions

- Cannot create a studio before approval.
- Cannot list artwork before approval.
- Cannot upload artwork listing images before approval.
- Cannot create commission boards before approval.
- Cannot publish seller feed posts before approval.
- Cannot bypass onboarding by changing profile fields or direct API calls.

## Verified Seller Functionality

Verified sellers are approved artists or studios.

### Studio Setup

- Create a studio after admin approval.
- Edit studio name, description, banner/avatar, location, social links, and
  portfolio links.
- View onboarding/verification state.
- View public studio profile as buyers see it.
- Suspend or hide studio only through allowed seller/admin actions.

### Artwork Listing

- Create new artwork listings.
- Upload artwork images to protected storage.
- Add title, description, medium, dimensions or format, tags, category, edition
  details, starting bid, reserve rules where supported, and auction duration.
- Preview listing before publishing.
- Edit draft listings.
- Publish eligible listings.
- View open inventory and listing status.
- Retire, cancel, or update listings according to marketplace policy.
- Be blocked from listing if seller verification is missing, studio is
  suspended, rate limits are exceeded, or required fields are invalid.

### Auction Management

- View live auction value and bid count.
- View bid activity on own listings.
- Receive notifications for auction close, sale, invoice pending, and paid
  status.
- See anti-snipe extensions when they occur.
- View settlements and payout status in Studio.
- Cannot bid on own artwork.
- Cannot manually choose auction winners.

### Commission Board

- Create commission offerings after approval.
- Define title, description, medium, price, available slots, delivery estimate,
  revision policy, and terms.
- Open or close commission availability.
- View bookings.
- Accept, progress, deliver, cancel, or dispute commissions according to the
  commission state machine.
- Message buyers inside commission threads.
- Mark milestones where allowed.
- View commission escrow/invoice status until payment gateway exists.

### Seller Feed

- Publish feed posts as a verified seller.
- Attach artwork references or media where supported.
- Edit or delete own feed posts.
- View comments, likes, saves, and engagement.
- Receive notifications for follows, likes, comments, and reports where allowed.
- Feed posts should expire or be removed according to configured feed TTL rules
  if that product rule remains active.

### AI Authenticity Proof

- See when an artwork is AI-voted or restricted.
- Submit process proof for a flagged artwork.
- Upload proof images or supporting media.
- Add written process notes.
- Track proof review status.
- Be notified when proof is accepted or rejected.
- Have bidding restored when proof is accepted and policy allows.

### Seller Restrictions

- Cannot approve own application.
- Cannot edit admin moderation outcomes.
- Cannot remove AI votes directly.
- Cannot mark own invoices paid.
- Cannot access other sellers' private studio, proof, or settlement data.

## Admin Functionality

Admins are platform operators. Admin powers must be explicit, audited, and
protected by RLS/RPC checks.

### Admin Dashboard

- View platform overview metrics.
- View queue counts for seller applications, reports, AI reviews, disputes,
  settlements, delivery jobs, and audit log.
- Navigate between admin sections without losing context.
- See errors from failed admin actions clearly.

### Seller Application Review

- View all seller applications.
- Open a detailed application packet.
- Review sample artwork images, proof images, portfolio links, social links,
  artist statement, and account metadata.
- Approve a seller application.
- Reject a seller application with a review note.
- Request revisions where supported.
- Approval must create or update the seller/artist record and set profile
  verification through the seller-review path only.
- Generic KYC/profile verification must not approve artist selling rights.
- Rejection must keep seller tools locked.
- All decisions must be audited.

### User And KYC Management

- View users and public/private profile fields appropriate for admins.
- Verify or revoke non-seller profile states where product policy allows.
- Suspend or unsuspend users/studios.
- Avoid generic verification for seller approval.
- See whether a user is buyer, seller applicant, verified seller, suspended, or
  admin.

### Artwork Moderation

- View reported artwork and moderation review items.
- Open the artwork, artist profile, report reason, report details, and relevant
  context.
- Decide whether to keep, restrict, take down, or reinstate artwork.
- Record admin notes and decision reason.
- Notify affected users where notification delivery is configured.
- Audit every moderation decision.

### AI Authenticity Moderation

- View AI-voted artworks and vote counts.
- View submitted seller proof.
- Accept proof and restore eligible listing behavior.
- Reject proof and keep restrictions or take down listing.
- Clear false-positive voting where policy allows.
- Escalate repeat issues to broader account review.
- Audit all proof decisions.

### Social Moderation

- View reports on feed posts, artwork comments, feed comments, artists, buyers,
  commissions, or other supported targets.
- Open the reported content in context.
- Remove, hide, dismiss, or escalate reports according to policy.
- Avoid acting as a normal social participant from the admin account.

### Commission Disputes

- View commission disputes.
- Inspect booking, buyer, seller, thread messages, milestones, and dispute
  reason.
- Resolve disputes with an admin decision.
- Update commission state according to policy.
- Record audit notes.

### Auction Close-Out And Settlements

- View ended auctions that need settlement.
- Manually close ended auctions when needed.
- Support scheduled/system close-out for production.
- Create or inspect auction settlements.
- Notify buyer and seller where delivery is configured.
- Mark invoices paid manually only until payment gateway integration exists.
- See payout summaries and settlement state.

### Delivery Outbox

- View queued email and webhook delivery jobs.
- Inspect status, attempts, available time, and last error.
- Retry or mark handled where admin tooling supports it.
- Confirm delivery worker is processing rows in production.

### Webhook And Developer Operations

- View webhook endpoint health when relevant.
- Validate HTTPS-only endpoints.
- Validate supported event filters.
- Support event types such as notifications, outbid, new follower, feed like,
  feed comment, artwork comment, auction won, auction closed, auction paid,
  seller approved, seller rejected, proof accepted, proof rejected, commission
  booked, commission status, commission message, commission milestone, and drop
  alert.

### Audit Log

- View sensitive platform actions.
- Filter by actor, action, entity, and time where supported.
- Ensure seller approval, moderation, settlement, delivery, and admin role
  actions are recorded.

## System Worker Functionality

System workers are service-role processes that perform tasks users should not
run from the browser.

### Scheduled Jobs

- Expire artwork listings after the configured listing window.
- Delete or hide expired feed posts when feed TTL is enabled.
- Close ended auctions automatically.
- Generate settlements and notifications from close-out.
- Run with service-role or security-definer protections, not browser sessions.

### Delivery Worker

- Claim due `delivery_outbox` rows.
- Send notification emails through the configured email provider.
- Send webhook POST requests to active endpoints.
- Sign webhook requests when signing secret is configured.
- Retry failures with backoff.
- Record attempts, last error, and final status.
- Avoid leaking service-role keys or secrets to the frontend.

## Core Feature Modules

### Authentication And Email

Expected behavior:

- Supabase Auth email templates are white-labeled as FORMA.
- Sender name, subject, and body should not appear as generic Supabase branding
  in production.
- Google OAuth works only after the provider and redirect URLs are configured.
- Password reset and email-change flows require Supabase SMTP configuration.
- Logout must clear the Supabase session and update UI state immediately.

Production gate:

- Confirm signup email template, reset email template, change-email template,
  SMTP sender, Google provider, local redirect URL, and production redirect URL.

### Profile And Identity

Expected behavior:

- Profiles are private by default.
- Public profile cards expose only display-safe identity fields.
- Email is visible only to the account owner and admins.
- Avatars upload to a protected storage path owned by the user.
- Handles are generated automatically and remain stable.
- Display name can be edited by the user.

Production gate:

- RLS must prevent public full-profile reads.
- Storage policies must allow only owner/admin avatar writes.
- Profile update errors must be user-readable.

### Explore And Catalogue

Expected behavior:

- Explore owns search and filtering.
- Homepage stays editorial/promotional.
- Empty states are intentional and helpful.
- Artwork cards show accurate status.
- Artist cards show public-safe data.

Production gate:

- No local mock catalogue data should be used in production flows.
- Public catalogue reads should work anonymously.
- Anonymous writes should be blocked.

### Auctions

Expected behavior:

- Auctions have clear start/end state.
- Bids are validated server-side.
- Minimum increments are enforced.
- Anti-snipe extension rules are enforced once.
- Ended auctions close into settlements.
- Buyer invoice surfaces and seller settlement surfaces stay consistent.

Production gate:

- Automatic close-out job must run.
- Settlement creation must not be client-controlled.
- Payment gateway remains the only missing settlement completion step.

### Commissions

Expected behavior:

- Sellers create commission boards only after approval.
- Buyers book available slots.
- Threads are created from bookings.
- Buyers and sellers can message in the thread.
- Milestones and status transitions follow the commission state machine.
- Disputes route to admin.

Production gate:

- Booking, message, milestone, dispute, and status transitions must be tested
  for buyer, seller, and admin roles.

### Social Network

Expected behavior:

- Buyers and sellers can follow, like, save, comment, report, and vote.
- Verified sellers can publish feed posts.
- Buyers cannot publish seller feed posts unless a separate buyer-post product
  scope is approved later.
- Admins moderate social activity rather than participating socially.
- Social actions create notifications where appropriate.

Production gate:

- Rate limits must protect follows, likes, saves, comments, reports, AI votes,
  and messages.
- RLS must prevent cross-user edits/deletes.

### Community AI Art Filtration

Expected behavior:

- Buyers and sellers can vote down or flag artwork they suspect is AI-generated
  or misrepresented.
- Vote thresholds can restrict bidding or visibility according to policy.
- The seller can submit process proof.
- Admins review proof and decide whether to restore, restrict, take down, or
  reject the listing.
- Decisions notify relevant parties and are audited.

Production gate:

- AI vote, restriction, proof upload, proof review, restore, and takedown paths
  must be tested against Supabase.

### Notifications

Expected behavior:

- Users receive in-app notifications for relevant marketplace events.
- Drop alerts store subscriber intent and deliver when worker/email is enabled.
- Outbid, follow, comment, auction won, seller approved/rejected, proof review,
  commission updates, and payment/settlement events should enqueue
  notifications where applicable.

Production gate:

- Delivery worker must be deployed and scheduled for email/webhook delivery.
- In-app notifications should still work if outbound email is disabled.

### Webhooks

Expected behavior:

- Webhooks are advanced account/studio tools, not required buyer basics.
- Endpoint URLs must be HTTPS.
- Users can choose supported event filters.
- Endpoints can be paused, reactivated, and deleted.
- Webhook deliveries are queued and retried by the worker.

Production gate:

- Webhook signing secret must be configured.
- Endpoint ownership and event filters must be enforced by RLS/RPC.

## Security Requirements

- Enable RLS on all exposed tables.
- Keep service-role keys out of all browser bundles.
- Keep admin and seller verification controlled by database policies and
  protected RPCs.
- Prevent self-assignment of privileged roles through auth metadata.
- Use storage policies for avatar, artwork, and seller-application media.
- Validate file type, size, and ownership for uploads.
- Rate-limit abusive actions:
  - bids,
  - comments,
  - commission messages,
  - commission bookings,
  - reports,
  - AI votes,
  - follows,
  - likes,
  - saves.
- Audit sensitive actions:
  - seller approval/rejection,
  - profile verification changes,
  - suspensions,
  - artwork takedown/reinstate,
  - AI proof decisions,
  - dispute decisions,
  - auction close-out,
  - settlement paid marking,
  - delivery admin actions.
- Public reads must never expose private email, private profile fields, private
  seller proof, private application media, private commission threads, or
  other users' settlement data.

## Payment Gateway Scope

Payment integration is the only intentionally deferred major product area.

Expected future behavior:

- Buyer checkout for auction invoices.
- Buyer checkout for commission bookings or escrow deposits.
- Escrow capture, release, cancellation, and refund rules.
- Seller payout onboarding.
- Payment provider webhooks.
- Automatic settlement reconciliation.
- Tax, compliance, KYC/KYB, fraud, and chargeback handling according to chosen
  payment provider.

Current non-payment expectation:

- The app may show invoice, escrow, payout, and settlement states as modeled
  records.
- Admins may manually mark invoices paid for testing.
- The platform should not claim real funds are held in escrow until a compliant
  payment provider is integrated.

## QA Checklist By Role

### Guest QA

- Open homepage.
- Open Explore.
- Search and filter artwork.
- Open artwork detail.
- Open artist profile.
- Open commissions page.
- Open feed.
- Attempt a write action and confirm login is required.
- Start buyer signup.
- Start seller onboarding and confirm onboarding appears before confirmation.

### Buyer QA

- Sign up or sign in as buyer.
- Update profile display name and avatar.
- Confirm handle remains stable.
- Follow and unfollow artist.
- Like and unlike artwork.
- Save and unsave feed post.
- Comment on feed post.
- Comment on artwork.
- Report content.
- Vote suspected AI and remove/change vote where supported.
- Place valid bid.
- Confirm invalid bids are rejected.
- Book commission.
- Send commission message.
- Open dispute.
- View buyer dashboard invoices, bids, acquired works, and bookings.
- Log out.

### Seller Applicant QA

- Apply to sell from a new account.
- Apply to sell from an existing buyer account.
- Submit without required fields and confirm validation blocks submission.
- Upload sample artwork/proof images.
- Submit application.
- Confirm studio/listing/commission tools remain locked while pending.
- Confirm rejection keeps seller tools locked.
- Confirm approved applicant becomes verified seller.

### Verified Seller QA

- Sign in as approved seller.
- Create or update studio.
- Upload artwork image.
- List auction.
- Create commission board.
- Publish feed post.
- Edit/delete own feed post.
- View buyer comments/engagement.
- Submit AI proof for flagged artwork.
- Move commission through seller-owned lifecycle actions.
- View seller settlements and payout status.
- Confirm seller cannot approve own application or mark invoice paid.

### Admin QA

- Sign in as admin.
- Open seller application queue.
- Approve seller application.
- Reject seller application.
- Confirm generic KYC verification cannot approve seller rights.
- Open reports queue.
- Review and act on reported content.
- Open AI moderation queue.
- Accept and reject process proof.
- Take down and reinstate artwork where policy allows.
- Open commission disputes.
- Resolve dispute.
- Open auction settlement queue.
- Close ended auction.
- Mark invoice paid manually for test records.
- Inspect delivery outbox.
- Inspect audit log.
- Confirm admin account cannot create normal social interactions.

### System QA

- Apply migrations through the latest migration in order.
- Run automated tests.
- Run production smoke checks.
- Confirm anonymous writes are blocked.
- Confirm public catalogue reads work.
- Confirm authenticated buyer checks pass.
- Confirm verified seller checks pass.
- Confirm admin checks pass.
- Confirm scheduled auction close-out works.
- Confirm delivery worker processes email/webhook jobs.
- Confirm Supabase Auth SMTP, OAuth, redirect URLs, storage buckets, Realtime,
  cron, and Edge Function secrets are configured.

## Production-Ready Definition

FORMA is production-ready except for payment gateways when:

- Latest migrations are applied in order.
- Guest, buyer, seller applicant, verified seller, admin, and worker workflows
  pass QA.
- Seller onboarding cannot be bypassed.
- Admin seller approval works from the seller review queue.
- Unapproved sellers cannot create studios, listings, commissions, or seller
  feed posts.
- Social actions work for buyers and sellers and are blocked for guests/admins.
- AI voting, proof submission, and admin review work end to end.
- Commission booking and messaging work end to end.
- Auction bidding and automatic close-out work end to end.
- Settlement/invoice records are generated by trusted code only.
- Delivery outbox is consumed by a deployed worker.
- Auth emails are branded as FORMA.
- Supabase SMTP and OAuth are configured.
- RLS, storage policies, role gates, rate limits, and audit logs are verified.
- The only remaining major gap is real payment checkout, escrow, refunds,
  payouts, and payment webhooks.
