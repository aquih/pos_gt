odoo.define('pos_gt.pos_gt', function (require) {
"use strict";

var screens = require('point_of_sale.screens');
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
