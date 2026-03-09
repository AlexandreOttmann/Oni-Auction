# Kafka topic name constants — import everywhere, never hardcode strings

# Bid-related — partition key = lot_id (10 partitions)
BIDS            = "bids"
AUCTION_UPDATES = "auction_updates"
INVALID_BIDS    = "invalid_bids"

# Lifecycle events — partition key = auction_id (4 partitions)
AUCTION_EVENTS  = "auction_events"

# Dead-letter queue — partition key = lot_id (4 partitions)
BIDS_DLQ        = "bids_dlq"
