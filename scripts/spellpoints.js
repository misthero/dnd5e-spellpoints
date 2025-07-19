import { SP_MODULE_NAME, SP_ITEM_ID } from "./main.js";
import { ActorSpellPointsConfig } from "./actor-bar-config.js";

function isset(variable) {
  return (typeof variable !== 'undefined');
}

function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

/**
 * Extracts the mathematical operator from the start of a string
 * @param {string} str - The input string to check
 * @returns {string|null} The operator if found, null if no operator
 */
function extractOperator(str) {
  // List of valid operators to check
  const operators = ['+', '-', '*', '/', '%'];

  // Remove leading whitespace and get first character
  const trimmed = str.trim();
  const firstChar = trimmed.charAt(0);

  // Return the operator if found, null otherwise
  return operators.includes(firstChar) ? firstChar : null;
}


/**
 * Applies a mathematical operator to two numeric values and returns the result.
 *
 * @param {number} value1 - The first operand.
 * @param {string} operator - The operator to apply ('+', '-', '*', '/', '%').
 * @param {number} value2 - The second operand.
 * @returns {number} The result of applying the operator to the operands.
 */
function applyOperator(value1, operator, value2) {
  switch (operator) {
    case '+': return value1 + value2;
    case '-': return value1 - value2;
    case '*': return value1 * value2;
    case '/': return value1 / value2;
    case '%': return value1 % value2;
    default: return value1 + value2; // Default to addition if operator not recognized
  }
}

export class SpellPoints {
  static get settings() {
    return foundry.utils.mergeObject(this.defaultSettings, game.settings.get(SP_MODULE_NAME, 'settings'), { insertKeys: true, insertValues: true });
  }

  /**
   * Get default settings object.
   */
  static get defaultSettings() {



    let dndSpellProgression = CONFIG.DND5E.spellProgression;

    // Define default values for each progression type
    const progressionValues = {
      full: 1,
      half: 2,
      third: 3,
      artificer: 1,
      pact: 1,
      none: 0,
    };

    // Build spellcastingTypes dynamically from spellProgression
    const spellProgression = {};
    for (const [key, label] of Object.entries(dndSpellProgression)) {
      spellProgression[key] = {
        value: progressionValues[key] ?? 0,
        label
      };
    }


    return {
      spResource: 'Spell Points',
      spAutoSpellpoints: true,
      spFormula: 'DMG',
      enableForNpc: false,
      chatMessagePrivate: false,
      spellPointsByLevel: { 1: 4, 2: 6, 3: 14, 4: 17, 5: 27, 6: 32, 7: 38, 8: 44, 9: 57, 10: 64, 11: 73, 12: 73, 13: 83, 14: 83, 15: 94, 16: 94, 17: 107, 18: 114, 19: 123, 20: 133 },
      spellPointsCosts: { 0: 0, 1: 2, 2: 3, 3: 5, 4: 6, 5: 7, 6: 9, 7: 10, 8: 11, 9: 13 },
      spEnableVariant: false,
      spLifeCost: 2,
      isCustom: false,
      spCustomFormulaBase: '0',
      spCustomFormulaSlotMultiplier: '1',
      spUseLeveled: false,
      spellProgression: spellProgression,
      leveledProgressionFormula: { 1: "0", 2: "0", 3: "0", 4: "0", 5: "0", 6: "0", 7: "", 8: "0", 9: "0", 10: "0", 11: "0", 12: "0", 13: "0", 14: "0", 15: "0", 16: "0", 17: "0", 18: "0", 19: "0", 20: "0" },
      spGmOnly: true,
      spColorL: '#3a0e5f',
      spColorR: '#8a40c7',
      spAnimateBar: true,
      spActivateBar: true
    };
  }


  /**
   * Get a map of formulas to override values specific to those formulas.
   */
  static get formulas() {
    const maxlevel = CONFIG.DND5E.maxLevel;
    const slotLevels = CONFIG.DND5E.spellLevels;

    // Helper to build a level table up to maxlevel, only including valid keys
    function buildLevelTable(table) {
      const built = {};
      for (let lvl = 1; lvl <= maxlevel; lvl++) {
        built[lvl] = table[lvl] ?? 0;
      }
      return built;
    }

    // Helper to build spellPointsCosts to match current spellLevels, only including valid keys
    function buildSpellPointsCosts(costs) {
      const built = {};
      for (const lvl of Object.keys(slotLevels)) {
        built[lvl] = costs[lvl] ?? 0;
      }
      return built;
    }

    // Prepare extended tables for custom formulas
    const leveledProgression = buildLevelTable(this.defaultSettings.leveledProgressionFormula);
    const spellPointsByLevel = buildLevelTable(this.defaultSettings.spellPointsByLevel);
    const spellPointsCosts = buildSpellPointsCosts(this.defaultSettings.spellPointsCosts);

    return {
      DMG: {
        isCustom: false,
        spellPointsByLevel: this.defaultSettings.spellPointsByLevel,
        spellPointsCosts: this.defaultSettings.spellPointsCosts,
        spCustomFormulaSlotMultiplier: '',
        spUseLeveled: false
      },
      DMG_CUSTOM: {
        isCustom: true,
        spCustomFormulaBase: '0',
        spCustomFormulaSlotMultiplier: '1',
        spUseLeveled: true,
        spellPointsCosts: spellPointsCosts,
        leveledProgressionFormula: spellPointsByLevel
      },
      AM_CUSTOM: {
        isCustom: true,
        spCustomFormulaBase: 'ceil((2*@spells.pact.level + 1*@spells.spell1.max + 2*@spells.spell2.max + 3*@spells.spell3.max + 4*@spells.spell4.max + 5*@spells.spell5.max + 6*@spells.spell6.max + 7*@spells.spell7.max + 8*@spells.spell8.max + 9*@spells.spell9.max) / 2) + @attributes.spell.dc - 8 - @attributes.prof',
        spCustomFormulaSlotMultiplier: '0',
        spUseLeveled: false,
        spellPointsCosts: buildSpellPointsCosts({ 0: '0', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '12', 7: '14', 8: '24', 9: '27' }),
        leveledProgressionFormula: leveledProgression
      },
      CUSTOM: {
        isCustom: true,
        leveledProgressionFormula: leveledProgression,
        spellPointsCosts: spellPointsCosts,
        spCustomFormulaBase: '',
        spUseLeveled: false
      }
    }
  }

  static setSpColors() {
    document.documentElement.style.setProperty('--sp-left-color', SpellPoints.settings.spColorL);
    document.documentElement.style.setProperty('--sp-right-color', SpellPoints.settings.spColorR);
    if (SpellPoints.settings.spAnimateBar) {
      document.documentElement.style.setProperty('--sp-animation-name', 'scroll');
    } else {
      document.documentElement.style.setProperty('--sp-animation-name', 'none');
    }
  }

  static isActorCharacter(actor) {
    // Get the actor type once
    const type = foundry.utils.getProperty(actor, "type");
    // Return true if type is "character" or "npc"
    return type === "character" || type === "npc";
  }

  static getActorFlagSpellPointItem(actor) {
    const item_id = actor?.flags?.dnd5espellpoints?.item;
    return typeof item_id === 'string' && item_id.trim().length > 0 ? item_id : false;
  }

  static isSpellPointsItem(item) {
    return (item.type === "feat" || (item.type === "class" && item.type.subtype === "sp"))
      && (item.flags?.core?.sourceId === "Compendium.dnd5e-spellpoints.module-items.Item." + SP_ITEM_ID
        || item.system.source?.custom === this.settings.spResource);
  }

  static userHasActorOwnership(actor) {
    return actor.permission == 3;
  }

  /**
   * Evaluates the given formula with the given actors data. Uses FoundryVTT's Roll
   * to make this evaluation.
   * @param {string|number} formula The rollable formula to evaluate.
   * @param {object} actor The actor used for variables.
   * @return {number} The result of the formula.
   */
  static async withActorData(formula, actor) {
    formula = formula.toString().replace(/\n/g, " ");
    if (!formula || typeof formula !== 'string' || formula.length == 0) {
      return 0;
    }
    let dataObject = actor.getRollData();
    dataObject.flags = actor.flags;
    const r = await Roll.create(formula.toString(), dataObject).evaluate();
    return r.total;
  }

  /**
   * Retrieves the spell points item associated with the given actor.
   *
   * This method attempts to find the spell points item by first checking for an item ID
   * stored in the actor's flags. If not found, it searches the actor's items collection
   * for a feature or class item with a custom source label matching the configured spell points resource.
   *
   * @param {Actor} actor - The actor whose spell points item is to be retrieved.
   * @returns {Item|false} The spell points item if found, otherwise false.
   */
  static getSpellPointsItem(actor) {
    if (!actor) {
      console.warn("SpellPoints.getSpellPointsItem: No actor provided.");
      return false;
    }
    let items = foundry.utils.getProperty(actor, "collections.items");
    const item_id = SpellPoints.getActorFlagSpellPointItem(actor);
    let foundItem = false;
    if (item_id && items[item_id]) {
      foundItem = items[item_id];
    }
    if (!foundItem) {
      let features = items.filter(i => i.type == 'feat' || (i.type == 'class' && i.type.subtype == 'sp'));
      // get the item with source custom label = Spell Points
      let sp = features.filter(s => s.system.source.custom == this.settings.spResource);

      if (typeof sp == 'undefined') {
        return false;
      } else {
        foundItem = sp[0];
      }
    }
    return foundItem;
  }

  /**
   * Alters the spell points for a given actor by updating the associated spell point item.
   *
   * @param {Actor} actor - The actor whose spell points are to be altered.
   * @param {number} [uses] - The new value for current spell points. If provided, it will be clamped between 0 and max.
   * @param {number} [max] - The new maximum value for spell points. If provided, updates the maximum.
   *
   * @returns {void}
   */
  static async alterSpellPoints(actor, uses, max) {
    if (!actor) {
      console.warn("SpellPoints.alterSpellPoints: No actor provided.");
      return;
    }

    if (!SpellPoints.isActorCharacter(actor)) return;

    let spellPointItem = SpellPoints.getSpellPointsItem(actor);
    if (!spellPointItem) return;

    // Prepare update object
    let update = { system: { uses: {} } };

    let currentMax = await SpellPoints.withActorData(spellPointItem.system.uses.max, actor);

    // If max is provided, update max
    if (typeof max !== "undefined" && max !== null && max !== false && max !== "") {
      const maxOperator = extractOperator(max);
      const maxValue = await SpellPoints.withActorData(max, actor);
      if (maxOperator) {
        currentMax = applyOperator(maxValue, maxOperator, currentMax);
      } else {
        currentMax = maxValue;
      }
      update.system.uses.max = currentMax;
    }

    let currentUses = spellPointItem.system.uses.value;

    // If uses is provided, validate and update value and spent
    if (typeof uses !== "undefined" && uses !== null && uses !== false && uses !== "") {
      const usesOperator = extractOperator(uses);
      const usesValue = await SpellPoints.withActorData(uses, actor);
      if (usesOperator) {
        currentUses = applyOperator(usesValue, usesOperator, currentUses);
      } else {
        currentUses = usesValue;
      }
      // Clamp the value between 0 and max
      currentUses = Math.max(0, Math.min(currentUses, currentMax));
      update.system.uses.value = currentUses;
      update.system.uses.spent = currentMax - currentUses;
    }

    // Only update if there is something to change
    if (Object.keys(update.system.uses).length > 0) {
      spellPointItem.update(update);
    }
  }

  /** DEPRECATED: check what resource is spellpoints on this actor **/
  static getSpellPointsResource(actor) {
    let _resources = foundry.utils.getProperty(actor, "system.resources");
    for (let r in _resources) {
      if (_resources[r].label == this.settings.spResource) {
        return { 'values': _resources[r], 'key': r };
      }
    }
    return false;
  }

  /**
   * The function checks if the actor has enough spell points to cast the spell, and if not, checks if
   * the actor can cast the spell using hit points. If the actor can cast the spell using hit points,
   * the function reduces the actor's maximum hit points by the amount of hit points required to cast
   * the spell
   * @param item - the Item being used
   * @param consumeConfig - resource consumption
   * @param actor - The actor that is being updated.
   * @returns The update object.
   */

  static async castSpell(item, consumeConfig, options) {
    // ('SP CAST SPELL item', item);

    if (!consumeConfig.consume?.spellPoints || !item.consumption.spellSlot) {
      return [item, consumeConfig, options];
    }

    const actor = item.actor;
    /** do nothing if module is not active **/
    if (!SpellPoints.isActorCharacter(actor))
      return [item, consumeConfig, options];

    let spellPointItem = consumeConfig.spellPointsItem;

    const moduleSettings = this.settings
    let settings = moduleSettings;

    if (spellPointItem.flags?.spellpoints?.override) {
      settings = spellPointItem.flags?.spellpoints?.config ?? settings;
    }

    /** check if this is a spell casting **/
    /** dnd v4 this is not an item hook but an activation hook */

    const parentItem = item?.parent?.parent;

    if (typeof parentItem == 'undefined' || parentItem?.type != 'spell')
      return [item, consumeConfig, options];

    if (consumeConfig.consume.spellSlot) {
      consumeConfig.consume.spellPoints = false;
      return [item, consumeConfig, options];
    }

    if (consumeConfig.consume.spellPoints) {
      consumeConfig.consume.spellSlot = false;
      consumeConfig.hasConsumption = false; // prevent slot consumption
    }

    /** not found any resource for spellpoints ? **/
    if (!spellPointItem) {
      return {};
    }

    /** find the spell level just cast */
    const spellLvl = consumeConfig.isCantrip ? 0 : options.data.flags.dnd5e.use.spellLevel;

    const currentUses = spellPointItem.system.uses;
    let remainingUses = {
      'value': currentUses.max - currentUses.spent,
      'spent': currentUses.spent,
    }

    let actualSpellPoints = remainingUses.value;

    /* get spell cost in spellpoints */
    const spellPointCost = await this.withActorData(settings.spellPointsCosts[spellLvl], actor);

    /** check if message should be visible to all or just player+gm */
    let SpeakTo = [];
    if (moduleSettings.chatMessagePrivate) {
      SpeakTo = game.users.filter(u => u.isGM);
    }

    let updateActor = {
      'system': {
        'attributes': {},
        'resources': {}
      }
    };

    let updateItem = {
      'system': {
        'uses': {}
      }
    };

    // actor.update(updateActor);
    /** update spellpoints **/
    if (actualSpellPoints - spellPointCost >= 0) {
      /* character has enough spellpoints */
      remainingUses.spent += spellPointCost;

      ChatMessage.create({
        content: "<i style='color:green;'>" +
          game.i18n.format(SP_MODULE_NAME + ".spellUsingSpellPoints",
            {
              ActorName: actor.name,
              SpellPoints: moduleSettings.spResource,
              spellPointUsed: spellPointCost,
              remainingPoints: actualSpellPoints - spellPointCost
            }) + "</i>",
        speaker: ChatMessage.getSpeaker({ alias: actor.name }),
        isContentVisible: false,
        isAuthor: true,
        whisper: SpeakTo
      });
    } else if (actualSpellPoints - spellPointCost < 0) {
      /** check if actor can cast using HP **/
      if (settings.spEnableVariant) {
        // spell point resource is 0 but character can still cast.
        remainingUses.spent = currentUses.max;

        const hpMaxLost = spellPointCost * await SpellPoints.withActorData(settings.spLifeCost, actor);
        const hpActual = actor.system.attributes.hp.value;
        let hpTempMaxActual = actor.system.attributes.hp.tempmax;
        const hpMaxFull = actor.system.attributes.hp.max;
        if (!hpTempMaxActual)
          hpTempMaxActual = 0;
        const newTempMaxHP = hpTempMaxActual - hpMaxLost;
        const newMaxHP = hpMaxFull + newTempMaxHP;

        if (hpMaxFull + newTempMaxHP <= 0) { //character is permanently dead
          // 3 death saves failed and 0 hp
          updateActor.system.attributes = { 'death': { 'failure': 3 }, 'hp': { 'tempmax': -hpMaxFull, 'value': 0 } };
          ChatMessage.create({
            content: "<i style='color:red;'>" + game.i18n.format(SP_MODULE_NAME + ".castedLifeDead", { ActorName: actor.name }) + "</i>",
            speaker: ChatMessage.getSpeaker({ alias: actor.name }),
            isContentVisible: false,
            isAuthor: true,
            whisper: SpeakTo
          });
        } else {
          updateActor.system.attributes = { 'hp': { 'tempmax': newTempMaxHP } };// hp max reduction
          if (hpActual > newMaxHP) { // a character cannot have more hp than his maximum
            updateActor.system.attributes = foundry.utils.mergeObject(updateActor.system.attributes, { 'hp': { 'value': newMaxHP } });
          }
          ChatMessage.create({
            content: "<i style='color:red;'>" + game.i18n.format(SP_MODULE_NAME + ".castedLife", { ActorName: actor.name, hpMaxLost: hpMaxLost }) + "</i>",
            speaker: ChatMessage.getSpeaker({ alias: actor.name }),
            isContentVisible: false,
            isAuthor: true,
            whisper: SpeakTo
          });
        }
      } else {

        ChatMessage.create({
          content: "<i style='color:red;'>" + game.i18n.format(SP_MODULE_NAME + ".notEnoughSp", { ActorName: actor.name, SpellPoints: moduleSettings.spResource }) + "</i>",
          speaker: ChatMessage.getSpeaker({ alias: actor.name }),
          isContentVisible: false,
          isAuthor: true,
          whisper: SpeakTo
        });
        consumeConfig.consume.SpellSlot = false;
        consumeConfig.consume.SpellLevel = false;
        consumeConfig.create.measuredTemplate = false;
        options.createMessage = false;
        options.create = false;
        options.hasConsumption = false;
        consumeConfig.hasConsumption = false;
        delete options.flags;
        return [item, consumeConfig, options];
      }
    }

    consumeConfig.consume.SpellLevel = false;
    consumeConfig.consume.SpellSlot = false;
    options.hasConsumption = false;
    consumeConfig.hasConsumption = false;

    remainingUses.value = currentUses.max - remainingUses.spent;

    updateItem.system.uses.spent = remainingUses.spent;

    spellPointItem.update(updateItem);
    actor.update(updateActor);

    return [item, consumeConfig, options];
  }

  static async prepareLeveledSlots(slots, actor, modified) {
    //console.warn("SpellPoints.prepareLeveledSlots:", slots, actor, modified);
  }

  /**
   * Handles the application of active effects related to spell points on an actor.
   * If the effect key includes "dnd5espellpoints.", it modifies the corresponding property
   * on the actor's spell points item according to the provided formula and operator.
   *
   * @param {Actor} actor - The actor to which the active effect is being applied.
   * @param {Object} AE - The active effect data, expected to contain a `key` property.
   * @param {*} current - The current value before the effect is applied (unused).
   * @param {string} formula - The formula string used to calculate the modification.
   * @param {Array} changes - The list of changes being applied (unused).
   */
  static listenApplyActiveEffects(actor, AE, current, formula, changes) {

    if (AE.key.includes("dnd5espellpoints.")) {
      const item = SpellPoints.getSpellPointsItem(actor);
      if (!item) return;

      const operator = extractOperator(formula);
      let rollData = actor.getRollData();

      const path = AE.key.replace("dnd5espellpoints.", "");

      // get the property to modify from the item
      let propertyValue = foundry.utils.getProperty(item, path);

      const currentValue = Roll.create(propertyValue.toString(), rollData).evaluateSync({ strict: false }).total;
      const mod = Roll.create(formula, rollData).evaluateSync({ strict: false }).total;
      let newValue = mod;
      if (operator) {
        newValue = applyOperator(currentValue, operator, mod);
      }
      foundry.utils.setProperty(item, path, newValue);
    }
  }

  /*
   * prepare the spellpoints configuration.
   */
  static async checkPreUseActivity(activity, usageConfig, dialogConfig, messageConfig) {
    if (!activity.isSpell) {
      // exit if not a spell 
      return [activity, usageConfig, dialogConfig, messageConfig];
    }

    const actor = activity.actor;
    const spellPointItem = SpellPoints.getSpellPointsItem(actor);

    if (!this.isActorCharacter(actor) || !spellPointItem) {
      // exit if the actor is not a character or if the actor has no spell point resource
      return [activity, usageConfig, dialogConfig, messageConfig];
    }

    const isCantrip = activity.item.system.level === 0;
    if (isCantrip) {
      // check if cantrip spells costs spellpoints
      let settings = this.settings;
      if (spellPointItem.flags?.spellpoints?.override) {
        settings = spellPointItem.flags?.spellpoints?.config !== 'undefined' ? spellPointItem.flags?.spellpoints.config : settings;
      }
      if (settings.spellPointsCosts[0] == 0) {
        return [activity, usageConfig, dialogConfig, messageConfig];
      } else {
        usageConfig.hasConsumption = true;
        usageConfig.isCantrip = true;
        usageConfig.spell = { slot: "spell0" };
      }
    } else {
      usageConfig.isCantrip = false;
    }

    // is a spell, is a character, and has a spell point resource
    usageConfig.consume.canUseSpellpoints = true;
    usageConfig.spellPointsItem = spellPointItem;

    // add custom classes to the dialog
    if (!dialogConfig.applicationClass.DEFAULT_OPTIONS.classes.includes('spellpoints-cast')) {
      dialogConfig.applicationClass.DEFAULT_OPTIONS.classes.push('spellpoints-cast');
    }

    if (!isCantrip && !usageConfig.consume.spellSlot) {
      // set consume spellPoints to false and exit if not consuming a spell slot
      usageConfig.consume.spellPoints = false;
      return [activity, usageConfig, dialogConfig, messageConfig];
    }

    usageConfig.consume.spellPoints = true;
    usageConfig.consume.spellSlot = false;

    return [activity, usageConfig, dialogConfig, messageConfig];
  }

  /**
   * renderActivityUsageDialog hook
   * It checks if the spell is being cast by a player character, and if so, it replaces the spell slot
   * dropdown with a list of spell point costs, and adds a button to the dialog that will cast the
   * spell if the spell point cost is available
   * @param dialog - The dialog object.
   * @param html - The HTML element of the dialog.
   * @param formData - The data that was submitted by the user.
   * @returns the value of the variable `level`
   */
  static async checkDialogSpellPoints(dialog, html) {

    var usageConfig = foundry.utils.getProperty(dialog, "config");

    if (usageConfig?.consume?.canUseSpellpoints !== true) {
      return;
    }

    // Declare settings as a separate variable because jQuery overrides `this` when in an each() block
    let settings = this.settings;

    /** check if actor is a player character **/
    let actor = foundry.utils.getProperty(dialog, "item.actor");

    const spell = dialog.item.system;
    const preparation = spell.preparation.mode; //prepared,pact,always,atwill,innate

    // spell level can change later if casting it with a greater slot, baseSpellLvl is the default
    const baseSpellLvl = spell.level;

    /** get spellpoints **/
    const spellPointItem = usageConfig.spellPointsItem;

    if (spellPointItem && spellPointItem.flags?.spellpoints?.override) {
      settings = isset(spellPointItem.flags?.spellpoints?.config) ? spellPointItem.flags?.spellpoints?.config : settings;
    }

    let optionLevel = 'none';
    let cost = 0;

    let actualSpellPoints = spellPointItem.system.uses.max - spellPointItem.system.uses.spent;

    /** Replace list of spell slots with list of spell point costs **/
    if (usageConfig.consume.spellPoints && !usageConfig?.isCantrip) {
      const options = $('select[name="spell.slot"] option', $(html));
      for (const option of Array.from(options)) {
        let $option = $(option);
        let optionValue = $option.val();
        if (!optionValue || optionValue == '') {
          continue;
        }

        if (optionValue == 'pact') {
          optionLevel = actor.system.spells.pact.level;
        } else {
          optionLevel = optionValue.replace('spell', '');
        }

        cost = await SpellPoints.withActorData(settings.spellPointsCosts[optionLevel], actor);

        if (settings.spFormula == 'DMG' && optionValue == 'pact') {
          // do nothing
        } else {
          const spCostText = game.i18n.format(SP_MODULE_NAME + ".spellCost", { amount: cost + '/' + actualSpellPoints, SpellPoints: spellPointItem.name });
          let newText = $option.text() + ` (${spCostText})`;
          if (usageConfig.consume.spellSlot) {
            newText = $option.text() + ' (' + spCostText + ')';
          }

          $option.text(newText);
        }
      }
    }

    let choosenSpellLevel = usageConfig.spell.slot.replace('spell', '');

    if (choosenSpellLevel == 'pact') {
      choosenSpellLevel = actor.system.spells.pact.level;
    }

    let consumeSection = $('section[data-application-part="consumption"] fieldset', $(html));
    if (usageConfig.isCantrip) {
      consumeSection = $('section[data-application-part="consumption"]', $(html));
    }

    const consumeString = game.i18n.format(SP_MODULE_NAME + ".consumeSpellSlotInput", { SpellPoints: spellPointItem.name });
    const consumeSpellPoints = usageConfig.consume.spellPoints ? "checked" : '';

    let SpellPointsInput = `<div class="form-group">
        <label>${consumeString}</label>
        <div class="form-fields">
        <input type="checkbox" name="consume.spellPoints" ${consumeSpellPoints}></div></div>`;

    if (usageConfig.isCantrip) {
      SpellPointsInput = `<fieldset>${SpellPointsInput}</fieldset>`;
    }

    consumeSection.append(SpellPointsInput);

    /** Calculate spell point cost and warn user if they have none left */
    let spellPointCost = 0;

    if (preparation == 'pact') {
      spellPointCost = cost;
    } else {
      spellPointCost = await SpellPoints.withActorData(settings.spellPointsCosts[choosenSpellLevel], actor);
    }

    const missing_points = (typeof actualSpellPoints === 'undefined' || actualSpellPoints - spellPointCost < 0);
    const messageNotEnough = game.i18n.format(SP_MODULE_NAME + ".youNotEnough", { SpellPoints: spellPointItem.name });

    if (missing_points) {
      consumeSection.append('<div class="spError">' + messageNotEnough + '</div>');
    }

    let copyButton = $('.form-footer button', $(html)).clone();
    $('.form-footer button', $(html)).addClass('original').hide();
    copyButton.addClass('copy').removeClass('use').attr('data-button', '');
    $('.form-footer', $(html)).append(copyButton);

    $(html).on('click', '.copy', function (e) {
      e.preventDefault();
      /** if not consumeSlot we ignore cost, go on and cast or if variant active **/
      if (!$('dnd5e-checkbox[name="consume.spellSlot"]', $(html)).prop('checked') || settings.spEnableVariant) {
        $('.original', $(html)).trigger("click");
      } else if ($('select[name="spell.slot"]', $(html)).length > 0) {
        if (missing_points) {
          ui.notifications.error(messageNotEnough);
          dialog.close();
        } else {
          $('.original', $(html)).trigger("click");
        }
      }
    })
  }

  static async alterActivityDialogSP(dialog, html) {
    if (dialog.activity.isSpell) {

      const spellPointItem = SpellPoints.getSpellPointsItem(dialog.activity.actor);
      if (!spellPointItem) {
        return (dialog, html);
      }
      const template_data = {
        spellPointsEnabled: spellPointItem ? true : false, // TODO: check if spell points are enabled for this actor
        itemName: spellPointItem.name,
      };

      const template_file = "modules/dnd5e-spellpoints/templates/spell-points-activity.hbs";
      const rendered_html = await foundry.applications.handlebars.renderTemplate(template_file, template_data);
      $('.tab.activity-consumption', html).prepend(rendered_html);
      return (dialog, html);
    }

    return (dialog, html);
  }

  /**
   * Calculates the maximum spell points for an actor based on custom formulas.
   * @param {object} actor The actor used for variables.
   * @param {object} settings configuration from module or item ovveride
   * @return {number} The calculated maximum spell points.
   */
  static async _calculateSpellPointsCustom(actor, settings) {
    let SpellPointsMax = await SpellPoints.withActorData(settings.spCustomFormulaBase, actor);

    let hasSpellSlots = false;
    let spellPointsFromSlots = 0;
    for (let [slotLvlTxt, slot] of Object.entries(actor.system.spells)) {
      let slotLvl;
      if (slotLvlTxt == 'spell0') {
        slotLvl = 0;
      } else {
        slotLvl = slot.level;
      }

      if (!slotLvl || slotLvl == 0) {
        continue;
      }

      spellPointsFromSlots += slot.max * await SpellPoints.withActorData(settings.spellPointsCosts[slotLvl], actor);
      if (slot.max > 0) {
        hasSpellSlots = true;
      }
    }

    if (!hasSpellSlots) {
      return 0;
    }

    return SpellPointsMax;
  }

  /**
   * Calculates the maximum spell points for an actor based on a fixed map of
   * spellcasting level to maximum spell points. Builds up a total spellcasting
   * level based on the level of each spellcasting class according to
   * Multiclassing rules.
   * @param {object} item The class item of the actor.
   * @param {object} updates The details of how the class item was udpated.
   * @param {object} actor The actor used for variables.
   * @return {number} The calculated maximum spell points.
   */
  static async _calculateSpellPointsFixed(classItem, updates, actor, settings) {
    /* not an update? **/
    let changedClassLevel = null;
    let changedClassID = null;
    let levelUpdated = false;
    const leveledProgression = settings.spUseLeveled;

    if (foundry.utils.getProperty(updates.system, 'levels')) {
      changedClassLevel = foundry.utils.getProperty(updates.system, 'levels');
      changedClassID = foundry.utils.getProperty(classItem, '_id');
      levelUpdated = true;
    }

    let spellcastingNpc, spellcastingNpcLevel = false;
    //check if actor is a npc with spellcasting
    if (actor.type === 'npc') {
      if (actor.system?.attributes?.spell.level > 0) {
        spellcastingNpc = true;
        spellcastingNpcLevel = actor.system.attributes.spell.level;
      } else {
        return 0;
      }
    }

    // check for multiclasses
    const actorClasses = actor.classes;

    if (actorClasses.length == 0 && !spellcastingNpc) {
      // no classes, no spellcasting
      return 0;
    }

    if (spellcastingNpc && actorClasses.length == 0) {
      // no classes, but spellcasting npc
      if (leveledProgression) {
        return parseInt(await this.withActorData(settings.leveledProgressionFormula[spellcastingNpcLevel], actor)) || 0;
      } else {
        return parseInt(settings.spellPointsByLevel[spellcastingNpcLevel]) || 0;
      }
    }

    let spellcastingClassCount = 0;
    let spellcastingLevels = {};

    Object.keys(dnd5e.config.spellProgression).forEach((key) => {
      spellcastingLevels[key] = [];
    });

    Object.keys(actorClasses).forEach(c => {
      const actorClass = actorClasses[c];
      /* progression: pact; full; half; third; artificier; none; **/
      let progression = actorClass.system.spellcasting.progression;
      if (progression == 'none') {
        // check subclasses
        let subclass = actorClass.subclass;
        if (subclass && subclass?.system && subclass?.system?.spellcasting) {
          progression = subclass.system.spellcasting.progression;
        }
      }

      let level = actorClass.system.levels;

      // get updated class new level
      if (levelUpdated && actorClass._id == changedClassID)
        level = changedClassLevel;

      if (spellcastingLevels[progression] != undefined) {
        spellcastingLevels[progression].push(level);
        spellcastingClassCount++;
      }
    })

    // --- Dynamically sum all progressions from CONFIG.DND5E.spellProgression ---
    let totalSpellcastingLevel = 0;
    const divisorSource = (settings.spFormula === 'DMG')
      ? SpellPoints.defaultSettings.spellProgression
      : settings.spellProgression;

    // Loop through all progression keys present in the config
    for (const key of Object.keys(divisorSource)) {
      // Skip 'none' progression or any progression with divisor 0
      if (key === 'none') continue;
      if (key === 'pact' && settings.spFormula === 'DMG') continue; // Exclude pact for DMG
      const rawDivisor = Number(divisorSource[key]?.value);
      if (!rawDivisor) continue; // skip if 0 or NaN
      const divisor = rawDivisor;

      // Get all class levels for this progression
      const levels = spellcastingLevels[key] || [];
      // For 'artificer', always round up; for others, round down unless single-class
      let sum = 0;
      if (key === 'artificer') {
        sum = levels.reduce((acc, lvl) => acc + (divisor === 1 ? lvl : Math.ceil(lvl / divisor)), 0);
      } else if (key === 'half' || key === 'third') {
        if (spellcastingClassCount === 1 && ((key === 'half' && levels[0] >= 2) || (key === 'third' && levels[0] >= 3))) {
          sum = levels.reduce((acc, lvl) => acc + (divisor === 1 ? lvl : Math.ceil(lvl / divisor)), 0);
        } else {
          sum = levels.reduce((acc, lvl) => acc + (divisor === 1 ? lvl : Math.floor(lvl / divisor)), 0);
        }
      } else {
        sum = levels.reduce((acc, lvl) => acc + (divisor === 1 ? lvl : Math.floor(lvl / divisor)), 0);
      }
      totalSpellcastingLevel += sum;
    }

    if (leveledProgression && totalSpellcastingLevel > 0) {
      return parseInt(await this.withActorData(settings.leveledProgressionFormula[totalSpellcastingLevel], actor)) || 0;
    }

    return parseInt(settings.spellPointsByLevel[totalSpellcastingLevel]) || 0
  }

  /**
   * Conditionally updates the spell points for a given npc actor based on specific update actions.
   *
   * This method checks if the actor is a character and if the user has ownership before proceeding.
   * It updates the spell points if the action is an advancement or if the actor's spellcasting level
   * or spellcasting attribute has changed.
   *
   * @param {Actor} actor - The actor whose spell points may need to be updated.
   * @param {Object} update - The update data that may contain changes to the actor's system attributes.
   * @param {Object} action - The action object, which may indicate if this is an advancement.
   * @param {string} id - The identifier for the update or action.
   * @returns {Promise<void>} Resolves when the spell points update process is complete or skipped.
   */
  static async maybeUpdateSpellPoints(actor, update, action, id) {
    // Only proceed if actor is a character and user has ownership
    if (!SpellPoints.isActorCharacter(actor) || !SpellPoints.userHasActorOwnership(actor)) {
      return;
    }

    // Helper to update spell points if the item exists
    const updateIfItemExists = () => {
      const spellPointsItem = SpellPoints.getSpellPointsItem(actor);
      if (spellPointsItem) {
        SpellPoints.updateSpellPointsMax({}, {}, actor, spellPointsItem);
      }
    };

    // If spellcasting level increased, update spell points (NPCs)
    if (update?.system?.attributes?.spell?.level >= 0) {
      updateIfItemExists();
    }
  }

  /**
   * ** on updateItem hook applied only if changing a class item **
   * If the module is active, the actor is a character, and the actor has a spell point resource, then
   * update the spell point resource's maximum value
   * @param item - The item that was updated.
   * @param updates - The updates that are being applied to the item.
   * @param isDifferent - true if the item is being updated, false if it's being dropped
   * @returns True
   */
  static async classItemUpdateSpellPoints(classItem, update, action, id) {
    /* updating or dropping a class item */
    if (classItem.type !== 'class') {
      // check if is the spell point feature being dropped.
      return [classItem, update, action, id];
    }

    const actor = classItem.parent;

    if (!SpellPoints.isActorCharacter(actor))
      return [classItem, update, action, id];

    // if current user is not the owner of the actor, do nothing
    if (!SpellPoints.userHasActorOwnership(actor)) {
      return [classItem, update, action, id];
    }

    // are we changing the levels?
    if (!foundry.utils.getProperty(update.system, 'levels'))
      return [classItem, update, action, id];

    SpellPoints.updateSpellPointsMax(classItem, update, actor, false);

    return [classItem, update, action, id];
  }

  /** hook on createItem */
  static calculateSpellPointsCreate(item, updates, id) {
    if (SpellPoints.isSpellPointsItem(item)) {
      SpellPoints.processFirstDrop(item);
      return true;
    }
  }

  static async updateSpellPointsMax(classItem, updates, actor, spellPointsItem) {
    const actorName = actor.name;

    if (!spellPointsItem) {
      // get the spell points item from the actor
      spellPointsItem = SpellPoints.getSpellPointsItem(actor);
      if (!spellPointsItem) {
        // spell points item not found? 
        return;
      }
    }

    let settings;
    if (spellPointsItem.flags?.spellpoints?.override) {
      settings = foundry.utils.mergeObject(SpellPoints.settings, spellPointsItem.flags.spellpoints.config, { overwrite: true, recursive: true });
    } else {
      settings = SpellPoints.settings;
    }

    if (!settings.spAutoSpellpoints) {
      return true;
    }

    const isCustom = settings.isCustom;
    const spUseLeveled = settings.spUseLeveled;

    // choose the correct formula based on settings
    const SpellPointsMax = isCustom && !spUseLeveled ?
      await SpellPoints._calculateSpellPointsCustom(actor, settings) :
      await SpellPoints._calculateSpellPointsFixed(classItem, updates, actor, settings)

    if (SpellPointsMax !== NaN) {
      const newItemSpent = SpellPointsMax < spellPointsItem.system.uses.value ? 0 : SpellPointsMax - spellPointsItem.system.uses.value;
      const newItemValue = SpellPointsMax < spellPointsItem.system.uses.value ? SpellPointsMax : spellPointsItem.system.uses.value;
      const updates = {
        [`system.uses.max`]: SpellPointsMax,
        [`system.uses.value`]: newItemValue,
        [`system.uses.spent`]: newItemSpent,
      };

      // update the spell points item
      await spellPointsItem.update(updates);

      if (!game.user.isGM) {
        let SpeakTo = game.users.filter(u => u.isGM);
        let message = game.i18n.format(SP_MODULE_NAME + ".spellPointsFound", { SpellPoints: spellPointsItem.name, Actor: actorName })
        ChatMessage.create({
          content: "<i style='color:green;'>" + message + "</i>",
          speaker: ChatMessage.getSpeaker({ alias: actorName }),
          isContentVisible: false,
          isAuthor: true,
          whisper: SpeakTo
        });
      }
    }
    return updates;
  }

  /** hook computeLeveledProgression  */
  static levelProgression(slots, actor, classItem, progression) {

  }

  /** preDeleteItem */
  static removeItemFlag(item, dialog, id) {
    let actor = item.parent;
    if (item._id == SpellPoints.getActorFlagSpellPointItem(actor)) {
      actor.update({ [`flags.dnd5espellpoints.-=item`]: null });
    }
  }

  /** preUpdateItem hook */
  /** check if max uses is less than value */
  static checkSpellPointsValues(item, update, difference, id) {
    if (!SpellPoints.isSpellPointsItem(item)) return;

    let max, value;
    let changed_uses = false;

    if (update.system?.uses?.max) {
      max = update.system.uses.max;
      changed_uses = true;
    } else {
      max = item.system.uses.max
    }

    if (update.system?.uses?.value) {
      value = update.system.uses.value;
      changed_uses = true;
    } else {
      value = item.system.uses.value
    }

    if (changed_uses) {
      if (value > max) {
        update.system.uses.value = max
      }
    }

    if (!isset(item.flags?.spellpoints?.config)) {
      // get global module settings for defaults
      const def = SpellPoints.settings;
      const formulas = SpellPoints.formulas;
      // store current item configuration
      let conf = isset(item.flags?.spellpoints?.config) ? item.flags?.spellpoints?.config : {};

      conf = foundry.utils.mergeObject(conf, def, { recursive: true, insertKeys: true, insertValues: false, overwrite: false })
      const preset = conf.spFormula;

      conf.isCustom = formulas[preset].isCustom;

      update.flags.spellpoints = {
        [`config`]: item.flags?.spellpoints?.override ? conf : {},
        [`override`]: item.flags?.spellpoints?.override
      };
    }

    return [item, update, difference, id];

  }

  static processFirstDrop(item) {
    const actor = item.parent;

    if (!SpellPoints.userHasActorOwnership(actor)) {
      return;
    }

    if (SpellPoints.getActorFlagSpellPointItem(actor)) {
      // there is already a spellpoints item here.
      ui.notifications.error(game.i18n.format(SP_MODULE_NAME + ".alreadySpItemOwned"));
      item.update({
        'name': item.name + ' (' + game.i18n.format(SP_MODULE_NAME + ".duplicated") + ')'
      });
      return;
    }

    if (actor == null)
      return;

    let updateActor = {
      'flags': {
        'dnd5espellpoints': {
          'item': item._id
        }
      }
    };
    actor.update(updateActor);
    SpellPoints.updateSpellPointsMax({}, {}, actor, item)
  }

  static removeOldResource(item, spellPointResource) {
    const actor = item.actor;

    let max = actor.system.resources[`${spellPointResource.key}`].max;
    let value = actor.system.resources[`${spellPointResource.key}`].value;
    let updateActor = { [`system.resources.${spellPointResource.key}.label`]: "" };
    actor.update(updateActor);
    item.update({
      [`system.uses.max`]: max,
      [`system.uses.value`]: value,
      [`system.uses.spent`]: max - value
    })
  }

  /**
   * It adds a spell points tracker to the character sheet
   * @param app - The application object.
   * @param html - The HTML of the Actor sheet.
   * @param data - The data object passed to the sheet.
   * @returns The return value is the html_checkbox variable.
   */
  static async alterCharacterSheet(app, html, data, type) {
    if (data.actor.type != "character" && data.actor.type != "npc") {
      return;
    }
    if (!SpellPoints.settings.spActivateBar) {
      return;
    }
    const actor = data.actor;
    const SpellPointsItem = this.getSpellPointsItem(actor);
    if (SpellPointsItem) {
      const max = SpellPointsItem.system.uses.max;
      const spent = SpellPointsItem.system.uses.spent;
      const value = max - spent;

      let percent = value / max * 100 > 100 ? 100 : value / max * 100;
      const template_data = {
        'isV2': type == 'v2',
        'isNPC': type == 'npc',
        'editable': data.editable,
        'name': SpellPointsItem.name,
        '_id': SpellPointsItem._id,
        'max': max,
        'value': value,
        'percent': percent,
      }
      const template_file = "modules/dnd5e-spellpoints/templates/spell-points-sheet-tracker.hbs";
      const rendered_html = await foundry.applications.handlebars.renderTemplate(template_file, template_data);

      let sidebarClasses = '.sidebar .stats'
      let append = true;

      let container = $('<div class="sp-bar-container"></div>');

      container.append(rendered_html);

      if (app.classList.value.includes('tidy5e-sheet')) {
        // Tidy5e specific handling
        sidebarClasses = '.attributes .side-panel';
        append = false;
      } else if (type == 'v2') {
        sidebarClasses = '.sidebar .stats';
      } else if (type == 'npc') {
        sidebarClasses = '.sheet-body .sidebar';
        append = false;
      } else {
        sidebarClasses = '.header-details .attributes';
      }

      if ($(sidebarClasses + ' .sp-bar-container', html).length > 0) {
        // If the sp bar container already exists, clear it
        $(sidebarClasses + ' .sp-bar-container', html).remove();
      }

      if (append) {
        $(sidebarClasses, html).append(container);
      } else {
        $(sidebarClasses, html).prepend(container);
      }

      $('.config-button.spellPoints').off('click').on('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        let config = new ActorSpellPointsConfig({ document: SpellPointsItem });
        config?.render(true);
      });
    }
  }

  static filterLevelKeys(obj, maxLevel) {
    const filtered = {};
    for (let lvl = 1; lvl <= maxLevel; lvl++) {
      if (obj[lvl] !== undefined) filtered[lvl] = obj[lvl];
    }
    return filtered;
  }

  static filterSpellLevelKeys(obj, spellLevels) {
    const filtered = {};
    for (const lvl of Object.keys(spellLevels)) {
      if (obj[lvl] !== undefined) filtered[lvl] = obj[lvl];
    }
    return filtered;
  }

  /* It renders the spell points item config in the item sheet. */
  static async renderSpellPointsItem(app, html, data) {
    const html_obj = $(html);
    const item = data?.item;

    if (SpellPoints.isSpellPointsItem(item)) {
      const itemId = item._id;

      $('.item-properties', html_obj).hide();
      let template_item = data.document; // data object to pass to the template
      //get global module settings for defaults
      const def = SpellPoints.settings;
      const formulas = SpellPoints.formulas;
      // store current item configuration
      let conf = isset(template_item.flags?.spellpoints?.config) ? template_item.flags?.spellpoints?.config : {};

      conf = foundry.utils.mergeObject(conf, def, { recursive: true, insertKeys: true, insertValues: false, overwrite: false })

      //conf.spFormula = isset(conf?.spFormula) ? conf?.spFormula : def.spFormula;
      const preset = conf.spFormula;

      conf.isCustom = isset(conf?.spFormula) ? formulas[preset].isCustom : def.isCustom;

      if (isset(conf?.previousFormula) && conf?.previousFormula != preset) {
        // changed formula preset, update spellpoints default
        conf = foundry.utils.mergeObject(conf, formulas[preset], { recursive: true, overwrite: true });
        conf.previousFormula = preset;
      }

      const maxLevel = CONFIG.DND5E.maxLevel;
      const spellLevels = CONFIG.DND5E.spellLevels;

      if (conf.spellPointsByLevel) {
        conf.spellPointsByLevel = SpellPoints.filterLevelKeys(conf.spellPointsByLevel, maxLevel);
      }
      if (conf.leveledProgressionFormula) {
        conf.leveledProgressionFormula = SpellPoints.filterLevelKeys(conf.leveledProgressionFormula, maxLevel);
      }
      if (conf.spellPointsCosts) {
        conf.spellPointsCosts = SpellPoints.filterSpellLevelKeys(conf.spellPointsCosts, spellLevels);
      }

      if (!isset(template_item.flags?.spellpoints?.config)) {
        template_item.flags.spellpoints = {
          [`config`]: template_item.flags?.spellpoints?.override ? conf : {},
          [`override`]: template_item.flags?.spellpoints?.override
        };
      }

      template_item.flags.spellpoints.editable = data.editable && (game.user.isGM || SpellPoints.settings?.spGmOnly == false);

      template_item.flags.spellpoints.spFormulas = Object.fromEntries(Object.keys(SpellPoints.formulas).map(formula_key => [formula_key, game.i18n.localize(`dnd5e-spellpoints.${formula_key}`)]));
      const template_file = "modules/dnd5e-spellpoints/templates/spell-points-item.hbs"; // file path for the template file, from Data directory

      foundry.applications.handlebars.renderTemplate(template_file, template_item).then(function (html) {
        html_obj.addClass('spellpoints-item-sheet');
        $('.tab[data-tab="description"] .item-descriptions', html_obj).prepend(html);
        $('.tab.description', html_obj).scrollTop(SpellPoints.scroll);
        SpellPoints.scroll = 0;
        // save scroll on interactions
        html_obj.on('change', function (e) {
          let scroll = $('.tab.description', html_obj).scrollTop();
          SpellPoints.scroll = scroll;
        });
      })


    }
    //return (app, html, data);

  }
  static scroll = 0;
} /** END SpellPoint Class **/


