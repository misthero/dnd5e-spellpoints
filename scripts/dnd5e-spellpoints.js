var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

const MODULE_NAME = 'dnd5e-spellpoints';

Handlebars.registerHelper("spFormat", (path, ...args) => {
  return game.i18n.format(path, args[0].hash);
});

class SpellPoints {
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
      spellPointsByLevel: {1:4,2:6,3:14,4:17,5:27,6:32,7:38,8:44,9:57,10:64,11:73,12:73,13:83,14:83,15:94,16:94,17:107,18:114,19:123,20:133},
      spellPointsCosts: {1:2,2:3,3:5,4:6,5:7,6:9,7:10,8:11,9:13},
      spEnableVariant: false,
      spLifeCost: 2,
      spMixedMode: false,
    };
  }
  
  static isModuleActive(){
    return game.settings.get(MODULE_NAME, 'spEnableSpellpoints');
  }
  
  static isModuleActive(){
    return game.settings.get(MODULE_NAME, 'spEnableSpellpoints');
  }
  
  static isActorCharacter(actor){
    return getProperty(actor, "data.type") == "character";
  }
  
  static isMixedActorSpellPointEnabled(actor){
    console.log(actor);
    if (actor.flags !== undefined) {
      if (actor.flags.dnd5espellpoints !== undefined) {
        if (actor.flags.dnd5espellpoints.enabled !== undefined ){
          return actor.flags.dnd5espellpoints.enabled
        }
      }
    }
    return false;
  }
  
  /** check what resource is spellpoints on this actor **/
  static getSpellPointsResource(actor) {
    let _resources = getProperty(actor, "data.data.resources");
    for (let r in _resources) {
      if (_resources[r].label == this.settings.spResource) {
        return {'values'  : _resources[r],'key'     : r};
        break;
      }
    }
    return false;
  }
  
  static castSpell(actor, update) {
    /** do nothing if module is not active **/ 
    if (!SpellPoints.isModuleActive() || !SpellPoints.isActorCharacter(actor))
      return update;

    /* if mixedMode active Check if SpellPoints is enabled for this actor */
    if (this.settings.spMixedMode && !SpellPoints.isMixedActorSpellPointEnabled(actor.data))
      return update;

    let spell = getProperty(update, "data.spells");
    if (!spell || spell === undefined)
      return update;
    
    let hp = getProperty(update, "data.attributes.hp.value");
    let spellPointResource = SpellPoints.getSpellPointsResource(actor);

    /** not found any resource for spellpoints ? **/
    if (!spellPointResource) {
      ChatMessage.create({
        content: "<i style='color:red;'>" + game.i18n.format("dnd5e-spellpoints.actorNoSP", {ActorName: actor.data.name, SpellPoints: this.settings.spResource }) + "</i>",
        speaker: ChatMessage.getSpeaker({ alias: actor.data.name })
      });
      game.i18n.format("dnd5e-spellpoints.createNewResource", this.settings.spResource);
      ui.notifications.error(game.i18n.format("dnd5e-spellpoints.createNewResource", { SpellPoints : this.settings.spResource }));
      return {};
    }
    
    /** check if is pact magic **/
    let isPact = false;
    if (getProperty(update, "data.spells.pact") !== undefined) {
      isPact = true;
    } 

     /** find the spell level just cast */
    const spellLvlNames = ["spell1", "spell2", "spell3", "spell4", "spell5", "spell6", "spell7", "spell8", "spell9", "pact"];
    let spellLvlIndex = spellLvlNames.findIndex(name => { return getProperty(update, "data.spells." + name) });

    let spellLvl = spellLvlIndex + 1;
    if (isPact)
      spellLvl = actor.data.data.spells.pact.level;
    
    //** slot calculation **/
    const origSlots = actor.data.data.spells;
    const preCastSlotCount = getProperty(origSlots, spellLvlNames[spellLvlIndex] + ".value");
    const postCastSlotCount = getProperty(update, "data.spells." + spellLvlNames[spellLvlIndex] + ".value");
    let maxSlots = getProperty(origSlots, spellLvlNames[spellLvlIndex] + ".max");
    
    let slotCost = preCastSlotCount - postCastSlotCount;

    /** restore slots to the max **/
    if (typeof maxSlots === undefined) {
      maxSlots = 1;
      update.data.spells[spellLvlNames[spellLvlIndex]].max = maxSlots;
    }
    update.data.spells[spellLvlNames[spellLvlIndex]].value = maxSlots;
        
    const maxSpellPoints = actor.data.data.resources[spellPointResource.key].max;
    const actualSpellPoints = actor.data.data.resources[spellPointResource.key].value;
   
   /* get spell cost in spellpoints */
    const spellPointCost = this.settings.spellPointsCosts[spellLvl];
    
    /** update spellpoints **/
    if (actualSpellPoints - spellPointCost >= 0 ) {
      /* character has enough spellpoints */
      spellPointResource.values.value = spellPointResource.values.value - spellPointCost;
      ChatMessage.create({
        content: "<i style='color:green;'>"+game.i18n.format("dnd5e-spellpoints.spellUsingSpellPoints", 
          { 
          ActorName : actor.data.name, 
          SpellPoints: this.settings.spResource,
          spellPointUsed: spellPointCost,
          remainingPoints: spellPointResource.values.value
          })+"</i>",
        speaker: ChatMessage.getSpeaker({ alias: actor.data.name })
      });
    } else if (actualSpellPoints - spellPointCost < 0) {
      /** check if actor can cast using HP **/
      if (this.settings.spEnableVariant) {
        // spell point resource is 0 but character can still cast.
        spellPointResource.values.value = 0;
        const hpMaxLost = spellPointCost * SpellPoints.settings.spLifeCost;
        const hpActual = actor.data.data.attributes.hp.value;
        let hpTempMaxActual = actor.data.data.attributes.hp.tempmax;
        const hpMaxFull = actor.data.data.attributes.hp.max;
        if (!hpTempMaxActual)
          hpTempMaxActual = 0;
        const newTempMaxHP = hpTempMaxActual - hpMaxLost;
        const newMaxHP = hpMaxFull + newTempMaxHP;
        
        if (hpMaxFull + newTempMaxHP <= 0) { //character is permanently dead
          // 3 death saves failed and 0 hp 
          update.data.attributes = {'death':{'failure':3}, 'hp':{'tempmax':-hpMaxFull,'value':0}}; 
          ChatMessage.create({
            content: "<i style='color:red;'>"+game.i18n.format("dnd5e-spellpoints.castedLifeDead", { ActorName : actor.data.name })+"</i>",
            
            speaker: ChatMessage.getSpeaker({ alias: actor.data.name })
          });
        } else {
          update.data.attributes = {'hp':{'tempmax':newTempMaxHP}};// hp max reduction
          if (hpActual > newMaxHP) { // a character cannot have more hp than his maximum
            update.data.attributes = mergeObject(update.data.attributes,{'hp':{'value': newMaxHP}});
          }
          ChatMessage.create({
            content: "<i style='color:red;'>"+game.i18n.format("dnd5e-spellpoints.castedLife", { ActorName : actor.data.name, hpMaxLost: hpMaxLost })+"</i>",
            speaker: ChatMessage.getSpeaker({ alias: actor.data.name })
          });
        }
      } else { 
        ChatMessage.create({
          content: "<i style='color:red;'>"+game.i18n.format("dnd5e-spellpoints.notEnoughSp", { ActorName : actor.data.name, SpellPoints: this.settings.spResource })+"</i>",
          speaker: ChatMessage.getSpeaker({ alias: actor.data.name })
        });
      }
    }
    if (typeof update.data.resources === 'undefined'){
      update.data.resources = {};
    }
    update.data.resources[spellPointResource.key] = { 'value' : spellPointResource.values.value };
    
    return update;
  }
  
  static checkDialogSpellPoints(dialog, html, formData){
    if (!SpellPoints.isModuleActive())
      return;
    
    let actor = getProperty(dialog, "item.actor");
    
    /** check if actor is a player character **/
    if(!this.isActorCharacter(actor))
      return;
    
    //console.log(MODULE_NAME,'checkDialogSpellPoints', actor, dialog, html, formData);
    
    /* if mixedMode active Check if SpellPoints is enabled for this actor */
    if (this.settings.spMixedMode && !SpellPoints.isMixedActorSpellPointEnabled(actor.data))
      return;
  
    /** check if this is a spell **/
    let isSpell = false;
    if ( dialog.item.data.type === "spell" )
      isSpell = true;
    
    //console.log(MODULE_NAME,'is spell');
    
    const spell = dialog.item.data;
    // spell level can change later if casting it with a greater slot, baseSpellLvl is the default
    const baseSpellLvl = spell.data.level;
    
    if (!isSpell)
      return;

    /** get spellpoints **/
    let spellPointResource = SpellPoints.getSpellPointsResource(actor);
    if (!spellPointResource) {
      // this actor has no spell point resource what to do?
      const messageCreate = game.i18n.format("dnd5e-spellpoints.pleaseCreate", {SpellPoints: this.settings.spResource });
      $('#ability-use-form', html).append('<div class="spError">'+messageCreate+'</div>');
      return;
    }

    // Declare settings as a separate variable because jQuery overrides `this` when in an each() block
    let settings = this.settings;

    /** Replace list of spell slots with list of point costs **/
    $('select[name="level"] option', html).each(function() {
      let level = $(this).val();
      let cost = settings.spellPointsCosts[level];
      let newText = `${CONFIG.DND5E.spellLevels[level]} (${game.i18n.format("dnd5e-spellpoints.spellCost", {amount: cost, SpellPoints: settings.spResource})})`
      $(this).text(newText);
    })

    /** Calculate spell point cost and warn user if they have none left */
    const maxSpellPoints = actor.data.data.resources[spellPointResource.key].max;
    const actualSpellPoints = actor.data.data.resources[spellPointResource.key].value;

    let spellPointCost = this.settings.spellPointsCosts[baseSpellLvl];
    
    if (actualSpellPoints - spellPointCost < 0) {
      const messageNotEnough = game.i18n.format("dnd5e-spellpoints.youNotEnough", {SpellPoints: this.settings.spResource });
      $('#ability-use-form', html).append('<div class="spError">'+messageNotEnough+'</div>');
    }

    let copyButton = $('.dialog-button', html).clone();
    $('.dialog-button', html).addClass('original').hide();
    copyButton.addClass('copy');
    $('.dialog-buttons', html).append(copyButton);
    
    html.on('click','.dialog-button.copy', function(e){
      /** if consumeSlot we ignore cost, go on and cast or if variant active **/
      if (!$('input[name="consumeSlot"]',html).prop('checked') 
        || SpellPoints.settings.spEnableVariant) {  
        $('.dialog-button.original', html).trigger( "click" );
      } else if ($('select[name="level"]', html).length > 0) {
        let spellLvl = $('select[name="level"]', html).val();
        spellPointCost = SpellPoints.settings.spellPointsCosts[spellLvl];
        if (actualSpellPoints - spellPointCost < 0) {
          ui.notifications.error("You don't have enough: '" + SpellPoints.settings.spResource + "' to cast this spell");
          dialog.close();
        } else {
          $('.dialog-button.original', html).trigger( "click" );
        }
      }
    })
  }
   
  /** Spell Points Automatic Calculation on class level update or new class */
  static calculateSpellPoints(item, updates, isDifferent) {
    //debugger
    //const updatedItem = mergeObject(ownedItem, updates, { overwrite: true, inplace: false });
    //Hooks.once("updateOwnedItem", async () => {
      console.log('item:',item, 'updates:',updates, 'isDifferent:',isDifferent)
      
      const actor = item.parent;
      
      if (!SpellPoints.isModuleActive() || !SpellPoints.isActorCharacter(actor))
      return true;
    
      if (!SpellPoints.settings.spAutoSpellpoints) {
        return true;
      }
      /* if mixedMode active Check if SpellPoints is enabled for this actor */
      if (SpellPoints.settings.spMixedMode && !SpellPoints.isMixedActorSpellPointEnabled(actor.data))
        return true;

      /* updating or dropping a class item */
      if (item.type !== 'class')
        return true;
      
      /* not an update? **/
      let changedClassLevel = null;
      let changedClassID = null;
      let levelUpdated = false;
      if (getProperty(updates.data, 'levels')) {
        const oldClassLevel = getProperty(item.data, 'levels');
        changedClassLevel = getProperty(updates.data, 'levels');
        changedClassID =  getProperty(item.data, '_id');
        levelUpdated = true;
      }

      const classDroppedName = getProperty(item, 'name');
      
      // check if this is the orignal name or localized with babele
      if (getProperty(item, 'flags.babele.translated')){
        let originalName = getProperty(item, 'flags.babele.originalName');
      } else {
        let originalName = classDroppedName;
      }

      const classItem = actor.items.getName(classDroppedName);
      
      let spellPointResource = SpellPoints.getSpellPointsResource(actor);
      
      const actorName = actor.data.name;
      
      if (!spellPointResource) {
        ui.notifications.error("SPELLPOINTS: Cannot find resource '" + SpellPoints.settings.spResource + "' on " + actorName + " character sheet!");
        return true;
      }

      let SpellPointsMax = 0;
      
      // check for multiclasses 
      const actorClasses = actor.items.filter(i => i.type === "class");
      
      console.log('classes', actorClasses);
      console.log('ACTORE:',actor);
      
      for (let c of actorClasses){
        /* spellcasting: pact; full; half; third; artificier; none; **/
        let spellcasting = c.data.data.spellcasting.progression;
        let level = c.data.data.levels;
        
        // get updated class new level
        if (levelUpdated && c.data._id == changedClassID)
          level = changedClassLevel;
    
        switch(spellcasting) {
          case 'full':
            SpellPointsMax += SpellPoints.settings.spellPointsByLevel[level];
            break;
          case 'half':
            SpellPointsMax += SpellPoints.settings.spellPointsByLevel[Math.ceil(level/2)];
            break;
          case 'third':
            SpellPointsMax += SpellPoints.settings.spellPointsByLevel[Math.ceil(level/3)];
            break;
          default:
            SpellPointsMax += 0;
        }

      }
      
      console.log('NEWSPELLPOINTMAX:',SpellPointsMax);
      if (SpellPointsMax > 0) {
        let updateActor = {[`data.resources.${spellPointResource.key}.max`] : SpellPointsMax};
        actor.update(updateActor);
        ui.notifications.info("SPELLPOINTS: Found resource '" + SpellPoints.settings.spResource + "' on " + actorName + " character sheet! Your Maximum "+ SpellPoints.settings.spResource +" have been updated.");
      }
    return true;
  }
  
  /**
  * mixed Mode add a button to spell sheet 
  * 
  **/
  
  static mixedMode(app, html, data){
    //console.log(data)
    if (!this.isModuleActive() || !this.settings.spMixedMode || data.actor.type != "character") {
      return;
    }
    
    let checked = "";
    if (SpellPoints.isMixedActorSpellPointEnabled(data.actor)) {
      checked = "checked";
    }
    
    let spellPointUseOnSheetLabel = game.i18n.localize('dnd5e-spellpoints.use-spellpoints');
    
    let html_checkbox = '<div class="spEnable flexrow ">';
    html_checkbox += '<div class="no-edit"><i class="fas fa-magic"></i> ' + spellPointUseOnSheetLabel + '</div>';
    html_checkbox += '<label class="edit-allowed"><i class="fas fa-magic"></i>&nbsp;';
    html_checkbox += spellPointUseOnSheetLabel;
    
    html_checkbox += '<input name="flags.dnd5espellpoints.enabled" '+checked+' class="spEnableInput visually-hidden" type="checkbox" value="1">';
    html_checkbox += ' <i class="spEnableCheck fas"></i>';
    html_checkbox += '</label></div>';
    $('.tab.spellbook', html).prepend(html_checkbox);
  }
  
} /** END SpellPoint Class **/


/**
* SPELL POINTS APPLICATION SETTINGS FORM
*/
class SpellPointsForm extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title: game.i18n.localize('dnd5e-spellpoints.form-title'),
      id: 'spellpoints-form',
      template: `modules/${MODULE_NAME}/templates/spellpoint-config.html`,
      width: 500,
      closeOnSubmit: true
    });
  }
  
  getData(options) {
    return mergeObject({
      spFormulas: {
          'DMG': game.i18n.localize('dnd5e-spellpoints.DMG')
          //'AM': game.i18n.localize('dnd5e-spellpoints.AM')
      }
    }, this.reset ? SpellPoints.defaultSettings :
      mergeObject(SpellPoints.defaultSettings, game.settings.get(MODULE_NAME, 'settings')));
  }
  
  onReset() {
    this.reset = true;
    this.render();
  }
  
  _updateObject(event, formData) {
    return __awaiter(this, void 0, void 0, function* () {
      let settings = mergeObject(SpellPoints.settings, formData, { insertKeys: true, insertValues: true });
      yield game.settings.set(MODULE_NAME, 'settings', settings);
    });
  }
  activateListeners(html) {
    super.activateListeners(html); 
    html.find('button[name="reset"]').click(this.onReset.bind(this));
  }
} /** end SpellPointForm **/

Hooks.on('init', () => {
  console.log('SpellPoints init');
  /** should spellpoints be enabled */
  game.settings.register(MODULE_NAME, "spEnableSpellpoints", {
    name: "Enable Spell Points system",
    hint: "Enables or disables spellpoints for casting spells, this will override the slot cost for player tokens.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: spEnableSpellpoints => {
      window.location.reload();
    }
  });
  
  game.settings.registerMenu(MODULE_NAME, MODULE_NAME, {
    name: "dnd5e-spellpoints.form",
    label: "dnd5e-spellpoints.form-title",
    hint: "dnd5e-spellpoints.form-hint",
    icon: "fas fa-magic",
    type: SpellPointsForm,
    restricted: true
  });

  game.settings.register(MODULE_NAME, "settings", {
    name: "Spell Points Settings",
    scope: "world",
    default: SpellPointsForm.defaultSettings,
    type: Object,
    config: false,
    onChange: (x) => window.location.reload()
  });
  
  let _betterRollsActive = false;
  for (const mod of game.data.modules) {
    if (mod.id == "betterrolls5e" && mod.active) {
      _betterRollsActive = true;
      break;
    }
	}
  
  //console.log('betterRollActive1:',_betterRollsActive);
  //console.log('betterRollActive2:',game.modules.get('betterrolls5e')?.active);

});

// collate all preUpdateActor hooked functions into a single hook call
Hooks.on("preUpdateActor", async (actor, update, options, userId) => {
  update = SpellPoints.castSpell(actor, update);
});

/** spell launch dialog **/
// renderAbilityUseDialog renderApplication
Hooks.on("renderAbilityUseDialog", async (dialog, html, formData) => {
  //console.log(MODULE_NAME, 'renderAbilityUseDialog');
  SpellPoints.checkDialogSpellPoints(dialog, html, formData);
})

Hooks.on("preUpdateItem", SpellPoints.calculateSpellPoints);
Hooks.on("preCreateItem", SpellPoints.calculateSpellPoints);

Hooks.on("renderActorSheet5e", (app, html, data) => {
  //console.log(MODULE_NAME, 'renderActorSheet5e');
  SpellPoints.mixedMode(app, html, data);
});