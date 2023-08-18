import { MODULE_NAME } from "./main.js";

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
      spLegacyMode: false,
      spFormula: 'DMG',
      warlockUseSp: false,
      chatMessagePrivate: true,
      spellPointsByLevel: { 1: 4, 2: 6, 3: 14, 4: 17, 5: 27, 6: 32, 7: 38, 8: 44, 9: 57, 10: 64, 11: 73, 12: 73, 13: 83, 14: 83, 15: 94, 16: 94, 17: 107, 18: 114, 19: 123, 20: 133 },
      spellPointsCosts: { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7, 6: 9, 7: 10, 8: 11, 9: 13 },
      spEnableVariant: false,
      spLifeCost: 2,
      spMixedMode: true,
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
        spCustomFormulaBase: 'ceil((1*@spells.spell1.max + 2*@spells.spell2.max + 3*@spells.spell3.max + 4*@spells.spell4.max + 5*@spells.spell5.max + 6*@spells.spell6.max + 7*@spells.spell7.max + 8*@spells.spell8.max + 9*@spells.spell9.max) / 2) + @attributes.spelldc - 8 - @attributes.prof',
        spCustomFormulaSlotMultiplier: '0',
        spellPointsCosts: { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '12', 7: '14', 8: '24', 9: '27' }
      }
    }
  }

  static isModuleActive() {
    return game.settings.get(MODULE_NAME, 'spEnableSpellpoints');
  }
  static isLegacyMode() {
    return this.settings.spLegacyMode;
  }

  static isActorCharacter(actor) {
    return getProperty(actor, "type") == "character";
  }

  static isMixedActorSpellPointEnabled(actor) {
    if (actor.flags !== undefined) {
      if (actor.flags['dnd5e-spellpoints'] !== undefined) {
        if (actor.flags['dnd5e-spellpoints'].enabled !== undefined) {
          return actor.flags['dnd5e-spellpoints'].enabled
        }
      }
    }
    return false;
  }

  static getOverride(id, actor){
    let overrides = actor.getFlag(MODULE_NAME,'spellOverrides');
    if(typeof overrides[id] === 'undefined')
        return false;
    else
       return overrides[id];
  }
  static setOverride(id,cost,actor){
    let overrides = actor.getFlag(MODULE_NAME,'spellOverrides');
    overrides[id]= Number(cost);
    actor.setFlag(MODULE_NAME,'spellOverrides',overrides);
  }
  /**
  * Get spell point global modifier, or return 0.
  * 
  * @returns Global modifier to use change spell point usage. For instance, if a homebrewed feat reduces the usage of spell points cast.
  */
  static getSPGlobalModifier(actor) {
    if (actor.flags !== undefined) {
        if (actor.flags['dnd5e-spellpoints'] !== undefined) {
          if (actor.flags['dnd5e-spellpoints'].globalMod !== undefined) {
            return actor.flags['dnd5e-spellpoints'].globalMod;
          }
        }
      }
      return 0;
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

  /** check what resource is spellpoints on this actor **/
  
  static getSpellPointsResource(actor) {
    if(SpellPoints.isLegacyMode()){
        let _resources = getProperty(actor, "system.resources");
        for (let r in _resources) {
        if (_resources[r].label == this.settings.spResource) {
            return { 'values': _resources[r], 'key': r };
            break;
        }
        }
    }else{
        return {current:actor.getFlag(MODULE_NAME,'current'),max:actor.getFlag(MODULE_NAME,'max')}
    }
    return false;
  }

  /**
   * The function checks if the actor has enough spell points to cast the spell, and if not, checks if
   * the actor can cast the spell using hit points. If the actor can cast the spell using hit points,
   * the function reduces the actor's maximum hit points by the amount of hit points required to cast
   * the spell
   * @param actor - The actor that is being updated.
   * @param update - The update object that is passed to the actor update function.
   * @returns The update object.
   */

  static castSpell(item, consume, options) {

    if (!consume.consumeSpellLevel) {
      return [item, consume, options];
    }
    const isLegacyMode = SpellPoints.isLegacyMode();
    const actor = item.actor;
    /** do nothing if module is not active **/
    if (!SpellPoints.isModuleActive() || !SpellPoints.isActorCharacter(actor))
      return [item, consume, options];

    const settings = this.settings;

    /* if mixedMode active Check if SpellPoints is enabled for this actor */
    if (settings.spMixedMode && !SpellPoints.isMixedActorSpellPointEnabled(actor))
      return [item, consume, options];


    /** if is a pact spell, but no mixed mode and warlocks do not use spell points: do nothing */
    if (item.system.preparation.mode == 'pact' && !settings.spMixedMode && !settings.warlockUseSp)
      return [item, consume, options];

  
    const override = SpellPoints.getOverride(item._id, actor);
    
    const globalMod = SpellPoints.getSPGlobalModifier(actor);
    const tempMod = (typeof consume.tempMod === 'number') ? consume.tempMod : 0;

    let totalMods = globalMod + tempMod;
    let spellPointResource =  SpellPoints.getSpellPointsResource(actor);
    /** not found any resource for spellpoints ? **/
    if (!spellPointResource) {
      ChatMessage.create({
        content: "<i style='color:red;'>" + game.i18n.format("dnd5e-spellpoints.actorNoSP", { ActorName: actor.name, SpellPoints: settings.spResource }) + "</i>",
        speaker: ChatMessage.getSpeaker({ alias: actor.name })
      });
      game.i18n.format("dnd5e-spellpoints.createNewResource", settings.spResource);
      ui.notifications.error(game.i18n.format("dnd5e-spellpoints.createNewResource", { SpellPoints: settings.spResource }));
      return {};
    }

    /** find the spell level just cast */
    const spellLvl = item.system.level;

    let actualSpellPoints = 0;
    if (isLegacyMode && actor.system.resources[spellPointResource.key].hasOwnProperty("value")) {
      actualSpellPoints = actor.system.resources[spellPointResource.key].value;
    }else{
        actualSpellPoints = spellPointResource.current;
    }
   
    /* get spell cost in spellpoints */
  
    // if override is not false, set to new cost, else use established one.
    let spellPointCost = (override) ? override: this.withActorData(this.settings.spellPointsCosts[spellLvl], actor);

    //reduce/increase cost by mods.
    spellPointCost = spellPointCost + totalMods;

     //if consume is false, then cost is 0.
    spellPointCost = (consume.consumeSpellSlot) ? spellPointCost:0;

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
    actor.update(updateActor);
    /** update spellpoints **/
    if (actualSpellPoints - spellPointCost >= 0 ) {
      /* character has enough spellpoints */
      //If Legacy Mode, subtract from resource, otherwise use flag.
      if(isLegacyMode)
        spellPointResource.values.value = spellPointResource.values.value - spellPointCost;
      else
        actor.setFlag(MODULE_NAME,'current',spellPointResource.current-spellPointCost);

      ChatMessage.create({
        content: "<i style='color:green;'>" + game.i18n.format("dnd5e-spellpoints.spellUsingSpellPoints",
          {
            ActorName: actor.name,
            SpellPoints: this.settings.spResource,
            spellPointUsed: spellPointCost,
            remainingPoints: (isLegacyMode) ? spellPointResource.values.value: spellPointResource.current-spellPointCost
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
        spellPointResource.values.value = 0;
        const hpMaxLost = (spellPointCost - globalMod) * SpellPoints.withActorData(SpellPoints.settings.spLifeCost, actor);
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
            update.system.attributes = mergeObject(update.system.attributes, { 'hp': { 'value': newMaxHP } });
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
    if(isLegacyMode){
        updateActor.system.resources[`${spellPointResource.key}`] = { value: spellPointResource.values.value };
        actor.update(updateActor);
    }

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
    html.height("auto");
    const isLegacyMode = SpellPoints.isLegacyMode();
    if (!SpellPoints.isModuleActive())
      return;

    /** check if actor is a player character **/
    let actor = getProperty(dialog, "item.actor");
    if (!this.isActorCharacter(actor))
      return;

    // Declare settings as a separate variable because jQuery overrides `this` when in an each() block
    let settings = this.settings;

    /* if mixedMode active Check if SpellPoints is enabled for this actor */
    if (settings.spMixedMode && !SpellPoints.isMixedActorSpellPointEnabled(actor))
      return;

    /** check if this is a spell **/
    if (getProperty(dialog, "item.type") !== "spell")
      return;
   

    
    const spell = dialog.item.system;
    const preparation = spell.preparation.mode; //prepared,pact,always,atwill,innate
    const warlockCanCast = settings.spMixedMode || settings.warlockUseSp;
    /* if is a warlock but mixed mode is disable and warlocks cannot use spellpoints, do nothing. */
    if (preparation == 'pact' && !warlockCanCast)
      return;

    // spell level can change later if casting it with a greater slot, baseSpellLvl is the default
    const baseSpellLvl = spell.level;

    /** get spellpoints **/
    let spellPointResource = SpellPoints.getSpellPointsResource(actor);

    if (!spellPointResource) {
      // this actor has no spell point resource what to do?
      const messageCreate = game.i18n.format("dnd5e-spellpoints.pleaseCreate", { SpellPoints: this.settings.spResource });
      $('#ability-use-form', html).append('<div class="spError">' + messageCreate + '</div>');
      return;
    }
    const globalMod = SpellPoints.getSPGlobalModifier(actor);
   
    let tempMod = 0;
    
    let override = SpellPoints.getOverride(dialog.item._id,actor);

    let overrideMod = override - SpellPoints.settings.spellPointsCosts[baseSpellLvl];
    let totalMods = globalMod + overrideMod;

    let level = 'none';
    let cost = 0;
    /** Replace list of spell slots with list of spell point costs **/
    function replaceSpellDropdown(tempMod=0){
        $('select[name="consumeSpellLevel"] option', html).each(function () {
        let selectValue = $(this).val();

        if (selectValue == 'pact' && warlockCanCast) {
            level = actor.system.spells.pact.level;
        } else {
            level = selectValue;
        }
    
        cost = SpellPoints.withActorData(settings.spellPointsCosts[level], actor) + totalMods + tempMod;

        let newText = `${CONFIG.DND5E.spellLevels[level]} (${game.i18n.format("dnd5e-spellpoints.spellCost", { amount: cost, SpellPoints: settings.spResource })})`
        if ((selectValue == 'pact' && warlockCanCast) || selectValue != 'pact') {
            $(this).text(newText);
        }
        })
    };
    replaceSpellDropdown();
    if (level == 'none')
      return;

    /** Calculate spell point cost and warn user if they have none left */
    let spellPointCost = 0;
    const actualSpellPoints = (isLegacyMode) ? actor.system.resources[spellPointResource.key].value:spellPointResource.current;
    if (preparation == 'pact' && warlockCanCast)
      spellPointCost = cost;
    else
      spellPointCost = SpellPoints.withActorData(SpellPoints.settings.spellPointsCosts[baseSpellLvl], actor)+ totalMods;
   
    let missing_points = (typeof actualSpellPoints === 'undefined' || actualSpellPoints - (spellPointCost + tempMod) < 0);
    console.log(spellPointCost,tempMod, missing_points)
    const messageNotEnough = game.i18n.format("dnd5e-spellpoints.youNotEnough", { SpellPoints: this.settings.spResource });
    if (missing_points) {
      
      $('#ability-use-form', html).append('<div class="spError">' + messageNotEnough + '</div>');
    }
    // Change wording
    $('#ability-use-form .form-group:nth-of-type(2) label')[0].childNodes[2].nodeValue = 'Consume Spell Slot\/Points?\n';

    let copyButton = $('.dialog-button', html).clone();
    $('.dialog-button', html).addClass('original').hide();
    copyButton.addClass('copy').removeClass('use').attr('data-button', '');
    $('.dialog-buttons', html).append(copyButton);

    html.on('click', '.dialog-button.copy', function (e) {
      e.preventDefault();
      /** if not consumeSlot we ignore cost, go on and cast or if variant active **/
      if (!$('input[name="consumeSpellSlot"]', html).prop('checked') || SpellPoints.settings.spEnableVariant) {
        $('.dialog-button.original', html).trigger("click");

      } else if ($('select[name="consumeSpellLevel"]', html).length > 0) {
        if (missing_points) {
          ui.notifications.error("You don't have enough: '" + SpellPoints.settings.spResource + "' to cast this spell");
          dialog.close();
        } else {
          $('.dialog-button.original', html).trigger("click");
        }
      }
    })

    // Add temp mod to dialog
    $('#ability-use-form .form-group:nth-of-type(1)', html).after(`<div class="form-group"><label>Temporary SP mod</label><input class="tempMod" style="max-width:40px;padding:0 5px" type="number" value="" name="tempMod"/></div>`)
    $('#ability-use-form').on('blur','.tempMod',(e)=>{
        //dialog.render();
        if($('.tempMod').val() !== ''){
            tempMod = Number($('.tempMod').val());
            missing_points = (typeof actualSpellPoints === 'undefined' || actualSpellPoints - (spellPointCost + tempMod) < 0);
            console.log(spellPointCost,tempMod, missing_points)
            replaceSpellDropdown(tempMod);
            if (missing_points) {
                $('#ability-use-form', html).append('<div class="spError">' + messageNotEnough + '</div>');
            }else{
                $('.spError').remove();
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

      if (slotLvl == 0) {
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
  static calculateSpellPoints(item, updates, isDifferent) {
    const actor = item.parent;

    if (!SpellPoints.isModuleActive() || !SpellPoints.isActorCharacter(actor))
      return true;

    if (!SpellPoints.settings.spAutoSpellpoints) {
      return true;
    }
    /* if mixedMode active Check if SpellPoints is enabled for this actor */
    if (SpellPoints.settings.spMixedMode && !SpellPoints.isMixedActorSpellPointEnabled(actor))
      return true;

    /* updating or dropping a class item */
    if (item.type !== 'class')
      return true;

    if (!getProperty(updates.system, 'levels'))
      return true;

    let spellPointResource = SpellPoints.getSpellPointsResource(actor);
    const actorName = actor.name;

    let SpeakTo = game.users.filter(u => u.isGM);
    let message = '';

    if (!spellPointResource) {
      message = "SPELLPOINTS: Cannot find resource '" + SpellPoints.settings.spResource + "' on " + actorName + " character sheet!";
      ChatMessage.create({
        content: "<i style='color:red;'>" + message + "</i>",
        speaker: ChatMessage.getSpeaker({ alias: actorName }),
        isContentVisible: false,
        isAuthor: true,
        whisper: SpeakTo
      });
      return true;
    }

    const isCustom = SpellPoints.settings.isCustom.toString().toLowerCase() == 'true';
    const SpellPointsMax = isCustom ? SpellPoints._calculateSpellPointsCustom(actor) : SpellPoints._calculateSpellPointsFixed(item, updates, actor)

    if (SpellPointsMax > 0) {
      let updateActor = { [`system.resources.${spellPointResource.key}.max`]: SpellPointsMax };
      actor.update(updateActor);
      let message = "SPELLPOINTS: Found resource '" + SpellPoints.settings.spResource + "' on " + actorName + " character sheet! Your Maximum " + SpellPoints.settings.spResource + " have been updated.";
      ChatMessage.create({
        content: "<i style='color:green;'>" + message + "</i>",
        speaker: ChatMessage.getSpeaker({ alias: actorName }),
        isContentVisible: false,
        isAuthor: true,
        whisper: SpeakTo
      });
    }
    return true;
  }
  
  /**
   * It adds a checkbox to the character sheet that allows the user to enable/disable spell points for
   * the character
   * @param app - The application object.
   * @param html - The HTML of the Actor sheet.
   * @param data - The data object passed to the sheet.
   * @returns The return value is the html_checkbox variable.
   */
  static mixedMode(app, html, data) {
    if (!this.isModuleActive() || !this.settings.spMixedMode) {
      return;
    }

    let checked = "";
    if (SpellPoints.isMixedActorSpellPointEnabled(data.actor)) {
      checked = "checked";
    }
    let spMod = SpellPoints.getSPGlobalModifier(data.actor) || 0;
    let spellPointUseOnSheetLabel = game.i18n.localize('dnd5e-spellpoints.use-spellpoints');

    let html_checkbox = '<h3 class="form-header">Spell Points</h3>';
    html_checkbox += '<div class="form-group"><label>'+spellPointUseOnSheetLabel+'</label>';
    html_checkbox += '<input name="flags.dnd5e-spellpoints.enabled" ' + checked + ' class="spEnableInput" type="checkbox" value="1">';
    html_checkbox += '<p class="notes">'+game.i18n.localize('dnd5e-spellpoints.use-spellpoints-note')+'</p>';
    html_checkbox += '</div>';
    html_checkbox += '<div class="form-group"><label>'+game.i18n.localize('dnd5e-spellpoints.spellpoints-modifier-label') + '</label>';
    html_checkbox += '<input type="text" name="flags.dnd5e-spellpoints.globalMod" value="'+ spMod +'" placeholder="0" data-dtype="Number">';
    html_checkbox += '<p class="notes">'+game.i18n.localize('dnd5e-spellpoints.spellpoints-modifier-note')+'</p></div>';
    $('.form-group:nth-of-type(1)', html).after(html_checkbox);
  }

 /**
   * Adds a tracker to character sheet instead of using one of the three Resource Boxes.
   * 
   * @param app - The application object.
   * @param html - The HTML of the Actor sheet.
   * @param data - The data object passed to the sheet.
   * @returns The return value is the html_checkbox variable.
   */

  static addSpellPointTrackerToSheet(app,html,data){

     if(SpellPoints.isModuleActive() && SpellPoints.isActorCharacter(data.actor)){
        //set or get spell point flags
        if(typeof data.actor.getFlag(MODULE_NAME,'current') !== 'number'){
            data.actor.setFlag(MODULE_NAME,'current', 0);
        }
        if(typeof data.actor.getFlag(MODULE_NAME,'max') !== 'number'){
            data.actor.setFlag(MODULE_NAME,'max', 0);
        }
        $(`<li class="attribute spellpoints">
        <h4 class="attribute-name box-title">
            Spellpoints
        </h4>
    
        <div class="attribute-value multiple">
            <input name="flags.dnd5e-spellpoints.current" type="text" value="${data.actor.flags['dnd5e-spellpoints'].current}" placeholder="0" data-tooltip="dnd5e-spellpoints.SpellPointsCurrent" data-dtype="Number">
            <span class="sep"> / </span>
            <input name="flags.dnd5e-spellpoints.max" type="text" value="${data.actor.flags['dnd5e-spellpoints'].max}" placeholder="0" data-tooltip="dnd5e-spellpoints.SpellPointsMax" data-dtype="Number">
        </div>
    </li>`).appendTo('.header-details ul.attributes',html);
    }
  }

} /** END SpellPoint Class **/