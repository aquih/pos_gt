/** @odoo-module **/

import { ControlButtons } from "@point_of_sale/app/screens/product_screen/control_buttons/control_buttons";
import { patch } from "@web/core/utils/patch";

patch(ControlButtons.prototype, {
    async clickTakeOut() {
        const order = this.pos.get_order();
        order.take_out = !order.take_out;
    }
});