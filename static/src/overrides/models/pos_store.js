/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/store/pos_store";

patch(PosStore.prototype, {
    //@override
    add_new_order() {
        const order = super.add_new_order(...arguments);
        if (this.config.default_client_id) {
            order.set_partner(this.db.get_partner_by_id(this.config.default_client_id[0]));
        }
        if (this.config.invoice_journal_id) {
            order.set_to_invoice(true);
        }
        return order;
    },

    getReceiptHeaderData(order) {
        const result = super.getReceiptHeaderData(...arguments);
        result.diario_factura_nombre = this.config.diario_factura_nombre
        result.diario_factura_direccion = this.config.diario_factura_direccion
        result.diario_factura_tel = this.config.diario_factura_tel
        return result;
    },
})
