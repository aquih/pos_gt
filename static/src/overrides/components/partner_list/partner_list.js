/** @odoo-module */

import { PartnerList } from "@point_of_sale/app/screens/partner_list/partner_list";
import { patch } from "@web/core/utils/patch";

patch(PartnerList.prototype, {
    async editPartner(p = false) {
        this.pos.env.nit_gt = this.state.query || 'CF';
        super.editPartner(p);
    },
});