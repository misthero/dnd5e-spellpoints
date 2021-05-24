# Advanced Magic - Spell Points System 5e
 FoundryVTT module for Spell Point System in D&D5e
 
 **Not using spellpoints for your games? well, you should, spellpoints are much better than slots!!**
 
 This module use the optional rules found on DMG to allow character to cast spells using a resource named "Spell Points"
 
## Installation Instructions
- Copy "https://raw.githubusercontent.com/misthero/dnd5e-spellpoints/main/module.json" into the module installer inside foundry when it asks for the manifest.
- Launch your world go to settings -> module settings and enable the module `dnd5e-spellpoints`.
- Choose the name of the resource to use as Spell Points (default "Spell Points") you can change the name in module settings.
- Create a new resource with the name "Spell Points" on every character sheet. (Hint: if any of your player need more resources you can use the module https://github.com/ardittristan/5eSheet-resourcesPlus/tree/master)
- The module will calculate Spell Points automatically when you add a new class item or level up your class (only offical rules supported, if you are using hombrew rules you should disable the automatic mode.


You are ready to go, now spells cast by player's characters will use spell points instead of slots.


**Notice**: Slots won't disappear from character sheets, but they will always stay full as long as this module is enabled.

## Features
- Configurable resource name
- Configurable spell cost in spell points if you use any homebrew system.
- Optionally you can enable a variant rule to allow players to keep casting even when they run out of spellpoints using their own life with terrible consequences if you are using the **[Advanced Magic - Spell Point System 5e!](https://www.drivethrurpg.com/product/272967/Advanced-Magic--Spell-Points-System-5e)** available as "Pay what you Want" on DriveThruRPG.
- Configurable healt loss for casting using the Gritty High Magic Variant.

## To do
- Automatic Spell Point calculations based on class and level.
- Show the sell cost on each spell somewhere?

### Incompatibility
None at the moment but please let me know if any.

## CHANGELOG

- 1.0.0 First release
- 1.0.1 Bug fixes
- 1.0.2 Automatic spell points calculation, localization added, better code.
- 1.1.0 New Mixed Mode option to have both slots and Spell Points characters in same game.
- 1.1.2 Added compatibility with FVTT 0.7.8 - Fixed a css issue preventing "hidden combatant" from showing in combat tracker.
- 1.1.3 fixed css bug with mixed mode introduced in versione 1.1.2
- 1.1.4 fixed some bugs including the class level calculation bug. Introduced Italian translation.
- 1.2.0 First support for FoundryVTT 0.8+