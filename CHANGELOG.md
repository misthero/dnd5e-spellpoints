# CHANGELOG

## [3.2.11]

- Remove nelines from formulas, thx to [@mclemente](https://github.com/mclemente)

## [3.2.10]

- Introduces dynamic handling of custom spellcasting type and progression based on: CONFIG.DND5E.spellProgression; CONFIG.DND5E.maxLevel; CONFIG.DND5E.spellLevels.
- updates templates for improved styling and compatibility. 
- tidy5e sheet compatibility

## [3.2.00]

### Added macro helper functions

- two methods are exposed to modules or macros
- `getSpellPointsItem` to retrieve the spellpoints item data from an actor
- `alterSpellPoints` to change spellpoints item uses from an actor

## [3.1.03]

### Bugfixes

- Npc spellcasting detection and spellpoints calculation.
- Fix regression where spellpoints cost for spell was 0 when module was first installed and configuration was never changed.

## [3.1.01]

### New Features

- Active Effects integration, you can now alter the spellpoints on the character sheet using active effects. Check the readme for more info.
- Possibility to disable the default spellpoints bar on actor sheet in case you prefer other modules handling that like: [5e Resource trackers](https://foundryvtt.com/packages/dnd5e-item-resources).

## [3.0.00]

### Foundry V13

- Compatibility release for Foundry VTT v13
- Bufix and code optimization
- Switch to application v2

## [2.5.02]

### Bugfix

- Check user permission on item updates. [Issue: #134](https://github.com/misthero/dnd5e-spellpoints/issues/134)

## [2.5.01]

### Bugfix

- Updated DMG link on spellpoints item

## [2.5.00]

### New feature

- Optional spell points cost for cantrips. [Issue: #31](https://github.com/misthero/dnd5e-spellpoints/issues/31)

## [2.4.40]

### Compatibility release

- Bugfix for D&D system 4.3.3

## [2.4.32]

### Fixed some bug with auto calculation and pact magic

- if the formula is Default DMG pact slots will not give spellpoints
- the cast spell dialog will not default to consume spellpoints if the spell is a pact spell and the forumla is Default DMG
- diabling Consume Slot in the activity of a spell will also disable Spell Points.

## [2.4.22]

### Removed old settings not necessary with the new version using the spellpoints item

- "Warlock use spell points" setting is gone. Just give them the spell points item or not.
- "Npc use spell points" setting is gone. Just give them the spell points item or not.
- "Mixed mode" checkbox is gone. Every actor can use spell points or slots depending on the presence of the item.
- "Enable module" checkbox is gone. If no actor has the item the module will do nothing.

## [2.4.21]

- bugfix for the forge import path
- first update path implementation
- fix for config popup not refreshing when recalculating spellpoints
- style optimizations

## [2.4.11]

### Compatibility release for D&D v4

- Removed compatibility with old resources
- Some code refactoring and cleanup
- Added SP bar for NPCs
- Recalculate max spellpoints button added to quick config

## [2.2.30]

- fix subclass detection with spellcasting when using DMG formula

## [2.2.20]

- renaming version

## [2.2.2]

### Foundry v12 Compatibility

- Customizable Cantrip costs.

## [2.2.1]

- Bugfix

## [2.2.0]

### New Features

- Per character/item spellpoints progression and cost.
- Customizable spell points bar color.
- Animate spell points resource bar.
- New non-linear progression by level (supports roll formulas).
- Factor the progression based on caster type: full, half, third, pact, artificier.

## [2.1.0]

- Bugfix
- Fixed readme
- Removed message to create resource if actor doesn't have spell point item.
- New feature, enable for NPC (setting available to enable or disable this feature)

## [2.0.0]

- Module refactor, DnD5e v3+ compatibility. Removed resource and using items.

## [1.5.3]  

- Dnd5e 2.4+ compatibility bugfix

## [1.5.1]

- Dnd5e 2.2+ compatibility bugfix

## [1.5.0]

- First FVTT11 compatibility release

## [1.4.4]

- remove deprecated code, code refactor

## [1.4.3]

- bugfix resource value undefined when should be 0 in new dnd5e system

## [1.4.2]

- Minor settings bugfix

## [1.4.1]

- Improved compatibility with DnD5e system, v.2.1.5+

## [1.3.7]

- Data object for formulas now includes flags object

## [1.3.6]

- Multiclassing Max Spell Points fix

## [1.3.5]

- Fix Warlock pact casting
- New option for including or excluding Warlocks from spellpoint usage.
- Moved the mixed mode enable Spell Point on character sheet to Features tab instead of Spells Tab.
- New global option to hide chat message about how many spell points are being used to other players (GM excluded)

## [1.3.1]

- Compatibility fixes for FVTT 0.9x

## [1.3.0]

- Add a new options to the formula selection box. The new options allow custom formulas defined at runtime for calculating spell point costs and maximum spell points. Custom formulas are hidden from configuration whenever a non-custom formula is selected. Selecting a formula will override options within the configuration window

## [1.2.5]

- Bugfix: Restored mixed mode checkbox on certain character sheets

## [1.2.4]

### Feature

- Disable Spell Point switch on character sheet when sheet is locked. <https://github.com/misthero/dnd5e-spellpoints/issues/14>

## [1.2.3]

- Bugfix: <https://github.com/misthero/dnd5e-spellpoints/issues/13>

## [1.2.2]

- Display spell point cost in Usage Configuration window when casting a spell, fix a bug where the insufficient spell points warning would not pop up when casting

## [1.2.1]

- Added Spanish translation

## [1.2.0]

- First support for FoundryVTT 0.8+
