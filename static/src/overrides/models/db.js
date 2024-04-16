/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { Order } from "@point_of_sale/app/store/models";

patch(Order.prototype, {
    //@override
    export_for_printing() {
        const result = super.export_for_printing(...arguments);
        result["partner"] = this.partner
        result["diario_factura_nombre"] = this.pos.config.diario_factura_nombre
        result["diario_factura_direccion"] = this.pos.config.diario_factura_direccion
        result["diario_factura_tel"] = this.pos.config.diario_factura_tel
        return result
    }
})