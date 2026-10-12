# Sea Trader

A turn-based trading game set among the 19th-century Far East treaty ports: the Captain sails between ports, buying and selling goods to grow their fortune before the voyage ends. Units follow the era's trade conventions, simplified for play.

## Language

**Captain**:
The player.
_Avoid_: User, trader

**Voyage**:
The Captain's whole trading run, counted in days. A classic Voyage ends on day 200; an extended Voyage continues past it with a score penalty.
_Avoid_: Game, run, campaign

**Season**:
One of four 30-day periods (Spring, Summer, Autumn, Winter) that shift prices and event chances. The Voyage starts in a random Season and moves to the next every 30 days.
_Avoid_: Quarter, period

**Price Update**:
The moment every 14 days when trends move and prices change at every port.
_Avoid_: Market refresh, tick

**Delay**:
Days an event adds to the passage, such as sheltering from a storm. A favourable wind gives a negative Delay, though a passage always takes at least one day.
_Avoid_: Lost time, wait

**Event**:
A random happening during a passage, such as a storm, a market rumour or an uncharted island. Some Events ask the Captain to choose.
_Avoid_: Incident, encounter, random event

**Pirate Encounter**:
Pirates intercepting the Ship during a passage; the Captain orders an attack, an escape or a bribe.
_Avoid_: Pirate event, battle

**Outcome**:
A single change an Event or Pirate Encounter makes to the Ship, the Balance, the Hold, reputation or the calendar, such as damage to the Ship or a Delay.
_Avoid_: Effect, consequence, result

**Ship**:
The Captain's single merchant vessel. It has a Vessel Class, condition, speed, defense and one Hold. The Captain owns one Ship at a time and may change its Vessel Class.
_Avoid_: Vessel, boat

**Vessel Class**:
A kind of Ship, such as a Coastal Junk, with its own base speed, defense and capacity and its own upgrade ladders.
_Avoid_: Ship type, model, hull

**Hold**:
The cargo carried aboard the Ship: how much of each good is aboard, and how much room the Ship has. Goods are tracked as amounts per good, not as individual purchases.
_Avoid_: Inventory, storage, cargo bay

**Picul**:
The unit for both goods and Hold capacity, about 60 kg (one porter's load). A Ship's capacity is how many picul it can carry, and one picul of any Good takes one picul of capacity.
_Avoid_: Tons burden, storage units, units of storage, bulkiness

**Overloaded**:
A Hold carrying more than the Ship's capacity, within a limited extra margin. An Overloaded Ship sails slower, flees pirates less easily, and suffers more from storms and cargo shifting.
_Avoid_: Over capacity, overweight

**Cargo Offer**:
Goods the Captain may load onto the Ship without buying them, such as goods found while exploring. When they don't all fit, the Captain chooses between taking as much as the Ship can carry (Overloaded) or only what fits.
_Avoid_: Loot, windfall, found goods

**Guard Fleet**:
Escort ships the Captain hires to fight pirates. They carry no cargo.
_Avoid_: Guards, escorts

**Upkeep**:
The daily cost of keeping the Guard Fleet. While the Captain is in Overdraft, Upkeep goes unpaid and the fleet fights at reduced strength; unpaid days are forgiven, not billed later.
_Avoid_: Maintenance, fleet fee

### World

**Good**:
A commodity traded between Ports, such as Tea or Porcelain, with its own base price, volatility and seasonal swings.
_Avoid_: Item, product, commodity, merchandise

**Port**:
A harbor where the Captain trades and repairs. Each Port has a market size and may be a Trading Hub or produce some Goods.
_Avoid_: City, harbor, location

**Sea Route**:
The distance in nautical miles between two Ports, the same in both directions.
_Avoid_: Path, lane, distance matrix

**Trading Hub**:
A Port whose busy market keeps prices slightly lower for every Good.
_Avoid_: Hub, entrepôt

**Produced Good**:
A Good a Port makes locally, so it sells there below its usual price.
_Avoid_: Specialty, local good, export

### Money

**Balance**:
The Captain's money. It goes negative when the Captain owes the Moneylenders.
_Avoid_: Cash, funds, wallet

**Overdraft**:
A negative Balance owed to the Moneylenders, charged daily interest. The Captain falls into Overdraft through charges, never by buying: purchases are paid only from a positive Balance.
_Avoid_: Debt, credit, negative balance

**Moneylenders**:
Who the Captain owes while in Overdraft.
_Avoid_: Bank, creditors, lenders

**Net Worth**:
The Balance plus the value of the Hold's cargo at the current port's prices.
_Avoid_: Net cash, wealth, assets

**Voyage End**:
How a voyage finished: **Retired** after the voyage days, **Bankrupt** when the Overdraft passed the limit, **Declared Bankrupt** when the Captain gave up while in Overdraft, or **Shipwrecked** when the Ship was a wreck the Captain couldn't afford to repair.
_Avoid_: Game over, outcome
