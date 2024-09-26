import { SpellPointsForm } from "./settings-form.js";
import { SpellPoints } from "./spellpoints.js";
import { checkUpdate } from "./update.js";

export const SP_MODULE_NAME = 'dnd5e-spellpoints';
export const SP_ITEM_ID = 'LUSjG8364p7LFY1u';

//CONFIG.debug.hooks = true;

(function () {
  function checkCondition(v1, operator, v2) {
    switch (operator) {
      case '==':
        return (v1 == v2);
      case '===':
        return (v1 === v2);
      case '!==':
        return (v1 !== v2);
      case '<':
        return (v1 < v2);
      case '<=':
        return (v1 <= v2);
      case '>':
        return (v1 > v2);
      case '>=':
        return (v1 >= v2);
      case '&&':
        return (v1 && v2);
      case '||':
        return (v1 || v2);
      default:
        return false;
    }
  }

  Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
    return checkCondition(v1, operator, v2)
      ? options.fn(this)
      : options.inverse(this);
  });
}());

Handlebars.registerHelper("spFormat", (path, ...args) => {
  return game.i18n.format(path, args[0].hash);
});

Hooks.on('ready', () => {
  checkUpdate();
})

Hooks.on('init', () => {
  console.log('SpellPoints init');

  // add a class feature subtype
  game.dnd5e.config.featureTypes.class.subtypes.sp = game.i18n.format(SP_MODULE_NAME + ".spClassSubtype");

  game.settings.register(SP_MODULE_NAME, "spPrevVersion", {
    scope: "world",
    config: false,
    default: null
  })

  game.settings.registerMenu(SP_MODULE_NAME, SP_MODULE_NAME, {
    name: SP_MODULE_NAME + ".form",
    label: SP_MODULE_NAME + ".form-title",
    hint: SP_MODULE_NAME + ".form-hint",
    icon: "fas fa-magic",
    type: SpellPointsForm,
    restricted: true
  });

  game.settings.register(SP_MODULE_NAME, "settings", {
    name: game.i18n.format(SP_MODULE_NAME + ".settingsTitle"),
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

  SpellPoints.setSpColors();

});

/** spell launch dialog **/
Hooks.on("renderActivityUsageDialog", async (dialog, html) => {
  SpellPoints.checkDialogSpellPoints(dialog, html);
})

Hooks.on("updateItem", SpellPoints.calculateSpellPoints);
Hooks.on("createItem", SpellPoints.calculateSpellPointsCreate);
Hooks.on("preDeleteItem", SpellPoints.removeItemFlag);
Hooks.on("preUpdateItem", SpellPoints.checkSpellPointsValues);

//Hooks.on("dnd5e.computeLeveledProgression", SpellPoints.calculateSpellPointsProgression);

Hooks.on("renderActorSheet5eCharacter2", (app, html, data) => {
  SpellPoints.alterCharacterSheet(app, html, data, 'v2');
});

Hooks.on("renderActorSheet5eCharacter", (app, html, data) => {
  SpellPoints.alterCharacterSheet(app, html, data, 'v1');
});

Hooks.on("renderActorSheet5eNPC", (app, html, data) => {
  SpellPoints.alterCharacterSheet(app, html, data, 'npc');
});

/**
  * Hook that is triggered after the SpellPointsForm has been rendered. This
  * sets the visiblity of the custom formula fields based on if the current
  * formula is a custom formula.
  */
Hooks.on('renderSpellPointsForm', (spellPointsForm, html, data) => {
  const isCustom = (data.isCustom || "").toString().toLowerCase() == "true"
  //spellPointsForm.setCustomOnlyVisibility(isCustom)
})
// dnd 3.2 changed the params from item, consume, options, update to item, config, options 
Hooks.on("dnd5e.preActivityConsumption", (item, consume, options, update) => {
  SpellPoints.castSpell(item, consume, options, update);
})

Hooks.on("renderItemSheet", async (app, html, data) => {
  SpellPoints.renderSpellPointsItem(app, html, data);
})