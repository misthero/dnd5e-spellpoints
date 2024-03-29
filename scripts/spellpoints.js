import { MODULE_NAME, ITEM_ID, dndV3 } from "./main.js";

export class SpellPoints {
  static get settings() {
    return mergeObject(this.defaultSettings, game.settings.get(MODULE_NAME, 'settings'));
  }

  /**
   * Get default settings object.
   */
  static get defaultSettings() {
    return {
      spEnableSpellpoints: false,
      spResource: 'Spell Points',
      spAutoSpellpoints: false,
      spFormula: 'DMG',
      warlockUseSp: false,
      chatMessagePrivate: false,
      spellPointsByLevel: { 1: 4, 2: 6, 3: 14, 4: 17, 5: 27, 6: 32, 7: 38, 8: 44, 9: 57, 10: 64, 11: 73, 12: 73, 13: 83, 14: 83, 15: 94, 16: 94, 17: 107, 18: 114, 19: 123, 20: 133 },
      spellPointsCosts: { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7, 6: 9, 7: 10, 8: 11, 9: 13 },
      spEnableVariant: false,
      spLifeCost: 2,
      spMixedMode: false,
      isCustom: "false",
      spCustomFormulaBase: '0',
      spCustomFormulaSlotMultiplier: '1'
    };
  }

  /**
   * Get a map of formulas to override values specific to those formulas.
   */
  static get formulas() {
    return {
      DMG: {
        isCustom: "false",
        spellPointsByLevel: { 1: 4, 2: 6, 3: 14, 4: 17, 5: 27, 6: 32, 7: 38, 8: 44, 9: 57, 10: 64, 11: 73, 12: 73, 13: 83, 14: 83, 15: 94, 16: 94, 17: 107, 18: 114, 19: 123, 20: 133 },
        spellPointsCosts: { 1: '2', 2: '3', 3: '5', 4: '6', 5: '7', 6: '9', 7: '10', 8: '11', 9: '13' }
      },
      CUSTOM: {
        isCustom: "true"
      },
      DMG_CUSTOM: {
        isCustom: "true",
        spCustomFormulaBase: '0',
        spCustomFormulaSlotMultiplier: '1',
        spellPointsCosts: { 1: '2', 2: '3', 3: '5', 4: '6', 5: '7', 6: '9', 7: '10', 8: '11', 9: '13' }
      },
      AM_CUSTOM: {
        isCustom: "true",
        spCustomFormulaBase: 'ceil((2*@spells.pact.level + 1*@spells.spell1.max + 2*@spells.spell2.max + 3*@spells.spell3.max + 4*@spells.spell4.max + 5*@spells.spell5.max + 6*@spells.spell6.max + 7*@spells.spell7.max + 8*@spells.spell8.max + 9*@spells.spell9.max) / 2) + @attributes.spelldc - 8 - @attributes.prof',
        spCustomFormulaSlotMultiplier: '0',
        spellPointsCosts: { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '12', 7: '14', 8: '24', 9: '27' }
      }
    }
  }

  static isModuleActive() {
    return game.settings.get(MODULE_NAME, 'spEnableSpellpoints');
  }

  static isActorCharacter(actor) {
    return getProperty(actor, "type") == "character";
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
    let dataObject = actor.getRollData();
    dataObject.flags = actor.flags;
    const r = new Roll(formula.toString(), dataObject);
    r.evaluate({ async: false });
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

    const settings = this.settings;

    /** check if this is a spell casting **/
    if (item.type != 'spell')
      return [item, consume, options];

    /** if is a pact spell, but no mixed mode and warlocks do not use spell points: do nothing */
    if (item.system.preparation.mode == 'pact' && !settings.warlockUseSp)
      return [item, consume, options];

    let spellPointResource = null;
    let spellPointItem = null;
    if (dndV3) {
      spellPointItem = SpellPoints.getSpellPointsItem(actor);
    } else {
      spellPointResource = SpellPoints.getSpellPointsResource(actor);
    }

    let V3usingResource = false;
    if (dndV3 && !spellPointItem && spellPointResource) {
      V3usingResource = true;
    }

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
        actorNoSP_message = game.i18n.format("dnd5e-spellpoints.actorNoSPV3", { ActorName: actor.name, SpellPoints: settings.spResource });
        createNewResource_message = game.i18n.format("dnd5e-spellpoints.createNewResourceV3", { SpellPoints: settings.spResource })
      } else {
        actorNoSP_message = game.i18n.format("dnd5e-spellpoints.actorNoSP", { ActorName: actor.name, SpellPoints: settings.spResource });
        createNewResource_message = game.i18n.format("dnd5e-spellpoints.createNewResource", { SpellPoints: settings.spResource })
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
    const spellPointCost = this.withActorData(this.settings.spellPointsCosts[spellLvl], actor);

    /** check if message should be visible to all or just player+gm */
    let SpeakTo = [];
    if (this.settings.chatMessagePrivate) {
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
            SpellPoints: this.settings.spResource,
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
      if (this.settings.spEnableVariant) {
        // spell point resource is 0 but character can still cast.
        if (dndV3) {
          spellPointItem.system.uses.value = 0;
        } else {
          spellPointResource.values.value = 0;
        }

        const hpMaxLost = spellPointCost * SpellPoints.withActorData(SpellPoints.settings.spLifeCost, actor);
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
          content: "<i style='color:red;'>" + game.i18n.format("dnd5e-spellpoints.notEnoughSp", { ActorName: actor.name, SpellPoints: this.settings.spResource }) + "</i>",
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
  static checkDialogSpellPoints(dialog, html, formData) {
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
    }

    if (!spellPointResource && !spellPointItem) {
      // this actor has no spell point resource what to do?
      let messageCreate;
      if (dndV3) {
        messageCreate = game.i18n.format("dnd5e-spellpoints.pleaseCreateV3", { SpellPoints: this.settings.spResource });
      } else {
        messageCreate = game.i18n.format("dnd5e-spellpoints.pleaseCreate", { SpellPoints: this.settings.spResource });
      }
      $('#ability-use-form', html).append('<div class="spError">' + messageCreate + '</div>');
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

      let newText = `${CONFIG.DND5E.spellLevels[level]} (${game.i18n.format("dnd5e-spellpoints.spellCost", { amount: cost, SpellPoints: (dndV3 ? spellPointItem.name : settings.spResource) })})`
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
      spellPointCost = SpellPoints.withActorData(SpellPoints.settings.spellPointsCosts[baseSpellLvl], actor);
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
      if (!$('input[name="consumeSpellPoints"]', html).prop('checked') || SpellPoints.settings.spEnableVariant) {
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
   * @return {number} The calculated maximum spell points.
   */
  static _calculateSpellPointsCustom(actor) {
    let SpellPointsMax = SpellPoints.withActorData(SpellPoints.settings.spCustomFormulaBase, actor);

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

      spellPointsFromSlots += slot.max * SpellPoints.withActorData(SpellPoints.settings.spellPointsCosts[slotLvl], actor);
      if (slot.max > 0) {
        hasSpellSlots = true;
      }
    }

    if (!hasSpellSlots) {
      return 0;
    }

    SpellPointsMax += spellPointsFromSlots * SpellPoints.withActorData(SpellPoints.settings.spCustomFormulaSlotMultiplier, actor);

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
  static _calculateSpellPointsFixed(item, updates, actor) {
    /* not an update? **/
    let changedClassLevel = null;
    let changedClassID = null;
    let levelUpdated = false;

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
      third: []
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
    totalSpellcastingLevel += spellcastingLevels['full'].reduce((sum, level) => sum + level, 0)
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

    return parseInt(SpellPoints.settings.spellPointsByLevel[totalSpellcastingLevel]) || 0
  }

  /**
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
      return true;

    if (!SpellPoints.settings.spAutoSpellpoints) {
      return true;
    }

    /* updating or dropping a class item */

    if (item.type !== 'class') {
      // check if is the spell point feature being dropped.
      return true;
    }

    if (!getProperty(updates.system, 'levels'))
      return true;

    SpellPoints.updateSpellPointsMax(item, updates, actor, false);
    return true;
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
    if (!SpellPoints.settings.spAutoSpellpoints) {
      return true;
    }

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

    const isCustom = SpellPoints.settings.isCustom.toString().toLowerCase() == 'true';
    const SpellPointsMax = isCustom ? SpellPoints._calculateSpellPointsCustom(actor) : SpellPoints._calculateSpellPointsFixed(classItem, updates, actor)

    if (SpellPointsMax > 0) {
      spellPointsItem.update({
        [`system.uses.max`]: SpellPointsMax,
        [`system.uses.value`]: createdItem ? SpellPointsMax : spellPointsItem.system.uses.value
      });

      let SpeakTo = game.users.filter(u => u.isGM);
      let message = "SPELLPOINTS: Found resource '" + SpellPoints.settings.spResource + "' on " + actorName + " character sheet! Your Maximum " + SpellPoints.settings.spResource + " have been updated.";
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
    let max, value;
    let changed_uses = false;
    if (SpellPoints.isSpellPointsItem) {
      if (update.system?.uses?.max) {
        max = update.system.uses.max;
        changed_uses = true;
      } else {
        max = item.system.uses.max;
      }
      if (update.system?.uses?.value) {
        changed_uses = true;
        value = update.system.uses.value;
      } else {
        value = item.system.uses.value;
      }

      if (value > max) {
        value = max;
      }
      if (changed_uses) {
        update.system.uses.value = value;
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
  static alterCharacterSheet(app, html, data) {
    if (!this.isModuleActive() || data.actor.type != "character") {
      return;
    }

    const actor = data.actor;

    const SpellPointsItem = this.getSpellPointsItem(actor);
    if (dndV3 && SpellPointsItem) {
      let value = SpellPointsItem.system.uses.value;
      let max = SpellPointsItem.system.uses.max;
      let percent = value / max * 100;
      if (percent > 100)
        percent = 100;
      let html_spellpoints = '<div class="meter-group">';
      html_spellpoints += '<div class="label roboto-condensed-upper"><span>' + SpellPointsItem.name + '</span>';
      if (data.editable) {
        let cog = '<a class="config-button spellPoints" data-action="spellPoints" ';
        cog += 'data-tooltip="' + game.i18n.localize("dnd5e-spellpoints.ItemConfig") + ' ' + SpellPointsItem.name + '" ';
        cog += 'aria-label="' + game.i18n.localize("dnd5e-spellpoints.ItemConfig") + ' ' + SpellPointsItem.name + '"><i class="fas fa-cog" ></i></a>';
        html_spellpoints += cog;
      }
      html_spellpoints += '</div>';
      html_spellpoints += '<div class="meter sectioned sp-points" data-item-id="' + SpellPointsItem._id + '" data-entry-id="' + SpellPointsItem._id + '" data-item-name="' + SpellPointsItem.name + '">';
      html_spellpoints += '<div class="progress sp-points" role="meter" aria-valuemin="0" aria-valuenow="' + value + '" aria-valuemax="' + max + '" style="--bar-percentage: ' + percent + '%">';
      html_spellpoints += '<div class="label">';
      html_spellpoints += '<span class="value">' + value + '</span>';
      html_spellpoints += '<span class="separator">/</span>';
      html_spellpoints += '<span class="max">' + max + '</span>';
      html_spellpoints += '</div>';
      html_spellpoints += '<input type="text" name="system.uses.value" data-dtype="Number" placeholder="0" value="' + value + '" hidden="">';
      html_spellpoints += '<input type="text" value="' + max + '" placeholder="0" data-dtype="Number" data-name="system.uses.max" inputmode="numeric" pattern="[0-9+=\-]*" hidden="">';
      html_spellpoints += '</div>';
      html_spellpoints += '</div>';

      $('.sidebar .stats', html).append(html_spellpoints);

      $('.config-button.spellPoints').on('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        let config = new ActorSpellPointsConfig(SpellPointsItem);
        config?.render(true);
      });

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
      template: "modules/dnd5e-spellpoints/templates/spell-points-config.hbs",
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
      recovery: game.system.config.limitedUsePeriods
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