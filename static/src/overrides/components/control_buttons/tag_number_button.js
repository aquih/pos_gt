/** @odoo-module **/

import { ControlButtons } from "@point_of_sale/app/screens/product_screen/control_buttons/control_buttons";
import { NumberPopup } from "@point_of_sale/app/utils/input_popups/number_popup";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";

patch(ControlButtons.prototype, {
    async clickTagNumber() {
        this.dialog.add(NumberPopup, {
            title: _t("Etiqueta"),
            placeholder: _t("1"),
            getPayload: async (etiqueta) => {
                const order = this.pos.get_order();
                order.tag_number = etiqueta;
            },
        });
    }
});