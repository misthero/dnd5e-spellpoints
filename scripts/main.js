import { SpellPointsForm } from "./settings-form.js";
import { SpellPoints } from "./spellpoints.js";

export const MODULE_NAME = 'dnd5e-spellpoints';
export const ITEM_ID = 'LUSjG8364p7LFY1u';

export let dndV3 = false;

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


Hooks.on('init', () => {
  console.log('SpellPoints init');
  if (typeof game.dnd5e.version === 'string') {
    dndV3 = foundry.utils.isNewerVersion(game.dnd5e.version, '2.99.99');
  }

  /** should spellpoints be enabled */
  game.settings.register(MODULE_NAME, "spEnableSpellpoints", {
    name: game.i18n.format("dnd5e-spellpoints.enableModule"),
    hint: game.i18n.format("dnd5e-spellpoints.enableModuleHint"),
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
    name: game.i18n.format("dnd5e-spellpoints.settingsTitle"),
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
Hooks.on("renderAbilityUseDialog", async (dialog, html, formData) => {
  SpellPoints.checkDialogSpellPoints(dialog, html, formData);
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
  spellPointsForm.setCustomOnlyVisibility(isCustom)
})

Hooks.on("dnd5e.preItemUsageConsumption", (item, consume, options, update) => {
  SpellPoints.castSpell(item, consume, options, update);
})

Hooks.on("renderItemSheet", async (app, html, data) => {
  SpellPoints.renderSpellPointsItem(app, html, data);
})