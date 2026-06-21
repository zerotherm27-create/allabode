# All Abode — Stitch Design Assets

Design reference assets fetched from the Stitch project
**"All Abode Responsive Website"** (project ID `15200214189784676710`)
via the Stitch MCP API (`https://stitch.googleapis.com/mcp`).

## Contents

```
design/
  DESIGN-TOKENS.md          ← consolidated brand colors, type, spacing, components
  screenshots/              ← full-resolution PNG renders (2560px wide)
    home.png
    properties.png
    leasing-services.png
    property-management.png
    tenant-dashboard.png
    owner-dashboard.png
  code/                     ← exported standalone HTML (Tailwind CDN) per screen
    home/index.html
    properties/index.html
    leasing-services/index.html
    property-management/index.html
    tenant-dashboard/index.html
    owner-dashboard/index.html
    design-system/
      design-system.json     ← raw Stitch design-system payload
      STYLE-GUIDELINES.md     ← Prestige Architectural Design guidelines
```

## Screens fetched (the 7 from the brief)

| Screen | Stitch screen ID | Image | Code |
|--------|------------------|-------|------|
| Home - Allabode Realty | `920d53f25b2e48f5b9301b5f42901c73` | ✓ | ✓ |
| Properties - Allabode Realty | `32e9371499d84794aad63322bf054fa9` | ✓ | ✓ |
| Leasing Services - Allabode Realty | `0601eea1614b45cbb21ab0ef76da4b64` | ✓ | ✓ |
| Property Management - Allabode Realty | `c607b2b90abd492ab6baa5bcb866bcd0` | ✓ | ✓ |
| Tenant Dashboard - Allabode Property Solutions | `1c3b5e868cda4a03bce7e8b1e1b05f2b` | ✓ | ✓ |
| Owner Dashboard - Allabode Property Solutions | `ecf21693878f4c80bdc2e38369ab409a` | ✓ | ✓ |
| Design System (Prestige Architectural) | `assets/1dc80f007002467aaa676c3083d5b4ad` | — | ✓ (json + md) |

> The project contains 20 total screens (multiple variants/iterations of each page);
> the IDs above are the specific ones named in the build brief. Other variants are
> available via the Stitch MCP `list_screens` tool if needed.

## Logos

Brand logo variants are in `../public/logo/` (primary = navy+gold horizontal).
