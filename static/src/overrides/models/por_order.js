/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { PosOrder } from "@point_of_sale/app/models/pos_order";

patch(PosOrder.prototype, {
    //@override
    export_for_printing() {
        const result = super.export_for_printing(...arguments);
        result.partner = this.get_partner()
        return result
    }
})
