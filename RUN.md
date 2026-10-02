# How to run Bankable

You need Node.js installed (it is already on this laptop). Open Terminal in this folder, then:

1. **Install the parts (once):** `npm install`
2. **Add your OpenAI key (once):** `cp .env.example .env.local`, then open `.env.local` and paste your key after `OPENAI_API_KEY=`. Never share this file.
3. **Start the app:** `npm run dev` and open http://localhost:3000 in your browser.
4. **Quick check that the key works (optional):** `npm run smoke` (it says SKIPPED if there is no key yet).

To try it: drag the files from the `sample-docs` folder onto the page and press "Read my documents".
To inspect the hackathon property feed, open `http://localhost:3000/api/properties?mode=both&limit=12`. `live` records contain portal URLs and fetch times; `synthetic` records are clearly marked illustrative. See [property-data.md](docs/property-data.md) for calibration and source limitations.
To stop the app: press `Ctrl + C` in Terminal.
