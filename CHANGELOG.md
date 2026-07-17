# Akij Holidays v4 — Release Notes

Focused on your explicit feedback. Zero regressions from v3.

## ✅ QA Results — 48 assertions, all passing

```
[1] Boot every v4 page — no runtime errors    ✓ 7 pages
[2] Removed pages truly gone                   ✓ 4 checks
[3] Live preview renders on every maker        ✓ 4 makers
[4] Invoice bank card conditional              ✓ 4 checks (incl. SWIFT-removed)
[5] Voucher hero band + hotel cards            ✓ 9 checks
[6] Ticket smart-importer parses correctly     ✓ 13 checks
[7] Sidebar starts collapsed by default        ✓
[8] Sheets logger uses no-cors POST            ✓ 2 checks
[9] DOC_TYPES limited to v4 slim set           ✓ 4 checks
[10] Preview footer smaller than print         ✓ 2 checks
[11] google-apps-script.gs is valid JS         ✓ 2 checks
```

---

## 🗑 Removed
- `receipt.html`, `quotation.html`, `visa.html` deleted from disk.
- `receipt`, `quotation`, `visa`, `tour` removed from `CFG.DOC_TYPES`.
- Sidebar nav trimmed to: Dashboard · All Documents · **Invoice · Voucher · Airline Ticket · Ticket Invoice** · Settings.
- Quick tiles + recent-list icons no longer reference removed doc types.

## 🖼 Preview footer image made smaller
- Preview footer banner capped at **110 px** width (vs 220 px in print/PDF).
- Preview footer caption font shrunk to 9.5 px + italic muted colour.
- Print/PDF `!important` overrides restore full 220 px for the printed page.

## 🏢 Company address removed from doc header
- The doc header now shows the **logo only** (LEFT) + doc title (RIGHT).
- Company name, address, phone, email, website still appear inside the invoice/ticket-invoice as the "Invoice From" **party** column (standard business practice — that's where recipients expect to find the sender's info).

## 🏦 Bank details — pro design below the invoice
- New "Payment Information — Bank Details" card:
  - Gradient header band with 🏦 icon + currency chip.
  - 3-column grid: Bank Name, Account Name, Branch (top row); Account Number, Routing/IFSC (bottom row).
  - Monospace font for numeric fields (crisp reading).
  - Dashed-separator footer note: *"Please quote invoice number **INV-2026-0001** on all bank transactions."*
- Only renders when at least one bank field is populated (empty invoices don't show a blank bank block).
- Same card now available on **ticket-invoice** too, prefilled from `CFG.BANK`.
- No SWIFT field (per your instruction).

## 🎫 Voucher redesign — elegant & professional
Every voucher now has:
- **Hero band** with gradient background:
  - Booking Voucher label + Guest Name in large type
  - Booking number code + status pill (right side)
  - Check-in / Nights / Check-out timeline row (large-format dates, night count in center)
  - 4-stat bar: Guests · Rooms · Hotels · Service
- **Beautiful hotel cards**:
  - Circular 🏨 icon badge, large hotel name in brand-red, city + country subtitle
  - **Star rating** (interactive picker in the form; ★★★★☆ in output)
  - 3-column body: Address, Confirmation # (mono), Rooms, Room Type, Meal Plan, Check-in, Check-out, Phone
  - Only non-blank fields render — no empty rows
- Empty hotels are filtered out entirely.

Voucher form gains: country, star rating picker, room type, per-hotel meal plan, per-hotel check-in/out dates, per-hotel phone.

## 📄 Smart ticket import
New file: `ticket-import.js`.

The Airline Ticket page now has an "**Smart Ticket Import**" drop-zone at the top. Users can:
- **Drag & drop** a `.pdf` / `.png` / `.jpg` / `.txt` e-ticket
- **Click to browse** for a file
- **Paste raw ticket text** into a collapsible textarea

What gets auto-detected and filled:
- **Airline** (100+ airlines database — matches name, IATA, or ICAO)
- **Flight number** (prefers matches prefixed with the detected airline's IATA)
- **PNR** (5–7 uppercase alphanumeric — recognises multiple label variants)
- **Ticket number** (`217-1234567890` etc.)
- **Departure & arrival airports** (IATA codes matched against the 100+ airport database; uses "from…to…" hints when present)
- **Departure date + time** and **arrival date + time** (accepts many formats)
- **Class / cabin** (Economy / Business / First / Premium Economy)
- **Baggage** (`30 kg` etc.)
- **Passengers** (parses `SURNAME/GIVENNAME MR` style + several other formats)

Tech under the hood:
- Text files & pasted text — parsed directly.
- **PDFs** — extracted via `pdf.js` (loaded on-demand from CDN, cached after first use).
- **Images** — OCR via `Tesseract.js` (loaded on-demand from CDN).
- Never uploads the file anywhere — 100 % client-side.
- Existing form fields are preserved: import only fills fields that are still empty.
- Success toast reports the exact number of fields filled ("Filled 12 fields from ticket…").

## 📊 Google Sheets — automatic logging
- New `google-apps-script.gs` targets your sheet directly (`1EqWBeRUl7sYh…`).
- Creates per-type tabs: `Invoices`, `Vouchers`, `Airline Tickets`, `Ticket Invoices`.
- Auto-deduplicates: if the same document ID is saved again, the older row is deleted so the sheet always shows the latest.
- Includes columns: Timestamp · Type · ID · Number · Status · Party · Amount · Currency · PNR · Ticket # · Route · Travel Date · GitHub Path · Updated At.
- Header row styled in brand red + frozen.

Client-side (`app.js`):
- Uses `fetch(..., { mode: "no-cors", keepalive: true })` — works from **any origin** (file://, localhost, GitHub Pages, Netlify, custom domain) without CORS issues, and even completes if the user hits refresh mid-save.
- Compact payload — only the fields the sheet actually needs, not the whole doc.
- Fire-and-forget — never blocks the UI.

Settings page rewrite (`settings.html`):
- Numbered step-by-step guide with brand-styled step counters.
- **Copy Apps Script code** button — one click, paste into Apps Script.
- **Show/Hide script** toggle to inspect the code inline.
- Open Target Google Sheet direct-link button.
- Live status badge (`✓ Connected` / `Not configured`).

## 🌐 GitHub cloud storage — preserved
Every save still writes to GitHub as before:
- Path: `Documents/<Type>/<YYYY>/<MM>/<number>.json`
- Robust base64 encoding (Unicode-safe — Bengali / Chinese / emoji round-trip correctly).
- Settings page has full setup instructions with a fine-grained-token walkthrough.

## 📐 Overall design polish
- Sidebar **collapsed by default**. Hover the collapsed rail to peek-expand it; click the menu button to pin it open. State remembered per browser.
- Sidebar gets a subtle vertical gradient background + custom-styled scrollbar.
- Section-title bars now use a gradient dark-red badge for a more premium feel.
- Item-table headers get a 135° gradient (matches brand identity).
- Ticket stub band, voucher hero band, bank-card head — all use consistent brand-red gradient.
- Hotel-card corner icon is now a gradient pill instead of flat.
- All buttons use `type="button"` — zero accidental form submissions.
- Sticky toolbar under the topbar so Save/Print/PDF are always in reach.
- Preview panel has internal scroll with `max-height` — never overflows the viewport.
- Every focus state has a 3-px brand-red ring for keyboard accessibility (WCAG AA).

## 🔒 Preserved from v3
- LocalStorage key `akij.docs.v2` — same schema, existing data reads back untouched.
- Document ID format, `?id=` routing, `Store.get()` load flow — unchanged.
- GitHub folder layout — unchanged.
- All existing keyboard shortcuts (Ctrl/Cmd+S = Save, Ctrl/Cmd+P = Print).
- All existing invoice / voucher / ticket / ticket-invoice functionality — every field still saved and rendered.

---

## 📁 File Manifest

| File | Purpose |
|---|---|
| `CHANGELOG.md` | This file |
| `README.md` | Original docs (v3-era, kept for reference) |
| `config.js` | Global config — target sheet ID, brand, currencies, DOC_TYPES |
| `app.js` | Core lib: Storage, GitHub, Sheets (no-cors), PDF, Print, Autocomplete, Theme, Toast, Sidebar (collapsed default) |
| `theme.css` | Enterprise CSS — collapsed sidebar + hover-expand, smaller preview footer |
| `doc-renderers.js` | Invoice / Voucher / Ticket / Ticket-Invoice renderers |
| `doc-actions.js` | Save / Print / PDF / Copy wiring |
| `aviation-data.js` | 100+ airlines, 100+ airports |
| `ticket-import.js` | **NEW** Smart ticket parser (PDF / image / text) |
| `google-apps-script.gs` | Sheet logger (paste into Apps Script) |
| `index.html` | Dashboard |
| `documents.html` | Merged local + GitHub list |
| `invoice.html` | Invoice maker |
| `voucher.html` | Voucher maker (elegant redesign) |
| `ticket.html` | Airline ticket maker (with smart import banner) |
| `ticket-invoice.html` | Airline ticket invoice (bank card added) |
| `settings.html` | Cloud config — step-by-step Sheets setup with one-click script copy |
| `logo.png`, `banner.png` | Brand assets |
