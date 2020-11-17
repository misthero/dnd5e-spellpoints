Hooks.on('init', () => {
  /** should spellpoints be enabled */
  console.log('SpellPoints init');
  game.settings.register("dnd5e-spellpoints", "spEnableSpellpoints", {
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
  
  /** name of the resource we use as spellpount */
  game.settings.register("dnd5e-spellpoints", "spResource", {
    name: "Spell Points Resource",
    hint: "Name of the resource that represents the spell points in character sheet (default: Spell Points)",
    scope: "world",
    config: true,
    default: "Spell Points",
    type: String,
  });
  
  /** configure spell point slot cost **/
  const defaultSpellPointCosts = {1:2,2:3,3:5,4:6,5:7,6:9,7:10,8:11,9:13};
  
  for (i = 1; i < 10; i++) {
    game.settings.register("dnd5e-spellpoints", "spSpellCost_"+i, {
      name: "Spell Points Costs - LVL " + i + "  Slot",
      hint: "How much spellpoints should a level " + i + " spell cost",
      scope: "world",
      config: true,
      default: defaultSpellPointCosts[i],
      type: Number,
    });
  }
  
  game.settings.register("dnd5e-spellpoints", "spEnableVariant", {
    name: "Cast with your life (homebrew)",
    hint: "With this variant a PC can keep casting using his own HP once he runs out of Spell Points",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
  });
  
  game.settings.register("dnd5e-spellpoints", "spLifeCost", {
    name: "HP Cost Multiplier per Spell Point (homebrew)",
    hint: "How many HP a PC will lose will depend on this setting, default is 2 (casting a spell will double it's cost in hp)",
    scope: "world",
    config: true,
    default: 2,
    type: Number,
  });
  
});

Hooks.on('ready', () => {
  console.log("dnd5e spellpoints socket setup")
  game.socket.on(`module.dnd5e-spellpoints`, socketData => {
    console.log("socket recived")  
  })
})

function isModuleActive(){
  return game.settings.get('dnd5e-spellpoints', 'spEnableSpellpoints');
}

function isActorCharacter(actor){
  return getProperty(actor, "data.type") == "character";
}

function isVariantActive(){
  return game.settings.get('dnd5e-spellpoints', 'spEnableVariant');
}

function getHpLifeCost(spellPointsCost){
  const times = game.settings.get('dnd5e-spellpoints', 'spLifeCost');
  if (times > 0)
    return spellPointsCost*times;
  return 1;
}

//collate all preUpdateActor hooked functions into a single hook call
Hooks.on("preUpdateActor", async (actor, update, options, userId) => {
  /** do nothing if module is not active **/
  if (!isModuleActive() || !isActorCharacter(actor))
    return;
  
  let spell = getProperty(update, "data.spells");
  if (!spell || spell === undefined)
    return false
  
  const spellPointResourceName = game.settings.get('dnd5e-spellpoints', 'spResource');
  
  let hp = getProperty(update, "data.attributes.hp.value");
  let spellPointResource = getSpellPointsResource(actor, spellPointResourceName);

  /** not found any resource for spellpoints ? **/
  if (!spellPointResource) {
    ChatMessage.create({
      content: "<i style='color:red;'>"+actor.data.name+" doesn't have any resource named '"+spellPointResourceName+"'.</i>",
      speaker: ChatMessage.getSpeaker({ alias: actor.data.name })
    });
    ui.notifications.error("Please create a new resource and name it: '"+spellPointResourceName+"'");
    return;
  }
  
  /** find the spell level just cast */
  const spellLvlNames = ["spell1", "spell2", "spell3", "spell4", "spell5", "spell6", "spell7", "spell8", "spell9"];
  let spellLvlIndex = spellLvlNames.findIndex(name => { return getProperty(update, "data.spells." + name) });
  
  let spellLvl = spellLvlIndex + 1;
  //** slot calculation **/
  const origSlots = actor.data.data.spells;
  const preCastSlotCount = getProperty(origSlots, spellLvlNames[spellLvlIndex] + ".value");
  const postCastSlotCount = getProperty(update, "data.spells." + spellLvlNames[spellLvlIndex] + ".value");
  const maxSlots = getProperty(origSlots, spellLvlNames[spellLvlIndex] + ".max");
  
  let slotCost = preCastSlotCount - postCastSlotCount;
  
  /** restore slots to the max **/
  update.data.spells[spellLvlNames[spellLvlIndex]].value = maxSlots;
  
  const maxSpellPoints = actor.data.data.resources[spellPointResource.key].max;
  const actualSpellPoints = actor.data.data.resources[spellPointResource.key].value;
  /* get spell cost in spellpoints */
  const spellPointCost = game.settings.get('dnd5e-spellpoints', 'spSpellCost_'+spellLvl);
  
  /** update spellpoints **/
  if (actualSpellPoints - spellPointCost >= 0 ) {
    spellPointResource.values.value = spellPointResource.values.value - spellPointCost;
  } else if (actualSpellPoints - spellPointCost < 0) {
    
    /** check if actor can cast using HP **/
    if (isVariantActive()) {
      spellPointResource.values.value = 0;
      const hpLost = getHpLifeCost(spellPointCost);

      update.data.attributes = {'hp':{'value':actor.data.data.attributes.hp.value - hpLost}};
      ChatMessage.create({
        content: "<i style='color:red;'>"+actor.data.name+" casted using his own life. ("+hpLost+" HP)</i>",
        speaker: ChatMessage.getSpeaker({ alias: actor.data.name })
      });
    } else {
      ChatMessage.create({
        content: "<i style='color:red;'>"+actor.data.name+" doesn't have enough '"+spellPointResourceName+"' to cast this spell.</i>",
        speaker: ChatMessage.getSpeaker({ alias: actor.data.name })
      });
    }
  }
  update.data.resources = {
    [spellPointResource.key] : spellPointResource.values
  };
});

/** check what resource is spellpoints on this actor **/
function getSpellPointsResource(actor, spellPointResourceName) {
  let _resources = getProperty(actor, "data.data.resources");
  for (let r in _resources) {
    if (_resources[r].label == spellPointResourceName) {
      return {'values'  : _resources[r],'key'     : r};
      break;
    }
  }
  return false;
}

/** spell launch dialog **/

Hooks.on("renderAbilityUseDialog", async (dialog, html) => {
  /** check if this module is active **/
  if (!isModuleActive())
    return;
  
  /** check if this is a spell **/
  let isSpell = false;
  if ( dialog.item.data.type === "spell" )
    isSpell = true;
  
  const spell = dialog.item.data;
  const baseSpellLvl = spell.data.level;
  
  if (!isSpell)
    return;
  
  /** check if actor is a player character **/
  let actor = getProperty(dialog, "item.options.actor");
  if(!isActorCharacter(actor))
    return;
  
  /** get spellpoints **/
  const spellPointResourceName = game.settings.get('dnd5e-spellpoints', 'spResource');
  let spellPointResource = getSpellPointsResource(actor, spellPointResourceName);
  
  const maxSpellPoints = actor.data.data.resources[spellPointResource.key].max;
  const actualSpellPoints = actor.data.data.resources[spellPointResource.key].value;

  let spellPointCost = game.settings.get('dnd5e-spellpoints', 'spSpellCost_'+baseSpellLvl);
  
  if (actualSpellPoints - spellPointCost < 0) {
    ui.notifications.error("You don't have enough: '"+spellPointResourceName+"' to cast this spell");
  }
  
  let copyButton = $('.dialog-button', html).clone();
  $('.dialog-button', html).addClass('original').hide();
  copyButton.addClass('copy');
  $('.dialog-buttons', html).append(copyButton);
  
  html.on('click','.dialog-button.copy', function(e){
    /** we ignore cost, go on and cast or variant active **/
    if (!$('input[name="consumeSlot"]',html).prop('checked') 
        || isVariantActive()) {
      $('.dialog-button.original', html).trigger( "click" );
    } else if ($('select[name="level"]', html).length > 0) {
      let spellLvl = $('select[name="level"]', html).val();
      spellPointCost = game.settings.get('dnd5e-spellpoints', 'spSpellCost_'+spellLvl);
      if (actualSpellPoints - spellPointCost < 0) {
        ui.notifications.error("You don't have enough: '"+spellPointResourceName+"' to cast this spell");
        dialog.close();
      } else {
        $('.dialog-button.original', html).trigger( "click" );
      }
    }
  })
})