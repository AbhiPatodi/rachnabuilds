# Cold-email sequence v2 — for Rachna's review

Audience: US/UK/AU/CA Shopify store owners from the Vela list (tier A+/A), personal inbox on their own domain.
Sender: Rachna Jain from rachna@ / rachna.jain@ / r.jain@ on getrachnabuilds.com, hellorachnabuilds.com, teamrachnabuilds.com.
Rules: plain text, no links in email 1, no images, one idea per email, every email opens with something true about *their* store (`{{finding}}` comes from the scan). Sequence stops on any reply. CAN-SPAM footer with a real address and an opt-out line.

Variables: `{{firstName}}`, `{{storeName}}`, `{{finding}}` (one sentence, specific). No report link in any email: the full audit runs only when someone replies "yes", and the link is sent automatically in the same thread when it's ready (~15–20 min).

---

## Email 1 · Day 0 · subject: `{{storeName}} on a phone`

Hi {{firstName}},

I had a quick look at {{storeName}} on my phone, the way your customers see it, and one thing stood out: {{finding}}

It's usually the kind of thing that quietly costs a store orders every day without anyone noticing, because the store still "works".

If you'd like, I'll run the full check-up I do for my Shopify clients (speed, tracking, trust, mobile friction, about 60 checks) and send you the report. Reply "yes" and you'll have it within the hour. No call, no pitch.

Rachna
Rachna Builds · Shopify conversion specialist
Indore, India · rachnabuilds.com
If you'd rather not hear from me, reply "no" and I won't write again.

---

## Email 2 · Day 2 · same thread · subject: `Re: {{storeName}} on a phone`

Hi {{firstName}},

Just in case my note got buried: the offer of the free check-up for {{storeName}} stands, one word back and I'll run it.

For context on why I flagged it: a similar issue on a skincare store we worked on this month, once fixed, took the product page from 10.7 seconds to 4.7 on mobile, and Google's own score from 68 to 84. Those numbers are real, not rounded.

Rachna

---

## Email 3 · Day 6 · same thread · subject: `Re: {{storeName}} on a phone`

Hi {{firstName}},

I'll close {{storeName}}'s file for now so I'm not cluttering your inbox.

If the timing's better later, this thread will still work: reply "yes" whenever and I'll run the check-up then.

Wishing you a strong Q4,
Rachna

---

### Notes for Rachna
- The "similar fix" numbers in email 2 are Nuwa's real before/after (PDP LCP 10.7s→4.7s, PSI 68→84). Don't change them to round numbers; real ones read as real.
- Email 1 deliberately has no link. We'll A/B a link-in-email-1 version on 200 leads after the domains are 4–6 weeks old.
- Reply handling: "yes"/"send it" queues the full StoreProof audit of their real domain; the Mac worker runs it (~15 min) and the CRM replies in the same thread with the link. Questions and objections come to you (answer within the hour in working hours); "no" or unsubscribe stops everything for that person.
- Daily volume at launch: 20–25 per inbox (9 inboxes ≈ 200/day). Bounce > 2% or complaint > 0.3% = pause.
