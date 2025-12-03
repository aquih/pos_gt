/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { PosOrder } from "@point_of_sale/app/models/pos_order";

patch(PosOrder.prototype, {
    //@override
    export_for_printing() {
        const result = super.export_for_printing(...arguments);
        result.partner = this.get_partner()
        result.tag_number = this.tag_number;
        result.ask_tag_number = this.config.ask_tag_number;
        result.take_out = this.take_out;
        result.takeout_option = this.config.takeout_option;
        return result
    }
})
