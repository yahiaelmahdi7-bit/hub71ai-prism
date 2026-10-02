# Yala AD — Abu Dhabi relocation action hub

## The idea

Yala AD helps freelancers, self-employed newcomers, individuals, and companies moving teams settle in Abu Dhabi from one simple place. It uses a reusable personal profile to connect where someone can live, where they can work, how they can set up, and which financial products fit their situation. Companies add a move program with policy, invitations, and a progress view. Each result leads to a real next action: contact an agent, start a booking, reach an official service, or connect with a bank.

The first market is Abu Dhabi. The first build connects one personal journey with a small-team employer journey; broader jurisdictions, cities, and providers follow later. The complete screen and status flow is in [app-flow.md](app-flow.md).

## The first experience

The website is a connected application: a focused landing page, source-linked area and service information pages, a short onboarding flow, a private move workspace, and a separate company workspace. Each page supports a decision or action. The application works from a fresh browser and empty program without loading demo data automatically.

Ask only what work the person does, who is moving with them, and their income. They may enter income manually or let the existing document reader help. Ask further questions only when they would change a recommendation.

The first screen returns a small set of suitable areas and homes, a realistic move and housing budget, nearby places to work, a setup path, and direct action buttons. When a person selects a property, Yala AD updates the required cash and finance fit for that specific choice. Their profile and live journey timeline carry across the experience.

## Product modules that work together

| Module | Useful result | Action |
| --- | --- | --- |
| Areas and homes | Explainable matches to income, household, and preferences | Open listing or contact agent |
| Workplaces | Coworking and work-friendly cafés near shortlisted areas | Book where supported, or contact venue |
| Setup | Relevant Abu Dhabi licence and residence route | Start at official service or approved provider |
| Money | Account, loan, and property-specific mortgage readiness | Start lender application or request callback |
| Evidence | Reusable income and identity facts from optional documents | Share selected information with a named provider by consent |

The current PDF/image analyzer becomes the evidence feature inside this journey. It is not the product's home screen.

## Company moves

A company can start with its existing UAE entity or follow a jurisdiction-specific establishment path. It enters its office area, team size, target date, and relocation allowances once, then invites employees into their own private personal journeys. Yala AD shows the employer aggregate milestones, blockers, housing-policy fit, and expected move spend while keeping personal income documents and lender information private. Official company, work-permit, and residence submissions remain with the responsible authority or provider; Yala AD tracks honest handoffs and evidence-backed status. The first company demo targets an already-established employer moving five people, with mainland/ADGM/KEZAD setup paths added as tracked handoffs. See [app-flow.md](app-flow.md).

## Live journey tracking

One timeline tracks every action across housing, workspaces, business setup, residence, and finance. Each card shows its current status, when it changed, where the update came from, what is blocking progress, and the next action. For example: a property moves from saved to contact opened, agent replied, viewing booked, and lease agreed; a mortgage moves from application started to submitted, lender review, and lender decision.

Connected providers update the timeline through APIs or webhooks as events arrive, and the app can notify the user when a status changes or an action is due. For actions that open an external site or WhatsApp chat, Yala AD can track that the contact or booking page was opened; it cannot claim that a message was sent or a booking was confirmed without a provider event or an explicit user update. Manually updated statuses remain clearly labeled with their source and time.

## The dataset we build

Create a structured Abu Dhabi dataset from real, dated sources: area-level rents, current public property listings, workspaces and their booking paths, licensing/residence steps, and lender requirements. Each fact needs a source, date checked, and confidence. The [ADREC rental index](https://adrec.gov.ae/en/property_and_index/interactive-map) and [market data](https://adrec.gov.ae/en/market-data) are starting points for area-level housing data. [ADDED](https://added.gov.ae/en/set-up/establish-your-business/licensing-requirements) and [ADRO](https://www.adro.gov.ae/en/Visas/Types-of-Visas/Abu-Dhabi-Green-Visa/Freelancers) are starting points for freelancer setup routes.

The existing Sara documents are fictional test data. They do not count as the real market dataset.

Store the dataset in a searchable structure and use Jev to rank a shortlist against personal preferences. Budget limits and other hard requirements stay in deterministic code. Jev's [official reranking pattern](https://docs.typesafe.ai/cookbooks/rerank_typesafe.md) fits that role.

## Integration path

Start with real, user-initiated contact and provider booking links. [WhatsApp click-to-chat](https://faq.whatsapp.com/5913398998672934) is available for agent contact. Property Finder offers a [developer network](https://pfdn.propertyfinder.com/), and [WeWork offers a partner API](https://developers.wework.com/); their deeper in-app capabilities require access and agreements. No public consumer listing-search API has been verified for Property Finder or Dubizzle. A button must say whether it opens contact, sends an inquiry, requests a booking, or confirms one. Provider integrations should return status events to the shared timeline.

For this short-lived hackathon prototype, attempt a small, rate-limited sample of publicly visible Abu Dhabi rentals from [Dubizzle Abu Dhabi rental search](https://abudhabi.dubizzle.com/en/property-for-rent/residential/), with [Property Finder Abu Dhabi search](https://www.propertyfinder.ae/en/rent/abu-dhabi/properties-for-rent.html) as a separately attributed fallback when Dubizzle blocks requests. Preserve each listing URL, asking rent, source, and fetch time. Keep real listings distinct from synthetic records calibrated to observed prices. Link contact actions back to the original portal; do not claim a partnership or claim an agent replied merely because a contact page opened. Do not base the app on [`aksiksi/dubizzle`](https://github.com/aksiksi/dubizzle): its README says it has been broken since 2016, it focuses on Motors, and the repo is archived. Both [Dubizzle's terms](https://www.dubizzle.com/legalhub/terms/) and [Property Finder's terms](https://www.propertyfinder.com/ae/terms-and-conditions/) prohibit automated scraping/database building, so this extraction is a bounded demo experiment, not a production integration. Remove it or replace it with authorized access before any public launch.

For finance, show a property-specific readiness explanation using sourced lender requirements and [CBUAE mortgage limits](https://rulebook.centralbank.ae/en/rulebook/article-3-important-ratios). A lender owns approval and pre-approval. Yala AD shows readiness factors without approval probabilities. User financial information goes to a provider only with explicit, recipient-specific consent. Fees, payment terms and commute times stay unknown until there is evidence for them.

## First release success

- A user sees useful area matches with no more than three required answers.
- Each recommendation shows why it fits and when its underlying facts were checked.
- A property choice changes the budget and finance view.
- One property-agent contact path and one workspace booking/contact path work with honest status.
- The timeline shows housing, workspace, setup, and finance actions with a timestamp, update source, and next step; connected provider events appear as they arrive.
- Opening an external contact or booking page never changes its status to sent or confirmed without evidence.
- A bounded live rental pull shows actual asking rents and source links, while synthetic demo homes are unmistakably labeled; a property can be checked against the user's budget.
- Optional document extraction populates the same profile used by the other modules.
- The product never displays an invented property price, confirmed booking, partner integration, or bank approval.

This is the product direction. The implementation plan should ship one connected personal journey and one small-team company program before expanding to more cities, jurisdictions, providers, or banks.
