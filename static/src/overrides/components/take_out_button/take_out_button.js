/** @odoo-module **/

import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { Component, useState } from "@odoo/owl";
import { usePos } from "@point_of_sale/app/store/pos_hook";

class TakeOutButton extends Component {
    static template = "pos_gt.TakeOutButton";

    setup() {
        this.pos = usePos();
        console.debug(this.pos)
        super.setup();
        const order = this.pos.get_order();
        this.state = useState({ take_out: order.take_out || false });
    }

    async click() {
        this.state.take_out = !this.state.take_out;
        const order = this.pos.get_order();
        order.take_out = this.state.take_out;
    }
}

ProductScreen.addControlButton({
    component: TakeOutButton,
    condition: function() {
        const { takeout_option } = this.pos.config;
        return takeout_option;
    },
});