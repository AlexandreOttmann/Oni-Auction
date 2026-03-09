# Domain Glossary

Every agent must use these terms consistently across code, APIs, and UI.

---

## User Roles

### Admin
- Sees a **realtime dashboard** with all active auctions listed
- On each auction, sees full realtime state: bid activity, timer, bidder count, charts
- Can create, start, pause, and close auctions
- Read-only on the bidding process itself — does not bid

### Buyer (Procurement)
- Wants to **purchase** materials — participates as a bidder
- Sees the auction page, places bids, watches competition in real-time
- In **English auctions**: bids higher to outbid competitors
- In **Dutch auctions**: waits for the price to drop to their target, then strikes first
- Gets notified when outbid or when they win

### Seller (Supplier)
- **Offers** materials for auction
- Sees the auction from a read-only perspective (current bid, leader, history)
- Watches to understand market demand
- Does **not** bid in their own auction

---

## Auction Types

### English Auction (Ascending Price)
- Starts at a **minimum price**
- Buyers bid **higher and higher**
- Current highest bid is always visible
- Auction ends when timer expires — highest bidder wins
- Classic "who wants to top the current offer" model
- Anti-sniping rule optional: timer extends if a bid is placed in the last 30s

### Dutch Auction (Descending Price)
- Starts at a **high price**, drops by a set amount each round
- Round duration is configurable (e.g., 30s per round)
- **First buyer to bid wins** — at the current price
- No competition between buyers — speed is the advantage
- Price floor: auction closes without a winner if floor is reached with no bids

---

## Auction Lifecycle States

```
DRAFT → SCHEDULED → ACTIVE → CLOSING → CLOSED → SETTLED
```

| State | Meaning |
|-------|---------|
| DRAFT | Created, not yet configured |
| SCHEDULED | Configured, waiting for start time |
| ACTIVE | Bidding open |
| CLOSING | Timer in final 60s (English: anti-snipe mode) |
| CLOSED | Bidding ended, winner determined |
| SETTLED | Payment/handoff confirmed |

---

## Lot
A single item or group of items being auctioned. One auction has one lot (MVP). Future: one auction may have multiple lots in sequence.

## Bid
An offer from a buyer at a specific price point. Immutable once placed — bids are never deleted, only superseded.

## Current Bid (Highest Bid)
The highest valid bid at any moment. Stored in Redis as `auction:{id}:highest_bid`.

## Leader
The user currently holding the highest bid. Stored in Redis as `auction:{id}:leader`.

## Bid History
Ordered list of all valid bids for an auction, most recent first. Stored in Redis as a list: `auction:{id}:bids`.

## Partition Key
Always `auction_id` in Kafka. Guarantees all bids for one auction are processed in order by the same worker.

## Consumer Group
`bid-processors` — the group of Bid Worker instances. Kafka distributes partitions (auctions) across workers. Adding workers scales processing capacity.

---

## UI Vocabulary (Use Exactly These Labels)

| Concept | Label in UI |
|---------|------------|
| Current highest bid | "Current Bid" |
| User currently winning | "Leader" |
| Price in Dutch auction | "Current Price" |
| Time until auction ends | "Time Remaining" |
| Bid that was outbid | "Previous Bid" |
| Round in Dutch auction | "Round {n}" |
| Admin overview page | "Auction Dashboard" |
| Auction detail for admin | "Auction Monitor" |
| Buyer's auction page | "Live Auction" |
| Seller's view | "Auction Overview" |
