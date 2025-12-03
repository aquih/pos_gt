/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { Order } from "@point_of_sale/app/store/models";

patch(Order.prototype, {
    //@override
    export_for_printing() {
        const result = super.export_for_printing(...arguments);
        result.partner = this.partner;
        result.tag_number = this.tag_number;
        result.ask_tag_number = this.pos.config.ask_tag_number;
        result.take_out = this.take_out;
        result.takeout_option = this.pos.config.takeout_option;
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
