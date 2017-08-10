odoo.define('pos_gt.pos_gt', function (require) {
"use strict";

var screens = require('point_of_sale.screens');
var models = require('point_of_sale.models');
var pos_db = require('point_of_sale.DB');

screens.ClientListScreenWidget.include({
    display_client_details: function(visibility,partner,clickpos){
        this._super(visibility,partner,clickpos);
        if (visibility === 'edit') {
            var vat = this.$('.screen-content input').val();
            this.$('.vat').val(vat);
        };
    }
})

screens.PaymentScreenWidget.include({
    show: function(){
        if (!this.pos.get_order().is_to_invoice()) {
            this.click_invoice();
        }
        this._super();
    }
})

var _super_posmodel = models.PosModel.prototype;
models.PosModel = models.PosModel.extend({
    add_new_order: function(){
        var order = _super_posmodel.add_new_order.apply(this);
        if (this.config.cliente_cf_id) {
            order.set_client(this.db.get_partner_by_id(this.config.cliente_cf_id[0]))
        }
    }
})

pos_db.include({
    _partner_search_string: function(partner){
        var str =  partner.name;
        if(partner.ean13){
            str += '|' + partner.ean13;
        }
        if(partner.address){
            str += '|' + partner.address;
        }
        if(partner.phone){
            str += '|' + partner.phone.split(' ').join('');
        }
        if(partner.mobile){
            str += '|' + partner.mobile.split(' ').join('');
        }
        if(partner.email){
            str += '|' + partner.email;
        }
        if(partner.vat){
            str += '|' + partner.vat;
        }
        str = '' + partner.id + ':' + str.replace(':','') + '\n';
        return str;
    }
})

});
