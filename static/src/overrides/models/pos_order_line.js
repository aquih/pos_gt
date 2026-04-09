/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { PosOrderline } from "@point_of_sale/app/models/pos_order_line";

patch(PosOrderline.prototype, {
    //@override
    setFullProductName() {
        super.setFullProductName(...arguments);

        const product = this.getProduct();
        if (product.default_code) {
            this.full_product_name = `[${product.default_code}] ${this.full_product_name}`;
        }
    },
    get orderDisplayProductName() {
        const data = super.orderDisplayProductName;

        const product = this.getProduct();
        if (product.default_code) {
            data['name'] = `[${product.default_code}] ${data['name']}`;
        }
        return data;
    }
})
