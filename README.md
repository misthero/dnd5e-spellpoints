# D&D5e Spell Points
 FoundryVTT module for Spell Point System in D&D5e
 
 **Not using spellpoints for your games? well, you should, spellpoints are much better than slots!!**
 
 This module use the optional rules found on DMG to allow character to cast spells using a resource named "Spell Points"
 
## Installation Instructions
- Copy "https://raw.githubusercontent.com/misthero/dnd5e-spellpoints/main/module.json" into the module installer inside foundry when it asks for the manifest.
- Launch your world go to settings -> module settings and enable the module `dnd5e-spellpoints`.
- Choose the name of the resource to use as Spell Points (default "Spell Points") you can change the name in module settings.
- Create a new resource with the name "Spell Points" on every character sheet. (Hint: if any of your player need more resources you can use the module https://github.com/ardittristan/5eSheet-resourcesPlus/tree/master)
- The module doesn't calculate spellpoints per class/character level right now, the players (or GM) will have to enter that number manully.

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
