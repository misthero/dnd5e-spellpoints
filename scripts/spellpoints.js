import { SP_MODULE_NAME, SP_ITEM_ID } from "./main.js";

function isset(variable) {
  return (typeof variable !== 'undefined');
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
      spellPointsCosts: { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7, 6: 9, 7: 10, 8: 11, 9: 13 },
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
      spAnimateBar: true
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
        spCustomFormulaBase: 'ceil((2*@spells.pact.level + 1*@spells.spell1.max + 2*@spells.spell2.max + 3*@spells.spell3.max + 4*@spells.spell4.max + 5*@spells.spell5.max + 6*@spells.spell6.max + 7*@spells.spell7.max + 8*@spells.spell8.max + 9*@spells.spell9.max) / 2) + @attributes.spelldc - 8 - @attributes.prof',
        spCustomFormulaSlotMultiplier: '0',
        spUseLeveled: false,
        spellPointsCosts: { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '12', 7: '14', 8: '24', 9: '27' },
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
    const isActor = foundry.utils.getProperty(actor, "type") == "character";
    let isNPC = false;
    if (this.settings.enableForNpc && !isActor) {
      isNPC = foundry.utils.getProperty(actor, "type") == "npc";
    }
    return isNPC || isActor;
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

  /**
   * Evaluates the given formula with the given actors data. Uses FoundryVTT's Roll
   * to make this evaluation.
   * @param {string|number} formula The rollable formula to evaluate.
   * @param {object} actor The actor used for variables.
   * @return {number} The result of the formula.
   */
  static withActorData(formula, actor) {
    //console.log('rollFormula', formula);
    let dataObject = actor.getRollData();
    dataObject.flags = actor.flags;
    const r = new Roll(formula.toString(), dataObject);
    r.evaluateSync({ async: false });
    return r.total;
  }

  static getSpellPointsItem(actor) {
    let items = foundry.utils.getProperty(actor, "collections.items");
    const item_id = SpellPoints.getActorFlagSpellPointItem(actor);
    if (items[item_id])
      return items[item_id];
    let features = items.filter(i => i.type == 'feat' || i.type == 'class' && i.type.subtype == 'sp');
    // get the item with source custom label = Spell Points
    let sp = features.filter(s => s.system.source.custom == this.settings.spResource);

    if (typeof sp == 'undefined') {
      return false;
    }
    return sp[0];
  }

  /** check what resource is spellpoints on this actor **/
  static getSpellPointsResource(actor) {
    let _resources = foundry.utils.getProperty(actor, "system.resources");
    for (let r in _resources) {
      if (_resources[r].label == this.settings.spResource) {
        return { 'values': _resources[r], 'key': r };
        break;
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
   * @param consume - resource consumption
   * @param actor - The actor that is being updated.
   * @returns The update object.
   */

  static castSpell(item, consume, options) {
    // ('SP CAST SPELL item', item);
    //console.log('SP CAST SPELL consume', consume);
    //console.log('SP CAST SPELL options', options);

    if (!consume.consume?.spellPoints || !item.consumption.spellSlot) {
      return [item, consume, options];
    }

    const actor = item.actor;
    /** do nothing if module is not active **/
    if (!SpellPoints.isActorCharacter(actor))
      return [item, consume, options];

    let spellPointItem = SpellPoints.getSpellPointsItem(actor);

    const moduleSettings = this.settings
    let settings = moduleSettings;

    if (spellPointItem.flags?.spellpoints?.override) {
      settings = spellPointItem.flags?.spellpoints?.config !== 'undefined' ? spellPointItem.flags?.spellpoints.config : settings;
    }

    /** check if this is a spell casting **/
    /** dnd v4 this is not an item hook but an activation hook */

    const parentItem = item?.parent?.parent;

    if (typeof parentItem == 'undefined' || parentItem?.type != 'spell')
      return [item, consume, options];

    if (consume.consume.spellSlot) {
      consume.consume.spellPoints = false;
      return [item, consume, options];
    }

    if (consume.consume.spellPoints) {
      consume.consume.spellSlot = false;
      consume.hasConsumption = false;
    }

    /** not found any resource for spellpoints ? **/
    if (!spellPointItem) {
      return {};
    }

    /** find the spell level just cast */
    const spellLvl = options.data.flags.dnd5e.use.spellLevel;

    let actualSpellPoints = spellPointItem.system.uses.value;

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
      spellPointItem.system.uses.spent = spellPointItem.system.uses.spent + spellPointCost;

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
        spellPointItem.system.uses.spent = spellPointItem.system.uses.max

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
        consume.consumeSpellSlot = false;
        consume.consumeSpellLevel = false;
        consume.create.measuredTemplate = false;
        options.createMessage = false;
        options.create = false;
        options.hasConsumption = false;
        consume.hasConsumption = false;
        delete options.flags;
        return [item, consume, options];
      }
    }

    consume.consumeSpellLevel = false;
    consume.consumeSpellSlot = false;
    options.hasConsumption = false;
    consume.hasConsumption = false;

    updateItem.system.uses = spellPointItem.system.uses;
    spellPointItem.update(updateItem);

    actor.update(updateActor);

    return [item, consume, options];
  }


  // prepare the spellpoints configuration.
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

    // is a spell, is a character, and has a spell point resource
    usageConfig.consume.shouldUseSpellpoints = true;
    usageConfig.spellPointsItem = spellPointItem;

    // add custom classes to the dialog
    if (!dialogConfig.applicationClass.DEFAULT_OPTIONS.classes.includes('spellpoints-cast')) {
      dialogConfig.applicationClass.DEFAULT_OPTIONS.classes.push('spellpoints-cast');
    }

    if (!usageConfig.consume.spellSlot) {
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

    if (usageConfig?.consume?.shouldUseSpellpoints !== true) {
      return;
    }

    //console.log('checkDialogSpellPoints usageConfig', usageConfig);

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

    let level = 'none';
    let cost = 0;
    let actualSpellPoints = spellPointItem.system.uses.value;

    /** Replace list of spell slots with list of spell point costs **/
    if (usageConfig.consume.spellPoints) {
      $('select[name="spell.slot"] option', $(html)).each(function () {
        let optionValue = $(this).val();

        if (optionValue == 'pact') {
          level = actor.system.spells.pact.level;
        } else {
          level = optionValue.replace('spell', '');
        }

        cost = SpellPoints.withActorData(settings.spellPointsCosts[level], actor);
        if (settings.spFormula == 'DMG' && optionValue == 'pact') {
          // do nothing
        } else {
          const spCostText = game.i18n.format(SP_MODULE_NAME + ".spellCost", { amount: cost + '/' + actualSpellPoints, SpellPoints: spellPointItem.name });
          let newText = `${CONFIG.DND5E.spellLevels[level]} (${spCostText})`;
          if (usageConfig.consume.spellSlot) {
            newText = $(this).text() + ' (' + spCostText + ')';
          }

          $(this).text(newText);
        }
      })
    }

    let consumeInput = $('dnd5e-checkbox[name="consume.spellSlot"]', $(html)).parents('.form-group');
    const consumeString = game.i18n.format(SP_MODULE_NAME + ".consumeSpellSlotInput", { SpellPoints: spellPointItem.name });
    const consumeSpellPoints = usageConfig.consume.spellPoints ? "checked" : '';
    consumeInput.parent().append(`<div class="form-group">
      <label>${consumeString}</label>
      <div class="form-fields">
      <input type="checkbox" name="consume.spellPoints" ${consumeSpellPoints}></div></div>`);

    if (level == 'none')
      return;

    /** Calculate spell point cost and warn user if they have none left */
    let spellPointCost = 0;

    if (preparation == 'pact') {
      spellPointCost = cost;
    } else {
      spellPointCost = SpellPoints.withActorData(settings.spellPointsCosts[baseSpellLvl], actor);
    }
    const missing_points = (typeof actualSpellPoints === 'undefined' || actualSpellPoints - spellPointCost < 0);
    const messageNotEnough = game.i18n.format(SP_MODULE_NAME + ".youNotEnough", { SpellPoints: spellPointItem.name });

    if (missing_points) {
      $('#ability-use-form', html).append('<div class="spError">' + messageNotEnough + '</div>');
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
      const rendered_html = await renderTemplate(template_file, template_data);
      $('.tab.activity-consumption', html).prepend(rendered_html);
      return (dialog, html);
      //console.log('alterActivityDialogSP', dialog);
      /*const activity = dialog.activity;
      const spell = dialog.activity.item;
      if (typeof activity?.consumption?.spellPoints == 'undefined') {
        //activity.validConsumptionTypes
        //activity.update({ 'consumption.spellPoints': true });
      }
      let spEnabled = activity?.consumption?.spellPoints ? activity?.consumption?.spellPoints : true;
      const template_data = {
        spellPointsEnabled: spEnabled,
      };
      const template_file = "modules/dnd5e-spellpoints/templates/spell-points-activity.hbs";
      const rendered_html = await renderTemplate(template_file, template_data);
      $('.tab.activity-consumption', html).prepend(rendered_html);
      */
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
      if (slotLvlTxt == 'pact') {
        slotLvl = slot.level;
      } else {
        slotLvl = parseInt(slotLvlTxt.replace(/\D/g, ''));
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

    SpellPointsMax += spellPointsFromSlots * SpellPoints.withActorData(settings.spCustomFormulaSlotMultiplier, actor);

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
  static _calculateSpellPointsFixed(item, updates, actor, settings) {
    /* not an update? **/
    let changedClassLevel = null;
    let changedClassID = null;
    let levelUpdated = false;
    const leveledProgression = settings.spUseLeveled;

    if (foundry.utils.getProperty(updates.system, 'levels')) {
      changedClassLevel = foundry.utils.getProperty(updates.system, 'levels');
      changedClassID = foundry.utils.getProperty(item, '_id');
      levelUpdated = true;
    }
    // check for multiclasses
    const actorClasses = actor.items.filter(i => i.type === "class");

    let spellcastingClassCount = 0;
    const spellcastingLevels = {
      full: [],
      half: [],
      artificer: [],
      third: [],
      pact: [],
    }

    for (let c of actorClasses) {
      /* spellcasting: pact; full; half; third; artificier; none; **/
      let spellcasting = c.system.spellcasting.progression;
      if (spellcasting == 'none') {
        // check subclasses
        let subclass = c.subclass;
        spellcasting = subclass.system.spellcasting.progression;
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

    //console.log('spellcastingLevels', spellcastingLevels);
    //console.log('settings.spFormula', settings.spFormula);


    let totalSpellcastingLevel = 0
    totalSpellcastingLevel += spellcastingLevels['full'].reduce((sum, level) => sum + level, 0);
    //console.log('totalSpellcastingLevel full', totalSpellcastingLevel);
    if (settings.spFormula != 'DMG') {
      // by default pact magic is not included in the total spellcasting level
      totalSpellcastingLevel += spellcastingLevels['pact'].reduce((sum, level) => sum + level, 0);
      //console.log('totalSpellcastingLevel full + pact', totalSpellcastingLevel);
    }
    totalSpellcastingLevel += spellcastingLevels['artificer'].reduce((sum, level) => sum + Math.ceil(level / 2), 0);
    //console.log('totalSpellcastingLevel full + pact + artificier', totalSpellcastingLevel);
    // Half and third casters only round up if they do not multiclass into other spellcasting classes and if they
    // have enough levels to obtain the spellcasting feature.
    if (spellcastingClassCount == 1 && (spellcastingLevels['half'][0] >= 2 || spellcastingLevels['third'][0] >= 3)) {
      totalSpellcastingLevel += spellcastingLevels['half'].reduce((sum, level) => sum + Math.ceil(level / 2), 0);
      totalSpellcastingLevel += spellcastingLevels['third'].reduce((sum, level) => sum + Math.ceil(level / 3), 0);
      //console.log('totalSpellcastingLevel full + pact + artificier + half + third SINGLE CLASS', totalSpellcastingLevel);
    } else {
      totalSpellcastingLevel += spellcastingLevels['half'].reduce((sum, level) => sum + Math.floor(level / 2), 0);
      totalSpellcastingLevel += spellcastingLevels['third'].reduce((sum, level) => sum + Math.floor(level / 3), 0);
      //console.log('totalSpellcastingLevel full + pact + artificier + half + third MULTI CLASS', totalSpellcastingLevel);
    }



    if (totalSpellcastingLevel == 0)
      return 0;

    if (leveledProgression) {
      return parseInt(this.withActorData(settings.leveledProgressionFormula[totalSpellcastingLevel], actor)) || 0;
    }

    return parseInt(settings.spellPointsByLevel[totalSpellcastingLevel]) || 0
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
  static calculateSpellPoints(item, updates, id) {
    const actor = item.parent;

    if (!SpellPoints.isActorCharacter(actor))
      return [item, updates, id];

    if (!SpellPoints.settings.spAutoSpellpoints) {
      return [item, updates, id];
    }

    /* updating or dropping a class item */

    if (item.type !== 'class') {
      // check if is the spell point feature being dropped.
      return [item, updates, id];
    }

    if (!foundry.utils.getProperty(updates.system, 'levels'))
      return [item, updates, id];

    SpellPoints.updateSpellPointsMax(item, updates, actor, false);
    return [item, updates, id];
  }


  static calculateSpellPointsCreate(item, updates, id) {
    if (SpellPoints.isSpellPointsItem(item)) {
      SpellPoints.processFirstDrop(item);
      return true;
    } else if (item.type == 'class') {
      SpellPoints.calculateSpellPoints(item, updates, id);
    }
  }

  static updateSpellPointsMax(classItem, updates, actor, createdItem) {
    const actorName = actor.name;
    let spellPointsItem;
    if (createdItem)
      spellPointsItem = createdItem;
    else
      spellPointsItem = SpellPoints.getSpellPointsItem(actor);
    if (!spellPointsItem) {
      // spell points item not found? 
      return;
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
    const SpellPointsMax = isCustom && !spUseLeveled ? SpellPoints._calculateSpellPointsCustom(actor, settings) : SpellPoints._calculateSpellPointsFixed(classItem, updates, actor, settings)

    if (SpellPointsMax > 0) {
      spellPointsItem.update({
        [`system.uses.max`]: SpellPointsMax,
        [`system.uses.value`]: createdItem ? SpellPointsMax : spellPointsItem.system.uses.value
      });

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
    return spellPointsItem;
  }

  /** hook computeLeveledProgression  */
  static levelProgression(slots, actor, classItem, progression) {

  }

  /** preDeleteItem */
  static removeItemFlag(item, dialog, id) {
    let actor = item.parent;
    if (item._id == SpellPoints.getActorFlagSpellPointItem(actor)) {
      actor.update({ [`flags.dnd5espellpoints.item`]: '' });
    }
  }

  /** pre update item */
  /** check if max uses is less than value */
  static checkSpellPointsValues(item, update, difference, id) {
    if (SpellPoints.isSpellPointsItem(item)) {
      let max, value;
      let changed_uses = false;
      //console.log("checkSpellPointsValues UPDATE", update)
      // check if changed the item uses prevent value exceed max
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

      //get global module settings for defaults
      const def = SpellPoints.settings;
      const formulas = SpellPoints.formulas;
      // store current item configuration
      let conf = isset(item.flags?.spellpoints?.config) ? item.flags?.spellpoints?.config : {};

      conf = foundry.utils.mergeObject(conf, def, { recursive: true, insertKeys: true, insertValues: false, overwrite: false })
      const preset = conf.spFormula;

      conf.isCustom = formulas[preset].isCustom;

      if (!isset(item.flags?.spellpoints?.config)) {
        update.flags.spellpoints = {
          [`config`]: item.flags?.spellpoints?.override ? conf : {},
          [`override`]: item.flags?.spellpoints?.override
        };
      }

      return [item, update, difference, id];
    }
  }

  static processFirstDrop(item) {
    if (SpellPoints.getActorFlagSpellPointItem(item.parent)) {
      // there is already a spellpoints item here.
      ui.notifications.error(game.i18n.format(SP_MODULE_NAME + ".alreadySpItemOwned"));
      item.update({
        'name': item.name + ' (' + game.i18n.format(SP_MODULE_NAME + ".duplicated") + ')'
      });
      return;
    }

    const actor = item.parent;
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
   * It adds a checkbox to the character sheet that allows the user to enable/disable spell points for
   * the character
   * @param app - The application object.
   * @param html - The HTML of the Actor sheet.
   * @param data - The data object passed to the sheet.
   * @returns The return value is the html_checkbox variable.
   */
  static async alterCharacterSheet(app, html, data, type) {
    //console.log('alterCharacterSheet', data.actor);
    //console.log('alterCharacterSheet', html);
    //console.log('alterCharacterSheet type', type);
    if (data.actor.type != "character" && data.actor.type != "npc") {
      return;
    }
    const actor = data.actor;
    const SpellPointsItem = this.getSpellPointsItem(actor);
    if (SpellPointsItem) {
      const value = SpellPointsItem.system.uses.value;
      const max = SpellPointsItem.system.uses.max;
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
      const rendered_html = await renderTemplate(template_file, template_data);

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
        let config = new ActorSpellPointsConfig(SpellPointsItem);
        config?.render(true);
      });
    }
  }

  static async renderSpellPointsItem(app, html, data) {
    const html_obj = $(html);
    const item = data?.item;

    if (SpellPoints.isSpellPointsItem(item)) {
      // this option make the app a little more usable, we keep submit on close and submit on change for checkboxes and select
      app.options.submitOnChange = false;
      $('.item-properties', html_obj).hide();
      let template_item = item; // data object to pass to the template
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
      const rendered_html = await renderTemplate(template_file, template_item);

      $('.sheet-body .tab[data-tab="description"] .item-descriptions', html_obj).prepend(rendered_html);
      $('.tab.active', html_obj).scrollTop(app.options?.prevScroll);

      $('input[type="checkbox"], select', html_obj).on('change', function () {
        let scroll = $('.tab.active', html_obj).scrollTop();
        app.options.prevScroll = scroll;
        app.submit();
      });
    }
    return (app, html, data);

  }
} /** END SpellPoint Class **/


/**
 * A form for configuring actor hit points and bonuses.
 */
class ActorSpellPointsConfig extends DocumentSheet {
  constructor(...args) {
    super(...args);

    /**
     * Cloned copy of the actor for previewing changes.
     * @type {Item5e}
     */
    this.clone = this.object.clone();
  }

  /** @inheritDoc */
  async _onChangeInput(event) {
    super._onChangeInput(event)
    const data = foundry.utils.expandObject(this._getSubmitData());

    data.uses.spent = data.uses.max > data.uses.value ? data.uses.max - data.uses.value : 0;
    const that = this;

    this._updateObject(event, data).then((data) => {
      that.clone = data;
      that.render();
    });
    //this.render();
  }

  /**
   * Handle performing some sheet action.
   * @param {PointerEvent} event  The originating event.
   * @returns {Promise|void}
   * @protected
   */
  _onSheetAction(event) {
    const target = event.currentTarget;
    const { action } = target.dataset;
    switch (action) {
      case "addRecovery": return this._onAddRecovery();
      case "deleteRecovery": return this._onDeleteRecovery(target);
      case "updateSpellPointMax": return this._updateMax();
    }
  }

  _updateMax() {
    const actor = this.clone.parent;
    const item = SpellPoints.getSpellPointsItem(actor);
    SpellPoints.updateSpellPointsMax({}, {}, actor, item);
    this.clone = item;
    this.render();
  }

  /**
   * Create a new recovery profile.
   * @returns {Promise}
   * @protected
   */
  _onAddRecovery() {
    const data = foundry.utils.expandObject(this._getSubmitData());
    data.uses.recovery = [...this.clone.system.uses.recovery, {}];
    this._updateObject(null, data).then((data) => {
      this.clone = data;
      this.render();
    });
  }

  /**
   * Delete a recovery profile.
   * @param {HTMLElement} target  The deletion event target.
   * @returns {Promise}
   * @protected
   */
  _onDeleteRecovery(target) {
    const data = foundry.utils.expandObject(this._getSubmitData());
    data.uses.recovery = [...this.clone.system.uses.recovery];
    data.uses.recovery.splice(target.closest("[data-index]").dataset.index, 1);
    this._updateObject(null, data).then((data) => {
      this.clone = data;
      this.render();
    });
  }

  /* -------------------------------------------- */

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e2", "dnd5e-spellpoints", "actor-spell-points-config", "sheet", "item"], /** css classes */
      template: "modules/dnd5e-spellpoints/templates/spell-points-popup-config.hbs",
      width: 400,
      height: "auto",
      title: "TITLE",
      sheetConfig: false
    });
  }

  get title() {
    return `${game.i18n.localize(SP_MODULE_NAME + ".ItemConfig")}: ${this.document.name}`;
  }

  /** @inheritdoc */
  async getData(options) {
    const context = await super.getData(options);

    context.uses = this.clone.system.uses;
    context.system = this.clone.system;
    context.img = this.clone.img;
    context.name = this.clone.name;
    context.recovery = game.system.config.limitedUsePeriods;

    // Limited Uses
    context.data = { uses: this.clone.uses };
    context.hasLimitedUses = this.clone.hasLimitedUses;
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
    context.usesRecovery = (context.system.uses?.recovery ?? []).map((data, index) => ({
      data,
      //fields: context.fields.uses.fields.recovery.element.fields,
      prefix: `uses.recovery.${index}.`,
      source: context.uses.recovery[index] ?? data,
      formulaOptions: data.period === "recharge" ? data.recharge?.options : null
    }));

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _getActorOverrides() {
    return Object.keys(foundry.utils.flattenObject(this.object.overrides?.system?.attributes || {}));
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    const uses = foundry.utils.expandObject(formData).uses;
    return this.document.update({ "system.uses": uses });;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    if (this.isEditable) {
      html.find("button.control-button").on("click", this._onSheetAction.bind(this));
    }
  }

}