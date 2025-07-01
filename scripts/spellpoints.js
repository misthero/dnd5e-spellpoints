import { SP_MODULE_NAME, SP_ITEM_ID } from "./main.js";

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
      spellcastingTypes: { 'full': { 'value': 1, 'label': "DND5E.SpellProgFull" }, 'half': { 'value': 2, 'label': "DND5E.SpellProgHalf" }, 'third': { 'value': 3, 'label': "DND5E.SpellProgThird" }, 'artificier': { 'value': 1, 'label': "DND5E.SpellProgArt" }, 'pact': { 'value': 1, 'label': "DND5E.SpellProgPact" } },
      leveledProgressionFormula: { 1: "", 2: "", 3: "", 4: "", 5: "", 6: "", 7: "", 8: "", 9: "", 10: "", 11: "", 12: "", 13: "", 14: "", 15: "", 16: "", 17: "", 18: "", 19: "", 20: "" },
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
        spellPointsCosts: this.defaultSettings.spellPointsCosts,
        leveledProgressionFormula: this.defaultSettings.spellPointsByLevel
      },
      AM_CUSTOM: {
        isCustom: true,
        spCustomFormulaBase: 'ceil((2*@spells.pact.level + 1*@spells.spell1.max + 2*@spells.spell2.max + 3*@spells.spell3.max + 4*@spells.spell4.max + 5*@spells.spell5.max + 6*@spells.spell6.max + 7*@spells.spell7.max + 8*@spells.spell8.max + 9*@spells.spell9.max) / 2) + @attributes.spell.dc - 8 - @attributes.prof',
        spCustomFormulaSlotMultiplier: '0',
        spUseLeveled: false,
        spellPointsCosts: { 0: '0', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '12', 7: '14', 8: '24', 9: '27' },
        leveledProgressionFormula: this.defaultSettings.leveledProgressionFormula
      },
      CUSTOM: {
        isCustom: true,
        leveledProgressionFormula: this.defaultSettings.leveledProgressionFormula,
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
  static withActorData(formula, actor) {
    formula = formula.toString();
    if (!formula || typeof formula !== 'string' || formula.length == 0) {
      return 0;
    }
    let dataObject = actor.getRollData();
    dataObject.flags = actor.flags;
    const r = new Roll(formula.toString(), dataObject);
    r.evaluateSync({ async: false });
    return r.total;
  }

  /** find the spellpoints item on actor */
  static getSpellPointsItem(actor) {
    let items = foundry.utils.getProperty(actor, "collections.items");
    const item_id = SpellPoints.getActorFlagSpellPointItem(actor);
    let foundItem = false;
    if (items[item_id]) {
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

  /** check what resource is spellpoints on this actor **/
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

  static castSpell(item, consumeConfig, options) {
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
    const spellPointCost = this.withActorData(settings.spellPointsCosts[spellLvl], actor);

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

        const hpMaxLost = spellPointCost * SpellPoints.withActorData(settings.spLifeCost, actor);
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

      const currentValue = Roll.create(propertyValue.toString(), rollData).evaluateSync().total;
      const mod = Roll.create(formula, rollData).evaluateSync().total;
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
      $('select[name="spell.slot"] option', $(html)).each(function () {
        let optionValue = $(this).val();
        if (!optionValue || optionValue == '') {
          return true;
        }

        if (optionValue == 'pact') {
          optionLevel = actor.system.spells.pact.level;
        } else {
          optionLevel = optionValue.replace('spell', '');
        }

        cost = SpellPoints.withActorData(settings.spellPointsCosts[optionLevel], actor);

        if (settings.spFormula == 'DMG' && optionValue == 'pact') {
          // do nothing
        } else {
          const spCostText = game.i18n.format(SP_MODULE_NAME + ".spellCost", { amount: cost + '/' + actualSpellPoints, SpellPoints: spellPointItem.name });
          let newText = $(this).text() + ` (${spCostText})`;
          if (usageConfig.consume.spellSlot) {
            newText = $(this).text() + ' (' + spCostText + ')';
          }

          $(this).text(newText);
        }
      })
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
      spellPointCost = SpellPoints.withActorData(settings.spellPointsCosts[choosenSpellLevel], actor);
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
  static _calculateSpellPointsCustom(actor, settings) {
    let SpellPointsMax = SpellPoints.withActorData(settings.spCustomFormulaBase, actor);

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

      spellPointsFromSlots += slot.max * SpellPoints.withActorData(settings.spellPointsCosts[slotLvl], actor);
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
  static _calculateSpellPointsFixed(classItem, updates, actor, settings) {
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
    const actorClasses = actor.items.filter(i => i.type === "class");

    if (actorClasses.length == 0 && !spellcastingNpc) {
      // no classes, no spellcasting
      return 0;
    }

    if (spellcastingNpc && actorClasses.length == 0) {
      // no classes, but spellcasting npc
      if (leveledProgression) {
        return parseInt(this.withActorData(settings.leveledProgressionFormula[spellcastingNpcLevel], actor)) || 0;
      } else {
        return parseInt(settings.spellPointsByLevel[spellcastingNpcLevel]) || 0;
      }
    }

    let spellcastingClassCount = 0;
    let spellcastingLevels = {};

    Object.keys(dnd5e.config.spellProgression).forEach((key) => {
      spellcastingLevels[key] = [];
    });


    for (let c of actorClasses) {
      /* spellcasting: pact; full; half; third; artificier; none; **/
      let spellcasting = c.system.spellcasting.progression;
      if (spellcasting == 'none') {
        // check subclasses
        let subclass = c.subclass;
        if (subclass && subclass?.system && subclass?.system?.spellcasting) {
          spellcasting = subclass.system.spellcasting.progression;
        }
      }

      let level = c.system.levels;

      // get updated class new level
      if (levelUpdated && c._id == changedClassID)
        level = changedClassLevel;

      if (spellcastingLevels[spellcasting] != undefined) {
        spellcastingLevels[spellcasting].push(level);
        spellcastingClassCount++;
      }
    }

    // --- Use correct divisors depending on formula ---
    const divisorSource = (settings.spFormula === 'DMG')
      ? SpellPoints.defaultSettings.spellcastingTypes
      : settings.spellcastingTypes;

    let totalSpellcastingLevel = 0;

    // Always add 'full' using its custom divisor
    totalSpellcastingLevel += spellcastingLevels['full'].reduce((sum, level) => {
      const divisor = Number(divisorSource['full']?.value) || 1;
      return sum + (divisor === 1 ? level : Math.floor(level / divisor));
    }, 0);

    // by default pact magic is not included in the total spellcasting level
    // Only include 'pact' if the formula is NOT 'DMG'
    if (settings.spFormula != 'DMG') {
      totalSpellcastingLevel += spellcastingLevels['pact'].reduce((sum, level) => {
        const divisor = Number(divisorSource['pact']?.value) || 1;
        return sum + (divisor === 1 ? level : Math.floor(level / divisor));
      }, 0);
    }

    // Add 'artificer' using its custom divisor (default 1, but often 2)
    totalSpellcastingLevel += spellcastingLevels['artificer'].reduce((sum, level) => {
      const divisor = Number(divisorSource['artificer']?.value) || 1;
      // Artificer always rounds up
      return sum + (divisor === 1 ? level : Math.ceil(level / divisor));
    }, 0);

    // Half and third casters only round up if they do not multiclass into other spellcasting classes and if they
    // have enough levels to obtain the spellcasting feature.
    if (spellcastingClassCount == 1 && (spellcastingLevels['half'][0] >= 2 || spellcastingLevels['third'][0] >= 3)) {
      // Single-class: round up
      totalSpellcastingLevel += spellcastingLevels['half'].reduce((sum, level) => {
        const divisor = Number(divisorSource['half']?.value) || 2;
        return sum + (divisor === 1 ? level : Math.ceil(level / divisor));
      }, 0);
      totalSpellcastingLevel += spellcastingLevels['third'].reduce((sum, level) => {
        const divisor = Number(divisorSource['third']?.value) || 3;
        return sum + (divisor === 1 ? level : Math.ceil(level / divisor));
      }, 0);
    } else {
      // Multiclass: round down
      totalSpellcastingLevel += spellcastingLevels['half'].reduce((sum, level) => {
        const divisor = Number(divisorSource['half']?.value) || 2;
        return sum + (divisor === 1 ? level : Math.floor(level / divisor));
      }, 0);
      totalSpellcastingLevel += spellcastingLevels['third'].reduce((sum, level) => {
        const divisor = Number(divisorSource['third']?.value) || 3;
        return sum + (divisor === 1 ? level : Math.floor(level / divisor));
      }, 0);
    }

    if (leveledProgression) {
      return parseInt(this.withActorData(settings.leveledProgressionFormula[totalSpellcastingLevel], actor)) || 0;
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
    if (update?.system?.attributes?.spell?.level > 0) {
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
    const SpellPointsMax = isCustom && !spUseLeveled ? SpellPoints._calculateSpellPointsCustom(actor, settings) : SpellPoints._calculateSpellPointsFixed(classItem, updates, actor, settings)

    if (SpellPointsMax !== NaN) {
      const newItemSpent = SpellPointsMax < spellPointsItem.system.uses.value ? 0 : SpellPointsMax - spellPointsItem.system.uses.value;
      const newItemValue = SpellPointsMax < spellPointsItem.system.uses.value ? SpellPointsMax : spellPointsItem.system.uses.value;
      await spellPointsItem.update({
        [`system.uses.max`]: SpellPointsMax,
        [`system.uses.value`]: newItemValue,
        [`system.uses.spent`]: newItemSpent,
      });

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

      if (type == 'v2') {
        $('.sidebar .stats', html).append(rendered_html);
      } else if (type == 'npc') {
        $('.sheet-body .sidebar', html).prepend(rendered_html);
      } else {
        $('.header-details .attributes', html).append(rendered_html);
      }

      $('.config-button.spellPoints').off('click').on('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        let config = new ActorSpellPointsConfig({ document: SpellPointsItem });
        config?.render(true);
      });
    }
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

/**
 * Spell Points Configuration
 * @extends {dnd5e.applications.actor.BaseConfigSheetV2}
 */
class ActorSpellPointsConfig extends dnd5e.applications.actor.BaseConfigSheetV2 {
  constructor(options) {
    foundry.utils.mergeObject(options ?? {}, {
      classes: [
        "standard-form", "config-sheet", "themed",
        "sheet", "dnd5e2", "spellpoints", "application"
      ],
      position: { width: 420 },
      submitOnClose: true,
      editable: true,
      submitOnChange: false,
      closeOnSubmit: false,
      actions: {
        updateSpellPointMax: ActorSpellPointsConfig._updateSpellPointMax,
        deleteRecovery: ActorSpellPointsConfig._deleteRecovery,
        addRecovery: ActorSpellPointsConfig._addRecovery,
      },
    });
    super(options);
  }

  /** @override */
  static PARTS = {
    config: {
      template: "modules/dnd5e-spellpoints/templates/spell-points-popup-config.hbs"
    }
  };

  /** Build the data context for spell-points-popup-config template */
  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    const actor = this.document.parent;

    context.uses = this.document.system.uses;
    context.uses.value = context.uses.max - context.uses.spent;
    context.img = this.document.img;
    context.name = this.document.name;
    context.recovery = game.system.config.limitedUsePeriods;

    // Limited Uses
    context.recoveryPeriods = [
      ...Object.entries(CONFIG.DND5E.limitedUsePeriods)
        .filter(([, { deprecated }]) => !deprecated)
        .map(([value, { label }]) => ({ value, label, group: game.i18n.localize("DND5E.DurationTime") })),
      { value: "recharge", label: game.i18n.localize("DND5E.USES.Recovery.Recharge.Label") }
    ];
    context.recoveryTypes = [
      { value: "recoverAll", label: game.i18n.localize("DND5E.USES.Recovery.Type.RecoverAll") },
      { value: "loseAll", label: game.i18n.localize("DND5E.USES.Recovery.Type.LoseAll") },
      { value: "formula", label: game.i18n.localize("DND5E.USES.Recovery.Type.Formula") }
    ];

    let recovery = this.document.system.uses.recovery ?? [];
    if (!Array.isArray(recovery)) recovery = Object.values(recovery ?? {});
    context.usesRecovery = recovery.map((data, index) => ({
      data,
      prefix: `uses.recovery.${index}.`,
      source: context.uses?.recovery[index] ?? data,
      formulaOptions: data.period === "recharge" ? data.recharge?.options : null
    }));


    return context;
  }


  /** @override */
  async _processSubmitData(event, form, submitData) {
    const item = this.document;
    const FormDataExtended = new foundry.applications.ux.FormDataExtended(form);
    const data = foundry.utils.expandObject(FormDataExtended.object);
    // Calculate spent based on max and value
    data.uses.spent = data.uses.max - data.uses.value;

    // Merge the submitted data with the existing uses
    submitData = foundry.utils.mergeObject(submitData?.system?.uses ?? {}, data.uses);

    // Merge the changes with the item's system.uses
    const changedUses = foundry.utils.mergeObject(item.system.uses, data.uses);

    // Await the super's _processSubmitData and then re-render
    await super._processSubmitData(event, form, { [`system.uses`]: changedUses });
    this.document.system.uses = changedUses;
    // Refresh the data context and re-render the sheet
    this.render();
  }

  /** Dispatch your three custom actions */
  _onSheetAction(event) {
    const action = event.currentTarget.dataset.action;
    switch (action) {
      case "addRecovery": return this._onAddRecovery();
      case "deleteRecovery": return this._onDeleteRecovery(event.currentTarget);
      case "updateSpellPointMax": return this._onUpdateMax();
    }
  }


  static _addRecovery(event, target) {
    const uses = foundry.utils.duplicate(this.document.system.uses);
    uses.recovery = [...(uses.recovery || []), {}];
    this.document.update({ [`system.uses.recovery`]: uses.recovery });
  }


  static _deleteRecovery(event, target) {
    const idx = Number(target.closest("[data-index]").dataset.index);
    const uses = foundry.utils.duplicate(this.document.system.uses);
    // Convert object to array if necessary
    if (!Array.isArray(uses.recovery)) {
      uses.recovery = Object.values(uses.recovery || {});
    }
    uses.recovery.splice(idx, 1);
    this.document.update({ [`system.uses.recovery`]: uses.recovery });
  }

  static async _updateSpellPointMax(event, target) {
    const uses = foundry.utils.duplicate(this.document.system.uses);
    const item = this.document;
    const actor = item.parent;
    await SpellPoints.updateSpellPointsMax({}, {}, actor, item);
    this.render(true);
  }

  get title() {
    return `${game.i18n.localize("dnd5e-spellpoints.ItemConfig")}: ${this.document.name}`;
  }
}