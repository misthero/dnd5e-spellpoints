import { DND5E } from "../../../systems/dnd5e/dnd5e.mjs";
import { SpellPointsForm } from "./settings-form.js";
import { SpellPoints } from "./spellpoints.js";

export const SP_MODULE_NAME = 'dnd5e-spellpoints';
export const SP_ITEM_ID = 'LUSjG8364p7LFY1u';
export let dndV4 = false;

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

async function update2_4_00() {
  if (!game.user.isGM) {
    return;
  }
  const settingExists = typeof game.settings.settings.get(SP_MODULE_NAME + '.spPrevVersion') === 'undefined' ? 0 : 1;
  let spPrevVersion = 0;
  if (settingExists) {
    spPrevVersion = game.settings.get(SP_MODULE_NAME, "spPrevVersion");
  }
  const spCurrVersion = game.modules.get(SP_MODULE_NAME).version;
  if (foundry.utils.isNewerVersion(spCurrVersion, spPrevVersion)) {
    const spItems = game.items.filter((i) => {
      const is_sp = i.flags?.core?.sourceId === 'Compendium.dnd5e-spellpoints.module-items.Item.' + SP_ITEM_ID
        || i.system?.source?.custom == 'Spell Points';
      return is_sp;
    });
    for (const s in spItems) {
      const FoundItem = spItems[s];
      if (FoundItem.system.activities.size > 0) {
        FoundItem.system.activities.forEach((n) => {
          n.delete();
        })
      }
    }
  };
}

Hooks.on('ready', () => {
  update2_4_00();
})

Hooks.on('init', () => {
  console.log('SpellPoints init');


  if (typeof game.dnd5e.version === 'string') {
    dndV4 = foundry.utils.isNewerVersion(game.dnd5e.version, '3.99.99');
  }

  DND5E.featureTypes.class.subtypes.sp = game.i18n.format(SP_MODULE_NAME + ".spClassSubtype");

  /** should spellpoints be enabled */
  game.settings.register(SP_MODULE_NAME, "spEnableSpellpoints", {
    name: game.i18n.format(SP_MODULE_NAME + ".enableModule"),
    hint: game.i18n.format(SP_MODULE_NAME + ".enableModuleHint"),
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

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
  spellPointsForm.setCustomOnlyVisibility(isCustom)
})
// dnd 3.2 changed the params from item, consume, options, update to item, config, options 
Hooks.on("dnd5e.preActivityConsumption", (item, consume, options, update) => {
  SpellPoints.castSpell(item, consume, options, update);
})

Hooks.on("renderItemSheet", async (app, html, data) => {
  SpellPoints.renderSpellPointsItem(app, html, data);
})