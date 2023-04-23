## CHANGELOG

- 1.2.0 First support for FoundryVTT 0.8+
- 1.2.1 Added Spanish translation.
- 1.2.2 Display spell point cost in Usage Configuration window when casting a spell, fix a bug where the insufficient spell points warning would not pop up when casting
- 1.2.3 Bugfix: https://github.com/misthero/dnd5e-spellpoints/issues/13.
- 1.2.4 Feature: Disable Spell Point switch on character sheet when sheet is locked. https://github.com/misthero/dnd5e-spellpoints/issues/14
- 1.2.5 Bugfix: Restored mixed mode checkbox on certain character sheets
- 1.3.0 Add a new options to the formula selection box. The new options allow custom formulas defined at runtime for calculating spell point costs and maximum spell points. Custom formulas are hidden from configuration whenever a non-custom formula is selected. Selecting a formula will override options within the configuration window.
- 1.3.1 Compatibility fixes for FVTT 0.9x
- 1.3.5 Fix Warlock pact casting. 
  - New option for including or excluding Warlocks from spellpoint usage. 
  - Moved the mixed mode enable Spell Point on character sheet to Features tab instead of Spells Tab.
  - New global option to hide chat message about how many spell points are being used to other players (GM excluded)
- 1.3.6 Multiclassing Max Spell Points fix
- 1.3.7 Data object for formulas now includes flags object
- 1.4.1 Improved compatibility with DnD5e system, v.2.1.5+
- 1.4.2 Minor settings bugfix
- 1.4.3 bugfix resource value undefined when should be 0 in new dnd5e system
- 1.4.4 remove deprecated code, code refactor.
