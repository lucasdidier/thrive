# Translating the landing page

content/landing/strings.json lists every English string on Thrive's landing page (ui/landing.html) and its
interactive product demo (public/landing-app.js, landing-phone.js, landing.js), in page order. Write
content/landing/<lang>.json: one JSON object whose keys are exactly those English strings (all of them,
same spelling) and whose values are the translations. Valid JSON, UTF-8, 1-space indent.

- Marketing copy (headlines, ledes, features, pricing, FAQ): write it as a native copywriter would for
  freelancers and small studios in that market: natural, concise, persuasive, not literal. Same meaning and
  honesty; keep claims and prices ($10 a month, $100 a year, 7 days free).
- Some strings are fragments of one sentence split by inline tags (e.g. "All your client work," + "in one
  place."). Read ui/landing.html around them and translate so the fragments read correctly in order.
- Product UI labels in the demo (Home, Clients, Proposals, "Billable time", "Record payment"...): use the
  app's own translation from public/locales/<lang>.json (English text is the key) when it exists.
- Keep unchanged: Thrive, brand/company/person names (Juniper Studio, Sophie Chen, Morgan Studio, Alex
  Morgan...), product names (Google Meet, Claude, ChatGPT, MCP, GitHub, llms.txt), invoice numbers (INV-001),
  emails, URLs, code. If a string should stay identical, use the English as the value.
- Sample dates/times/amounts in the demo ("Mon, Nov 9", "9:00 AM – 9:30 AM", "€3,000 deposit", "45 min"):
  localize their format naturally (e.g. "lun. 9 nov.", "9:00 – 9:30", "acompte de 3 000 €").
- Register: same as the blog and app: German "du", French "vous", Spanish "tú", Brazilian Portuguese
  "você", Italian "tu", Dutch "je", Turkish "sen", Indonesian "Anda", Polish informal "ty".
- Check with: node -e "const s=require('./content/landing/strings.json'),t=require('./content/landing/<lang>.json');const m=s.filter(k=>!(k in t));console.log(m.length,'missing')"
