# SC TMG Rules Notes (from Goonhammer Beta Rules First Impressions)

## Activation System
- **Alternating activation**: Each player activates one unit at a time, passes control
- **Per phase**: Each unit can do things in each phase (Movement, Assault, Combat, Scoring)
- Units activate **once per phase** (not once per round)
- A player who finishes activations in a phase first gets priority in the next phase

## Active Abilities
- Require unit to be **Activated**
- Used immediately before declaring an Action or immediately after resolving that Action
- Cannot be used in the middle of an Action
- **Each named Active Ability can only be used once per Round** (unless Repeatable keyword)
- Cannot be used on units in Reserves unless explicitly stated

## Reactive Abilities
- Triggered by specific events (e.g., enemy takes damage)
- **Cannot use more than one Reaction per Activation**
- **Restricted to once per Round** for a specific unit
- If both players react to same trigger, Active Player resolves first

## Shields (Protoss)
- Shields are a **second pool of health**
- The first time a model has suffered damage >= Shield value, it loses Shielded status
- Remove damage equal to Shield value
- So shields are like a one-time damage absorption per model

## Supply & Deployment
- Units deploy from Entry Edge by activating off-table units
- Must not exceed supply limit when deploying
- Supply Profile: relationship between models remaining and Current Supply
- Supply updated immediately upon models changing
- Supply used for: Deployment, objective control, Disengage checks

## Tactical Mass (Disengage)
- When disengaging, normally unit can't shoot or charge
- If falling back unit has higher supply than combined engaging units, it CAN shoot/charge

## Key Insight for App:
- Units activate in EACH phase (Movement, Assault, Combat) - not just once per round
- So tracking should be: hasActivated per phase, not per round
- React is once per round per unit
- Active abilities are once per round per named ability
