import { MODULE_NAME, ITEM_ID } from "./main.js";
import { SpellPoints } from "./spellpoints.js";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
    function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
    function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

/**
* SPELL POINTS APPLICATION SETTINGS FORM
*/
export class SpellPointsForm extends FormApplication {

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title: game.i18n.localize('dnd5e-spellpoints.form-title'),
      id: 'spellpoints-form',
      template: `modules/${MODULE_NAME}/templates/spellpoint-module-config.hbs`,
      width: 700,
      height: 600,
      //closeOnSubmit: true,
      submitOnChange: true,
      resizable: true
    });
  }

  /**
   * Get the data used for filling out the Form. This is composed of the following
   * in order of priority
   *   1) Settings defined by the user
   *   2) Default settings
   *   3) The available formulas
   */
  async getData(options) {
    let data = mergeObject(
      {
        spFormulas: Object.fromEntries(Object.keys(SpellPoints.formulas).map(formula_key => [formula_key, game.i18n.localize(`dnd5e-spellpoints.${formula_key}`)]))
      },
      this.reset ? mergeObject(SpellPoints.settings, SpellPoints.defaultSettings, { insertKeys: true, insertValues: true, overwrite: true, recursive: true, performDeletions: true }) : mergeObject(SpellPoints.settings, { requireSave: false })
    );
    this.reset = false;
    data.item_id = ITEM_ID;
    SpellPoints.setSpColors();
    return data;
  }

  async getLink() {
    let link = await TextEditor.enrichHTML("@UUID[Compendium.dnd5e-spellpoints.module-items.Item." + ITEM_ID + "]{Spell Points}");
  }

  onReset() {
    this.reset = true;
    this.render();
  }

  /**
   * Edits the visiblity of html elements within the Form based on whether the
   * current formula is a custom formula.
   * @param {boolean} isCustom A boolean flag that marks if the current formula is a custom formula.
   */
  setCustomOnlyVisibility(isCustom) {
    const displayValue = isCustom ? 'block' : 'none';
    const customElements = this.element[0].querySelectorAll('.spell-points-custom-only')
    for (let elementIndex = 0, customElement; customElement = customElements[elementIndex]; elementIndex++) {
      customElement.style.display = displayValue;
    }
  }

  _updateObject(event, formData, hideMessage) {
    var that = this;
    return __awaiter(this, void 0, void 0, function* () {
      let settings = mergeObject(SpellPoints.settings, formData, { insertKeys: true, insertValues: true });
      yield game.settings.set(MODULE_NAME, 'settings', settings);
      that.render();
      if (!hideMessage) {
        ui.notifications.info(game.i18n.format("dnd5e-spellpoints.settingSaved"));
      }
    });
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('button[name="reset"]').click(this.onReset.bind(this));
  }

  /**
   * Method executed whenever an input is changed within the Form. This method
   * watches only for changes in the spFormula select box. When a different
   * formula is selected, it will overwrite all fields specified by that formula.
   * The visiblity of custom formulas is also set based on if the new formula is
   * a custom formula.
   * @param {object} event The data detailing the change in the form.
   */
  _onChangeInput(event) {
    var $form_element = $('form', $(event.delegateTarget));
    const spFormData = new FormData($form_element[0]);

    let newSettings = this._getSubmitData(spFormData);
    const input_name = event.originalEvent.target.name
    if (input_name == "spFormula") {
      const input_value = event.originalEvent.target.value;
      const formulaOverrides = SpellPoints.formulas[input_value];
      newSettings = mergeObject(newSettings, formulaOverrides);
    }

    this._updateObject(event, newSettings, true);
  }
} /** end SpellPointForm **/