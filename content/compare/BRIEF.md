# Thrive comparison pages: writing brief

Pages at runonthrive.com/compare/thrive-vs-<competitor>: one honest, detailed comparison between Thrive and one
other product, for people searching "<competitor> vs", "<competitor> alternative" or "Thrive vs <competitor>".
The hub at /compare lists them all. These are landing pages, not blog posts: scannable, factual, decisive.

Thrive (https://runonthrive.com) is a workspace for freelancers and small service studios (designers, developers,
consultants, coaches, photographers, agencies of 1–10): clients, projects, proposals, contracts, invoices, time
tracking, email, scheduling, forms, workflows and client portals in one place. $10/month or $100/year, one plan
with everything, 7-day free trial without a card (connecting email and calendar waits until you subscribe).
Open source (MIT, github.com/lucasdidier/thrive), can be self-hosted. Works with AI assistants (Claude, ChatGPT)
through MCP. App in 10 languages (English, German, French, Spanish, Italian, Dutch, Portuguese (Brazil), Polish,
Turkish, Indonesian).

## Honesty rules (most important)
- Describe the other product ONLY with facts from its own official website, pricing page or help center, read
  now. Say "as of November 2026" for prices and plans. Don't use review sites, Reddit, G2 or your memory as a
  source. If you can't verify something on their site, leave it out (don't write "No" for it either).
- Never disparage. Say plainly, early, where the other tool is the better choice.
- Thrive's real limits, which must appear on every page where relevant: no payment processing (invoices show
  the payment instructions you write, such as bank details or your own payment link; clients pay outside Thrive
  and you record the payment), typed-name signatures only, no recurring invoices, no automatic payment
  reminders, no date-based workflow triggers (workflows react to events), no mobile app (browser only), no
  task lists / project management boards beyond Kanban boards for records, no accounting (no expenses,
  bank feeds, tax reports). Workflows: one event trigger and up to 20 actions.
- Thrive facts: verify in README.md (sections "Client portals", "Client links", "Client communications", "Form
  builder", "Document templates and service pricing", "Tracked time → invoice drafts", "Form templates",
  "Kanban boards", "Client CSV import", "Settings and notifications", "Nylas email and scheduling", "Thrive MCP")
  and public/ code (workflow-domain.js, domain.js) when unsure. Existing blog articles (content/blog/*/en.html,
  especially the *-alternative ones) were fact-checked on 16 November 2026 and can be reused for Thrive facts;
  re-check competitor facts on the competitor's site anyway.
- Never mention Bonsai (or Hello Bonsai) anywhere.

## Voice
Plain, warm, confident, specific. Short sentences. No hype or buzzwords ("seamless", "leverage", "game-changer",
"unlock", "elevate", "robust", "all-in-one powerhouse"). No emojis. Few em-dashes. "You" is the freelancer.
1,300–1,900 words of body.

## File format (exactly)
content/compare/thrive-vs-<slug>/en.html. Line 1 is a meta comment with JSON; then the body HTML. The page
adds the H1 ("Thrive vs <name>"), both logos, the lede, the "Last checked" line, buttons, the final call to action
and the trademark note, so don't write those.

<!--meta {"date":"2026-11-17","name":"HoneyBook","site":"https://www.honeybook.com/","logo":"honeybook.svg","title":"Thrive vs HoneyBook (2026): an honest comparison","description":"140–160 characters for search results","lede":"One or two sentences under the H1: who each tool is for, in plain words.","checked":"November 2026"} -->

Then these sections, in this order:

1. The quick answer: two columns, 3–5 bullets each, the other product FIRST.
   <div class="vs-pick">
    <section><h2>Choose HoneyBook if</h2><ul><li>…</li></ul></section>
    <section><h2>Choose Thrive if</h2><ul><li>…</li></ul></section>
   </div>
2. <h2>Feature by feature</h2>, then one <h3> per area that matters for this pair (pick 7–10 from: Clients and
   pipeline; Proposals and packages; Contracts and signatures; Invoices and payments; Scheduling; Email;
   Forms; Automations; Client portal; Time tracking; Projects and tasks; Accounting; AI; Mobile; Languages and
   regions; Your data and open source). Under each, one short paragraph on the other product, one on Thrive,
   and when it's clear, one sentence saying which is stronger here. Add 2–3 screenshot placeholders where they
   help (names below), e.g. <figure data-shot="client-packages"><figcaption>…</figcaption></figure>.
3. <h2>Pricing</h2>: their plans and prices as listed on their pricing page (say billed yearly/monthly as they
   do; mention trial and processing fees if listed), then Thrive's. A worked example is welcome ("a solo
   designer on X's cheapest plan with automations pays … a year; on Thrive, $100").
4. <h2>Where Thrive falls short</h2>: a frank <ul> of what the other product has and Thrive doesn't.
5. <h2>How to switch from <name> to Thrive</h2>: an <ol> (export clients to CSV if their help center says how,
   else "as a spreadsheet"; Thrive's Clients → Import clients with column matching and a review step, up to
   500 rows per file; rebuild proposal/contract templates from Thrive's starters; services and packages in the
   service catalog; payment instructions in Settings → Invoices; connect Google or Microsoft email and calendar;
   one or two workflows). Suggest finishing open projects in the old tool.
6. FAQ: 4–6 real questions people search ("Is Thrive cheaper than HoneyBook?", "Can clients pay by card in
   Thrive?", "Can I import my clients from HoneyBook?", "Is there a free trial?"…), short factual answers:
   <section class="vs-faq"><h2>Questions</h2><h3>…?</h3><p>…</p>…</section>
7. The comparison table, LAST (the page puts the call to action right after it). 12–18 rows, only verified
   facts. Row labels are <th>. Each value cell gets a class: "yes" (has it), "no" (doesn't), "part" (partly, or
   only on some plans), or none for plain values like prices. Always keep a few words of text in the cell.
   <h2>Thrive and HoneyBook side by side</h2>
   <table class="vs-table"><thead><tr><th></th><th>HoneyBook</th><th>Thrive</th></tr></thead><tbody>
   <tr><th>Price (as of November 2026)</th><td>From $29/month billed yearly</td><td>$10/month or $100/year</td></tr>
   <tr><th>Card payments in the app</th><td class="yes">Yes</td><td class="no">No, payment instructions on invoices</td></tr>
   <tr><th>Automations</th><td class="part">From Essentials</td><td class="yes">Included</td></tr>
   …</tbody></table>
   <p class="vs-note">We only list what we could confirm on HoneyBook's website in November 2026. Plans change, so check <a href="https://www.honeybook.com/pricing">HoneyBook's pricing page</a> before you decide. Spotted something out of date? Write to hello@runonthrive.com.</p>

Allowed tags: p, h2, h3, ul, ol, li, strong, em, a, div.vs-pick, section, figure, figcaption, table, thead,
tbody, tr, th, td, code. No inline styles, scripts or images (logos are added by the page). Links: the other
product's official pages (https), Thrive blog articles as /blog/<slug>, sign-up as
https://app.runonthrive.com/auth/sign-up, other comparisons as /compare/thrive-vs-<slug>.

## Screenshots available (real Thrive UI with fictional data)
overview (home dashboard), clients (client list with pipeline stages), project (one project's documents,
invoices, time, messages), proposal (proposal editor), contracts (contract open, signature status),
client-proposal (client's view of a proposal), client-contract (client signs with typed name), invoice,
client-invoice (client's view with payment instructions), client-portal, time (timer and entries), forms
(form submissions), workflows (list of automations), builder (workflow builder), scheduling (booking pages),
mcp ("Use with AI" page), emails (inbox linked to clients), packages-editor (proposal Pricing step with
packages), client-packages (client chooses a package), import-map, import-review (client CSV import),
form-embed (form embed code).

## Logo
Find the product's official logo on its OWN website (the header logo, or a press/brand kit page on the same
domain). Prefer SVG; else a PNG at least 256px wide with a transparent background. Download it with curl to
public/compare/logos/<slug>.svg (or .png). Check it: the file must be an image (for SVG: no <script>, no
external references, no event attributes), show the wordmark or symbol clearly, and not be a third-party copy.
Report the exact source URL. If the header logo is inline SVG in the page HTML, extract that <svg> element
into the file. Don't recolor or alter it.
