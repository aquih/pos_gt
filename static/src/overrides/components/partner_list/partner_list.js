/** @odoo-module */

import { PartnerListScreen } from "@point_of_sale/app/screens/partner_list/partner_list";
import { patch } from "@web/core/utils/patch";

patch(PartnerListScreen.prototype, {
    createPartner() {
        super.createPartner();
        this.state.editModeProps.partner.vat = this.state.query;
    },
});