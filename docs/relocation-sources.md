# Abu Dhabi relocation sources

Checked: 2026-10-02 10:40:06 Gulf time.

This file summarizes the primary-source catalog used by the relocation hub. The machine-readable version is [`data/abu-dhabi/catalog.json`](../data/abu-dhabi/catalog.json). Each supported requirement in the product should carry a source id, checked time, owner, and limitation. A provider portal opened by Bankable is only `opened`; `submitted`, `confirmed`, `issued`, or `approved` requires an official/provider event or a specific user or HR reference.

## Government and setup sources

| Source id | Source | Use in Bankable |
| --- | --- | --- |
| `added-licensing` | <https://www.added.gov.ae/en/set-up/establish-your-business/licensing-requirements> | Mainland ADDED economic licence route, kept separate from ADGM and KEZAD. |
| `adgm-registration` | <https://www.adgm.com/registration-authority/registration-and-incorporation> | ADGM incorporation route and Online Registry handoff. |
| `kezad-setup` | <https://www.kezadgroup.com/business-facilities/free-zone-business-setup-solutions/> | KEZAD free zone setup route, package/workspace flow and provider-owned licence issuance. |
| `adro-freelancer-green-visa` | <https://www.adro.gov.ae/en/Visas/Types-of-Visas/Abu-Dhabi-Green-Visa/Freelancers> | Freelancer Green Visa readiness factors; ADRO currently says this nomination category is unavailable through ADRO. |
| `uae-work-permits` | <https://u.ae/en/information-and-services/jobs/employment-in-the-private-sector/job-offers-and-work-permits-and-contracts/work-permits> | Employer Work Bundle handoff and employee work/residence task framing. |
| `uae-working-residence` | <https://u.ae/en/information-and-services/visa-and-emirates-id/residence-visas/residence-visa-for-working-in-the-uae> | Standard employer-applied work visa framing. |
| `adgm-visa-government-services` | <https://www.adgm.com/operating-in-adgm/post-registration-services/visa-and-government-services> | ADGM-specific employee visa and government-service handoff through ACCESSADGM. |
| `kezad-tariffs` | <https://www.kezadgroup.com/business-facilities/tariffs/> | KEZAD-specific permitting-service evidence, including Employment Residence and Establishment Card service names. |
| `masdar-city-about` | <https://www.masdarcity.ae/about> | Validates Masdar City as a named Abu Dhabi location only; housing fit still needs property evidence. |

## Housing, insurance and finance sources

| Source id | Source | Use in Bankable |
| --- | --- | --- |
| `uae-leasing` | <https://u.ae/en/information-and-services/moving-to-the-uae/leasing-a-property-in-the-uae> | Tenant documents, post-dated cheques, broker commission and Tawtheeq registration. |
| `addc-municipality-fee` | <https://www.addc.ae/en-US/residential/Pages/Municipality-Fee.aspx> | Municipality fee calculation and Tawtheeq enrollment language. |
| `uae-health-insurance` | <https://u.ae/en/information-and-services/health-and-fitness/getting-a-health-insurance> | Abu Dhabi employer/sponsor health-insurance responsibility. |
| `cbuae-mortgage-ratios` | <https://rulebook.centralbank.ae/en/rulebook/article-3-important-ratios> | Mortgage readiness factors only. Bankable must not show approval probabilities. |
| `adrec-rental-index` | <https://adrec.gov.ae/en/property_and_index/interactive-map> | Official rental-index benchmark only; not a live listing or exact legal rent for a unit. |
| `enbd-current-account` | <https://www.emiratesnbd.com/en/knowledge-hub/open-a-current-account-online> | One bank-provider route for personal current-account document readiness. |

## Workspace sources

| Source id | Source | Use in Bankable |
| --- | --- | --- |
| `wework-hub71` | <https://www.wework.com/buildings/hub71--abu-dhabi> | WeWork Hub71 contact/tour handoff at ADGM Square. |
| `cloudspaces-locations` | <https://www.cloudspaces.ae/en/locations> | Cloud Spaces Abu Dhabi location list. |
| `cloudspaces-yas` | <https://www.cloudspaces.ae/en-location/yas-mall> | Yas Mall workspace, booking/contact action and published starting prices. |
| `cloudspaces-adgm` | <https://www.cloudspaces.ae/en-location/abu-dhabi-global-market> | ADGM workspace, booking/contact action and address. |
| `adgm-office-space` | <https://www.adgm.com/operating-in-adgm/office-space> | ADGM office and business centre context. |

## Area-source boundaries

Area records are planning filters, not neighborhood endorsements. `al-maryah-island`, `yas-island`, and `masdar-city` have direct workspace or official location support in the catalog. `al-reem-island`, `khalifa-city`, `al-raha-beach`, `al-khalidiyah`, and `al-nahyan` currently use ADREC rental-index support as benchmark guidance only; any specific home, price, availability, commute, amenity, or lifestyle claim needs a separate dated listing or provider source beside the recommendation.

## Company setup guide data

The setup-page data lives in [`data/abu-dhabi/setup-guides.json`](../data/abu-dhabi/setup-guides.json). It references the same opened catalog sources and keeps mainland ADDED, ADGM and KEZAD separate. Each profile splits official requirements from guided planning steps and marks fees and timing as unknown in Yala AD unless the provider source supplies them.

## Area guide and image sources

The user-facing area-guide layer lives in [`data/abu-dhabi/area-guides.json`](../data/abu-dhabi/area-guides.json). It is separate from the canonical relocation catalog so that friendly area copy, practical planning suggestions and image metadata do not dilute service-rule provenance. Guide records split sourced facts into `factualHighlights` and non-binding relocation ideas into `practicalTips`.

Area images are documented in [`docs/assets-sources.md`](./assets-sources.md). Exact neighborhood images set `image.exactAreaPhoto` to `true`; fallback context photos set it to `false` and use captions that do not claim the photo shows that neighborhood. Mohamed Bin Zayed City is now included as a catalog area because an opened Dubizzle listing uses that `areaId`; DMT and Abu Dhabi Media Office sources support area context, while the listing source supports only the observed studio.

## Boundaries

- Government, licensing, visa, insurance, workspace booking and lender decisions belong to the actual provider.
- Synthetic homes are calibration examples only and must never show an agent-contact action.
- Employer views may show employee move milestones, blockers and policy fit. They must not show private income documents, identity evidence, bank results or lender decisions without recipient-specific consent.
- Company establishment is not one checklist: mainland ADDED, ADGM and KEZAD stay separate service records.
