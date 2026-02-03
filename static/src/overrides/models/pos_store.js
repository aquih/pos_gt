/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/services/pos_store";

patch(PosStore.prototype, {
    //@override
    addNewOrder(data = {}) {
        const order = super.addNewOrder(...arguments);
        if (this.config.default_client_id) {
            order.setPartner(this.config.default_client_id);
        }
        if (this.config.diario_factura_nombre) {
            order.setToInvoice(true);
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
