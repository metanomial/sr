import * as JTD from "jtd";
import * as Flags from "flags";
import { underline } from "colors";

const DEFAULT_INTERVAL = 1;
const DEFAULT_SCALAR = 1.3;
const INTERVAL_BASE = 86_400_000; // One day in milliseconds

const { options, deckPath } = getOptions();

if (options.version) {
  console.log("sr v0.1.0-alpha");
  console.log("Copyright (c) 2021 Benjamin Herman");
  console.log("MIT License");
  console.log("Source: <https://github.com/metanomial/sr>");
  Deno.exit(2);
}

if (options.help || !deckPath) {
  console.log();
  console.group(underline("Usage"));
  console.log("$ srcards [options] <deck>");
  console.log("Open a JSON deck");
  console.groupEnd();
  console.log();
  console.group(underline("Options"));
  console.log("--help, -h: Prints command usage.");
  console.log("--version, -v: Prints command usage.");
  console.groupEnd();
  console.log();
  Deno.exit(2);
}

const deck = loadDeck(deckPath);
const review: Card[] = deck.cards.filter(due).sort(shuffle);

console.log();
console.log(underline(deck.title));
console.log(`${review.length} cards to review`);

for (const card of review) {
  console.log();
  const response = prompt(card.front);
  card.interval = card.interval ?? DEFAULT_INTERVAL;
  if (response == card.back) {
    card.interval *= DEFAULT_SCALAR;
    console.log("right");
  } else {
    console.log("wrong: " + card.back);
  }
  console.log(`Repeating in ${(card.interval as number).toFixed(1)} days`);
  card.lastReview = new Date().toISOString();
  saveDeck(deck, deckPath);
}

Deno.exit(0);

function isValid<T>(schema: JTD.Schema, instance: unknown): instance is T {
  return !JTD.validate(schema, instance).length;
}

function getOptions() {
  const { _, ...options } = Flags.parse(Deno.args, {
    stopEarly: true,
    boolean: [
      "help",
      "version",
    ],
    alias: {
      h: "help",
      v: "version",
    },
  });
  return {
    deckPath: _[0] as string | undefined,
    options,
  };
}

function due(card: Card): boolean {
  if (!card.lastReview) return true;
  const lastReview = new Date(card.lastReview);
  const interval = card.interval ?? DEFAULT_INTERVAL;
  return new Date().getDate() - lastReview.getDate() > interval * INTERVAL_BASE;
}

function shuffle(_a: Card, _b: Card): number {
  return Math.random() - 0.5;
}

interface Card {
  front: string;
  back: string;
  lastReview?: string;
  interval?: number;
}

interface Deck {
  title: string;
  cards: Card[];
}

function loadDeck(deckPath: string): Deck {
  let text: string;
  let deck: unknown;
  try {
    text = Deno.readTextFileSync(deckPath);
  } catch (error) {
    console.error("Unable to read deck: " + error.message);
    Deno.exit(1);
  }
  try {
    deck = JSON.parse(text);
  } catch (error) {
    console.error("Deck JSON is invalid: " + error.message);
    Deno.exit(1);
  }
  const schema: JTD.Schema = {
    definitions: {
      cards: {
        properties: {
          front: { type: "string" },
          back: { type: "string" },
        },
        optionalProperties: {
          lastReview: { type: "timestamp" },
          interval: { type: "float32" },
        },
      },
    },
    properties: {
      title: { type: "string" },
      cards: {
        elements: { ref: "cards" },
      },
    },
  };
  if (!isValid<Deck>(schema, deck)) {
    console.error("Deck has format errors.");
    Deno.exit(1);
  }
  return deck;
}

function saveDeck(deck: Deck, deckPath: string): void {
  const text = JSON.stringify(deck);
  Deno.writeTextFileSync(deckPath as string, text);
}