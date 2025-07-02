# Advanced Magic - Spell Points System 5e

![GitHub Downloads (all assets, all releases)][download-shield] ![GitHub contributors][contributor-shield] ![GitHub last commit][last-commit-shield] [![Forks][forks-shield]][forks-url] [![Stargazers][stars-shield]][stars-url]

[![Forge Installs][forge-installs]][forge-link] ![Foundry Version](https://img.shields.io/endpoint?label=Foundry%20VTT%20versions:&url=https://foundryshields.com/version?url=https://raw.githubusercontent.com/misthero/dnd5e-spellpoints/main/module.json)

[![ko-fi](https://img.shields.io/badge/ko--fi-Support%20Me-red?style=flat-square&logo=ko-fi)](https://ko-fi.com/misthero)

#### FoundryVTT module for using  Spell Point in D&D5e.

**Not using spellpoints for your games? well, you should, spellpoints are much better than slots!!**

This module uses the variant rules found in the DMG to allow character to cast spells using a resource named "Spell Points". It also allow to create your custom Spell Points / Mana rules and advancement system.

[Help and feature request][issues]

## Changelog

<https://github.com/misthero/dnd5e-spellpoints/blob/main/CHANGELOG.md>

## Installation Instructions

- Copy `https://github.com/misthero/dnd5e-spellpoints/releases/latest/download/module.json` into the module installer inside foundry when it asks for the manifest.
- Launch your world go to settings -> module settings and enable the module Advanced Magic - Spell Points System 5e `dnd5e-spellpoints`.
- Find the spellpoints Item from the module compendium and import it.
- Drag the item on every character or NPC that should use Spell Points.

**Notice**: Slots won't disappear from character sheets, but they won't be used.

## Features

- Configurable formulas. All numerical fields are powered by FoundryVTT's Roll class. This not only give you access to functions like `round` and `kh` but also data within the characters themselves such as `@details.level` or `@abilities.cha.mod`. See [Data Paths as Variables](https://foundryvtt.com/article/dice-advanced/) for more information. The following fields are formulas:
  - SpellPointMaximum Base Formula (applied only if the character has at least one spell slot)
  - SpellPointMaximum Slot Multiplier (multiplies the cost of all spell slots the character would have). To reproduce the formula in the DMG, leave this as `1`.
  - Health Penalty Multiplier (See **[Advanced Magic - Spell Point System 5e!](https://www.drivethrurpg.com/product/272967/Advanced-Magic--Spell-Points-System-5e)** for more information).
- Optionally you can enable a variant rule to allow players to keep casting even when they run out of spellpoints using their own life with terrible consequences if you are using the **[Advanced Magic - Spell Point System 5e!](https://www.drivethrurpg.com/product/272967/Advanced-Magic--Spell-Points-System-5e)** available as "Pay what you Want" on DriveThruRPG.

## DnD v3/v4 Specific Features (spellpoints Item)

- Configurable Item Name
- Automatic spellpoint bar on character sheet
- Track the spellpoints directly in character sheet.
- Configurable spellpoint bar color.
- Per character spell points configuration and progression. Each character can have a different spell points setup overriding the configuration directly on the item.
- Spellcaster classes configurable progression for Full, Half, Third casters.
- Configurable SpellPoint Cost for each spell level for non-liear progression.
- You can also share your custom spellpoints item.

![spellpoints on sheet](https://i.postimg.cc/XqPY225m/screenshot-2024-09-21.png)

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
    6 * @spells.spell6.max +
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

___

## Active Effects

To enable active effects for the spellpoints item, use the attribute key `dnd5espellpoints`. This key serves as an alias for the spellpoints item on the actor.

Additionally, set the **Change Mode** to `Custom`. By default, the provided value will override the property. To modify the property instead, prepend:

- `+` to add the value
- `-` to subtract the value
- `*` to multiply by the value

### Active Effect Examples

| Attribute Key                              | Change Mode | Value                         | Expected Result                         |
|:--------------------------------------------|:------------|:------------------------------|:----------------------------------------|
| `dnd5espellpoints.system.uses.max`         | Custom      | `5`                           | Set the maximum uses to 5               |
| `dnd5espellpoints.system.uses.max`         | Custom      | `+5`                          | Increase the maximum uses by 5          |
| `dnd5espellpoints.system.uses.max`         | Custom      | `-5`                          | Decrease the maximum uses by 5          |
| `dnd5espellpoints.system.uses.max`         | Custom      | `*5`                          | Multiply the maximum uses by 5          |

You can also use formulas in the Value field. For example, `+floor(@abilities.cha.value/4)` adds the Charisma modifier to the spellpoints total.

___
### Macro Helpers

You can interact with spell points from a macro or a third-party module using two helper methods exposed by this module:

- `getSpellPointsItem` — Retrieve the spellpoints item data for a given actor.
- `alterSpellPoints` — Change the spell points item's current uses and/or maximum uses for a given actor.

#### Example Usage

Get the spell points item for an actor:

```js
const item = getSpellPointsItem(actor);
console.log(item);
```

Change the uses of the item or the uses.max or both.

```js
// remove a random number between 1 and 20 from the current item uses.
alterSpellPoints(actor, '-1d20');
// set the uses to 10
alterSpellPoints(actor, '10');
// add 10 to the current `uses.max`
alterSpellPoints(actor, null, '+10');
// set the current remaining uses to 5 and the max uses to 10.
alterSpellPoints(actor, '5', '10'); 
```
___
## To do

- Add configurable limit to number of times a spell slot can be generated per day. This would reproduce the limit within the DMG that only allows creatures to make one 6th+ level slot per day of the same level.

### Incompatibility

None at the moment but please let me know if any.



[issues]: https://github.com/misthero/dnd5e-spellpoints/issues
[forks-shield]: https://img.shields.io/github/forks/misthero/dnd5e-spellpoints.svg?style=flat-round
[forks-url]: https://github.com/forks/misthero/dnd5e-spellpoints/network/members
[stars-shield]: https://img.shields.io/github/stars/misthero/dnd5e-spellpoints.svg?style=flat-round
[stars-url]: https://github.com/misthero/dnd5e-spellpoints/stargazers
[download-shield]: https://img.shields.io/github/downloads/misthero/dnd5e-spellpoints/total?label=Latest%20Downloads
[contributor-shield]: https://img.shields.io/github/contributors/misthero/dnd5e-spellpoints?label=Contributors
[last-commit-shield]: https://img.shields.io/github/last-commit/misthero/dnd5e-spellpoints?label=Last%20Commit
[forge-installs]: https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https://forge-vtt.com/api/bazaar/package/dnd5e-spellpoints&colorB=blueviolet
[forge-link]: https://forge-vtt.com/bazaar#package=dnd5e-spellpoints