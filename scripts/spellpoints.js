import { MODULE_NAME, ITEM_ID, dndV3 } from "./main.js";

function isset(variable) {
  return (typeof variable !== 'undefined');
}

export class SpellPoints {
  static get settings() {
    return mergeObject(this.defaultSettings, game.settings.get(MODULE_NAME, 'settings'), { insertKeys: true, insertValues: true });
  }

  /**
   * Get default settings object.
   */
  static get defaultSettings() {
    return {
      spEnableSpellpoints: false,
      spResource: 'Spell Points',
      spAutoSpellpoints: true,
      spFormula: 'DMG',
      warlockUseSp: false,
      enableForNpc: false,
      chatMessagePrivate: false,
      spellPointsByLevel: { 1: 4, 2: 6, 3: 14, 4: 17, 5: 27, 6: 32, 7: 38, 8: 44, 9: 57, 10: 64, 11: 73, 12: 73, 13: 83, 14: 83, 15: 94, 16: 94, 17: 107, 18: 114, 19: 123, 20: 133 },
      spellPointsCosts: { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7, 6: 9, 7: 10, 8: 11, 9: 13 },
      spEnableVariant: false,
      spLifeCost: 2,
      spMixedMode: false,
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

  static isModuleActive() {
    return game.settings.get(MODULE_NAME, 'spEnableSpellpoints');
  }

  static isActorCharacter(actor) {
    const isActor = getProperty(actor, "type") == "character";
    let isNPC = false;
    if (this.settings.enableForNpc && !isActor) {
      isNPC = getProperty(actor, "type") == "npc";
    }
    return isNPC || isActor;
  }

  static getActorFlagSpellPointItem(actor) {
    const item_id = actor?.flags?.dnd5espellpoints?.item;
    return typeof item_id === 'string' && item_id.trim().length > 0 ? item_id : false;
  }

  static isSpellPointsItem(item) {
    return dndV3 &&
      item.type === "feat" &&
      (item.flags?.core?.sourceId === "Compendium.dnd5e-spellpoints.module-items.Item." + ITEM_ID
        || item.system.source?.custom === this.settings.spResource);
  }

  static isMixedActorSpellPointEnabled(actor) {
    return actor?.flags?.dnd5espellpoints?.enabled ?? false;
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
    //r.evaluateSync({ async: false }); //vtt v12+
    r.evaluate({ async: false });  //vtt v11
    return r.total;
  }

  static getSpellPointsItem(actor) {
    let items = getProperty(actor, "collections.items");//  filter(u => u.isGM);

    const item_id = SpellPoints.getActorFlagSpellPointItem(actor);
    if (items[item_id])
      return items[item_id];
    let features = items.filter(i => i.type == 'feat');
    // get the item with source custom label = Spell Points
    let sp = features.filter(s => s.system.source.custom == this.settings.spResource);
    // WIP: DETECT SPELLPOINT ITEM (sp[0] ??)

    if (typeof sp == 'undefined') {
      return false;
    }
    return sp[0];
  }

  /** check what resource is spellpoints on this actor **/
  static getSpellPointsResource(actor) {
    let _resources = getProperty(actor, "system.resources");
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
    //console.log('SP CAST SPELL', item, consume, options);

    if (!consume.consumeSpellPoints) {
      return [item, consume, options];
    }

    const actor = item.actor;
    /** do nothing if module is not active **/
    if (!SpellPoints.isModuleActive() || !SpellPoints.isActorCharacter(actor))
      return [item, consume, options];

    let spellPointResource = null;
    let spellPointItem = null;
    if (dndV3) {
      spellPointItem = SpellPoints.getSpellPointsItem(actor);
    } else {
      spellPointResource = SpellPoints.getSpellPointsResource(actor);
    }
    const moduleSettings = this.settings
    let settings = moduleSettings;

    let V3usingResource = false;
    if (dndV3 && !spellPointItem && spellPointResource) {
      V3usingResource = true;
    } else if (spellPointItem.flags?.spellpoints?.override) {
      settings = spellPointItem.flags?.spellpoints?.config !== 'undefined' ? spellPointItem.flags?.spellpoints.config : settings;
    }

    /** check if this is a spell casting **/
    if (item.type != 'spell')
      return [item, consume, options];

    /** if is a pact spell, but no mixed mode and warlocks do not use spell points: do nothing */
    if (item.system.preparation.mode == 'pact' && !moduleSettings.warlockUseSp)
      return [item, consume, options];

    if (consume.consumeSpellSlot) {
      consume.consumeSpellPoints = false;
      return [item, consume, options];
    }

    if (consume.consumeSpellPoints) {
      consume.consumeSpellSlot = false;
    }

    /** not found any resource for spellpoints ? **/
    if (!spellPointResource && !spellPointItem) {
      let actorNoSP_message = '';
      let createNewResource_message = '';
      if (dndV3 && !V3usingResource) {
        actorNoSP_message = game.i18n.format("dnd5e-spellpoints.actorNoSPV3", { ActorName: actor.name, SpellPoints: moduleSettings.spResource });
        createNewResource_message = game.i18n.format("dnd5e-spellpoints.createNewResourceV3", { SpellPoints: moduleSettings.spResource })
      } else {
        actorNoSP_message = game.i18n.format("dnd5e-spellpoints.actorNoSP", { ActorName: actor.name, SpellPoints: moduleSettings.spResource });
        createNewResource_message = game.i18n.format("dnd5e-spellpoints.createNewResource", { SpellPoints: moduleSettings.spResource })
      }
      ChatMessage.create({
        content: "<i style='color:red;'>" + actorNoSP_message + "</i>",
        speaker: ChatMessage.getSpeaker({ alias: actor.name })
      });
      ui.notifications.error(createNewResource_message);
      return {};
    }

    /** find the spell level just cast */
    const spellLvl = item.system.level;

    let actualSpellPoints = 0;
    if (dndV3) {
      actualSpellPoints = spellPointItem.system.uses.value;
    } else {
      if (actor.system.resources[spellPointResource.key].hasOwnProperty("value")) {
        actualSpellPoints = actor.system.resources[spellPointResource.key].value;
      }
    }

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
      if (dndV3) {
        spellPointItem.system.uses.value = spellPointItem.system.uses.value - spellPointCost;
      } else {
        spellPointResource.values.value = spellPointResource.values.value - spellPointCost;
      }

      ChatMessage.create({
        content: "<i style='color:green;'>" + game.i18n.format("dnd5e-spellpoints.spellUsingSpellPoints",
          {
            ActorName: actor.name,
            SpellPoints: moduleSettings.spResource,
            spellPointUsed: spellPointCost,
            remainingPoints: dndV3 ? spellPointItem.system.uses.value : spellPointResource.values.value
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
        if (dndV3) {
          spellPointItem.system.uses.value = 0;
        } else {
          spellPointResource.values.value = 0;
        }

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
            content: "<i style='color:red;'>" + game.i18n.format("dnd5e-spellpoints.castedLifeDead", { ActorName: actor.name }) + "</i>",
            speaker: ChatMessage.getSpeaker({ alias: actor.name }),
            isContentVisible: false,
            isAuthor: true,
            whisper: SpeakTo
          });
        } else {
          updateActor.system.attributes = { 'hp': { 'tempmax': newTempMaxHP } };// hp max reduction
          if (hpActual > newMaxHP) { // a character cannot have more hp than his maximum
            updateActor.system.attributes = mergeObject(updateActor.system.attributes, { 'hp': { 'value': newMaxHP } });
          }
          ChatMessage.create({
            content: "<i style='color:red;'>" + game.i18n.format("dnd5e-spellpoints.castedLife", { ActorName: actor.name, hpMaxLost: hpMaxLost }) + "</i>",
            speaker: ChatMessage.getSpeaker({ alias: actor.name }),
            isContentVisible: false,
            isAuthor: true,
            whisper: SpeakTo
          });
        }
      } else {
        ChatMessage.create({
          content: "<i style='color:red;'>" + game.i18n.format("dnd5e-spellpoints.notEnoughSp", { ActorName: actor.name, SpellPoints: moduleSettings.spResource }) + "</i>",
          speaker: ChatMessage.getSpeaker({ alias: actor.name }),
          isContentVisible: false,
          isAuthor: true,
          whisper: SpeakTo
        });
        consume.consumeSpellSlot = false;
        consume.consumeSpellLevel = false;
        consume.createMeasuredTemplate = false;
        options.createMessage = false;
        delete options.flags;
        return [item, consume, options];
      }
    }

    consume.consumeSpellLevel = false;
    consume.consumeSpellSlot = false;
    if (dndV3) {
      updateItem.system.uses = { value: spellPointItem.system.uses.value };
      spellPointItem.update(updateItem);
    } else {
      updateActor.system.resources[`${spellPointResource.key}`] = { value: spellPointResource.values.value };
    }
    actor.update(updateActor);

    return [item, consume, options];
  }

  /**
   * It checks if the spell is being cast by a player character, and if so, it replaces the spell slot
   * dropdown with a list of spell point costs, and adds a button to the dialog that will cast the
   * spell if the spell point cost is available
   * @param dialog - The dialog object.
   * @param html - The HTML element of the dialog.
   * @param formData - The data that was submitted by the user.
   * @returns the value of the variable `level`
   */
  static async checkDialogSpellPoints(dialog, html, formData) {
    if (!SpellPoints.isModuleActive())
      return;

    /** check if actor is a player character **/
    let actor = getProperty(dialog, "item.actor");
    if (!this.isActorCharacter(actor))
      return;

    // Declare settings as a separate variable because jQuery overrides `this` when in an each() block
    let settings = this.settings;

    /** check if this is a spell **/
    if (getProperty(dialog, "item.type") !== "spell")
      return;

    html.addClass('spellpoints-cast');

    const spell = dialog.item.system;
    const preparation = spell.preparation.mode; //prepared,pact,always,atwill,innate
    const warlockCanCast = settings.warlockUseSp;
    /* if is a warlock but mixed mode is disable and warlocks cannot use spellpoints, do nothing. */
    if (preparation == 'pact' && !warlockCanCast)
      return;

    // spell level can change later if casting it with a greater slot, baseSpellLvl is the default
    const baseSpellLvl = spell.level;

    /** get spellpoints **/
    let spellPointItem = null;
    let spellPointResource = SpellPoints.getSpellPointsResource(actor);;
    if (dndV3) {
      spellPointItem = SpellPoints.getSpellPointsItem(actor);
      if (spellPointItem && spellPointItem.flags?.spellpoints?.override)
        settings = isset(spellPointItem.flags?.spellpoints?.config) ? spellPointItem.flags?.spellpoints?.config : settings;
    }

    if (!spellPointResource && !spellPointItem) {
      // this actor has no spell point resource what to do?
      /*let messageCreate;
      if (dndV3) {
        messageCreate = game.i18n.format("dnd5e-spellpoints.pleaseCreateV3", { SpellPoints: this.settings.spResource });
      } else {
        messageCreate = game.i18n.format("dnd5e-spellpoints.pleaseCreate", { SpellPoints: this.settings.spResource });
      }
      $('#ability-use-form', html).append('<div class="spError">' + messageCreate + '</div>'); */
      return;
    }

    let level = 'none';
    let cost = 0;

    /** Replace list of spell slots with list of spell point costs **/
    $('select[name="slotLevel"] option', html).each(function () {
      let selectValue = $(this).val();

      if (selectValue == 'pact' && warlockCanCast) {
        level = actor.system.spells.pact.level;
      } else {
        level = selectValue.replace('spell', '');
      }
      cost = SpellPoints.withActorData(settings.spellPointsCosts[level], actor);

      let newText = `${CONFIG.DND5E.spellLevels[level]} (${game.i18n.format("dnd5e-spellpoints.spellCost", { amount: cost, SpellPoints: (dndV3 ? spellPointItem.name : this.settings.spResource) })})`
      if ((selectValue == 'pact' && warlockCanCast) || selectValue != 'pact') {
        $(this).text(newText);
      }
    })

    let consumeInput = $('input[name="consumeSpellSlot"]', html).parents('.form-group');
    const consumeString = game.i18n.format("dnd5e-spellpoints.consumeSpellSlotInput", { SpellPoints: dndV3 ? spellPointItem.name : this.settings.spResource });
    //consumeInput.html('<input type="checkbox" name="consumeSpellSlot">' + consumeString);
    consumeInput.parent().append('<div class="form-group"><label class="checkbox"><input type="checkbox" name="consumeSpellPoints" checked="">' + consumeString + '</label></div>');
    $('input[name="consumeSpellSlot"]', html).removeAttr('checked');

    if (level == 'none')
      return;

    /** Calculate spell point cost and warn user if they have none left */
    let spellPointCost = 0;
    let actualSpellPoints = 0;
    if (dndV3) {
      actualSpellPoints = spellPointItem.system.uses.value;
    } else {
      actualSpellPoints = actor.system.resources[spellPointResource.key].value;
    }

    if (preparation == 'pact' && warlockCanCast)
      spellPointCost = cost;
    else
      spellPointCost = SpellPoints.withActorData(settings.spellPointsCosts[baseSpellLvl], actor);
    const missing_points = (typeof actualSpellPoints === 'undefined' || actualSpellPoints - spellPointCost < 0);
    const messageNotEnough = game.i18n.format("dnd5e-spellpoints.youNotEnough", { SpellPoints: dndV3 ? spellPointItem.name : this.settings.spResource });

    if (missing_points) {
      $('#ability-use-form', html).append('<div class="spError">' + messageNotEnough + '</div>');
    }

    let copyButton = $('.dialog-button', html).clone();
    $('.dialog-button', html).addClass('original').hide();
    copyButton.addClass('copy').removeClass('use').attr('data-button', '');
    $('.dialog-buttons', html).append(copyButton);

    html.on('click', '.dialog-button.copy', function (e) {
      e.preventDefault();
      /** if not consumeSlot we ignore cost, go on and cast or if variant active **/
      if (!$('input[name="consumeSpellPoints"]', html).prop('checked') || settings.spEnableVariant) {
        $('.dialog-button.original', html).trigger("click");
      } else if ($('select[name="slotLevel"]', html).length > 0) {
        if (missing_points) {
          ui.notifications.error(messageNotEnough);
          dialog.close();
        } else {
          $('.dialog-button.original', html).trigger("click");
        }
      }
    })
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

    if (getProperty(updates.system, 'levels')) {
      changedClassLevel = getProperty(updates.system, 'levels');
      changedClassID = getProperty(item, '_id');
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
      let level = c.system.levels;

      // get updated class new level
      if (levelUpdated && c._id == changedClassID)
        level = changedClassLevel;

      if (spellcastingLevels[spellcasting] != undefined) {
        spellcastingLevels[spellcasting].push(level);
        spellcastingClassCount++;
      }

    }


    let totalSpellcastingLevel = 0
    totalSpellcastingLevel += spellcastingLevels['full'].reduce((sum, level) => sum + level, 0);
    totalSpellcastingLevel += spellcastingLevels['pact'].reduce((sum, level) => sum + level, 0);
    totalSpellcastingLevel += spellcastingLevels['artificer'].reduce((sum, level) => sum + Math.ceil(level / 2), 0);
    // Half and third casters only round up if they do not multiclass into other spellcasting classes and if they
    // have enough levels to obtain the spellcasting feature.
    if (spellcastingClassCount == 1 && (spellcastingLevels['half'][0] >= 2 || spellcastingLevels['third'][0] >= 3)) {
      totalSpellcastingLevel += spellcastingLevels['half'].reduce((sum, level) => sum + Math.ceil(level / 2), 0);
      totalSpellcastingLevel += spellcastingLevels['third'].reduce((sum, level) => sum + Math.ceil(level / 3), 0);
    } else {
      totalSpellcastingLevel += spellcastingLevels['half'].reduce((sum, level) => sum + Math.floor(level / 2), 0);
      totalSpellcastingLevel += spellcastingLevels['third'].reduce((sum, level) => sum + Math.floor(level / 3), 0);
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

    if (!SpellPoints.isModuleActive() || !SpellPoints.isActorCharacter(actor))
      return [item, updates, id];

    if (!SpellPoints.settings.spAutoSpellpoints) {
      return [item, updates, id];
    }

    /* updating or dropping a class item */

    if (item.type !== 'class') {
      // check if is the spell point feature being dropped.
      return [item, updates, id];
    }

    if (!getProperty(updates.system, 'levels'))
      return [item, updates, id];

    SpellPoints.updateSpellPointsMax(item, updates, actor, false);
    return [item, updates, id];
  }


  static calculateSpellPointsCreate(item, updates, id) {
    if (item.type == 'feat' && SpellPoints.isSpellPointsItem(item)) {
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
      settings = mergeObject(SpellPoints.settings, spellPointsItem.flags.spellpoints.config, { overwrite: true, recursive: true });
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
      let message = game.i18n.format("dnd5e-spellpoints.spellPointsFound", { SpellPoints: (dndV3 ? spellPointsItem.name : SpellPoints.settings.spResource), Actor: actorName })
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

      conf = mergeObject(conf, def, { recursive: true, insertKeys: true, insertValues: false, overwrite: false })
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
      ui.notifications.error(game.i18n.format("dnd5e-spellpoints.alreadySpItemOwned"));
      item.update({
        'name': item.name + ' (' + game.i18n.format("dnd5e-spellpoints.duplicated") + ')'
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

    let spellPointResource = SpellPoints.getSpellPointsResource(actor);

    if (spellPointResource) {
      // created a spell points item in a sheet with a spell points resource, let's get data from it.
      let d = Dialog.confirm({
        title: game.i18n.format("dnd5e-spellpoints.oldResourceFound"),
        content: "<p>" + game.i18n.format("dnd5e-spellpoints.oldResourceFoundDesc") + "</p>",
        yes: () => SpellPoints.removeOldResource(item, spellPointResource),
        no: () => item = SpellPoints.updateSpellPointsMax({}, {}, actor, item),
        defaultYes: true
      });
    } else {
      SpellPoints.updateSpellPointsMax({}, {}, actor, item)
    }
  }

  static removeOldResource(item, spellPointResource) {
    const actor = item.actor;

    let max = actor.system.resources[`${spellPointResource.key}`].max;
    let value = actor.system.resources[`${spellPointResource.key}`].value;
    let updateActor = { [`system.resources.${spellPointResource.key}.label`]: "" };
    actor.update(updateActor);
    item.update({
      [`system.uses.max`]: max,
      [`system.uses.value`]: value
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
    if (!this.isModuleActive() || data.actor.type != "character") {
      return;
    }
    const actor = data.actor;
    const SpellPointsItem = this.getSpellPointsItem(actor);
    if (dndV3 && SpellPointsItem) {
      const value = SpellPointsItem.system.uses.value;
      const max = SpellPointsItem.system.uses.max;
      let percent = value / max * 100 > 100 ? 100 : value / max * 100;
      const template_data = {
        'isV2': type == 'v2',
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
    const item = data?.item;
    if (this.isModuleActive() && SpellPoints.isSpellPointsItem(item)) {
      // this option make the app a little more usable, we keep submit on close and submit on change for checkboxes and select
      app.options.submitOnChange = false;

      $('.item-properties', html).hide();
      if (data.editable && (game.user.isGM || SpellPoints.settings?.spGmOnly == false)) {
        let template_item = item; // data object to pass to the template
        //get global module settings for defaults
        const def = SpellPoints.settings;
        const formulas = SpellPoints.formulas;
        // store current item configuration
        let conf = isset(template_item.flags?.spellpoints?.config) ? template_item.flags?.spellpoints?.config : {};

        conf = mergeObject(conf, def, { recursive: true, insertKeys: true, insertValues: false, overwrite: false })

        //conf.spFormula = isset(conf?.spFormula) ? conf?.spFormula : def.spFormula;
        const preset = conf.spFormula;

        conf.isCustom = isset(conf?.spFormula) ? formulas[preset].isCustom : def.isCustom;
        /*conf.spAutoSpellpoints = isset(conf?.spAutoSpellpoints) ? conf?.spAutoSpellpoints : def.spAutoSpellpoints;
        conf.spCustomFormulaBase = isset(conf?.spCustomFormulaBase) ? conf?.spCustomFormulaBase : def.spCustomFormulaBase;
        conf.spCustomFormulaSlotMultiplier = isset(conf?.spCustomFormulaSlotMultiplier) ? conf?.spCustomFormulaSlotMultiplier : def.spCustomFormulaSlotMultiplier;
        conf.spEnableVariant = isset(conf?.spEnableVariant) ? conf?.spEnableVariant : def.spEnableVariant;
        conf.spellPointsCosts = isset(conf?.spellPointsCosts) ? conf?.spellPointsCosts : def.spellPointsCosts;
        conf.spellPointsByLevel = isset(conf?.spellPointsByLevel) ? conf?.spellPointsByLevel : def.spellPointsByLevel;
        conf.spUseLeveled = isset(conf?.spUseLeveled) ? conf?.spUseLeveled : def.spUseLeveled;
        conf.leveledProgressionFormula = isset(conf?.leveledProgressionFormula) ? conf?.leveledProgressionFormula : def.leveledProgressionFormula;
        conf.spLifeCost = isset(conf?.spLifeCost) ? conf?.spLifeCost : def.spLifeCost;*/

        if (isset(conf?.previousFormula) && conf?.previousFormula != preset) {
          // changed formula preset, update spellpoints default
          conf = mergeObject(conf, formulas[preset], { recursive: true, overwrite: true });
          conf.previousFormula = preset;
        }

        if (!isset(template_item.flags?.spellpoints?.config)) {
          template_item.flags.spellpoints = {
            [`config`]: template_item.flags?.spellpoints?.override ? conf : {},
            [`override`]: template_item.flags?.spellpoints?.override
          };
        }

        template_item.flags.spellpoints.spFormulas = Object.fromEntries(Object.keys(SpellPoints.formulas).map(formula_key => [formula_key, game.i18n.localize(`dnd5e-spellpoints.${formula_key}`)]));
        const template_file = "modules/dnd5e-spellpoints/templates/spell-points-item.hbs"; // file path for the template file, from Data directory
        const rendered_html = await renderTemplate(template_file, template_item);

        $('.sheet-body .tab[data-tab="description"] .item-description', html).prepend(rendered_html);
        $('.tab.active', html).scrollTop(app.options?.prevScroll);

        $('input[type="checkbox"], select', html).on('change', function () {
          let scroll = $('.tab.active', html).scrollTop();
          app.options.prevScroll = scroll;
          app.submit();
        });
      }
      return (app, html, data);
    }
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

  /* -------------------------------------------- */

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "dnd5e-spellpoints", "actor-spell-points-config"], /** css classes */
      template: "modules/dnd5e-spellpoints/templates/spell-points-popup-config.hbs",
      width: 320,
      height: "auto",
      sheetConfig: false
    });
  }

  get title() {
    return `${game.i18n.localize("dnd5e-spellpoints.ItemConfig")}: ${this.document.name}`;
  }

  /** @inheritdoc */
  getData(options) {
    return {
      uses: this.clone.system.uses,
      img: this.clone.img,
      name: this.clone.name,
      recovery: game.system.config.limitedUsePeriods,
      formula: game.system.config.limitedUsePeriods[this.clone.system.uses.per]?.formula
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _getActorOverrides() {
    return Object.keys(foundry.utils.flattenObject(this.object.overrides?.system?.attributes || {}));
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    const uses = foundry.utils.expandObject(formData).uses
    return this.document.update({ "system.uses": uses });
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
  }

}