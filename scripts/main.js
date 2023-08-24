import { SpellPointsForm, SpellPointsConfig } from "./settings-form.js";
import { SpellPoints } from "./spellpoints.js";

export const MODULE_NAME = 'dnd5e-spellpoints';

Handlebars.registerHelper("spFormat", (path, ...args) => {
  return game.i18n.format(path, args[0].hash);
});


Hooks.on('init', () => {
  //console.log('SpellPoints init');
  //CONFIG.debug.hooks = true;
  /** should spellpoints be enabled */
  game.settings.register(MODULE_NAME, "spEnableSpellpoints", {
    name: "Enable Spell Points system",
    hint: "Enables or disables spellpoints for casting spells, this will override the slot cost for player tokens.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
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
    default: SpellPoints.defaultSettings,
    type: Object,
    config: false,
    //onChange: (x) => window.location.reload()
  });

  let _betterRollsActive = false;
  for (const mod of game.data.modules) {
    if (mod.id == "betterrolls5e" && mod.active) {
      _betterRollsActive = true;
      break;
    }
  }

 });

// Adds spell point box to Character Sheet near Initiative.
Hooks.on('renderActorSheet5e', async(app,html,data) => {
    // if Legacy Mode is false, then let's add a custom SP tracker to character sheet.
    if(!SpellPoints.isLegacyMode() && SpellPoints.isModuleActive){
     SpellPoints.addSpellPointTrackerToSheet(app,html,data);
    }
})
/** spell launch dialog **/
Hooks.on("renderAbilityUseDialog", async (dialog, html, formData) => {
  SpellPoints.checkDialogSpellPoints(dialog, html, formData);
})

 Hooks.on("updateItem", (item,updates,diff)=>{

    if(item.type === 'class'){
        let actor = item.actor;
        const newLevel = actor.system.details.level;
        const oldLevel = actor.getFlag(MODULE_NAME,'level')

         if(newLevel !== oldLevel)
            SpellPoints.updateSpellPointsOnLevelUp(actor);
    }
    SpellPoints.calculateSpellPoints(item,updates,diff);
 });
// Hooks.on("createItem", SpellPoints.calculateSpellPoints);

Hooks.on('dnd5e.advancementManagerComplete',(data)=>{
    let actor = data.actor;
    const newLevel = actor.system.details.level;
    const oldLevel = actor.getFlag(MODULE_NAME,'level')
    //console.log('compute', newLevel,oldLevel,data,actor);
    // if(newLevel !== oldLevel)
       // SpellPoints.updateSpellPointsOnLevelUp(actor);
})


Hooks.on('preUpdateActor',(actor,updates,diff)=>{
    if(!updates.hasOwnProperty('flags'))
        return;
    if(updates.flags[MODULE_NAME]?.enabled){

        SpellPoints.initializeSpellPoints(actor);
    }
})
// Moved the character opt in to spell point usage to Special trait section.
Hooks.on("renderActorSheetFlags", (app, html, data) => {
    SpellPoints.mixedMode(app, html, data);
});
/* On rest completed, restore spell points. Only needed for non Resource tracking. */
Hooks.on('dnd5e.restCompleted', (actor, data) => {
    if(SpellPoints.isLegacyMode()) 
     return;
    if( data.longRest === true)
        actor.setFlag(MODULE_NAME,'sp.current', actor.getFlag(MODULE_NAME,'sp.max'));
    if(data.longRest === false && actor.classes.hasOwnProperty('warlock'))
        actor.setFlag(MODULE_NAME,'sp.current', actor.getFlag(MODULE_NAME,'sp.max'));
});
/**
  * Hook that is triggered after the SpellPointsForm has been rendered. This
  * sets the visiblity of the custom formula fields based on if the current
  * formula is a custom formula.
  */
Hooks.on('renderSpellPointsForm', (spellPointsForm, html, data) => {
  const isCustom = (data.isCustom || "").toString().toLowerCase() == "true"
  spellPointsForm.setCustomOnlyVisibility(isCustom)
})

Hooks.on("dnd5e.preItemUsageConsumption", (item, consume, options, update) => {
    if(item.type==="spell"){
        SpellPoints.castSpell(item, consume, options, update);
    }
})

Hooks.on('renderItemSheet5e',(app,html,data) => {
 
    if(data.item.type==="spell"){
        const spell = data;
        const actor = spell.item.actor;
        if(!SpellPoints.isModuleActive())
            return;
        if(!SpellPoints.isMixedActorSpellPointEnabled(actor))
            return;
        if(_actor.classes.hasOwnProperty('warlock') && !SpellPoints.settings.warlockUseSp)
        return true;
        //get spellOverrides from Actor   
        let override = SpellPoints.getOverride(spell.item._id,actor);
        let spellPointCost = override || SpellPoints.settings.spellPointsCosts[spell.system.level];

        //Add spell point input to sheet.
        $('.tab.details .spell-components').before(`<div class="form-group"><label>Spell Points</label><input class="spOverrideInput" step="1" type="number" name="spOverride" default-value="${spellPointCost}" placeholder="${spellPointCost}" value="${spellPointCost}"></div>`);
        html.on('blur','.spOverrideInput',(e)=>{
            let cost = $('.spOverrideInput').val();

            if(cost === '' || isNaN(Number(cost))){
                cost = SpellPoints.settings.spellPointsCosts[spell.system.level];
                $('.spOverrideInput').val(cost);
            }else{
                cost = Number(cost);
            }
            SpellPoints.setOverride(spell.data._id, cost ,actor);
            
            
        })
    }
});