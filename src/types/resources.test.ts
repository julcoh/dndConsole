import { describe, it, expect } from 'vitest';
import {
  calculateRechargeAmount,
  getResourcesForRest,
  createSpellSlotResources,
  CASTER_PRESETS,
  type ResourceDefinition
} from './resources';

describe('resources', () => {
  describe('calculateRechargeAmount', () => {
    it('recharges to full when rechargeAmount is "full"', () => {
      const resource: ResourceDefinition = {
        id: 'test',
        name: 'Test',
        category: 'class_feature',
        maximum: 5,
        rechargeOn: 'short_rest',
        rechargeAmount: 'full'
      };

      expect(calculateRechargeAmount(resource, 0)).toBe(5);
      expect(calculateRechargeAmount(resource, 2)).toBe(5);
      expect(calculateRechargeAmount(resource, 5)).toBe(5);
    });

    it('recharges half (rounded up) when rechargeAmount is "half"', () => {
      const resource: ResourceDefinition = {
        id: 'hit_dice',
        name: 'Hit Dice',
        category: 'hit_dice',
        maximum: 10,
        rechargeOn: 'long_rest',
        rechargeAmount: 'half'
      };

      // Half of 10 = 5
      expect(calculateRechargeAmount(resource, 0)).toBe(5);
      expect(calculateRechargeAmount(resource, 3)).toBe(8);
      expect(calculateRechargeAmount(resource, 7)).toBe(10); // Capped at max
    });

    it('rounds up half for odd maximums', () => {
      const resource: ResourceDefinition = {
        id: 'hit_dice',
        name: 'Hit Dice',
        category: 'hit_dice',
        maximum: 7,
        rechargeOn: 'long_rest',
        rechargeAmount: 'half'
      };

      // Half of 7 = 3.5, rounds up to 4
      expect(calculateRechargeAmount(resource, 0)).toBe(4);
      expect(calculateRechargeAmount(resource, 5)).toBe(7); // Capped
    });

    it('ensures minimum of 1 for half recharge', () => {
      const resource: ResourceDefinition = {
        id: 'hit_dice',
        name: 'Hit Dice',
        category: 'hit_dice',
        maximum: 1,
        rechargeOn: 'long_rest',
        rechargeAmount: 'half'
      };

      // Half of 1 = 0.5, but minimum is 1
      expect(calculateRechargeAmount(resource, 0)).toBe(1);
    });

    it('recharges specific amount when rechargeAmount is number', () => {
      const resource: ResourceDefinition = {
        id: 'custom',
        name: 'Custom',
        category: 'custom',
        maximum: 10,
        rechargeOn: 'short_rest',
        rechargeAmount: 3
      };

      expect(calculateRechargeAmount(resource, 0)).toBe(3);
      expect(calculateRechargeAmount(resource, 5)).toBe(8);
      expect(calculateRechargeAmount(resource, 9)).toBe(10); // Capped at max
    });

    it('never exceeds maximum', () => {
      const resource: ResourceDefinition = {
        id: 'test',
        name: 'Test',
        category: 'class_feature',
        maximum: 5,
        rechargeOn: 'short_rest',
        rechargeAmount: 'full'
      };

      expect(calculateRechargeAmount(resource, 5)).toBe(5);
      expect(calculateRechargeAmount(resource, 100)).toBe(5); // Edge case
    });
  });

  describe('getResourcesForRest', () => {
    const resources: ResourceDefinition[] = [
      {
        id: 'short1',
        name: 'Short Rest Resource',
        category: 'class_feature',
        maximum: 5,
        rechargeOn: 'short_rest',
        rechargeAmount: 'full'
      },
      {
        id: 'long1',
        name: 'Long Rest Resource',
        category: 'spell_slot',
        maximum: 4,
        slotLevel: 1,
        rechargeOn: 'long_rest',
        rechargeAmount: 'full'
      },
      {
        id: 'daily1',
        name: 'Daily Resource',
        category: 'item_charge',
        maximum: 3,
        rechargeOn: 'daily',
        rechargeAmount: 'full'
      },
      {
        id: 'manual1',
        name: 'Manual Resource',
        category: 'custom',
        maximum: 10,
        rechargeOn: 'manual',
        rechargeAmount: 'full'
      }
    ];

    it('returns only short_rest resources for short rest', () => {
      const result = getResourcesForRest(resources, 'short');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('short1');
    });

    it('returns short, long, and daily resources for long rest', () => {
      const result = getResourcesForRest(resources, 'long');
      expect(result).toHaveLength(3);
      expect(result.map(r => r.id)).toContain('short1');
      expect(result.map(r => r.id)).toContain('long1');
      expect(result.map(r => r.id)).toContain('daily1');
    });

    it('never returns manual resources', () => {
      const shortResult = getResourcesForRest(resources, 'short');
      const longResult = getResourcesForRest(resources, 'long');

      expect(shortResult.map(r => r.id)).not.toContain('manual1');
      expect(longResult.map(r => r.id)).not.toContain('manual1');
    });
  });

  describe('CASTER_PRESETS', () => {
    it('has full caster preset with all 9 levels', () => {
      const full = CASTER_PRESETS.full;
      expect(full.name).toBe('Full Caster');
      expect(Object.keys(full.slots)).toHaveLength(9);
      expect(full.slots[1]).toBe(4);
      expect(full.slots[9]).toBe(1);
    });

    it('has half caster preset with 5 levels', () => {
      const half = CASTER_PRESETS.half;
      expect(half.name).toBe('Half Caster');
      expect(Object.keys(half.slots)).toHaveLength(5);
      expect(half.slots[5]).toBe(2);
      expect(half.slots[6]).toBeUndefined();
    });

    it('has warlock preset with pact slots', () => {
      const warlock = CASTER_PRESETS.warlock;
      expect(warlock.pactSlots).toBeDefined();
      expect(warlock.pactSlots?.level).toBe(5);
      expect(warlock.pactSlots?.count).toBe(4);
      expect(Object.keys(warlock.slots)).toHaveLength(0); // No regular slots
    });

    it('has artificer preset (half caster)', () => {
      const artificer = CASTER_PRESETS.artificer;
      expect(artificer.name).toBe('Artificer');
      expect(Object.keys(artificer.slots)).toHaveLength(5);
    });
  });

  describe('createSpellSlotResources', () => {
    it('creates resources for full caster', () => {
      const resources = createSpellSlotResources(CASTER_PRESETS.full, 20);

      expect(resources).toHaveLength(9);

      const firstLevel = resources.find(r => r.slotLevel === 1);
      expect(firstLevel).toBeDefined();
      expect(firstLevel?.name).toBe('1st Level');
      expect(firstLevel?.maximum).toBe(4);
      expect(firstLevel?.category).toBe('spell_slot');
      expect(firstLevel?.rechargeOn).toBe('long_rest');
    });

    it('creates pact slot for warlock', () => {
      const resources = createSpellSlotResources(CASTER_PRESETS.warlock, 20);

      expect(resources).toHaveLength(1);

      const pactSlot = resources[0];
      expect(pactSlot.category).toBe('pact_slot');
      expect(pactSlot.slotLevel).toBe(5);
      expect(pactSlot.maximum).toBe(4);
      expect(pactSlot.rechargeOn).toBe('short_rest'); // Pact slots recharge on short rest
    });

    it('generates unique IDs for spell slots', () => {
      const resources = createSpellSlotResources(CASTER_PRESETS.full, 20);
      const ids = resources.map(r => r.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('uses correct ordinal suffixes', () => {
      const resources = createSpellSlotResources(CASTER_PRESETS.full, 20);

      expect(resources[0].name).toBe('1st Level');
      expect(resources[1].name).toBe('2nd Level');
      expect(resources[2].name).toBe('3rd Level');
      expect(resources[3].name).toBe('4th Level');
    });
  });
});
