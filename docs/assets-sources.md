# Area guide image sources

Checked: 2026-10-02 12:25 Gulf time.

These images support the photo-led Abu Dhabi area guides in [`data/abu-dhabi/area-guides.json`](../data/abu-dhabi/area-guides.json). They are local copies under [`public/areas`](../public/areas): most are openly licensed Wikimedia Commons files; four (Al Nahyan, Al Raha Beach, Al Khalidiyah, MBZ City) are Relaam neighbourhood-guide photos, cropped to 4:3 and credited "Photo: Relaam". The pre-swap Commons files were set aside, not deleted. Captions in the guide data distinguish exact area photos from honest Abu Dhabi context images.

| Area id | Local path | Area-specific? | Source file | Photographer / author | License | Caption boundary |
| --- | --- | --- | --- | --- | --- | --- |
| `al-reem-island` | `/areas/al-reem-island.jpg` | Yes | [Al reem island.jpg](https://commons.wikimedia.org/wiki/File:Al_reem_island.jpg) | Sa7er90 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Al Reem Island towers at sunset, with mangroves and a water channel in the foreground. |
| `khalifa-city` | `/areas/khalifa-city.jpg` | Yes, as Masdar City in Khalifa City A | [Masdar City in March 2022 01.jpg](https://commons.wikimedia.org/wiki/File:Masdar_City_in_March_2022_01.jpg) | Renek78 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Masdar City is used for Khalifa City planning because Experience Abu Dhabi places Masdar City in Khalifa City A. |
| `al-maryah-island` | `/areas/al-maryah-island.jpg` | Yes | [The Galleria Al Maryah Island,.jpg](https://commons.wikimedia.org/wiki/File:The_Galleria_Al_Maryah_Island,.jpg) | Tetraeder | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | The Galleria on Al Maryah Island. |
| `masdar-city` | `/areas/masdar-city.jpg` | Yes | [Masdar City Image.jpg](https://commons.wikimedia.org/wiki/File:Masdar_City_Image.jpg) | NNegm | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Masdar City campus buildings and Central Park. |
| `yas-island` | `/areas/yas-island.jpg` | Yes | [Yas Bay Waterfront, Yas Island, Abu Dhabi.jpg](https://commons.wikimedia.org/wiki/File:Yas_Bay_Waterfront,_Yas_Island,_Abu_Dhabi.jpg) | Oleg Yunakov | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Yas Bay Waterfront on Yas Island. |
| `al-raha-beach` | `/areas/al-raha-beach.jpg` | Yes | [Relaam: Al Raha Beach guide](https://www.relaam.com/neighborhoods/al-raha-beach) | Relaam | © Relaam (credited; not openly licensed) | Al Raha Beach apartment buildings lit up along the waterfront at night. |
| `al-khalidiyah` | `/areas/al-khalidiyah.jpg` | Yes | [Relaam: Al Khalidiyah guide](https://www.relaam.com/neighborhoods/al-khalidiyah) | Relaam | © Relaam (credited; not openly licensed) | Apartment and office towers in Al Khalidiyah behind a landscaped walkway. |
| `al-nahyan` | `/areas/al-nahyan.jpg` | Yes | [Relaam: Al Nahyan guide](https://www.relaam.com/neighborhoods/al-nahyan) | Relaam | © Relaam (credited; not openly licensed) | A tree-lined road through Al Nahyan with office and apartment towers behind it. |
| `saadiyat-island` | `/areas/saadiyat-island.jpg` | Yes | [Saadiyat Beach.jpg](https://commons.wikimedia.org/wiki/File:Saadiyat_Beach.jpg) | Adman Payne | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Evening at the public beach on Saadiyat Island. |
| `mohamed-bin-zayed-city` | `/areas/mohamed-bin-zayed-city.jpg` | Yes | [Relaam: MBZ City guide](https://www.relaam.com/neighborhoods/mbz-city) | Relaam | © Relaam (credited; not openly licensed) | A palm-lined boulevard running through Mohamed Bin Zayed City. |

## Home hero image

| Use | Local path | Source file | Photographer / author | License | Notes |
| --- | --- | --- | --- | --- | --- |
| Home hero window (`app/home-v2/DoorHero.tsx`) | `/hero-abu-dhabi-aerial.jpg` | [Relaam neighbourhood guide banner](https://www.relaam.com/neighborhoods) | Relaam | © Relaam (credited; not openly licensed) | Aerial of the Corniche end: Etihad Towers, Emirates Palace, Marina Mall and the city grid. 2702x1282 with the warm grade already in the file; the page adds only a thin navy scrim under the open-state caption. Credit chip "Photo: Relaam" on the hero. The previous Commons photo (FritzDaCat, CC BY-SA 3.0) is still at `/hero-abu-dhabi.jpg` but unused. |

## Brand and provider marks

| Use | Local path | Notes |
| --- | --- | --- |
| Yala AD ribbon mark (all headers via `components/BrandMark.tsx`) | `/brand/yala-ad-mark.png` | Cut from Yahia's supplied logo sheet; full lockup at `/brand/yala-ad-logo.png`. Favicon set: `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png`. |
| ADGM logo on light cards | `/provider-logos/adgm-dark.svg` | Same paths as `adgm.svg` (the white, reversed logo), fills recoloured to `#134a7b` so it shows on white. Original kept unchanged. |

## Fallback-image rule

When an exact area image was unavailable during this pass, the local file remains a licensed Abu Dhabi context image and the guide record sets `image.exactAreaPhoto` to `false`. The caption must say what the photo is and must not describe it as the unavailable neighborhood.

## Usage boundary

The image source metadata supports attribution and honest display. It does not validate rents, commute times, availability, agent details, or government-service status. Those claims need their own dated source records in the catalog or listing feed.
