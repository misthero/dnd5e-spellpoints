import { SP_MODULE_NAME, SP_ITEM_ID } from "./main.js";
import { SpellPoints } from "./spellpoints.js";


/**
* SPELL POINTS APPLICATION SETTINGS FORM V2
*/
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
export class SpellPointsForm extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "spellpoints-form",
    classes: ["dnd5e-spellpoints", "spellpoints-form"],
    actions: {
      reset: SpellPointsForm.onReset,
    },
    form: {
      handler: SpellPointsForm.#onSubmit,
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: true,
    },
    position: {
      width: 778,
      height: 680,
    },
    tag: "form",
    window: {
      contentClasses: ["spellpoints-config", "standard-form"],
      icon: "fas fa-praying-hands",
      title: "dnd5e-spellpoints.form-title",
      resizable: true,
    }
  };

  static PARTS = {
    form: {
      template: `modules/dnd5e-spellpoints/templates/spellpoint-module-config.hbs`,
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    }
  };

  static filterLevelKeys(obj, maxLevel) {
    const filtered = {};
    for (let lvl = 1; lvl <= maxLevel; lvl++) {
      if (obj[lvl] !== undefined) filtered[lvl] = obj[lvl];
    }
    return filtered;
  }

  static filterSpellLevelKeys(obj, spellLevels) {
    const filtered = {};
    for (const lvl of Object.keys(spellLevels)) {
      if (obj[lvl] !== undefined) filtered[lvl] = obj[lvl];
    }
    return filtered;
  }

  _prepareContext() {
    let data = foundry.utils.mergeObject(
      {
        spFormulas: Object.fromEntries(Object.keys(SpellPoints.formulas).map(formula_key => [formula_key, game.i18n.localize(`dnd5e-spellpoints.${formula_key}`)]))
      },
      this.reset ? foundry.utils.mergeObject(SpellPoints.settings, SpellPoints.defaultSettings, { insertKeys: true, insertValues: true, overwrite: true, recursive: true, performDeletions: true }) : foundry.utils.mergeObject(SpellPoints.settings, { requireSave: false })
    );

    // Filter out levels above CONFIG.DND5E.maxLevel
    const maxLevel = CONFIG.DND5E.maxLevel;
    if (data.spellPointsByLevel) {
      data.spellPointsByLevel = SpellPointsForm.filterLevelKeys(data.spellPointsByLevel, maxLevel);
    }
    if (data.leveledProgressionFormula) {
      data.leveledProgressionFormula = SpellPointsForm.filterLevelKeys(data.leveledProgressionFormula, maxLevel);
    }
    // Filter out spell levels not in CONFIG.DND5E.spellLevels
    const spellLevels = CONFIG.DND5E.spellLevels;
    if (data.spellPointsCosts) {
      data.spellPointsCosts = SpellPointsForm.filterSpellLevelKeys(data.spellPointsCosts, spellLevels);
    }

    // Filter out spell levels not in CONFIG.DND5E.spellLevels
    const spellProgression = CONFIG.DND5E.spellProgression;
    if (data.spellProgression) {
      data.spellProgression = SpellPointsForm.filterSpellLevelKeys(data.spellProgression, spellProgression);
    }

    this.reset = false;
    data.item_id = SP_ITEM_ID;
    SpellPoints.setSpColors();
    data.buttons = [
      { type: "submit", icon: "fa-solid fa-save", label: "SETTINGS.Save" },
      { type: "reset", action: "reset", icon: "fa-solid fa-undo", label: "SETTINGS.Reset" },
    ]
    return data;
  }

  async _onRender(context, options) {
    // The form element is available as this.form
    // Restore scroll position if available
    if (this._pendingScrollTop !== undefined && this.form) {
      const scrollable = this.form.querySelector('.dnd5e-spellpoints .scrollable');
      if (scrollable) scrollable.scrollTop = this._pendingScrollTop;
      this._pendingScrollTop = undefined;
    }
  }

  _onChangeForm(options, event) {
    super._onChangeForm(options, event);
  }

  static async #onSubmit(event, form, formData) {

    // Save scroll position
    const scrollable = form.querySelector('.dnd5e-spellpoints .scrollable');
    const scrollTop = scrollable ? scrollable.scrollTop : 0;

    // Store scroll position for restoration
    this._pendingScrollTop = scrollTop;

    const expandForm = foundry.utils.expandObject(formData.object);

    let formulaOverrides = {};
    if (event.target.name == "spFormula") {
      formulaOverrides = SpellPoints.formulas[expandForm.spFormula];
    }

    let settings = foundry.utils.mergeObject(SpellPoints.settings, expandForm, { insertKeys: true, insertValues: true });
    settings = foundry.utils.mergeObject(settings, formulaOverrides, { insertKeys: true, insertValues: true });

    // Filter out levels above CONFIG.DND5E.maxLevel
    const maxLevel = CONFIG.DND5E.maxLevel;
    if (settings.spellPointsByLevel) {
      settings.spellPointsByLevel = SpellPointsForm.filterLevelKeys(settings.spellPointsByLevel, maxLevel);
    }
    if (settings.leveledProgressionFormula) {
      settings.leveledProgressionFormula = SpellPointsForm.filterLevelKeys(settings.leveledProgressionFormula, maxLevel);
    }
    // Filter out spell levels not in CONFIG.DND5E.spellLevels
    const spellLevels = CONFIG.DND5E.spellLevels;
    if (settings.spellPointsCosts) {
      settings.spellPointsCosts = SpellPointsForm.filterSpellLevelKeys(settings.spellPointsCosts, spellLevels);
    }

    await game.settings.set(SP_MODULE_NAME, 'settings', settings).then(() => {
      this.render();
    });

    if (event.type === "submit") this.close();

  }

  static async onReset(event, form) {
    const confirm = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.format(SP_MODULE_NAME + ".settingResetConfirmTitle") },
      content: game.i18n.format(SP_MODULE_NAME + ".settingResetConfirmText"),
    });
    if (!confirm) return;

    const defaultSettings = foundry.utils.mergeObject(SpellPoints.settings, SpellPoints.defaultSettings, { insertKeys: true, insertValues: true, overwrite: true, recursive: true, performDeletions: true });
    game.settings.set(
      SP_MODULE_NAME, 'settings', defaultSettings
    ).then(() => {
      ui.notifications.info(game.i18n.format(SP_MODULE_NAME + ".settingReset"));
      this.reset = true;
      this.render();
    });
  }
}