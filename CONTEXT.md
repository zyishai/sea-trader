# Sea Trader

A turn-based trading game set among the 19th-century Far East treaty ports: the Captain sails between ports, buying and selling goods to grow their fortune before the voyage ends. Units follow the era's trade conventions, simplified for play.

## Language

**Captain**:
The player.
_Avoid_: User, trader

**Ship**:
The Captain's single merchant vessel. It has a class, condition, speed, defense and one Hold. The Captain owns one Ship at a time and may change its class.
_Avoid_: Vessel, boat

**Hold**:
The cargo carried aboard the Ship: how much of each good is aboard, and how much room the Ship has. Goods are tracked as amounts per good, not as individual purchases.
_Avoid_: Inventory, storage, cargo bay

**Picul**:
The unit for both goods and Hold capacity, about 60 kg (one porter's load). A Ship's capacity is how many picul it can carry.
_Avoid_: Tons burden, storage units, units of storage

**Bulkiness**:
How much Hold capacity one picul of a good takes up. Most goods take exactly one picul of capacity; bulky goods take more.
_Avoid_: Volume, size

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
