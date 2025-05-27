/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/store/pos_store";

patch(PosStore.prototype, {
    //@override
    add_new_order() {
        const order = super.add_new_order(...arguments);
        if (this.config.default_client_id) {
            order.set_partner(this.config.default_client_id);
        }
        if (this.config.diario_factura_nombre) {
            order.set_to_invoice(true);
        }
        return order;
    },
    editPartnerContext(partner) {
        const res = super.editPartnerContext(partner);
        return {
            ...res,
            default_vat: this.env.nit_gt,
        };
    }
})
