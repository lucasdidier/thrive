# Thrive blog: writing brief

Thrive (https://runonthrive.com) is a workspace for freelancers and small service studios (designers, developers,
consultants, coaches, photographers, agencies of 1–10): clients, projects, proposals, contracts, invoices, time
tracking, email, scheduling, forms and workflows in one place. Price: $10/month or $100/year, 7-day free trial,
no card needed. Open source, can be self-hosted. Works with AI agents (Claude, ChatGPT) through MCP.

Goal of the blog: inbound marketing. Each article genuinely helps a freelancer with a real problem (useful even
without Thrive), shows how Thrive handles it with product screenshots, and ends by inviting them to try Thrive.

## Voice
- Plain, warm, practical. Short sentences, no hype, no buzzwords ("leverage", "seamless", "game-changer",
  "unlock", "elevate", "in today's fast-paced world"). No em-dash overuse. No emojis.
- Talk to "you", the freelancer. Concrete examples with numbers (a €4,800 brand project, a 50% deposit, net 14).
- Honest about Thrive: only describe features that exist (check README.md sections named below). Never invent
  integrations, payment processing, stats, customers or testimonials. Thrive does NOT process payments for
  freelancers: invoices show the payment instructions (bank details etc.) the user writes; clients pay outside.
- 1,100–1,600 words. Scannable: H2 sections, a few lists, one short checklist or template block where useful.

## Format (exactly)
File: content/blog/<slug>/en.html. First line is a meta comment with JSON, then the body HTML (no <html>,
<head>, <article> or <h1>; the page adds the title, date and the bottom call to action):

<!--meta {"title":"…","description":"one sentence for search results, 140–160 characters","minutes":7} -->
<p class="lede">…the opening paragraph…</p>
<h2>…</h2>
<p>…</p>
<figure data-shot="invoice"><figcaption>…what the screenshot shows…</figcaption></figure>
…

Allowed tags: p (class "lede" for the first only), h2, h3, ul, ol, li, strong, em, a, blockquote, figure, figcaption,
table/thead/tbody/tr/th/td (sparingly), code. Links: other articles as /blog/<slug>, sign-up as
https://app.runonthrive.com/auth/sign-up . No inline styles, no scripts, no images other than the screenshot
placeholders. Put 2–3 screenshot placeholders where they help, using only the shot names listed for your article.
End with a short closing section (an H2 like "Try it on your next project" + 2–3 sentences); the page adds a
call-to-action box after it, so don't write a button.

## Screenshots available (real Thrive UI, fictional studio "Morgan Studio" and its clients)
- overview: home dashboard (business totals, calendar, open projects, items awaiting a response)
- clients: client list with pipeline stages
- project: a project page (tasks, documents, invoices and time for one client project)
- proposal: a proposal open in the editor, with its client view
- contracts: a contract open (terms, signature status)
- client-proposal: what the client sees when they open the proposal link (accept online)
- client-contract: what the client sees to sign the contract (typed-name signature)
- invoice: an invoice open in Thrive (lines, totals, status)
- client-invoice: what the client sees when they open the invoice link (payment instructions)
- client-portal: a client's portal page (their proposals, contracts, invoices and files in one private link)
- time: time tracking page (timer, entries by project, billable hours)
- forms: a form's submissions (e.g. a project inquiry form)
- workflows: list of automations (e.g. "when a proposal is accepted, create the contract")
- builder: a workflow open in the builder (trigger + actions)
- scheduling: booking pages and upcoming meetings
- mcp: the "Use with AI" page (connect Claude/ChatGPT to Thrive)

## Product facts to check
Read the README.md sections relevant to your article before writing (e.g. "Document templates and service
pricing", "Tracked time → invoice drafts", "Form builder", "Form templates", "Client links", "Client portals",
"Thrive MCP", "Kanban boards", "Nylas email and scheduling") and the code under public/ (e.g. workflow-domain.js
for workflow triggers/actions, forms-ui.js, billing-ui.js, domain.js for deposits/payment schedules) when unsure.
Workflows, deposits, payment schedules, tracked-time-to-invoice and client portals exist; verify details before
claiming them. Don't edit any file except your article.

## Translating (content/blog/<slug>/<lang>.html)
- Translate all five English articles (content/blog/*/en.html) into your language, one file per article next to
  en.html: content/blog/<slug>/<lang>.html. Keep the same slug.
- Write like a native freelancer-focused writer in that language, not a literal translation: natural phrasing,
  local terms freelancers actually use, same structure, headings, lists, examples and meaning. Keep it honest
  (don't add claims). Adapt number/currency formatting to the language (e.g. 4.800 € in German, 4 800 € in
  French); keep the amounts and currency (€) as in English. German: informal "du" (like the app). Portuguese:
  Brazilian, "você". French: "vous". Spanish: "tú". Italian: "tu". Dutch: "je". Polish/Turkish/Indonesian: the
  natural friendly register for SaaS marketing.
- When the text names a Thrive button, page or field (e.g. "Invoice unbilled time", "Use with AI", "Send
  reminder", "Billable project"), use the app's own translation from public/locales/<lang>.json (the English text
  is the key) so readers find the same words in the screenshots. If a label isn't there, translate it naturally.
- Keep the HTML exactly: same tags, classes, data-shot names, figure/figcaption structure (translate the caption).
  Translate the meta JSON title and description (description 140–160 characters if the language allows; keep
  "minutes"). Keep the JSON valid (escape quotes).
- Links: internal article links /blog/<slug> become /blog/<lang>/<slug>. Keep https://app.runonthrive.com/auth/sign-up.
- Code spans like {{client.name}} stay as they are.
