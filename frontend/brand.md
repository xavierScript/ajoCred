# Brand — AjoCred

_Status: active_

AjoCred turns verified diaspora remittance history into collateral-free credit for
recipients in Nigeria. The brand needs to read as **credible financial infrastructure**
first — this is a lending product handling real money — while carrying a warmth that
generic fintech/crypto UI usually lacks. "Ajo" is the Yoruba word for a traditional
rotating community savings & credit circle; the brand should feel like that trust
model modernized, not like another purple-gradient DeFi dashboard.

## Design principles for this product

- **Trust over hype.** No neon, no glow, no "to the moon" energy. This is credit
  infrastructure — treat it with the visual seriousness of a banking product.
- **Warm, not corporate-cold.** Paper-warm neutrals instead of stark white/black.
  A distinct serif for headlines gives it editorial warmth instead of generic-SaaS blue.
- **Numbers are the product.** Amounts, wallet addresses, tx hashes, APY-style figures
  are load-bearing content — they get a monospace treatment and disciplined alignment,
  never an afterthought inside a rounded gradient card.
- **Restraint.** One accent color used sparingly for primary actions and status. Green
  is structural (brand + growth), terracotta is the "act now" accent, not a color to
  spray everywhere.

## Color palette

Warm, low-saturation, editorial-financial. Deep emerald as the structural brand color
(trust, deposits, growth), terracotta as a sparing secondary accent (borrow actions,
alerts to act). Paper-warm neutrals, not clinical white/black.

### Light mode

| Token                | Hex       | Use                                                       |
| -------------------- | --------- | --------------------------------------------------------- |
| `background`         | `#FAF8F4` | Page background (warm paper, not stark white)             |
| `foreground`         | `#1B1810` | Primary text                                              |
| `card`               | `#FFFFFF` | Card/panel surfaces                                       |
| `card-foreground`    | `#1B1810` | Text on cards                                             |
| `muted`              | `#F1EDE4` | Subtle section backgrounds, table stripes                 |
| `muted-foreground`   | `#6B6357` | Secondary/help text                                       |
| `border`             | `#E4DFD3` | Dividers, card borders, input borders                     |
| `primary`            | `#1C6B4E` | Primary buttons, links, brand mark, deposit actions       |
| `primary-foreground` | `#FAF8F4` | Text on primary buttons                                   |
| `primary-hover`      | `#155540` | Primary button hover                                      |
| `accent`             | `#B8532E` | Borrow CTA, "act now" highlights, eligibility ready-state |
| `accent-foreground`  | `#FAF8F4` | Text on accent buttons                                    |
| `success`            | `#2F8F63` | Repaid, compliant, verified states                        |
| `warning`            | `#A8762A` | Pending A-Pass, awaiting confirmation                     |
| `destructive`        | `#AE3A2F` | Errors, overdue, non-compliant                            |
| `ring`               | `#1C6B4E` | Focus ring                                                |

### Dark mode

| Token                | Hex       | Use                                                    |
| -------------------- | --------- | ------------------------------------------------------ |
| `background`         | `#15140F` | Page background (warm near-black)                      |
| `foreground`         | `#F1ECE1` | Primary text                                           |
| `card`               | `#1C1B15` | Card/panel surfaces                                    |
| `card-foreground`    | `#F1ECE1` | Text on cards                                          |
| `muted`              | `#221F17` | Subtle section backgrounds                             |
| `muted-foreground`   | `#A69C8B` | Secondary/help text                                    |
| `border`             | `#332F25` | Dividers, card borders                                 |
| `primary`            | `#33936B` | Primary buttons, links (brighter for dark bg contrast) |
| `primary-foreground` | `#0E120F` | Text on primary buttons                                |
| `primary-hover`      | `#3EA97C` | Primary button hover                                   |
| `accent`             | `#D97847` | Borrow CTA, act-now highlights                         |
| `accent-foreground`  | `#15140F` | Text on accent buttons                                 |
| `success`            | `#43AC7E` | Repaid, compliant, verified                            |
| `warning`            | `#C99141` | Pending states                                         |
| `destructive`        | `#D2564A` | Errors, overdue                                        |
| `ring`               | `#33936B` | Focus ring                                             |

Radius: base `8px` (`rounded-lg`), small controls `6px` (`rounded-md`). Full-round
(`rounded-full`) is reserved for avatars, status dots, and pill badges only — never
whole cards. Shadows are minimal; surfaces are separated by 1px borders, not drop
shadows. Reserve elevation shadows for true overlays (dropdowns, dialogs, toasts).

## Typography

| Role                | Font                | Notes                                                                                                                                                                                        |
| ------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Display / headlines | **Source Serif 4**  | Hero statements, section titles, big numbers on Landing. Weight 500–600. Gives editorial warmth without being the "trendy startup serif" (Fraunces/Canela) — more credible/banking-adjacent. |
| UI / body           | **Instrument Sans** | Nav, body copy, buttons, forms, dashboard labels. A modern grotesk with more character than Inter, still highly legible at small sizes.                                                      |
| Numeric / mono      | **JetBrains Mono**  | Wallet addresses, tx hashes, token amounts, dates in tables. Tabular figures for alignment in stat rows.                                                                                     |

Self-hosted via `@fontsource` packages (`@fontsource/source-serif-4`,
`@fontsource-variable/instrument-sans`, `@fontsource/jetbrains-mono`) — no external
font CDN calls, works offline, no layout-shift flash from a slow Google Fonts request.

## Voice

Direct, plain-language finance copy. No crypto-bro hype, no "unlock the future of
lending." Explain the mechanism in one sentence a non-technical user understands:
"Your remittance history is your credit history." CTAs are specific verbs tied to
outcomes: "Check my eligibility", "Deposit aUSDC", "Borrow ₦-equivalent", not
"Get Started" or "Learn More".
