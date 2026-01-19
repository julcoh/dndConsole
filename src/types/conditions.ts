// === CONDITIONS ===

export interface ActiveCondition {
  id: string;
  name: string;              // "Poisoned"
  source?: string;           // "Giant Spider bite"
  ends?: string;             // "End of next turn", "CON DC 14", free text
  roundsRemaining?: number;  // Optional countdown
}

// === Standard 5E Conditions ===

export interface ConditionInfo {
  name: string;
  description: string;
  effects: string[];
}

export const STANDARD_CONDITIONS: ConditionInfo[] = [
  {
    name: 'Blinded',
    description: 'Cannot see',
    effects: [
      'Automatically fails ability checks requiring sight',
      'Attack rolls against you have advantage',
      'Your attack rolls have disadvantage'
    ]
  },
  {
    name: 'Charmed',
    description: 'Magically influenced',
    effects: [
      "Can't attack the charmer or target them with harmful abilities",
      'Charmer has advantage on social checks against you'
    ]
  },
  {
    name: 'Deafened',
    description: 'Cannot hear',
    effects: [
      'Automatically fails ability checks requiring hearing'
    ]
  },
  {
    name: 'Frightened',
    description: 'Terrified of a source',
    effects: [
      'Disadvantage on ability checks and attacks while source is visible',
      "Can't willingly move closer to the source"
    ]
  },
  {
    name: 'Grappled',
    description: 'Held in place',
    effects: [
      'Speed becomes 0',
      'Ends if grappler is incapacitated or you are moved apart'
    ]
  },
  {
    name: 'Incapacitated',
    description: 'Cannot act',
    effects: [
      "Can't take actions or reactions"
    ]
  },
  {
    name: 'Invisible',
    description: 'Cannot be seen',
    effects: [
      "Can't be seen without magic or special sense",
      'Attack rolls against you have disadvantage',
      'Your attack rolls have advantage'
    ]
  },
  {
    name: 'Paralyzed',
    description: 'Cannot move or speak',
    effects: [
      'Incapacitated, cannot move or speak',
      'Automatically fails STR and DEX saves',
      'Attacks against you have advantage',
      'Hits within 5 feet are automatic crits'
    ]
  },
  {
    name: 'Petrified',
    description: 'Turned to stone',
    effects: [
      'Transformed to inanimate substance',
      'Incapacitated, cannot move or speak',
      'Unaware of surroundings',
      'Attacks against you have advantage',
      'Automatically fails STR and DEX saves',
      'Resistance to all damage',
      'Immune to poison and disease'
    ]
  },
  {
    name: 'Poisoned',
    description: 'Suffering from poison',
    effects: [
      'Disadvantage on attack rolls and ability checks'
    ]
  },
  {
    name: 'Prone',
    description: 'Lying on the ground',
    effects: [
      'Can only crawl (costs extra movement to stand)',
      'Disadvantage on attack rolls',
      'Attacks within 5 feet have advantage, others have disadvantage'
    ]
  },
  {
    name: 'Restrained',
    description: 'Held in place',
    effects: [
      'Speed becomes 0',
      'Attack rolls against you have advantage',
      'Your attack rolls have disadvantage',
      'Disadvantage on DEX saves'
    ]
  },
  {
    name: 'Stunned',
    description: 'Overwhelmed',
    effects: [
      'Incapacitated, cannot move',
      'Can only speak falteringly',
      'Automatically fails STR and DEX saves',
      'Attacks against you have advantage'
    ]
  },
  {
    name: 'Unconscious',
    description: 'Completely unaware',
    effects: [
      'Incapacitated, cannot move or speak',
      'Unaware of surroundings, drops held items, falls prone',
      'Automatically fails STR and DEX saves',
      'Attacks against you have advantage',
      'Hits within 5 feet are automatic crits'
    ]
  },
  {
    name: 'Exhaustion',
    description: 'Levels of fatigue',
    effects: [
      '1: Disadvantage on ability checks',
      '2: Speed halved',
      '3: Disadvantage on attacks and saves',
      '4: HP maximum halved',
      '5: Speed reduced to 0',
      '6: Death'
    ]
  }
];

// === Helpers ===

export function createCondition(
  name: string,
  options?: Partial<ActiveCondition>
): ActiveCondition {
  return {
    id: crypto.randomUUID(),
    name,
    ...options
  };
}

export function findConditionInfo(name: string): ConditionInfo | undefined {
  return STANDARD_CONDITIONS.find(
    c => c.name.toLowerCase() === name.toLowerCase()
  );
}

export function decrementConditionRounds(condition: ActiveCondition): ActiveCondition {
  if (condition.roundsRemaining === undefined || condition.roundsRemaining <= 0) {
    return condition;
  }
  return {
    ...condition,
    roundsRemaining: condition.roundsRemaining - 1
  };
}

export function isConditionExpired(condition: ActiveCondition): boolean {
  return condition.roundsRemaining !== undefined && condition.roundsRemaining <= 0;
}
