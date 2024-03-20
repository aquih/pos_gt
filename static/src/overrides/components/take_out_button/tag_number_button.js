/** @odoo-module **/

import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { Component, useState } from "@odoo/owl";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { useService } from "@web/core/utils/hooks";
import { NumberPopup } from "@point_of_sale/app/utils/input_popups/number_popup";

class TagNumberButton extends Component {
    static template = "pos_gt.TagNumberButton";

    setup() {
        this.pos = usePos();
        this.popup = useService("popup");

        const order = this.pos.get_order();
        this.state = useState({ tag_number: order.tag_number || -1 });
    }

    async click() {
        var self = this;
        const { confirmed, payload } = await this.popup.add(NumberPopup, {
            title: 'Etiqueta',
            startingValue: 0,
        });
        if (confirmed) {
            this.state.tag_number = parseInt(payload);
            const order = this.pos.get_order();
            order.tag_number = this.state.tag_number;
        }
    }
}

ProductScreen.addControlButton({
    component: TagNumberButton,
    condition: function() {
        const { ask_tag_number } = this.pos.config;
        return ask_tag_number;
    },
});