# Post-Ticket-21 product browser acceptance

Date: 2026-09-14  
Status: passed in one requested post-closure run

The current Expo Web product was served from the same-origin Ticket 20 room
fixture and exercised with real headless Google Chrome at 1500×1050.

Passed journeys:

1. Database catalogue counts, search and unit detail.
2. Army creation, Terran command card, Marine roster entry, save and persistence.
3. Damage, Matchup, Unit VS, Roster and real dice-history surfaces.
4. Official-source Settings plus Chinese/English switching.
5. Persistent bottom-right Kerrigan tactical-adjutant dock.
6. One-time room recovery, battlefield map, portrait/model selection, threat
   toggle, LegalSpace, Preview, human confirmation, Apply, asynchronous bot and
   strict Replay (`matches current: true`).
7. Four verified episodes, manual merged reflection, two quarantined SkillOpt
   candidates and five-Skill incremental freshness preview.

`consoleErrors=[]` and `pageErrors=[]`. Four `/hot` and `/message` WebSocket 404
messages are local-static-server HMR transport noise, not product errors. The
final product screenshot is
`build/ticket-20-product-web-user-journey-v1/final.png`.

Provider/model calls and cost were zero.

