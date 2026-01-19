#!/usr/bin/env node
/**
 * D&D 5E Spell Scraper
 * Scrapes spell data from dnd5e.wikidot.com
 *
 * Usage: node scripts/scrape-spells.mjs [--full] [--class=wizard]
 *
 * Options:
 *   --full    Scrape all spell details (slow, ~700 requests)
 *   --class=X Only scrape spells for a specific class
 *   --limit=N Limit to N spells (for testing)
 */

import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'data');
const BASE_URL = 'https://dnd5e.wikidot.com';

// Rate limiting
const DELAY_MS = 200; // Be respectful to the server
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Classes with spell lists
const SPELLCASTING_CLASSES = [
  'bard', 'cleric', 'druid', 'paladin', 'ranger',
  'sorcerer', 'warlock', 'wizard', 'artificer'
];

/**
 * Fetch HTML from a URL with retry logic
 */
async function fetchHTML(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'DND-Console-Spell-Scraper/1.0 (Personal Use)'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error(`  Attempt ${i + 1} failed for ${url}: ${error.message}`);
      if (i < retries - 1) {
        await sleep(1000 * (i + 1)); // Exponential backoff
      } else {
        throw error;
      }
    }
  }
}

/**
 * Parse the main spell list page to get all spell names and URLs
 */
async function scrapeSpellIndex() {
  console.log('Scraping spell index...');
  const html = await fetchHTML(`${BASE_URL}/spells`);
  const $ = cheerio.load(html);

  const spells = [];

  // The spell list is in tables with class "wiki-content-table"
  $('table.wiki-content-table tbody tr').each((_, row) => {
    const $row = $(row);
    const $link = $row.find('td:first-child a');

    if ($link.length) {
      const name = $link.text().trim();
      const href = $link.attr('href');

      // Parse other columns
      const cells = $row.find('td');
      const school = $(cells[1]).text().trim();
      const castingTime = $(cells[2]).text().trim();
      const range = $(cells[3]).text().trim();
      const duration = $(cells[4]).text().trim();

      spells.push({
        name,
        url: href ? `${BASE_URL}${href}` : null,
        school,
        castingTime,
        range,
        duration
      });
    }
  });

  console.log(`  Found ${spells.length} spells in index`);
  return spells;
}

/**
 * Parse spell level from text (e.g., "cantrip", "1st level", etc.)
 */
function parseLevelFromText(text) {
  const lower = text.toLowerCase();
  if (lower.includes('cantrip')) return 0;
  if (lower.includes('1st')) return 1;
  if (lower.includes('2nd')) return 2;
  if (lower.includes('3rd')) return 3;
  if (lower.includes('4th')) return 4;
  if (lower.includes('5th')) return 5;
  if (lower.includes('6th')) return 6;
  if (lower.includes('7th')) return 7;
  if (lower.includes('8th')) return 8;
  if (lower.includes('9th')) return 9;
  return -1;
}

/**
 * Parse spells from a table element
 */
function parseSpellsFromTable($, $table, level) {
  const spells = [];

  $table.find('tbody tr, tr').each((_, row) => {
    const $row = $(row);
    const $link = $row.find('td:first-child a');

    if ($link.length) {
      const spellName = $link.text().trim();
      const href = $link.attr('href');
      const cells = $row.find('td');

      // Skip header rows
      if (cells.length < 3) return;

      const isRitual = /\(R\)|\bRitual\b/i.test($row.text());
      const durationText = cells.length > 4 ? $(cells[4]).text() : '';
      const isConcentration = /concentration/i.test(durationText);

      spells.push({
        name: spellName,
        url: href ? `${BASE_URL}${href}` : null,
        level,
        school: cells.length > 1 ? $(cells[1]).text().trim() : '',
        castingTime: cells.length > 2 ? $(cells[2]).text().trim() : '',
        range: cells.length > 3 ? $(cells[3]).text().trim() : '',
        duration: durationText.trim(),
        components: cells.length > 5 ? $(cells[5]).text().trim() : '',
        isRitual,
        isConcentration
      });
    }
  });

  return spells;
}

/**
 * Scrape class spell list with level information
 * Strategy: Find collapsible blocks which contain spell tables per level
 */
async function scrapeClassSpellsWithLevels(className) {
  console.log(`Scraping ${className} spell list with levels...`);
  const url = `${BASE_URL}/spells:${className}`;

  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    const spellsByLevel = {
      0: [], 1: [], 2: [], 3: [], 4: [],
      5: [], 6: [], 7: [], 8: [], 9: []
    };

    // Strategy 1: YUI Tabset structure (used by wikidot)
    // Structure:
    // div.yui-navset
    //   ul.yui-nav (tabs with level names as links)
    //     li > a > em (contains "Cantrip", "1st Level", etc.)
    //   div.yui-content (tab content panels)
    //     div (one per tab, each contains a table)

    const yuiNavset = $('.yui-navset');

    if (yuiNavset.length > 0) {
      // Get the tab labels to determine level order
      const tabLabels = [];
      yuiNavset.find('.yui-nav li a').each((_, link) => {
        const text = $(link).text().trim();
        const level = parseLevelFromText(text);
        tabLabels.push(level);
      });

      // Get the content panels (tables)
      yuiNavset.find('.yui-content > div').each((i, panel) => {
        const level = tabLabels[i];
        if (level >= 0) {
          const $table = $(panel).find('table').first();
          if ($table.length) {
            const spells = parseSpellsFromTable($, $table, level);
            spellsByLevel[level].push(...spells);
          }
        }
      });
    }

    // Strategy 1b: Fallback - try collapsible blocks
    const collapsibleBlocks = $('.collapsible-block');

    if (Object.values(spellsByLevel).flat().length === 0 && collapsibleBlocks.length > 0) {
      collapsibleBlocks.each((_, block) => {
        const $block = $(block);

        // Get level from the link text
        const linkText = $block.find('.collapsible-block-link').first().text();
        const level = parseLevelFromText(linkText);

        if (level >= 0) {
          // Find the table inside this block
          const $table = $block.find('table').first();
          if ($table.length) {
            const spells = parseSpellsFromTable($, $table, level);
            spellsByLevel[level].push(...spells);
          }
        }
      });
    }

    // Strategy 2: Look for h2/h3 headers followed by tables
    if (Object.values(spellsByLevel).flat().length === 0) {
      let currentLevel = -1;

      // Walk through all elements in page-content
      $('#page-content *').each((_, el) => {
        const $el = $(el);
        const tagName = el.tagName?.toLowerCase();

        // Check for level headers (h1, h2, h3, or strong)
        if (['h1', 'h2', 'h3', 'h4', 'strong', 'b'].includes(tagName)) {
          const headerText = $el.text();
          const parsedLevel = parseLevelFromText(headerText);
          if (parsedLevel >= 0) {
            currentLevel = parsedLevel;
          }
        }

        // If this is a table and we have a level, parse it
        if (tagName === 'table' && currentLevel >= 0) {
          const spells = parseSpellsFromTable($, $el, currentLevel);
          spellsByLevel[currentLevel].push(...spells);
        }
      });
    }

    // Strategy 3: If still no spells, try parsing divs with level text
    if (Object.values(spellsByLevel).flat().length === 0) {
      // Look for any element containing level text followed by a sibling table
      $('*:contains("Cantrip"), *:contains("1st Level"), *:contains("2nd Level"), *:contains("3rd Level"), *:contains("4th Level"), *:contains("5th Level"), *:contains("6th Level"), *:contains("7th Level"), *:contains("8th Level"), *:contains("9th Level")').each((_, el) => {
        const $el = $(el);
        const text = $el.clone().children().remove().end().text().trim(); // Get only direct text

        if (text.length < 50) { // Short text, likely a header
          const level = parseLevelFromText(text);
          if (level >= 0) {
            // Look for a table in the next siblings
            const $nextTable = $el.nextAll('table').first();
            if ($nextTable.length) {
              const spells = parseSpellsFromTable($, $nextTable, level);
              // Avoid duplicates
              for (const spell of spells) {
                if (!spellsByLevel[level].some(s => s.name === spell.name)) {
                  spellsByLevel[level].push(spell);
                }
              }
            }
          }
        }
      });
    }

    // Flatten and count
    const allSpells = Object.values(spellsByLevel).flat();
    console.log(`  Found ${allSpells.length} ${className} spells with level data`);

    // Debug output if no spells found (rare - page structure may have changed)
    if (allSpells.length === 0) {
      console.log(`  WARNING: No spells found. Page structure may have changed.`);
      console.log(`  DEBUG: Tables on page: ${$('table').length}`);
      console.log(`  DEBUG: YUI navsets: ${yuiNavset.length}`);
      console.log(`  DEBUG: Collapsible blocks: ${collapsibleBlocks.length}`);
    }

    return { className, spellsByLevel, allSpells };
  } catch (error) {
    console.error(`  Error scraping ${className}: ${error.message}`);
    return { className, spellsByLevel: {}, allSpells: [] };
  }
}

/**
 * Parse an individual spell page for full details
 */
async function scrapeSpellDetails(spellUrl) {
  const html = await fetchHTML(spellUrl);
  const $ = cheerio.load(html);

  const content = $('#page-content');

  // Get spell name from page title (try multiple selectors)
  let name = $('#page-title').text().trim();
  if (!name) {
    name = $('div.page-title').text().trim();
  }
  if (!name) {
    name = $('h1').first().text().trim();
  }
  if (!name) {
    // Extract from URL as fallback
    const urlParts = spellUrl.split('/');
    const slug = urlParts[urlParts.length - 1].replace('spell:', '');
    name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // Get the full text content for parsing
  const fullText = content.text();

  // Extract level and school from the text
  // Patterns: "3rd-level evocation" or "Evocation cantrip"
  const levelMatch = fullText.match(/(\d+)(?:st|nd|rd|th)-level\s+(\w+)/i);
  const cantripMatch = fullText.match(/(\w+)\s+cantrip/i);

  let level = 0;
  let school = '';

  if (levelMatch) {
    level = parseInt(levelMatch[1], 10);
    school = levelMatch[2].toLowerCase();
  } else if (cantripMatch) {
    level = 0;
    school = cantripMatch[1].toLowerCase();
  }

  // Check for ritual tag
  const isRitual = /\(ritual\)/i.test(fullText);

  // Parse properties using regex on full text
  // These can be on one line or across multiple elements
  const castingTimeMatch = fullText.match(/Casting Time:\s*([^\n]+?)(?=\s*Range:|$)/i);
  const rangeMatch = fullText.match(/Range:\s*([^\n]+?)(?=\s*Components:|$)/i);
  const componentsMatch = fullText.match(/Components:\s*([^\n]+?)(?=\s*Duration:|$)/i);
  // Duration is trickier - capture until we hit a sentence that doesn't look like duration text
  const durationMatch = fullText.match(/Duration:\s*((?:Concentration,?\s*)?(?:up to\s+)?\d*\s*\w+(?:\s+\(\w+\))?|Instantaneous|Until dispelled)/i);

  const castingTime = castingTimeMatch ? castingTimeMatch[1].trim() : '';
  const range = rangeMatch ? rangeMatch[1].trim() : '';
  const componentsText = componentsMatch ? componentsMatch[1].trim() : '';
  const duration = durationMatch ? durationMatch[1].trim() : '';

  // Check for concentration
  const isConcentration = /concentration/i.test(duration);

  // Parse components
  const hasVerbal = /\bV\b/.test(componentsText);
  const hasSomatic = /\bS\b/.test(componentsText);
  const hasMaterial = /\bM\b/.test(componentsText);
  const materialMatch = componentsText.match(/\(([^)]+)\)/);
  const materials = materialMatch ? materialMatch[1] : null;

  // Get description - text after Duration until Spell Lists or At Higher Levels
  let description = '';
  const descMatch = fullText.match(/Duration:[^\n]+\n+([\s\S]+?)(?=At Higher Levels|Spell Lists|$)/i);
  if (descMatch) {
    description = descMatch[1].trim();
  }

  // Get "At Higher Levels" if present
  let atHigherLevels = null;
  const higherMatch = fullText.match(/At Higher Levels[.:]\s*([\s\S]+?)(?=Spell Lists|$)/i);
  if (higherMatch) {
    atHigherLevels = higherMatch[1].trim();
  }

  // Get spell lists (classes that can use this spell)
  const spellLists = [];
  const listsMatch = fullText.match(/Spell Lists[.:]\s*([^\n]+)/i);
  if (listsMatch) {
    listsMatch[1].split(',').forEach(c => {
      const className = c.trim().toLowerCase().replace(/\s*\(.*\)/, ''); // Remove parenthetical notes
      if (className && !className.includes('optional')) {
        spellLists.push(className);
      }
    });
  }

  return {
    name,
    level,
    school,
    isRitual,
    isConcentration,
    castingTime,
    range,
    components: {
      verbal: hasVerbal,
      somatic: hasSomatic,
      material: hasMaterial,
      materials
    },
    duration,
    description: description.substring(0, 2000), // Limit description size
    atHigherLevels: atHigherLevels ? atHigherLevels.substring(0, 500) : null,
    classes: spellLists,
    source: 'dnd5e.wikidot.com'
  };
}

/**
 * Scrape class-specific spell list
 */
async function scrapeClassSpells(className) {
  console.log(`Scraping ${className} spell list...`);
  const url = `${BASE_URL}/spells:${className}`;

  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    const spells = [];

    // Parse spell tables
    $('table.wiki-content-table tbody tr').each((_, row) => {
      const $row = $(row);
      const $link = $row.find('td:first-child a');

      if ($link.length) {
        const name = $link.text().trim();
        const href = $link.attr('href');

        // Try to get level from the table structure or preceding header
        const cells = $row.find('td');

        spells.push({
          name,
          url: href ? `${BASE_URL}${href}` : null
        });
      }
    });

    // Also parse any list items (some pages use different formats)
    $('div.list-pages-item, li').each((_, item) => {
      const $link = $(item).find('a').first();
      if ($link.length) {
        const name = $link.text().trim();
        const href = $link.attr('href');
        if (href && href.startsWith('/spell:')) {
          spells.push({
            name,
            url: `${BASE_URL}${href}`
          });
        }
      }
    });

    console.log(`  Found ${spells.length} ${className} spells`);
    return { className, spells };
  } catch (error) {
    console.error(`  Error scraping ${className}: ${error.message}`);
    return { className, spells: [] };
  }
}

/**
 * Main scraper function
 */
async function main() {
  const args = process.argv.slice(2);
  const fullScrape = args.includes('--full');
  const classFilter = args.find(a => a.startsWith('--class='))?.split('=')[1];
  const limitArg = args.find(a => a.startsWith('--limit='))?.split('=')[1];
  const limit = limitArg ? parseInt(limitArg, 10) : null;

  console.log('=== D&D 5E Spell Scraper ===\n');
  console.log(`Mode: ${fullScrape ? 'Full (with individual page details)' : 'Class lists with levels'}`);
  if (classFilter) console.log(`Class filter: ${classFilter}`);
  if (limit) console.log(`Limit: ${limit} spells`);
  console.log('');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const classesToScrape = classFilter
    ? [classFilter.toLowerCase()]
    : SPELLCASTING_CLASSES;

  // Step 1: Scrape class-specific lists WITH level information
  console.log('Scraping class spell lists with level data...\n');
  const classSpellsData = {};
  const allSpellsMap = new Map(); // Use map to dedupe by name

  for (const className of classesToScrape) {
    const result = await scrapeClassSpellsWithLevels(className);
    classSpellsData[className] = result.spellsByLevel;

    // Merge spells into master list
    for (const spell of result.allSpells) {
      const existing = allSpellsMap.get(spell.name.toLowerCase());
      if (existing) {
        // Add this class to the spell
        if (!existing.classes.includes(className)) {
          existing.classes.push(className);
        }
      } else {
        allSpellsMap.set(spell.name.toLowerCase(), {
          ...spell,
          classes: [className]
        });
      }
    }

    await sleep(DELAY_MS);
  }

  let spellDatabase = Array.from(allSpellsMap.values());
  console.log(`\nMerged ${spellDatabase.length} unique spells from class lists`);

  if (limit) {
    spellDatabase = spellDatabase.slice(0, limit);
  }

  // Step 2: Optionally scrape individual spell pages for full details
  if (fullScrape) {
    console.log('\nScraping individual spell pages for full details...');
    console.log('(This will take a while - ~' + spellDatabase.length + ' requests)');

    const enrichedSpells = [];

    for (let i = 0; i < spellDatabase.length; i++) {
      const spell = spellDatabase[i];
      if (!spell.url) {
        enrichedSpells.push(spell);
        continue;
      }

      process.stdout.write(`  [${i + 1}/${spellDatabase.length}] ${spell.name}... `);

      try {
        const details = await scrapeSpellDetails(spell.url);

        // Preserve class list from our scraping
        details.classes = spell.classes;

        enrichedSpells.push(details);
        console.log('OK');
      } catch (error) {
        console.log(`FAILED: ${error.message}`);
        enrichedSpells.push(spell); // Keep basic data
      }

      await sleep(DELAY_MS);
    }

    spellDatabase = enrichedSpells;
  }

  // Step 3: Output results
  console.log('\nWriting output files...');

  // Main spell database
  const spellsOutput = {
    version: 1,
    scrapedAt: new Date().toISOString(),
    source: 'dnd5e.wikidot.com',
    count: spellDatabase.length,
    spells: spellDatabase.sort((a, b) => {
      // Sort by level, then name
      const levelDiff = (a.level || 0) - (b.level || 0);
      if (levelDiff !== 0) return levelDiff;
      return a.name.localeCompare(b.name);
    })
  };

  const spellsPath = path.join(OUTPUT_DIR, 'spells.json');
  fs.writeFileSync(spellsPath, JSON.stringify(spellsOutput, null, 2));
  console.log(`  Wrote ${spellsPath}`);

  // Class spell lists (organized by level)
  const classSpellsOutput = {
    version: 1,
    scrapedAt: new Date().toISOString(),
    source: 'dnd5e.wikidot.com',
    classes: {}
  };

  for (const [className, spellsByLevel] of Object.entries(classSpellsData)) {
    classSpellsOutput.classes[className] = {};
    for (const [level, spells] of Object.entries(spellsByLevel)) {
      classSpellsOutput.classes[className][level] = spells.map(s => s.name);
    }
  }

  const classSpellsPath = path.join(OUTPUT_DIR, 'class-spells.json');
  fs.writeFileSync(classSpellsPath, JSON.stringify(classSpellsOutput, null, 2));
  console.log(`  Wrote ${classSpellsPath}`);

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total unique spells: ${spellDatabase.length}`);

  // Count by level
  const byLevel = {};
  for (const spell of spellDatabase) {
    const lvl = spell.level ?? 'unknown';
    byLevel[lvl] = (byLevel[lvl] || 0) + 1;
  }
  console.log('\nSpells by level:');
  for (let i = 0; i <= 9; i++) {
    if (byLevel[i]) {
      console.log(`  ${i === 0 ? 'Cantrips' : `${i}${['st','nd','rd'][i-1] || 'th'} level`}: ${byLevel[i]}`);
    }
  }

  console.log('\nSpells per class:');
  for (const [className, spellsByLevel] of Object.entries(classSpellsData)) {
    const total = Object.values(spellsByLevel).flat().length;
    console.log(`  ${className}: ${total}`);
  }

  console.log('\nDone!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
