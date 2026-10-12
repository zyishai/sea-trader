# ctrader

## 3.2.0

### Minor Changes

- 54f134c: Smarter Cargo, Fairer Money and Clearer Voyages

  - When you find more goods than your hold can take, choose to take as much as you can carry (overloading the ship) or only what fits; the most valuable goods are loaded first
  - The market tells you how much you can buy, counting both your money and your cargo space, with and without overloading
  - Goods and hold capacity are measured in picul everywhere, and the help screen explains what a picul is
  - Pirates who win a fight now reliably plunder part of your cargo
  - Purchases are paid only from money you have; you can no longer buy on credit after slipping into debt
  - While you're in debt, your guard fleet's upkeep is forgiven instead of billed later, and the fleet fights at half strength
  - Debt interest is 3% a day, at most $50 a day, and is charged only for days you're actually in debt
  - Bribing pirates takes money on hand
  - Selling your fleet to cover debts now fetches half its hiring price
  - Retiring with a small debt now scores your voyage instead of calling it bankruptcy
  - The shipyard shows upgrades you can't afford yet and tells you why
  - The status bar shows your balance, in red while you're in debt
  - The port screen shows how many days each passage takes, the day you'll arrive, and your guard fleet's upkeep for the trip
  - The status bar shows the day of your voyage (for example "Day 34 of 200") and the current season
  - Days lost to storms and other events now count toward price updates and season changes, and never carry a classic voyage past day 200
  - Long passages no longer skip a price update
  - Events and pirate encounters report exactly what happened to your ship, money, cargo, reputation and schedule, in the same words every time
  - Event messages read more clearly, with spelling fixes
  - A capacity bonus from expert maintenance no longer makes your next hold upgrade skip a size
  - The help screen shows the correct starting money and names the goods you can trade
  - After buying or selling you stay on the goods list instead of jumping back to the market menu, and a refused order keeps you on its prompt so you can try again
  - Fractional or empty quantities are refused with a clear message
  - Not affording a guard fleet upgrade no longer throws you out of the shipyard, and fully upgraded ship parts say so instead of "not enough money"
  - If you're left with no cargo and too little money to buy anything, you can now declare bankruptcy instead of being stuck, and the shipyard warns you before an upgrade or repair that would leave you that way
  - The help screen and README now explain the goal, scoring, money rules, and controls, and several misleading tips are corrected

## 3.1.0

### Minor Changes

- 9dcba87: Fits Any Terminal

  - Screens that don't fit your terminal now scroll with the mouse wheel or PgUp/PgDn
  - Market prices stay neatly aligned, even when they reach four or five digits
  - The game adapts to your terminal width and stays playable down to 60×20
  - A clear message tells you when the window is too small, and your game picks up where you left off once it's resized
  - Quitting the game now leaves your terminal exactly as it was
  - Merchant tips about strong price trends now give the right advice on when to buy or sell
  - Merchant tips now always match the prices on screen
  - Requires Node.js 18 or newer

## 3.0.1

### Patch Changes

- 8cfc1d7: Fix Price Comparison Table

## 3.0.0

### Major Changes

- 77f52ea: Simplified UI and Personalized Messages

  - Completely new ui: simple, smooth, and intuitive
  - Personalized messages
  - Balanced events and prices
  - New features: market tips, reputation, port specialization, and more

## 2.10.0

### Minor Changes

- 635a02e: Market Analysis and Merchant Tips

## 2.9.0

### Minor Changes

- 6216f33: Price System Update

  - Dynamic trend schedule based on trend duration
  - Seasons system affects prices
  - Market specialization system affect trends
  - Enhanced market trend system

## 2.8.0

### Minor Changes

- 34dc896: Market Intelligence System - Phase 1

  - Market information level system
  - Reliability degrades over time
  - Market and intelligence actions

### Patch Changes

- 499b7f9: Internal workflow changes
- 1cbd426: Internal workflow updates

## 2.7.0

### Minor Changes

- e9f6646: Strategy features and historic accuracy

  - Better market UI
  - Overloading cargo affects speed and potential damage
  - Historically accurate weight and volume units
  - Ship upgrades
  - Interactive events

## 2.6.3

### Patch Changes

- 7ba6325: Internal improvements and updates

## 2.6.2

### Patch Changes

- c63ba1e: Custom release notes

## 2.6.1

### Patch Changes

- 47cc2d3: Better release notes

## 2.6.0

### Minor Changes

- f9dbd74: Update help screen

## 2.5.7

### Patch Changes

- 2e117d2: Automate release workflow

## 2.5.6

### Patch Changes

- 8b00b52: Automated release workflow

## 2.5.5

### Patch Changes

- 2672ff9: Automated release workflow

## 2.5.4

### Patch Changes

- ee34eaf: Automated release workflow fixed

## 2.5.3

### Patch Changes

- 90033fc: Automated release workflow

## 2.5.2

### Patch Changes

- e2726ef: Fix release workflow

## 2.5.1

### Patch Changes

- 332b7fc: New UI and better documentation

## 2.5.0

### Minor Changes

- 2222b99: Update README and setup automated workflow

## 2.4.0

### Minor Changes

- 742955b: Changed to game length

  - Game length is now 200 days (previously: 100 days)
  - Ship speed has more reasonable range, 8-20 knots (previously: 500!)
  - Adjust travel time
  - Add speed factor to events chance

## 2.3.0

### Minor Changes

- 5c769dc: New layout

  - Different views for different actions
  - Separation of view area from actions area
  - Players can visit the shipyard anytime (upgrades not available yet)
  - Exit confirmation state
  - New inventory view

## 2.2.1

### Patch Changes

- 8f3dee0: Hot fix: player starts the game in debt

## 2.2.0

### Minor Changes

- d7966e7: New UI, new hiring system, and debt handling

## 2.1.0

### Minor Changes

- 31d5db3: Pirates encounter

## 2.0.0

### Major Changes

- 4432499: Remodeled machine and UI messages

## 1.3.0

### Minor Changes

- 8ca7a35: Better animations

## 1.2.0

### Minor Changes

- ef966b7: Update README and help screen

## 1.1.0

### Minor Changes

- afc3387: Prices update

## 1.0.0

### Major Changes

- d2209c6: First version 🚀

## 0.2.0

### Minor Changes

- e497033: New layout and messages redesigned

## 0.1.0

### Minor Changes

- c821988: Basic market and ship repair

## 0.0.2

### Patch Changes

- 2e27f99: Sea Trader v0-beta.2

## 0.0.1

### Patch Changes

- 59742c9: Simple greeting cli
