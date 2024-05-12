# Advanced Magic - Spell Points System 5e

FoundryVTT module for using  Spell Point in D&D5e

## D&D System V3+ notes

The module has been update for compatibility to D&D v3. Starting from version 2.0.0 of this module it will not be compatible with previous versions of the Foundry D&D system.
Now it uses "Items" to allow a character to cast using spell points instead of a resource. Each Spell Points Item can be configured indipendently or follow the global settings.
The Spell Point Item is in a compendium included with the module starting from v2, you need to drag the item to your character sheet to enable it for that character.

### Not using spellpoints for your games? well, you should, spellpoints are much better than slots!!

This module uses the variant rules found in the DMG to allow character to cast spells using a resource named "Spell Points". It also allow to create your custom Spell Points / Mana rules and advancement system.

## Changelog

<https://github.com/misthero/dnd5e-spellpoints/blob/main/CHANGELOG.md>

## Installation Instructions

- Copy `https://raw.githubusercontent.com/misthero/dnd5e-spellpoints/main/module.json` into the module installer inside foundry when it asks for the manifest.
- Launch your world go to settings -> module settings and enable the module `dnd5e-spellpoints`.
- Find the spellpoints Item from the module compendium and import it.
- Drag the item on every character that should use Spell Points.

### Old v1 verion Instructions

- Choose the name of the resource to use as Spell Points (default "Spell Points") you can change the name in module settings. (v1 only)
- Create a new resource with the name "Spell Points" on every character sheet. (Hint: if any of your player need more resources you can use the module <https://github.com/ardittristan/5eSheet-resourcesPlus/tree/master)(v1> only)


You are ready to go, now spells cast by player's characters will use spell points instead of slots.

**Notice**: Slots won't disappear from character sheets, but they will always stay full as long as this module is enabled.

## Features

- Configurable resource name (DnDV2 only).

- Warlock can use spellpoints (disabled by default).
- NPC can use spellpoints (disabled by default).
- Configurable formulas. All numerical fields are powered by FoundryVTT's Roll class. This not only give you access to functions like `round` and `kh` but also data within the characters themselves such as `@details.level` or `@abilities.cha.mod`. See [Data Paths as Variables](https://foundryvtt.com/article/dice-advanced/) for more information. The following fields are formulas:
  - SpellPointMaximum Base Formula (applied only if the character has at least one spell slot)
  - SpellPointMaximum Slot Multiplier (multiplies the cost of all spell slots the character would have). To reproduce the formula in the DMG, leave this as `1`.
  - Health Penalty Multiplier (See **[Advanced Magic - Spell Point System 5e!](https://www.drivethrurpg.com/product/272967/Advanced-Magic--Spell-Points-System-5e)** for more information).
- Optionally you can enable a variant rule to allow players to keep casting even when they run out of spellpoints using their own life with terrible consequences if you are using the **[Advanced Magic - Spell Point System 5e!](https://www.drivethrurpg.com/product/272967/Advanced-Magic--Spell-Points-System-5e)** available as "Pay what you Want" on DriveThruRPG.

## DnD v3 Specific Features (spellpoints Item)

- Configurable Item Name (DnD V3 only).
- Automatic spellpoint bar on character sheet (DnD V3 only).
- Configurable spellpoint bar color.
- Per character spell points configuration and progression. Each character can have a different spell points setup overriding the configuration directly on the item (DnD V3 only).
- Spellcaster classes configurable progression for Full, Half, Third casters.
- Configurable SpellPoint Cost for each spell level for non-liear progression.
- You can also share your custom spellpoints item.

#### Drag your item on character sheet.
[<img src="https://github.com/misthero/dnd5e-spellpoints/assets/3662610/7730f934-b995-4494-82e0-fdd9b0b91bb2" width="600px"/>](https://github.com/misthero/dnd5e-spellpoints/assets/3662610/7730f934-b995-4494-82e0-fdd9b0b91bb2)

#### The spell points tracker will appear.
[<img src="https://github.com/misthero/dnd5e-spellpoints/assets/3662610/5b761ba5-2229-40a7-9654-35cc1821725b" width="600px"/>](https://github.com/misthero/dnd5e-spellpoints/assets/3662610/5b761ba5-2229-40a7-9654-35cc1821725b)

#### Spells will automatically check spell points for casting and deselect Slots.
[<img src="https://github.com/misthero/dnd5e-spellpoints/assets/3662610/3422b30e-db0d-4d0e-938f-f38e27c4d386" width="600px"/>](https://github.com/misthero/dnd5e-spellpoints/assets/3662610/3422b30e-db0d-4d0e-938f-f38e27c4d386)

#### You can override the settings for a specific item or a specific character to have unique progression and costs.
[<img src="https://github.com/misthero/dnd5e-spellpoints/assets/3662610/22e0c899-779a-4825-b582-42e29112f764" width="600px"/>](https://github.com/misthero/dnd5e-spellpoints/assets/3662610/22e0c899-779a-4825-b582-42e29112f764)

#### It's possible to have multiple spellpoints items each one with different settings.
![immagine](https://github.com/misthero/dnd5e-spellpoints/assets/3662610/67641955-bd17-4b4b-9e1e-ec09566bb77e)



## Example Custom Formulas

### DMG

By the DMG, a character will always have enough spell points to create the spell slots they would normally have. This can be calculated by starting with `0` and  adding up the spell point cost of every slot they would normally have, multiplying it by `1`.

- If you adjust the Spell Point costs, character maximum spell points will adjust when they level up.
- If you edit the spell slots a character has, their maximum spell points will adjust when they level up.

Base Formula

```
0
```

Spell Point Multiplier

```
1
```

### Advanced Magic

See the [Advanced Magic](https://www.dmsguild.com/product/272967/Advanced-Magic--Spell-Points-System-5e) spell point system for why characters may not always have enough spell points to cast all of their normal spell slots.

Base Formula

```
ceil(
  (
    1 * @spells.spell1.max +
    2 * @spells.spell2.max +
    3 * @spells.spell3.max +
    4 * @spells.spell4.max +
    5 * @spells.spell5.max +
    <!-- 6 * @spells.spell6.max + -->
    7 * @spells.spell7.max +
    8 * @spells.spell8.max +
    9 * @spells.spell9.max
  ) / 2
)
+
@attributes.spelldc - 8 - @attributes.prof
```

Spell Point Multiplier

```
0
```

## Making Your Own Formula

Foundry VTT V9: Create a macro with the following script:

```js
console.log(actor.data.data)
```

Foundry VTT V10+: Create a macro with the following script:

```js
console.log(actor.getRollData())
```

While selecting a token, execute the macro. Then, look at the console. This will tell you all the data that is available to you when writing a formula.

You can test out a formula by rolling it in chat while selecting a token. The following formula would determine the largest modifier which are typically used for spell casting, and it would roll it in chat.

```
/roll { @abilities.wis.mod,  @abilities.int.mod,  @abilities.cha.mod}kh
```

It is also possible to add a module or create your own module that edits or adds information to `actor.system`. This new information will be available to the formulas with no concerns over compatibility.

## To do

- Add configurable limit to number of times a spell slot can be generated per day. This would reproduce the limit within the DMG that only allows creatures to make one 6th+ level slot per day of the same level.

### Incompatibility

None at the moment but please let me know if any.
