# Bankable: sourced readiness rules, self-employed newcomer, Abu Dhabi
Researched 2026-10-01. Every row was fetched from the page cited. No AI search summary is used as a source.
Bank thresholds are bank policy, not law, and pages change. Re-check the day before the demo.
AED amounts on bank pages sometimes render the currency as an icon. Those are marked "(AED assumed)".

## A) Summary
1. **Demo moment 1: Home loan.** The CBUAE regulation gives hard, checkable numbers: expat first-home LTV, DBR 50%, 25-year tenor, 7x income cap.
2. Mashreq and ADIB add exact document lists for self-employed applicants (audited accounts, 6 months of statements, trade licence).
3. **Demo moment 2: Car finance.** CBUAE sets 80% of vehicle value and a 60-month maximum, and the banks add self-employed thresholds. Emirates NBD needs AED 20,000 average balance and FAB needs 25,000 over 3 months.
4. **Demo moment 3: Credit card.** Emirates NBD gives a self-employed rule (average balance of 50,000 over 3 months) and an exact document list. CBUAE adds a 60,000 income floor (older notice, so medium confidence).
5. **Runner-up: Business bank account.** The Emirates NBD document list is clear and checkable (trade licence, passports/EIDs, MOA, 6 months of statements).
6. **Personal account** is well documented at Emirates NBD only. The other banks were not fetched, so treat it as a single-bank rule.
7. **Weakest moment: Rent.** Only u.ae supports it (passport, visa, EID, post-dated cheques, Tawtheeq, 5% municipality fee). Cheque count and deposit rules are NOT FOUND.
8. **Licence basics and AECB** are only partly verified (TAMM and AECB pages did not load). They are shown as informational, not scored.
9. **There is no universal self-employed income haircut.** CBUAE only says unreliable income must be "suitably discounted or excluded", with no percentage. The app must never show a haircut.
10. **Correction to the brief:** the expat LTV above AED 5m is 70% in the primary text, not 75%. At or below 5m it is 80%, as the brief said.

## B) Tables

### B1. Personal bank account
| Requirement | Proof document/field | Threshold | Source URL | Type | Conf |
|---|---|---|---|---|---|
| UAE resident, adult | Residence visa page, Emirates ID | Age 18+ | https://www.emiratesnbd.com/en/knowledge-hub/open-a-current-account-online | PRIMARY (bank) | M-H |
| Identity and residence | Passport, visa page, original Emirates ID | present, valid | same | PRIMARY | M-H |
| Income proof (self-employed substitute) | Trade licence OR 3-month bank statement instead of salary certificate | present | same | PRIMARY | M-H |
| Proof of address | Tenancy contract or utility bill | present | same | PRIMARY | M-H |
| Minimum balance (ENBD Classic) | Account balance | AED 3,000 average monthly; no minimum salary | same | PRIMARY | M |

### B2. Business bank account
| Requirement | Proof | Threshold | Source URL | Type | Conf |
|---|---|---|---|---|---|
| Legal entity or sole proprietor | Valid trade licence or certificate of incorporation from any UAE issuing authority | valid | https://www.emiratesnbd.com/en/business-banking/open-business-bank-account-online | PRIMARY | H |
| Owners/signatories identified | Passports + Emirates IDs of all partners/signatories | present | same | PRIMARY | H |
| Constitutional documents | MOA/AOA/board resolution | present | same | PRIMARY | H |
| Banking history | 6 months of bank statements: company (existing) or partner (new company) | 6 months | same | PRIMARY | H |
| Minimum balance (Emirati Business package only; other packages not read) | Average balance | AED 25,000 monthly | same | PRIMARY | L-M |

### B3. Rent a home
| Requirement | Proof | Threshold | Source URL | Type | Conf |
|---|---|---|---|---|---|
| Tenant documents | Passport copy, valid residence visa, Emirates ID | present, valid | https://u.ae/en/information-and-services/moving-to-the-uae/leasing-a-property-in-the-uae | PRIMARY (gov) | H |
| Rent paid by post-dated cheques | Cheques covering the agreed period | count NOT FOUND | same | PRIMARY | M |
| Tenancy registered in Tawtheeq (Abu Dhabi); needed to connect utilities | Registered contract | registered | same | PRIMARY | H |
| Municipality fee | Added to the utility bill | 5% of rental value or rental index (the higher), over 12 months | same | PRIMARY | H |
| Broker commission cap | Broker invoice | up to 5% of total rent | same | PRIMARY | M-H |

### B4. Credit card
| Requirement | Proof | Threshold | Source URL | Type | Conf |
|---|---|---|---|---|---|
| Minimum age | Emirates ID | 21+ (Emirates NBD) | https://www.emiratesnbd.com/en/help-and-support/eligibility-and-documents-for-credit-cards | PRIMARY | H |
| Self-employed balance | Bank statement, last 3 months | average balance at least 50,000 (AED assumed) | same | PRIMARY | M-H |
| Possible fixed deposit | Deposit | "may need" a deposit equal to the card's minimum (not guaranteed) | same | PRIMARY | M |
| Documents | Emirates ID + passport (originals), trade licence (if you own the business), 3-month bank statement; salaried applicants add a salary certificate | present | same | PRIMARY | H |
| CBUAE minimum income | Income proof | AED 60,000 per year; below it, a pledged deposit of at least 60,000; card repayment within 50% DBR | https://rulebook.centralbank.ae/en/entiresection/1793 | PRIMARY (regulator, 2011 notice) | M |

### B5. Car finance
| Requirement | Proof | Threshold | Source URL | Type | Conf |
|---|---|---|---|---|---|
| Maximum financing | Quotation / valuation | 80% of vehicle value | https://rulebook.centralbank.ae/en/entiresection/1793 (text also at https://rulebook.centralbank.ae/en/entiresection/4406) | PRIMARY (regulator) | M-H |
| Maximum repayment period | Loan term | 60 months | same | PRIMARY | M-H |
| ENBD self-employed income | 3-month statement | average balance AED 20,000; age 21-60 | https://www.emiratesnbd.com/en/help-and-support/apply-for-an-auto-loan | PRIMARY | H |
| ENBD self-employed documents | Trade licence + MOA/AOA, passport, visa+EID, driving licence | present | same | PRIMARY | H |
| FAB self-employed | Bank statements | average monthly balance 25,000 for last 3 months (AED assumed); up to 1.5m or 80% of car; min down payment 20% | https://www.bankfab.com/en-ae/personal/loans/car-loans | PRIMARY | M-H |
| Used-car documents | Seller passport/EID + valuation certificate | present | ENBD URL above | PRIMARY | M |

### B6. Home loan
| Requirement | Proof | Threshold | Source URL | Type | Conf |
|---|---|---|---|---|---|
| LTV, expat first home, value at or below 5m | Property value, loan amount | max 80% | https://rulebook.centralbank.ae/en/rulebook/article-3-important-ratios | PRIMARY (regulator) | H |
| LTV, expat first home, value above 5m | same | max 70% | same | PRIMARY | H |
| LTV, expat second/investment home; off-plan | same | 60%; off-plan 50% | same | PRIMARY | H |
| DBR | Gross income, monthly debts | max 50% of gross income; stress-test 2-4 pp above the current rate | same | PRIMARY | H |
| Tenor | Loan term | max 25 years | same | PRIMARY | H |
| Maximum financing | Annual income | expats up to 7x annual income | same | PRIMARY | H |
| Income that counts | Salary or verifiable business/rental income. End of service benefit is not allowed. | Only "reliable and sustainable" income; non-standard income "suitably discounted or excluded" with no percentage | https://rulebook.centralbank.ae/en/entiresection/2850 | PRIMARY | H |
| Mashreq self-employed documents | Application form, passport+visa, last 6 months bank statements (personal AND company), liability letter, MOA/AOA, audited financials for the last 2 years, board resolution, trade licence, Chamber of Commerce copy, business profile on letterhead, purchase contract, down-payment receipts | present | https://www.mashreq.com/en/uae/neo/loans/mortage-loans/mashreq-home-loans/ | PRIMARY | H |
| Mashreq limits | Application | min income from AED 15,000 per month (text ambiguous); max AED 15m; max 25 years; age 70 at maturity | same | PRIMARY | M |
| ADIB self-employed | Company ownership documents, 6 months bank statement, passport+EID, visa | annual turnover AED 3,000,000; min age 30; age 70 at maturity; Abu Dhabi and Dubai only | https://www.adib.ae/en/personal/finance/home-finance/build-your-dream-home | PRIMARY | M |

### B7. Licence basics and AECB (informational, not scored)
Both TAMM and the AECB pages failed to load. Treat everything in this section as NOT VERIFIED. See D.

## C) JSON rules
```json
[
{"id":"HL-LTV-EXP1-LE5M","moment":"home_loan","requirement":"Expat first home value at or below AED 5m: max LTV","proof_field":"loan_amount / property_value","threshold":"<= 80%","source_url":"https://rulebook.centralbank.ae/en/rulebook/article-3-important-ratios","source_type":"PRIMARY","confidence":"H"},
{"id":"HL-LTV-EXP1-GT5M","moment":"home_loan","requirement":"Expat first home value above AED 5m: max LTV","proof_field":"loan_amount / property_value","threshold":"<= 70%","source_url":"https://rulebook.centralbank.ae/en/rulebook/article-3-important-ratios","source_type":"PRIMARY","confidence":"H"},
{"id":"HL-DBR","moment":"home_loan","requirement":"Debt burden ratio","proof_field":"total_monthly_debt_payments / gross_monthly_income","threshold":"<= 50%; stress-tested at 2-4 pp above current rate","source_url":"https://rulebook.centralbank.ae/en/rulebook/article-3-important-ratios","source_type":"PRIMARY","confidence":"H"},
{"id":"HL-TENOR","moment":"home_loan","requirement":"Maximum tenor","proof_field":"requested_tenor_years","threshold":"<= 25 years","source_url":"https://rulebook.centralbank.ae/en/rulebook/article-3-important-ratios","source_type":"PRIMARY","confidence":"H"},
{"id":"HL-MAXFIN-EXP","moment":"home_loan","requirement":"Max financing for expats","proof_field":"loan_amount / annual_income","threshold":"<= 7x annual income","source_url":"https://rulebook.centralbank.ae/en/rulebook/article-3-important-ratios","source_type":"PRIMARY","confidence":"H"},
{"id":"HL-INCOME-RELIABLE","moment":"home_loan","requirement":"Only reliable, sustainable, verifiable income counts; no percentage haircut is defined","proof_field":"business_income_statements","threshold":"no numeric rule","source_url":"https://rulebook.centralbank.ae/en/entiresection/2850","source_type":"PRIMARY","confidence":"H"},
{"id":"HL-MASHREQ-DOCS","moment":"home_loan","requirement":"Mashreq self-employed document set","proof_field":"6m personal+company statements, audited financials 2y, MOA/AOA, trade licence, liability letter, Chamber of Commerce copy","threshold":"all present","source_url":"https://www.mashreq.com/en/uae/neo/loans/mortage-loans/mashreq-home-loans/","source_type":"PRIMARY","confidence":"H"},
{"id":"HL-ADIB-TURNOVER","moment":"home_loan","requirement":"ADIB self-employed minimum annual turnover, min age","proof_field":"annual_turnover, age","threshold":"AED 3,000,000; age >= 30","source_url":"https://www.adib.ae/en/personal/finance/home-finance/build-your-dream-home","source_type":"PRIMARY","confidence":"M"},
{"id":"CAR-LTV","moment":"car_finance","requirement":"Max financing as share of vehicle value","proof_field":"loan_amount / vehicle_value","threshold":"<= 80%","source_url":"https://rulebook.centralbank.ae/en/entiresection/1793","source_type":"PRIMARY","confidence":"M"},
{"id":"CAR-TENOR","moment":"car_finance","requirement":"Max repayment period","proof_field":"requested_tenor_months","threshold":"<= 60 months","source_url":"https://rulebook.centralbank.ae/en/entiresection/1793","source_type":"PRIMARY","confidence":"M"},
{"id":"CAR-ENBD-BAL","moment":"car_finance","requirement":"Emirates NBD self-employed average balance","proof_field":"avg_bank_balance_3m","threshold":">= AED 20,000","source_url":"https://www.emiratesnbd.com/en/help-and-support/apply-for-an-auto-loan","source_type":"PRIMARY","confidence":"H"},
{"id":"CAR-ENBD-DOCS","moment":"car_finance","requirement":"Emirates NBD self-employed documents","proof_field":"trade licence + MOA/AOA, passport, visa+EID, driving licence","threshold":"all present","source_url":"https://www.emiratesnbd.com/en/help-and-support/apply-for-an-auto-loan","source_type":"PRIMARY","confidence":"H"},
{"id":"CAR-FAB-BAL","moment":"car_finance","requirement":"FAB self-employed average balance and down payment","proof_field":"avg_bank_balance_3m, down_payment_pct","threshold":">= AED 25,000 (AED assumed); down payment >= 20%","source_url":"https://www.bankfab.com/en-ae/personal/loans/car-loans","source_type":"PRIMARY","confidence":"M"},
{"id":"CC-ENBD-BAL","moment":"credit_card","requirement":"Emirates NBD self-employed average balance","proof_field":"avg_bank_balance_3m","threshold":">= 50,000 (AED assumed)","source_url":"https://www.emiratesnbd.com/en/help-and-support/eligibility-and-documents-for-credit-cards","source_type":"PRIMARY","confidence":"M"},
{"id":"CC-ENBD-AGE","moment":"credit_card","requirement":"Minimum age","proof_field":"date_of_birth","threshold":">= 21","source_url":"https://www.emiratesnbd.com/en/help-and-support/eligibility-and-documents-for-credit-cards","source_type":"PRIMARY","confidence":"H"},
{"id":"CC-ENBD-DOCS","moment":"credit_card","requirement":"Emirates NBD documents","proof_field":"Emirates ID, passport, trade licence (if business owner), 3-month bank statement","threshold":"all present","source_url":"https://www.emiratesnbd.com/en/help-and-support/eligibility-and-documents-for-credit-cards","source_type":"PRIMARY","confidence":"H"},
{"id":"CC-CBUAE-INCOME","moment":"credit_card","requirement":"CBUAE minimum income for a card, or pledged deposit","proof_field":"annual_income","threshold":">= AED 60,000 per year, else a pledged deposit >= 60,000","source_url":"https://rulebook.centralbank.ae/en/entiresection/1793","source_type":"PRIMARY","confidence":"M"},
{"id":"BA-BIZ-LICENCE","moment":"business_account","requirement":"Valid trade licence or certificate of incorporation","proof_field":"trade_licence.expiry","threshold":"valid (not expired)","source_url":"https://www.emiratesnbd.com/en/business-banking/open-business-bank-account-online","source_type":"PRIMARY","confidence":"H"},
{"id":"BA-BIZ-DOCS","moment":"business_account","requirement":"Passports + Emirates IDs of signatories, MOA/AOA/board resolution","proof_field":"passport, emirates_id, moa_aoa","threshold":"all present","source_url":"https://www.emiratesnbd.com/en/business-banking/open-business-bank-account-online","source_type":"PRIMARY","confidence":"H"},
{"id":"BA-BIZ-STMT","moment":"business_account","requirement":"Bank statement history","proof_field":"bank_statement_months","threshold":"6 months (company, or partner if new company)","source_url":"https://www.emiratesnbd.com/en/business-banking/open-business-bank-account-online","source_type":"PRIMARY","confidence":"H"},
{"id":"BA-PERS-DOCS","moment":"personal_account","requirement":"Emirates NBD documents; self-employed may use trade licence or 3-month statement instead of a salary certificate","proof_field":"passport, visa page, emirates_id, trade_licence or bank_statement_3m, proof_of_address","threshold":"all present","source_url":"https://www.emiratesnbd.com/en/knowledge-hub/open-a-current-account-online","source_type":"PRIMARY","confidence":"M"},
{"id":"BA-PERS-MINBAL","moment":"personal_account","requirement":"Emirates NBD Classic minimum average balance","proof_field":"monthly_avg_balance","threshold":"AED 3,000","source_url":"https://www.emiratesnbd.com/en/knowledge-hub/open-a-current-account-online","source_type":"PRIMARY","confidence":"M"},
{"id":"RENT-DOCS","moment":"rent","requirement":"Tenant documents","proof_field":"passport copy, residence visa, Emirates ID","threshold":"all present and valid","source_url":"https://u.ae/en/information-and-services/moving-to-the-uae/leasing-a-property-in-the-uae","source_type":"PRIMARY","confidence":"H"},
{"id":"RENT-CHEQUES","moment":"rent","requirement":"Post-dated cheques covering the agreed rental period (number not specified)","proof_field":"cheque_book / bank account","threshold":"count NOT FOUND","source_url":"https://u.ae/en/information-and-services/moving-to-the-uae/leasing-a-property-in-the-uae","source_type":"PRIMARY","confidence":"M"},
{"id":"RENT-TAWTHEEQ","moment":"rent","requirement":"Abu Dhabi tenancy registered in Tawtheeq (needed for utilities)","proof_field":"tawtheeq_contract_number","threshold":"registered","source_url":"https://u.ae/en/information-and-services/moving-to-the-uae/leasing-a-property-in-the-uae","source_type":"PRIMARY","confidence":"H"},
{"id":"RENT-MUNI-FEE","moment":"rent","requirement":"Municipality fee added to the utility bill over 12 months","proof_field":"annual_rent","threshold":"5% of rental value or rental index, whichever is higher","source_url":"https://u.ae/en/information-and-services/moving-to-the-uae/leasing-a-property-in-the-uae","source_type":"PRIMARY","confidence":"H"},
{"id":"RENT-BROKER","moment":"rent","requirement":"Maximum broker commission","proof_field":"broker_invoice","threshold":"up to 5% of total rent","source_url":"https://u.ae/en/information-and-services/moving-to-the-uae/leasing-a-property-in-the-uae","source_type":"PRIMARY","confidence":"M"}
]
```

## D) NOT FOUND / unverified
- **Self-employed income haircut %:** none exists. CBUAE only says income must be "reliable and sustainable". The app must not show a haircut.
- **Universal trading-history requirement:** no CBUAE rule on years in business or audited accounts for self-employed borrowers. Only bank-specific lists (Mashreq audited financials for 2 years; ADIB turnover and 6 months of statements).
- **ADIB dedicated self-employed programme** (turnover 2m nationals / 3m expats, 3 years in business, min age 25): the page returned 404 or empty. NOT VERIFIED, not used.
- **ADCB** (all products): adcb.com returned 403. No ADCB rule is used.
- **FAB, ADCB and Mashreq personal accounts, and credit cards at FAB, ADCB and Mashreq:** not fetched.
- **Rent:** cheque count, security deposit, and landlord income or tenancy-history requirements. No primary Abu Dhabi source found. TAMM lease-registration fee and documents (a search summary said AED 50) are NOT VERIFIED.
- **Freelance permit / licence** (ADDED, TAMM, twofour54, ADGM): TAMM is a single-page app and I got no usable text. Documents, fees, validity and the activity list are NOT VERIFIED.
- **AECB:** score range, newcomer behaviour, and the Nova Credit foreign-report programme. The aecb.gov.ae site did not load (curl returned 1 byte, DNS failure in the browser). NOT VERIFIED.
- **Bank-specific minimum monthly income for a Mashreq self-employed home loan:** the text is ambiguous between salaried and self-employed.
- **Currency icon:** the AED currency icon was not rendered on the Emirates NBD and FAB pages. Amounts marked "AED assumed" are probable, not confirmed.
- **Credit card AED 60,000 floor and car 80% / 60 months:** from CBUAE Notice 2901/2011. It may have been amended or superseded, so confidence is M.

## Result summary
1. Wrote rules-research.md with A) summary, B) tables, C) 28 JSON rules, D) NOT FOUND.
2. Best moments for the demo: home loan, car finance, credit card. Business account is the runner-up.
3. Correction: expat LTV above AED 5m is 70% (primary text), not 75%. At or below 5m it is 80%.
4. No self-employed haircut % exists. Rent cheque count and deposit, freelance licence details and AECB are NOT VERIFIED (pages unreachable).
5. All rule URLs were fetched and read this session; bank figures are bank policy and need a recheck.
