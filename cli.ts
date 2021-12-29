import * as JTD from "jtd";
import * as Flags from "flags";
import { underline } from "colors";
import { DB } from "sqlite";

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
  logSections(
    {
      title: "Usage",
      lines: [
        "$ sr [options] <deck>",
        "Opens a deck file for review.",
      ],
    },
    {
      title: "Options",
      lines: [
        "--help, -h: Prints command usage.",
        "--version, -v: Prints command usage.",
      ],
    },
  );
  Deno.exit(2);
}

const deck = new DB(deckPath);
deck.query();

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

interface Section {
  title: string;
  lines: string[];
}

function logSections(...sections: Section[]) {
  console.log();
  for (const section of sections) {
    console.group(underline(section.title));
    for (const line of section.lines) {
      console.log(line);
    }
    console.groupEnd();
    console.log();
  }
}

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
