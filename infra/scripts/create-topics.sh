#!/bin/bash
set -e

BOOTSTRAP="kafka:9092"

echo "Waiting for Kafka to be ready..."
until kafka-broker-api-versions --bootstrap-server "$BOOTSTRAP" &>/dev/null; do
  sleep 2
done
echo "Kafka is ready."

create_topic() {
  local topic=$1
  local partitions=$2
  local replication=$3

  if kafka-topics --bootstrap-server "$BOOTSTRAP" --list | grep -q "^${topic}$"; then
    echo "Topic already exists: $topic"
  else
    kafka-topics --bootstrap-server "$BOOTSTRAP" \
      --create \
      --topic "$topic" \
      --partitions "$partitions" \
      --replication-factor "$replication"
    echo "Created topic: $topic (partitions=$partitions)"
  fi
}

# Bid-related topics — partition key = lot_id → 10 partitions for ordering per lot
create_topic bids            10 1
create_topic auction_updates 10 1

# Lower-volume topics — 4 partitions sufficient
create_topic invalid_bids    4  1
create_topic auction_events  4  1
create_topic bids_dlq        4  1

echo "All Kafka topics ready."
