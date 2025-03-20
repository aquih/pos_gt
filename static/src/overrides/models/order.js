/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { Order } from "@point_of_sale/app/store/models";

patch(Order.prototype, {
    //@override
    export_for_printing() {
        const result = super.export_for_printing(...arguments);
        result.partner = this.partner
        return result
    },
    init_from_JSON(json) {
        super.init_from_JSON(...arguments);
        this.take_out = json.take_out;
    },
    export_as_JSON(){
        const json = super.export_as_JSON(...arguments);
        json.take_out = this.take_out;
        return json;
    }
})
