# Advanced Magic - Spell Points System 5e
FoundryVTT module for Spell Point System in D&D5e

**Not using spellpoints for your games? well, you should, spellpoints are much better than slots!!**

This module uses the optional rules found in the DMG to allow character to cast spells using a resource named "Spell Points"

## Changelog
https://github.com/misthero/dnd5e-spellpoints/blob/main/CHANGELOG.md

## Installation Instructions
- Copy "https://raw.githubusercontent.com/misthero/dnd5e-spellpoints/main/module.json" into the module installer inside foundry when it asks for the manifest.
- Launch your world go to settings -> module settings and enable the module `dnd5e-spellpoints`.
- Choose the name of the resource to use as Spell Points (default "Spell Points") you can change the name in module settings.
- Create a new resource with the name "Spell Points" on every character sheet. (Hint: if any of your player need more resources you can use the module https://github.com/ardittristan/5eSheet-resourcesPlus/tree/master)
- The module will calculate Spell Points automatically when you add a new class item or level up your class. You can even create your own formula for calculating Spell Points.


You are ready to go, now spells cast by player's characters will use spell points instead of slots.


**Notice**: Slots won't disappear from character sheets, but they will always stay full as long as this module is enabled.

## Features
- Configurable resource name.
- Configurable formulas. All numerical fields are powered by FoundryVTT's Roll class. This not only give you access to functions like `round` and `kh` but also data within the characters themselves such as `@details.level` or `@abilities.cha.mod`. See [Data Paths as Variables](https://foundryvtt.com/article/dice-advanced/) for more information. The following fields are formulas:
    - SpellPoint Costs
    - SpellPointMaximum Base Formula (applied only if the character has at least one spell slot)
    - SpellPointMaximum Slot Multiplier (multiplies the cost of all spell slots the character would have). To reproduce the formula in the DMG, leave this as `1`.
    - Health Penalty Multiplier (See **[Advanced Magic - Spell Point System 5e!](https://www.drivethrurpg.com/product/272967/Advanced-Magic--Spell-Points-System-5e)** for more information).
- Optionally you can enable a variant rule to allow players to keep casting even when they run out of spellpoints using their own life with terrible consequences if you are using the **[Advanced Magic - Spell Point System 5e!](https://www.drivethrurpg.com/product/272967/Advanced-Magic--Spell-Points-System-5e)** available as "Pay what you Want" on DriveThruRPG.

## Example Custom Formulas

### DMG
By the DMG, a character will always have enough spell points to create the spell slots they would normally have. This can be calculated by starting with `0` and  adding up the spell point cost of every slot they would normally have, multiplying it by `1`.
* If you adjust the Spell Point costs, character maximum spell points will adjust when they level up.
* If you edit the spell slots a character has, their maximum spell points will adjust when they level up.


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

Create a macro with the following script:
```js
console.log(actor.data.data)
```

While selecting a token, execute the macro. Then, look at the console. This will tell you all the data that is available to you when writing a formula.

You can test out a formula by rolling it in chat while selecting a token. The following formula would determine the largest modifier which are typically used for spell casting, and it would roll it in chat.
```
/roll { @abilities.wis.mod,  @abilities.int.mod,  @abilities.cha.mod}kh
```

It is also possible to add a module or create your own module that edits or adds information to `actor.data.data`. This new information will be available to the formulas with no concerns over compatibility.


## To do
- Add configurable limit to number of times a spell slot can be generated per day. This would reproduce the limit within the DMG that only allows creatures to make one 6th+ level slot per day of the same level.

### Incompatibility
None at the moment but please let me know if any.
