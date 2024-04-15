/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { Order } from "@point_of_sale/app/store/models";

patch(Order.prototype, {
    //@override
    export_for_printing() {
        const result = super.export_for_printing(...arguments);
        result["partner"] = this.partner
        return result
    }
})